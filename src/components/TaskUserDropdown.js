import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function TaskUserDropdown({ field, value, onChange, users, readOnly }) {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState(null);
  const buttonRef = React.useRef(null);

  const options = users.map(u => ({ label: u.email, value: u.email }));
  
  const selectedOption = options.find(o => o.value === value);
  const displayValue = selectedOption ? selectedOption.label : `Select ${field.label}`;

  const toggleDropdown = () => {
    if (readOnly) return;
    if (!isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isOpen && !e.target.closest(".user-dropdown-container") && !e.target.closest(".user-dropdown-menu")) {
        setIsOpen(false);
      }
    };
    
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      window.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.addEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  const menuStyle = buttonRect ? {
    position: "fixed",
    top: `${buttonRect.bottom + 4}px`,
    left: `${buttonRect.left}px`,
    width: `${buttonRect.width}px`,
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "0.375rem",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    zIndex: 99999,
    maxHeight: "200px",
    overflowY: "auto"
  } : {};

  return (
    <div className="form-group user-dropdown-container">
      <label className="form-label">
        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
      </label>
      
      <button
        type="button"
        ref={buttonRef}
        onClick={toggleDropdown}
        className="form-input"
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          backgroundColor: readOnly ? "#f8fafc" : "white",
          opacity: readOnly ? 0.7 : 1,
          cursor: readOnly ? "not-allowed" : "pointer"
        }}
        disabled={readOnly}
      >
        <span>{displayValue}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && createPortal(
        <div className="user-dropdown-menu" style={menuStyle}>
          {options.length === 0 ? (
            <div style={{ padding: "0.5rem 0.75rem", color: "#64748b", fontSize: "0.875rem" }}>
              No users available
            </div>
          ) : (
            options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                style={{
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  backgroundColor: value === opt.value ? "#f1f5f9" : "transparent",
                  color: value === opt.value ? "var(--primary)" : "#1e293b",
                  fontSize: "0.875rem",
                  fontWeight: value === opt.value ? "500" : "400"
                }}
                onMouseOver={(e) => {
                  if (value !== opt.value) e.currentTarget.style.backgroundColor = "#f8fafc";
                }}
                onMouseOut={(e) => {
                  if (value !== opt.value) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
