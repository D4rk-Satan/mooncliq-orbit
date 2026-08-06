"use client";

import React from 'react';

export default function TableSkeleton() {
  return (
    <div className="w-full bg-white rounded-lg p-6 shadow-sm animate-pulse" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
        <style>
        {`
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: .5; }
            }
        `}
        </style>
      
      {/* Header Skeleton */}
      <div className="mb-6 flex justify-between items-center" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ height: '32px', width: '250px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ height: '36px', width: '120px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}></div>
          <div style={{ height: '36px', width: '100px', backgroundColor: '#cbd5e1', borderRadius: '6px' }}></div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: '16px', backgroundColor: '#cbd5e1', borderRadius: '4px' }}></div>
          ))}
        </div>
        
        {/* Table Rows */}
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', padding: '16px', borderBottom: row !== 5 ? '1px solid #f1f5f9' : 'none' }}>
            {[1, 2, 3, 4, 5].map(col => (
              <div key={col} style={{ height: '20px', width: col === 1 ? '80%' : (col === 4 ? '60%' : '90%'), backgroundColor: '#f1f5f9', borderRadius: '4px' }}></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
