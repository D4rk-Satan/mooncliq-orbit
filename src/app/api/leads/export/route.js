import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUser } from '../../../../lib/auth';
import { canExport } from '../../../../lib/permissions';
import Papa from 'papaparse';

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
    const { dateRangeType, startDate, endDate, stages, columns, fileFormat, password } = body;

    const whereClause = { organizationId: user.organizationId };

    if (!user.profile?.canAccessSettings && user.profile?.permissions?.Lead?.visibility === 'private') {
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

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: { stage: true },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Transform to flat structure based strictly on selected columns
    const selectedCols = Array.isArray(columns) && columns.length > 0 ? columns : null;

    const exportedRows = leads.map(lead => {
      let customData = lead.customData;
      if (typeof customData === 'string') {
        try { customData = JSON.parse(customData); } catch (e) { customData = {}; }
      }
      if (!customData || typeof customData !== 'object') customData = {};

      const rowObj = {};

      const resolveValue = (colName) => {
        if (colName === 'id') return lead.id;
        if (colName === 'fullName') return lead.fullName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
        if (colName === 'companyName') return lead.companyName || customData.companyName || '';
        if (colName === 'firstName') return lead.firstName || '';
        if (colName === 'lastName') return lead.lastName || '';
        if (colName === 'email') return lead.email || '';
        if (colName === 'phone') return lead.phone || '';
        if (colName === 'alternatePhone') return lead.alternatePhone || '';
        if (colName === 'owner') return lead.owner || '';
        if (colName === 'stage') return lead.stage?.name || 'Unknown';
        if (colName === 'leadSource') return lead.leadSource || '';
        if (colName === 'priority') return lead.priority || '';
        if (colName === 'notes') return lead.notes || '';
        if (colName === 'createdAt') return lead.createdAt.toISOString();
        if (colName === 'address') {
          const parts = [lead.street, lead.city, lead.state, lead.zipCode, lead.country].filter(Boolean);
          return parts.length > 0 ? parts.join(', ') : (customData.address || '');
        }
        // Custom field lookup
        return customData[colName] !== undefined ? customData[colName] : '';
      };

      if (selectedCols) {
        selectedCols.forEach(col => {
          rowObj[col] = resolveValue(col);
        });
      } else {
        rowObj.fullName = resolveValue('fullName');
        rowObj.email = resolveValue('email');
        rowObj.phone = resolveValue('phone');
        rowObj.companyName = resolveValue('companyName');
        rowObj.stage = resolveValue('stage');
        rowObj.owner = resolveValue('owner');
        rowObj.createdAt = resolveValue('createdAt');
      }

      return rowObj;
    });

    const fileNameBase = `leads_export_${new Date().toISOString().slice(0, 10)}`;

    // 1. If format is Excel (.xlsx) OR Password Protection is enabled -> Generate direct Excel file!
    if (fileFormat === 'excel' || (password && password.trim().length > 0)) {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Mooncliq Orbit CRM';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Leads');

      // Define columns
      const headers = selectedCols && selectedCols.length > 0 
        ? selectedCols 
        : (exportedRows.length > 0 ? Object.keys(exportedRows[0]) : ['id', 'fullName', 'email', 'phone']);

      worksheet.columns = headers.map(h => ({
        header: h,
        key: h,
        width: Math.max(h.length + 5, 18)
      }));

      // Style Header row
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Sleek slate #0f172a
      };

      // Add data rows
      exportedRows.forEach(row => {
        worksheet.addRow(row);
      });

      let buffer = await workbook.xlsx.writeBuffer();

      // If password protection is requested, encrypt workbook with xlsx-populate (Password to Open)
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

    // 2. If format is JSON
    if (fileFormat === 'json') {
      return new NextResponse(JSON.stringify(exportedRows, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${fileNameBase}.json"`
        }
      });
    }

    // 3. Default: CSV (.csv)
    const csvStr = Papa.unparse(exportedRows);
    return new NextResponse(csvStr, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileNameBase}.csv"`
      }
    });

  } catch (error) {
    console.error("Error exporting leads:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Keep GET for backwards compatibility
export async function GET(request) {
  return POST(request);
}
