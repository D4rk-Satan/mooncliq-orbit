"use client";

import React, { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";

export default function ExportModal({
  isOpen,
  onClose,
  moduleName = "Lead",
  blueprint
}) {
  const [dateRangeType, setDateRangeType] = useState("all"); // 'all', 'today', 'this_week', 'this_month', 'custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStages, setSelectedStages] = useState([]); // Array of stage IDs
  const [selectedColumns, setSelectedColumns] = useState([]); // Array of field names
  const [fileFormat, setFileFormat] = useState("csv"); // 'csv' or 'json'
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Available Blueprint fields
  const availableFields = useMemo(() => {
    if (!blueprint?.fields) {
      return [
        { name: "fullName", label: "Full Name" },
        { name: "companyName", label: "Company Name" },
        { name: "email", label: "Email" },
        { name: "phone", label: "Phone" },
        { name: "owner", label: "Owner" },
        { name: "stage", label: "Stage" },
        { name: "createdAt", label: "Created Date" }
      ];
    }
    const standardAndCustom = blueprint.fields
      .filter(f => !f.isHidden)
      .map(f => ({ name: f.name, label: f.label || f.name }));

    return [
      ...standardAndCustom,
      { name: "stage", label: "Stage / Status" },
      { name: "createdAt", label: "Created Date" }
    ];
  }, [blueprint]);

  // Stages available from Blueprint
  const stages = useMemo(() => {
    return blueprint?.stages || [];
  }, [blueprint]);

  // Initialize all columns as selected on load
  React.useEffect(() => {
    if (availableFields.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(availableFields.map(f => f.name));
    }
  }, [availableFields]);

  const toggleColumn = (colName) => {
    setSelectedColumns(prev =>
      prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(availableFields.map(f => f.name));
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const toggleStage = (stageId) => {
    setSelectedStages(prev =>
      prev.includes(stageId) ? prev.filter(s => s !== stageId) : [...prev, stageId]
    );
  };

  // Trigger Export Request to Backend
  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      alert("Please select at least one column to export!");
      return;
    }

    setIsExporting(true);
    try {
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken.toString();

      // Build payload
      const payload = {
        moduleName,
        dateRangeType,
        startDate: dateRangeType === "custom" ? startDate : undefined,
        endDate: dateRangeType === "custom" ? endDate : undefined,
        stages: selectedStages,
        columns: selectedColumns,
        fileFormat,
        password: enablePassword && password.trim() ? password.trim() : undefined
      };

      const res = await fetch(`/api/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let fileExt = fileFormat === 'excel' ? 'xlsx' : fileFormat;
      if (enablePassword && password.trim()) {
        fileExt = 'xlsx'; // Password protected Excel
      }
      a.download = `${moduleName.toLowerCase()}s_export_${new Date().toISOString().slice(0, 10)}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error("Export error:", err);
      alert(err.message || "Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="slide-backdrop open" style={{ zIndex: 9999 }}></div>
      <div
        className="modal-card open"
        style={{
          width: "780px",
          maxWidth: "95vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 10000,
          padding: 0
        }}
      >
        {/* Header */}
        <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              EXPORT DATA
            </span>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
              Export {moduleName}s
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "1.25rem" }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* SECTION 1: DATE RANGE SELECTOR */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.5rem" }}>
              1. Date Range
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: dateRangeType === "custom" ? "0.75rem" : "0" }}>
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "this_week", label: "This Week" },
                { id: "this_month", label: "This Month" },
                { id: "custom", label: "Custom Range" }
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDateRangeType(d.id)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "20px",
                    border: dateRangeType === d.id ? "1.5px solid #0f172a" : "1px solid #cbd5e1",
                    backgroundColor: dateRangeType === d.id ? "#0f172a" : "#ffffff",
                    color: dateRangeType === d.id ? "#ffffff" : "#475569",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {dateRangeType === "custom" && (
              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>From Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="form-input"
                    style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>To Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="form-input"
                    style={{ padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: STAGE / STATUS SELECTOR */}
          {stages.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                  2. Filter by Stages
                </label>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {selectedStages.length === 0 ? "Exporting All Stages" : `${selectedStages.length} stage(s) selected`}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setSelectedStages([])}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "16px",
                    border: selectedStages.length === 0 ? "1.5px solid #10b981" : "1px solid #cbd5e1",
                    backgroundColor: selectedStages.length === 0 ? "#ecfdf5" : "#ffffff",
                    color: selectedStages.length === 0 ? "#047857" : "#64748b",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  All Stages
                </button>
                {stages.map(st => {
                  const isSelected = selectedStages.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleStage(st.id)}
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "16px",
                        border: isSelected ? "1.5px solid #3b82f6" : "1px solid #cbd5e1",
                        backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                        color: isSelected ? "#1d4ed8" : "#475569",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {st.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: COLUMN SELECTOR */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                3. Choose Columns ({selectedColumns.length} of {availableFields.length} selected)
              </label>
              <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem" }}>
                <button
                  type="button"
                  onClick={selectAllColumns}
                  style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, cursor: "pointer" }}
                >
                  Select All
                </button>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <button
                  type="button"
                  onClick={deselectAllColumns}
                  style={{ background: "none", border: "none", color: "#64748b", fontWeight: 600, cursor: "pointer" }}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                maxHeight: "160px",
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "0.5rem",
                backgroundColor: "#f8fafc"
              }}
            >
              {availableFields.map(f => {
                const isChecked = selectedColumns.includes(f.name);
                return (
                  <label
                    key={f.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.8rem",
                      color: isChecked ? "#0f172a" : "#64748b",
                      fontWeight: isChecked ? 600 : 400,
                      cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleColumn(f.name)}
                      style={{ cursor: "pointer", accentColor: "#0f172a" }}
                    />
                    {f.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: FILE FORMAT */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.5rem" }}>
              4. Export File Format
            </label>
            <div style={{ display: "flex", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}>
                <input
                  type="radio"
                  name="fileFormat"
                  value="excel"
                  checked={fileFormat === "excel"}
                  onChange={() => setFileFormat("excel")}
                />
                Excel (.xlsx)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}>
                <input
                  type="radio"
                  name="fileFormat"
                  value="csv"
                  checked={fileFormat === "csv"}
                  onChange={() => setFileFormat("csv")}
                />
                CSV (.csv)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}>
                <input
                  type="radio"
                  name="fileFormat"
                  value="json"
                  checked={fileFormat === "json"}
                  onChange={() => setFileFormat("json")}
                />
                JSON (.json)
              </label>
            </div>
          </div>

          {/* SECTION 5: PASSWORD PROTECTION (SECURITY) */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <LucideIcons.Lock size={18} color={enablePassword ? "#2563eb" : "#64748b"} />
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                    Password Protection (Encrypted File)
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Locks the file so only authorized people with the password can open it
                  </div>
                </div>
              </div>
              <label style={{ position: "relative", display: "inline-block", width: "42px", height: "24px" }}>
                <input
                  type="checkbox"
                  checked={enablePassword}
                  onChange={(e) => setEnablePassword(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: enablePassword ? "#0f172a" : "#cbd5e1",
                    transition: "0.3s",
                    borderRadius: "24px"
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: '""',
                      height: "18px",
                      width: "18px",
                      left: enablePassword ? "20px" : "3px",
                      bottom: "3px",
                      backgroundColor: "white",
                      transition: "0.3s",
                      borderRadius: "50%"
                    }}
                  />
                </span>
              </label>
            </div>

            {enablePassword && (
              <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid #e2e8f0" }}>
                <label
                  htmlFor="exportPasswordInput"
                  style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.4rem" }}
                >
                  Set Protection Password
                </label>
                <div style={{ position: "relative", maxWidth: "360px" }}>
                  <input
                    id="exportPasswordInput"
                    type="password"
                    placeholder="Enter password to protect file..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.85rem",
                      fontSize: "0.85rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      outline: "none",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                    }}
                  />
                </div>
                <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.72rem", color: "#64748b" }}>
                  💡 Excel will require this password before users can edit or modify the worksheet.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div style={{ padding: "1rem 1.75rem", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
            Ready to export selected {selectedColumns.length} column(s)
          </span>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontWeight: 500, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || selectedColumns.length === 0}
              className="btn-primary"
              style={{ padding: "0.5rem 1.5rem", backgroundColor: isExporting ? "#94a3b8" : "#0f172a" }}
            >
              {isExporting ? "Generating Export..." : `Export ${moduleName}s ➔`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}