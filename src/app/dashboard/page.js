"use client";

import React, { useState } from "react";
import SlideOverPanel from "../../components/SlideOverPanel";
import Sidebar from "../../components/Sidebar";

const mockData = [
  { id: "26-27/232", date: "07/06/2026", processHouse: "Sunita Processors Pvt. Ltd.", vendor: "VISHNU LAXMI TEXTILE", billNo: "411", challanNo: "411", stage: "Dyeing Warehouse", batch: "48", mts: "6412.00" },
  { id: "26-27/231", date: "08/06/2026", processHouse: "RADHIKA SYNTEX PRIVATE LIMITED", vendor: "GOVIND INDUSTRIES", billNo: "412", challanNo: "412", stage: "Printing", batch: "49", mts: "3200.00" },
  { id: "26-27/230", date: "09/06/2026", processHouse: "Sunita Processors Pvt. Ltd.", vendor: "SHREE JEEN FABRICS", billNo: "413", challanNo: "413", stage: "Finishing", batch: "50", mts: "1200.50" },
  { id: "26-27/229", date: "10/06/2026", processHouse: "Sunita Processors Pvt. Ltd.", vendor: "SHREE JEEN FABRICS", billNo: "414", challanNo: "414", stage: "Packaging", batch: "51", mts: "840.00" },
  { id: "26-27/228", date: "11/06/2026", processHouse: "Sunita Processors Pvt. Ltd.", vendor: "SHREE JEEN FABRICS", billNo: "415", challanNo: "415", stage: "Dyeing Warehouse", batch: "52", mts: "4100.00" },
];

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
