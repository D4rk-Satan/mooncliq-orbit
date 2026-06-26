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

const mockData = [];

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

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>GI Challan</th>
                <th>Process House</th>
                <th>Vendor</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {mockData.map((row) => (
                <tr key={row.id} onClick={() => handleRowClick(row)}>
                  <td className="font-medium">{row.id}</td>
                  <td>{row.processHouse}</td>
                  <td>{row.vendor}</td>
                  <td><span className="badge">{row.stage}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="table-footer">
            Showing {mockData.length} of {mockData.length} records
          </div>
        </div>
      </main>

      <SlideOverPanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        data={selectedRecord}
      />
    </div>
  );
}
