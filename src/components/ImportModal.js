"use client";

import React, { useState, useMemo } from "react";
import Papa from "papaparse";
import * as LucideIcons from "lucide-react";

export default function ImportModal({
  isOpen,
  onClose,
  moduleName = "Lead",
  blueprint,
  onImportSuccess
}) {
  const [currentStep, setCurrentStep] = useState(0); // 0: Upload, 1: Map, 2: Preview & Validate
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({}); // { csvHeader: crmFieldName }
  const [isImporting, setIsImporting] = useState(false);
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);

  // Available CRM fields from Blueprint
  const crmFields = useMemo(() => {
    if (!blueprint?.fields) {
      // Fallback standard fields for Lead
      return [
        { name: "firstName", label: "First Name", type: "text", isRequired: true },
        { name: "lastName", label: "Last Name", type: "text", isRequired: false },
        { name: "email", label: "Email", type: "email", isRequired: false },
        { name: "phone", label: "Phone", type: "phone", isRequired: false },
        { name: "owner", label: "Owner", type: "user", isRequired: false }
      ];
    }
    return blueprint.fields.filter(f => !f.isHidden);
  }, [blueprint]);

  // 1. Handle File Upload & Parse
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields && results.meta.fields.length > 0) {
          setCsvHeaders(results.meta.fields);
          setCsvRows(results.data);

          // Auto-guess mapping based on similar names and common synonyms
          const initialMap = {};
          const synonyms = {
            fullName: ["name", "fullname", "contactname", "leadname", "person", "clientname"],
            firstName: ["firstname", "first", "fname"],
            lastName: ["lastname", "last", "lname", "surname"],
            email: ["email", "emailaddress", "mail", "contactemail"],
            phone: ["phone", "phonenumber", "mobile", "mobilenumber", "contact", "contactno", "cell", "telephone"],
            alternatePhone: ["alternatephone", "altphone", "secondaryphone"],
            companyName: ["company", "companyname", "organization", "org", "business"],
            leadSource: ["leadsource", "source"],
            owner: ["owner", "assignedto", "leadowner", "rep", "agent"],
            address: ["address", "location", "fulladdress"],
            notes: ["notes", "description", "remark", "remarks", "comment"]
          };

          results.meta.fields.forEach(header => {
            const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");

            // 1. Direct match with CRM field name or label
            let matchedField = crmFields.find(f => {
              const cleanField = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
              const cleanLabel = (f.label || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              return cleanField === cleanHeader || cleanLabel === cleanHeader;
            });

            // 2. Synonym match if direct match didn't find anything
            if (!matchedField) {
              for (const [fieldName, aliasList] of Object.entries(synonyms)) {
                if (aliasList.includes(cleanHeader)) {
                  matchedField = crmFields.find(f => f.name.toLowerCase() === fieldName.toLowerCase());
                  if (matchedField) break;
                }
              }
            }

            if (matchedField) {
              initialMap[header] = matchedField.name;
            } else {
              initialMap[header] = "ignore";
            }
          });
          setColumnMapping(initialMap);
          setCurrentStep(1); // Go to Map Step
        }
      }
    });
  };

  // 2. Row Validation Audit (Checks data type, required fields, etc.)
  const validatedRows = useMemo(() => {
    if (csvRows.length === 0) return [];

    return csvRows.map((row, rowIdx) => {
      const fieldErrors = {};
      let hasError = false;

      // Check each mapped field
      Object.entries(columnMapping).forEach(([csvHeader, crmFieldName]) => {
        if (!crmFieldName || crmFieldName === "ignore") return;

        const val = row[csvHeader] ? String(row[csvHeader]).trim() : "";
        const fieldDef = crmFields.find(f => f.name === crmFieldName);
        if (!fieldDef) return;

        // Check A: Required Field Check
        if (fieldDef.isRequired && !val) {
          fieldErrors[crmFieldName] = `${fieldDef.label || fieldDef.name} is required`;
          hasError = true;
          return;
        }

        if (val) {
          const type = (fieldDef.type || "").toLowerCase();

          // Check B: Email Validation
          if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            fieldErrors[crmFieldName] = "Invalid email format";
            hasError = true;
          }

          // Check C: Number / Currency / Decimal Validation
          if ((type === "number" || type === "currency" || type === "decimal") && isNaN(Number(val.replace(/[^0-9.-]+/g, "")))) {
            fieldErrors[crmFieldName] = "Expected a valid number";
            hasError = true;
          }

          // Check D: Phone Validation (Strict 10-digit check)
          if (type === "phone") {
            const cleanDigits = val.replace(/\D/g, "");
            if (cleanDigits.length < 10) {
              fieldErrors[crmFieldName] = "Phone must be at least 10 digits";
              hasError = true;
            }
          }
        }
      });

      return {
        rowIdx,
        originalRow: row,
        fieldErrors,
        isValid: !hasError
      };
    });
  }, [csvRows, columnMapping, crmFields]);

  const totalErrors = validatedRows.filter(r => !r.isValid).length;
  const totalValid = validatedRows.length - totalErrors;

  // 3. Submit Import to Backend
  const handleFinalImport = async () => {
    setIsImporting(true);
    try {
      const rowsToImport = validatedRows
        .filter(r => (skipInvalidRows ? r.isValid : true))
        .map(r => {
          const transformed = {};
          Object.entries(columnMapping).forEach(([csvHeader, crmFieldName]) => {
            if (crmFieldName && crmFieldName !== "ignore") {
              transformed[crmFieldName] = r.originalRow[csvHeader];
            }
          });
          return transformed;
        });

      if (rowsToImport.length === 0) {
        alert("No valid rows to import!");
        setIsImporting(false);
        return;
      }

      const { fetchAuthSession } = await import("aws-amplify/auth");
      const { tokens } = await fetchAuthSession();
      const token = tokens.idToken.toString();

      const res = await fetch(`/api/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ moduleName, rows: rowsToImport })
      });

      const data = await res.json();
      if (data.success) {
        alert(`Successfully imported ${data.importedCount} ${moduleName}s!`);
        onImportSuccess && onImportSuccess();
        onClose();
      } else {
        alert(data.error || "Import failed.");
      }
    } catch (err) {
      console.error("Import error:", err);
      alert("Failed to import. Check server logs.");
    } finally {
      setIsImporting(false);
    }
  };

  const steps = [
    { title: "Upload File", desc: "Select CSV" },
    { title: "Map Columns", desc: "Match Fields" },
    { title: "Preview & Validate", desc: "Audit Errors" }
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="slide-backdrop open" style={{ zIndex: 9999 }}></div>
      <div
        className="modal-card open"
        style={{
          width: "820px",
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
              IMPORT DATA WIZARD
            </span>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
              Import {moduleName}s
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "1.25rem" }}
          >
            ✕
          </button>
        </div>

        {/* Stepper Header (Mooncliq Native Style) */}
        <div style={{ padding: "1rem 1.75rem", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {steps.map((st, idx) => (
              <React.Fragment key={idx}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      backgroundColor: idx < currentStep ? "#D4F870" : idx === currentStep ? "#111827" : "#ffffff",
                      color: idx < currentStep ? "#111827" : idx === currentStep ? "#ffffff" : "#94a3b8",
                      border: idx > currentStep ? "1.5px solid #cbd5e1" : "none"
                    }}
                  >
                    {idx < currentStep ? "✓" : idx + 1}
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: idx === currentStep ? 600 : 500, color: idx <= currentStep ? "#0f172a" : "#94a3b8" }}>
                    {st.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div style={{ flex: 1, height: "2px", backgroundColor: idx < currentStep ? "#D4F870" : "#e2e8f0", margin: "0 1rem", minWidth: "40px" }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem" }}>
          {/* STEP 0: FILE UPLOAD */}
          {currentStep === 0 && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "12px",
                  padding: "3rem 2rem",
                  backgroundColor: "#f8fafc",
                  cursor: "pointer",
                  transition: "border-color 0.2s"
                }}
                onClick={() => document.getElementById("csv-file-input").click()}
              >
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto", color: "#475569" }}>
                  <LucideIcons.Upload size={24} />
                </div>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>
                  Click to upload CSV File
                </h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  Standard CSV formatted files are supported
                </p>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </div>

              <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "center", gap: "1rem" }}>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => {
                    const sample = "fullName,email,phone,companyName\nJohn Doe,john@example.com,9876543210,Acme Corp";
                    const blob = new Blob([sample], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `sample_${moduleName.toLowerCase()}s.csv`;
                    a.click();
                  }}
                >
                  📥 Download Sample CSV Template
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: FIELD MAPPING TABLE (Zoho Style) */}
          {currentStep === 1 && (
            <div>
              <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>Map CSV Columns to CRM Fields</h4>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>We auto-matched similar columns. Adjust dropdowns as needed.</p>
                </div>
                <span style={{ fontSize: "0.8rem", backgroundColor: "#e2e8f0", padding: "0.25rem 0.5rem", borderRadius: "6px", fontWeight: 500 }}>
                  {csvRows.length} Rows detected
                </span>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <tr>
                      <th style={{ padding: "0.75rem 1rem", color: "#475569", fontWeight: 600 }}>CSV Column Header</th>
                      <th style={{ padding: "0.75rem 1rem", color: "#475569", fontWeight: 600 }}>Row 1 Sample Data</th>
                      <th style={{ padding: "0.75rem 1rem", color: "#475569", fontWeight: 600 }}>Maps to CRM Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvHeaders.map((header) => {
                      const sampleVal = csvRows[0]?.[header] || "-";
                      const currentMappedField = columnMapping[header];

                      return (
                        <tr key={header} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#1e293b" }}>
                            {header}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "#64748b", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sampleVal}
                          </td>
                          <td style={{ padding: "0.5rem 1rem" }}>
                            <select
                              value={currentMappedField || "ignore"}
                              onChange={(e) => setColumnMapping({ ...columnMapping, [header]: e.target.value })}
                              style={{
                                width: "100%",
                                padding: "0.4rem 0.6rem",
                                borderRadius: "6px",
                                border: currentMappedField && currentMappedField !== "ignore" ? "1px solid #3b82f6" : "1px solid #cbd5e1",
                                backgroundColor: currentMappedField && currentMappedField !== "ignore" ? "#eff6ff" : "#ffffff",
                                color: currentMappedField && currentMappedField !== "ignore" ? "#1e40af" : "#64748b",
                                fontSize: "0.85rem",
                                fontWeight: 500
                              }}
                            >
                              <option value="ignore">❌ Do Not Import (Skip)</option>
                              <optgroup label="CRM Fields">
                                {crmFields.map(f => (
                                  <option key={f.name} value={f.name}>
                                    {f.label || f.name} {f.isRequired ? "*" : ""} ({f.type || "text"})
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & REAL-TIME VALIDATION AUDIT (Red Highlighting) */}
          {currentStep === 2 && (
            <div>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem" }}>
                <div style={{ flex: 1, padding: "0.75rem 1rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>TOTAL ROWS</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>{validatedRows.length}</div>
                </div>
                <div style={{ flex: 1, padding: "0.75rem 1rem", backgroundColor: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600 }}>READY TO IMPORT</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#16a34a" }}>{totalValid}</div>
                </div>
                <div style={{ flex: 1, padding: "0.75rem 1rem", backgroundColor: totalErrors > 0 ? "#fef2f2" : "#f8fafc", borderRadius: "8px", border: totalErrors > 0 ? "1px solid #fecaca" : "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.75rem", color: totalErrors > 0 ? "#991b1b" : "#64748b", fontWeight: 600 }}>ROWS WITH ERRORS</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: totalErrors > 0 ? "#dc2626" : "#64748b" }}>{totalErrors}</div>
                </div>
              </div>

              {totalErrors > 0 && (
                <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", color: "#92400e" }}>
                    ⚠️ Some rows contain invalid types (e.g. invalid phone, text in currency). Red boxes show specific issues.
                  </span>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#78350f", fontWeight: 600, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={skipInvalidRows}
                      onChange={e => setSkipInvalidRows(e.target.checked)}
                    />
                    Skip invalid rows & import valid ones
                  </label>
                </div>
              )}

              {/* Data Preview Table */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflowX: "auto", maxHeight: "320px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                  <thead style={{ backgroundColor: "#f8fafc", position: "sticky", top: 0, zIndex: 1, borderBottom: "1px solid #e2e8f0" }}>
                    <tr>
                      <th style={{ padding: "0.5rem 0.75rem", color: "#64748b", width: "40px" }}>#</th>
                      <th style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>Status</th>
                      {Object.entries(columnMapping)
                        .filter(([_, crmField]) => crmField && crmField !== "ignore")
                        .map(([csvCol, crmField]) => {
                          const fDef = crmFields.find(f => f.name === crmField);
                          return (
                            <th key={crmField} style={{ padding: "0.5rem 0.75rem", color: "#1e293b", textAlign: "left" }}>
                              {fDef?.label || crmField}
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody>
                    {validatedRows.slice(0, 15).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: !row.isValid ? "#fff5f5" : "transparent" }}>
                        <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8" }}>{idx + 1}</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          {row.isValid ? (
                            <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ Valid</span>
                          ) : (
                            <span style={{ color: "#dc2626", fontWeight: 600, backgroundColor: "#fee2e2", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                              ✕ Invalid
                            </span>
                          )}
                        </td>
                        {Object.entries(columnMapping)
                          .filter(([_, crmField]) => crmField && crmField !== "ignore")
                          .map(([csvCol, crmField]) => {
                            const error = row.fieldErrors[crmField];
                            const cellValue = row.originalRow[csvCol] || "";

                            return (
                              <td
                                key={crmField}
                                style={{
                                  padding: "0.5rem 0.75rem",
                                  backgroundColor: error ? "#fee2e2" : "transparent",
                                  color: error ? "#b91c1c" : "#334155",
                                  border: error ? "1.5px solid #ef4444" : "1px solid transparent",
                                  borderRadius: error ? "4px" : "0"
                                }}
                                title={error || ""}
                              >
                                {cellValue || <span style={{ color: "#cbd5e1" }}>[Empty]</span>}
                                {error && (
                                  <div style={{ fontSize: "0.7rem", color: "#dc2626", fontWeight: 500, marginTop: "2px" }}>
                                    ⚠️ {error}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: "1rem 1.75rem", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontWeight: 500, cursor: "pointer" }}
            >
              Back
            </button>
          ) : <div></div>}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontWeight: 500, cursor: "pointer" }}
            >
              Cancel
            </button>

            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn-primary"
                style={{ padding: "0.5rem 1.25rem" }}
              >
                Next: Validate Data ➔
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleFinalImport}
                disabled={isImporting || (totalValid === 0 && skipInvalidRows)}
                className="btn-primary"
                style={{ padding: "0.5rem 1.5rem", backgroundColor: isImporting ? "#94a3b8" : "#0f172a" }}
              >
                {isImporting ? "Importing Data..." : `Start Import (${skipInvalidRows ? totalValid : validatedRows.length} Rows)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
