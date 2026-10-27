import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { canExport } from '@/lib/permissions';
import Papa from 'papaparse';

/**
 * Universal Export API for any Module (Lead, Deal, Account, Task, Product, Custom Modules)
 */
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canExport(user)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to export data" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      moduleName = 'Lead', 
      moduleId, 
      dateRangeType, 
      startDate, 
      endDate, 
      stages, 
      columns, 
      fileFormat, 
      password 
    } = body;

    const normalizedModule = (moduleName || 'Lead').trim();
    const whereClause = { organizationId: user.organizationId };

    // RBAC Data Visibility
    if (!user.profile?.canAccessSettings && user.profile?.permissions?.[normalizedModule]?.visibility === 'private') {
      whereClause.owner = user.profile?.nickname || user.email;
    }

    // 1. Stage Filter
    if (Array.isArray(stages) && stages.length > 0) {
      whereClause.stageId = { in: stages };
    }

    // 2. Date Range Filter
    const now = new Date();
    if (dateRangeType === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      whereClause.createdAt = { gte: todayStart };
    } else if (dateRangeType === 'this_week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      whereClause.createdAt = { gte: weekStart };
    } else if (dateRangeType === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      whereClause.createdAt = { gte: monthStart };
    } else if (dateRangeType === 'custom' && startDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {})
      };
    }

    // 3. Fetch Data dynamically based on Module Type
    let records = [];
    const lower = normalizedModule.toLowerCase();

    if (lower === 'lead') {
      records = await prisma.lead.findMany({
        where: whereClause,
        include: { stage: true },
        orderBy: { createdAt: 'desc' }
      });
    } else if (lower === 'deal') {
      records = await prisma.deal.findMany({
        where: whereClause,
        include: { stage: true },
        orderBy: { createdAt: 'desc' }
      });
    } else if (lower === 'account') {
      records = await prisma.account.findMany({
        where: whereClause,
        include: { stage: true },
        orderBy: { createdAt: 'desc' }
      });
    } else if (lower === 'task') {
      records = await prisma.task.findMany({
        where: whereClause,
        include: { stage: true },
        orderBy: { createdAt: 'desc' }
      });
    } else if (lower === 'product') {
      records = await prisma.product.findMany({
        where: whereClause,
        include: { stage: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Custom Module
      let customModuleId = moduleId;
      if (!customModuleId) {
        const cm = await prisma.customModule.findFirst({
          where: { organizationId: user.organizationId, name: normalizedModule }
        });
        if (cm) customModuleId = cm.id;
      }

      if (customModuleId) {
        whereClause.customModuleId = customModuleId;
        records = await prisma.customRecord.findMany({
          where: whereClause,
          include: { stage: true },
          orderBy: { createdAt: 'desc' }
        });
      }
    }

    // 4. Transform to flat structure strictly for selected columns
    const selectedCols = Array.isArray(columns) && columns.length > 0 ? columns : null;

    const exportedRows = records.map(r => {
      let customData = {};
      try {
        customData = typeof r.customData === 'string' ? JSON.parse(r.customData) : (r.customData || {});
      } catch (e) {
        customData = {};
      }

      const flat = { ...customData };

      // Map native fields
      Object.keys(r).forEach(k => {
        if (k === 'customData') return;
        if (k === 'stage') {
          flat.stage = r.stage?.name || '';
          return;
        }
        if (r[k] instanceof Date) {
          flat[k] = r[k].toISOString().slice(0, 10);
        } else if (typeof r[k] === 'object' && r[k] !== null) {
          try { flat[k] = JSON.stringify(r[k]); } catch (e) { flat[k] = ''; }
        } else {
          flat[k] = r[k] ?? '';
        }
      });

      // Compute display name if missing
      if (!flat.fullName && (flat.firstName || flat.lastName)) {
        flat.fullName = `${flat.firstName || ''} ${flat.lastName || ''}`.trim();
      }

      if (selectedCols) {
        const filtered = {};
        selectedCols.forEach(col => {
          filtered[col] = flat[col] !== undefined ? flat[col] : '';
        });
        return filtered;
      }

      return flat;
    });

    const fileNameBase = `${normalizedModule.toLowerCase()}s_export_${new Date().toISOString().slice(0, 10)}`;

    // 5. Excel (.xlsx) OR Password Protected
    if (fileFormat === 'excel' || (password && password.trim().length > 0)) {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Mooncliq Orbit CRM';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet(`${normalizedModule}s`);

      const headers = selectedCols && selectedCols.length > 0 
        ? selectedCols 
        : (exportedRows.length > 0 ? Object.keys(exportedRows[0]) : ['id', 'name', 'createdAt']);

      worksheet.columns = headers.map(h => ({
        header: h,
        key: h,
        width: Math.max(h.length + 5, 18)
      }));

      // Style Header row with Orbit theme slate #0f172a
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' }
      };

      exportedRows.forEach(row => {
        worksheet.addRow(row);
      });

      let buffer = await workbook.xlsx.writeBuffer();

      // Agile Password Encryption
      if (password && password.trim().length > 0) {
        const XlsxPopulate = (await import('xlsx-populate')).default;
        const populateWorkbook = await XlsxPopulate.fromDataAsync(buffer);
        buffer = await populateWorkbook.outputAsync({ password: password.trim() });
      }

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${fileNameBase}.xlsx"`
        }
      });
    }

    // 6. JSON (.json)
    if (fileFormat === 'json') {
      return new NextResponse(JSON.stringify(exportedRows, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileNameBase}.json"`
        }
      });
    }

    // 7. Default: CSV (.csv)
    const csvStr = Papa.unparse(exportedRows);
    return new NextResponse(csvStr, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileNameBase}.csv"`
      }
    });

  } catch (error) {
    console.error("Universal Export Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
