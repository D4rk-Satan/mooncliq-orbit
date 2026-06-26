"use client";

import React, { useState } from "react";
import SlideOverPanel from "../../components/SlideOverPanel";
import Sidebar from "../../components/Sidebar";

const GaugeChart = ({ percentage }) => {
  const totalTicks = 45;
  return (
    <div className="report-gauge-container">
      <div className="report-gauge-ticks">
        {Array.from({ length: totalTicks }).map((_, i) => {
          const angle = -90 + (i * (180 / (totalTicks - 1)));
          const isActive = (i / totalTicks) <= (percentage / 100);
          return (
            <div 
              key={i} 
              className={`report-gauge-tick ${isActive ? 'active' : 'inactive'}`} 
              style={{ transform: `rotate(${angle}deg)` }} 
            />
          );
        })}
      </div>
      <div className="report-gauge-content">
        <div className="report-gauge-value">{percentage}%</div>
        <div className="report-gauge-label">Successful deals</div>
      </div>
    </div>
  );
};

const BarChart = () => {
  const data = [
    { day: 'Mon', solid: 65, striped: 25 },
    { day: 'Tue', solid: 90, striped: 50 },
    { day: 'Wed', solid: 75, striped: 35 },
    { day: 'Thu', solid: 35, striped: 15 },
    { day: 'Fri', solid: 90, striped: 65 },
  ];
  return (
    <div className="report-chart-container">
      <div className="report-chart-title">New customers</div>
      <div className="report-bar-chart">
        <div className="report-bar-y-axis">
          <span>10</span>
          <span>5</span>
          <span>0</span>
        </div>
        {data.map((d, i) => (
          <div key={i} className="report-bar-group">
            <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '100px' }}>
              <div className="report-bar striped" style={{ height: `${d.striped}%` }} />
              <div className="report-bar solid" style={{ height: `${d.solid}%` }} />
            </div>
            <div className="report-bar-label">{d.day}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardReport = () => {
  return (
    <div className="dashboard-report-section">
      <BarChart />
      <GaugeChart percentage={68} />
      
      <div className="report-kpi-block">
        <div className="report-kpi-value">53</div>
        <div className="report-kpi-label">Tasks<br/>in progress <span className="report-kpi-arrow">→</span></div>
      </div>

      <div className="report-kpi-block">
        <div className="report-kpi-value">$ 15.890</div>
        <div className="report-kpi-label">Prepayments<br/>from customers <span className="report-kpi-arrow">→</span></div>
      </div>
    </div>
  );
};

const ProgressReport = () => {
  const days = [
    { name: 'Mon', value: 56, segments: [20, 20, 16] },
    { name: 'Tue', value: 40, segments: [15, 15, 10] },
    { name: 'Wed', value: 68, segments: [25, 25, 18], active: true },
    { name: 'Thu', value: 44, segments: [20, 15, 9] },
    { name: 'Fri', value: 52, segments: [20, 20, 12] },
  ];

  return (
    <div className="progress-report-card">
      <div className="progress-report-header">
        <div>
          <h2>Your progress</h2>
          <p>See how your focus changes across the week.</p>
        </div>
        <div className="progress-toggle">
          <button className="active">Week</button>
          <button>Month</button>
        </div>
      </div>
      
      <div className="progress-chart">
        {days.map((day) => (
          <div key={day.name} className={`progress-bar-column ${day.active ? 'active' : ''}`}>
            {day.active ? (
              <div className="progress-badge">
                {day.value} 
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </div>
            ) : (
              <div className="progress-value">{day.value}</div>
            )}
            
            <div className="progress-bar-container" style={{ height: `${day.value * 2}px` }}>
               <div className="segment segment-3" style={{ flex: day.segments[2] }}></div>
               <div className="segment segment-2" style={{ flex: day.segments[1] }}></div>
               <div className="segment segment-1" style={{ flex: day.segments[0] }}></div>
            </div>
            
            <div className={`progress-day ${day.active ? 'active' : ''}`}>{day.name}</div>
          </div>
        ))}
      </div>

      <div className="progress-report-footer">
        <div className="legend">
          <span className="legend-dot"></span> Minutes of focused study
        </div>
        <div className="average">
          Average per day: 48 min
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>MoonCliq CRM</h1>
          <div className="header-actions">
            <span>F.Y 2026-27</span>
          </div>
        </header>

        <DashboardReport />

        <ProgressReport />
      </main>

      <SlideOverPanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        data={selectedRecord}
      />
    </div>
  );
}
