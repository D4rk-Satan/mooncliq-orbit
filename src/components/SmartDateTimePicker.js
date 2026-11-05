"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * SmartDateTimePicker with React Portal
 * - Floats completely above forms and modals (Never gets cut off)
 * - Exact minute control with strict boundary locks
 * - Due Date strictly locked to Start Date + 10 mins minimum (Impossible to select less)
 * - Past hours/minutes completely eliminated for Today
 */
export default function SmartDateTimePicker({
  label,
  value,
  onChange,
  isRequired = false,
  minDateTime = null, // e.g. Start Date + 10 mins for Due Date
  isDueDate = false,
  error = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parseVal = (valStr) => {
    if (!valStr) return null;
    const d = new Date(valStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  // If this is Due Date and no value is provided, default to minDateTime (or now + 15m)
  const computeInitial = () => {
    if (value) {
      const p = parseVal(value);
      if (p) return p;
    }
    if (minDateTime) {
      const m = parseVal(minDateTime);
      if (m) return m;
    }
    if (isDueDate) {
      return new Date(now.getTime() + 15 * 60000);
    }
    return now;
  };

  const initialDate = computeInitial();

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedHour, setSelectedHour] = useState(initialDate.getHours());
  const [selectedMin, setSelectedMin] = useState(initialDate.getMinutes());

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 490;
      let left = rect.left;
      
      if (isDueDate || (left + popoverWidth > window.innerWidth)) {
        left = Math.max(10, rect.right - popoverWidth);
      }

      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: left + window.scrollX,
        width: rect.width
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  // Keep internal state aligned with prop changes (e.g. when start time changes and minDateTime updates)
  useEffect(() => {
    if (value) {
      const d = parseVal(value);
      if (d) {
        setSelectedDate(d);
        setSelectedHour(d.getHours());
        setSelectedMin(d.getMinutes());
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    } else if (minDateTime && isDueDate) {
      const m = parseVal(minDateTime);
      if (m) {
        setSelectedDate(m);
        setSelectedHour(m.getHours());
        setSelectedMin(m.getMinutes());
        setViewYear(m.getFullYear());
        setViewMonth(m.getMonth());
      }
    }
  }, [value, minDateTime, isDueDate]);

  const emitChange = (dateObj, h, m) => {
    const d = new Date(dateObj);
    d.setHours(h, m, 0, 0);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(h).padStart(2, '0');
    const mins = String(m).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}T${hh}:${mins}`);
  };

  const isTodaySelected = 
    selectedDate.getFullYear() === currentYear &&
    selectedDate.getMonth() === currentMonth &&
    selectedDate.getDate() === currentDay;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const format12Hr = (h, m) => {
    const displayH = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const isDayDisabled = (day) => {
    const target = new Date(viewYear, viewMonth, day, 23, 59, 59);
    if (minDateTime) {
      const minD = new Date(minDateTime);
      const minFloor = new Date(minD.getFullYear(), minD.getMonth(), minD.getDate());
      return target < minFloor;
    }
    const todayFloor = new Date(currentYear, currentMonth, currentDay);
    return target < todayFloor;
  };

  // Determine effective minimum bound
  const minBoundaryDate = minDateTime ? new Date(minDateTime) : null;
  const isSameDayAsMin = minBoundaryDate && 
    selectedDate.getFullYear() === minBoundaryDate.getFullYear() &&
    selectedDate.getMonth() === minBoundaryDate.getMonth() &&
    selectedDate.getDate() === minBoundaryDate.getDate();

  // Starting Hour calculation
  let startingHour = 0;
  if (isTodaySelected) {
    startingHour = currentHour;
  }
  if (isSameDayAsMin) {
    startingHour = Math.max(startingHour, minBoundaryDate.getHours());
  }

  const hoursList = [];
  for (let h = startingHour; h < 24; h++) {
    hoursList.push(h);
  }

  // Minimum allowed minute for selected hour
  let minAllowedMinute = 0;
  if (isTodaySelected && selectedHour === currentHour) {
    minAllowedMinute = currentMin;
  }
  if (isSameDayAsMin && selectedHour === minBoundaryDate.getHours()) {
    minAllowedMinute = Math.max(minAllowedMinute, minBoundaryDate.getMinutes());
  }

  // Quick Presets Handler
  const applyPreset = (type) => {
    const base = (isDueDate && minDateTime) ? new Date(minDateTime) : new Date();
    let target = new Date(base);
    if (type === 'now') target = new Date();
    if (type === '+15m') target = new Date(base.getTime() + 15 * 60000);
    if (type === '+30m') target = new Date(base.getTime() + 30 * 60000);
    if (type === '+1h') target = new Date(base.getTime() + 60 * 60000);
    if (type === '+2h') target = new Date(base.getTime() + 120 * 60000);

    setSelectedDate(target);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setSelectedHour(target.getHours());
    setSelectedMin(target.getMinutes());
    emitChange(target, target.getHours(), target.getMinutes());
  };

  return (
    <div className="form-group" style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
          <span>{label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}</span>
        </label>
      )}

      {/* Input Pill */}
      <div
        ref={buttonRef}
        onClick={handleToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f8fafc', border: error ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
          borderRadius: '12px', padding: '9px 13px', cursor: 'pointer', transition: 'all 0.15s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isDueDate ? '#fdf2f8' : '#eff6ff', color: isDueDate ? '#db2777' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: value ? '#0f172a' : '#94a3b8' }}>
              {value ? format12Hr(selectedHour, selectedMin) : (isDueDate ? 'Select Due Time' : 'Select Start Time')}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
              {value ? selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pick Date'}
            </span>
          </div>
        </div>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>

      {/* REACT PORTAL: Floats cleanly over entire screen / modal */}
      {mounted && isOpen && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: '490px',
            maxWidth: '96vw',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 1px 1px rgba(0,0,0,0.05)',
            padding: '1.15rem',
            zIndex: 999999,
            display: 'grid',
            gridTemplateColumns: '240px 1fr',
            gap: '1.25rem'
          }}
        >
          {/* LEFT: CALENDAR */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                {new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setViewMonth(prev => prev === 0 ? (setViewYear(y => y - 1), 11) : prev - 1)}
                  style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
                >&lt;</button>
                <button
                  type="button"
                  onClick={() => setViewMonth(prev => prev === 11 ? (setViewYear(y => y + 1), 0) : prev + 1)}
                  style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
                >&gt;</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const disabled = isDayDisabled(day);
                const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      const newD = new Date(viewYear, viewMonth, day);
                      setSelectedDate(newD);
                      let adjustedH = selectedHour;
                      let adjustedM = selectedMin;
                      if (minBoundaryDate && newD.toDateString() === minBoundaryDate.toDateString()) {
                        if (adjustedH < minBoundaryDate.getHours()) {
                          adjustedH = minBoundaryDate.getHours();
                          adjustedM = minBoundaryDate.getMinutes();
                        } else if (adjustedH === minBoundaryDate.getHours() && adjustedM < minBoundaryDate.getMinutes()) {
                          adjustedM = minBoundaryDate.getMinutes();
                        }
                      }
                      setSelectedHour(adjustedH);
                      setSelectedMin(adjustedM);
                      emitChange(newD, adjustedH, adjustedM);
                    }}
                    style={{
                      height: '28px', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.25 : 1,
                      textDecoration: disabled ? 'line-through' : 'none',
                      background: isSelected ? '#2563eb' : 'transparent',
                      color: isSelected ? '#ffffff' : '#334155'
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: EXACT TIME SELECTOR */}
          <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
              {isDueDate ? 'Set Due Time (Min +10m)' : 'Select Exact Time'}
            </div>

            {/* Exact Hour & Minute Steppers */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              {/* Hour Select */}
              <select
                value={selectedHour}
                onChange={(e) => {
                  const h = Number(e.target.value);
                  setSelectedHour(h);
                  let m = selectedMin;
                  if (isSameDayAsMin && h === minBoundaryDate.getHours() && m < minBoundaryDate.getMinutes()) {
                    m = minBoundaryDate.getMinutes();
                    setSelectedMin(m);
                  }
                  emitChange(selectedDate, h, m);
                }}
                style={{
                  flex: 1, padding: '7px 8px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
                  fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', background: '#f8fafc', outline: 'none'
                }}
              >
                {hoursList.map(h => (
                  <option key={h} value={h}>
                    {format12Hr(h, 0).split(' ')[0]} {h >= 12 ? 'PM' : 'AM'}
                  </option>
                ))}
              </select>

              <span style={{ fontWeight: 800, color: '#64748b' }}>:</span>

              {/* Exact Minute Input (Type or Step) */}
              <input
                type="number"
                min={minAllowedMinute}
                max={59}
                value={selectedMin}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setSelectedMin('');
                    return;
                  }
                  let m = parseInt(raw, 10);
                  if (isNaN(m)) return;
                  if (m > 59) m = 59;
                  setSelectedMin(m);
                  if (m >= minAllowedMinute) {
                    emitChange(selectedDate, selectedHour, m);
                  }
                }}
                onBlur={() => {
                  let m = parseInt(selectedMin, 10);
                  if (isNaN(m) || m < minAllowedMinute) {
                    m = minAllowedMinute;
                  } else if (m > 59) {
                    m = 59;
                  }
                  setSelectedMin(m);
                  emitChange(selectedDate, selectedHour, m);
                }}
                style={{
                  width: '60px', padding: '7px 8px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
                  fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', background: '#f8fafc', textAlign: 'center', outline: 'none'
                }}
              />
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
              {!isDueDate && (
                <button
                  type="button"
                  onClick={() => applyPreset('now')}
                  style={{ padding: '6px 0', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                >Now</button>
              )}

              <button
                type="button"
                onClick={() => applyPreset('+15m')}
                style={{ padding: '6px 0', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
              >+15m</button>

              <button
                type="button"
                onClick={() => applyPreset('+30m')}
                style={{ padding: '6px 0', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
              >+30m</button>

              <button
                type="button"
                onClick={() => applyPreset('+1h')}
                style={{ padding: '6px 0', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
              >+1 Hour</button>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  emitChange(selectedDate, selectedHour, selectedMin);
                  setIsOpen(false);
                }}
                style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >Done</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {error && (
        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', fontWeight: 500 }}>
          {error}
        </div>
      )}
    </div>
  );
}
