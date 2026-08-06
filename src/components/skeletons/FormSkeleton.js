"use client";

import React from 'react';

export default function FormSkeleton() {
  return (
    <div className="w-full bg-white rounded-lg p-6 animate-pulse" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
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
        <div style={{ height: '28px', width: '200px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></div>
        <div style={{ height: '36px', width: '100px', backgroundColor: '#e2e8f0', borderRadius: '6px' }}></div>
      </div>

      {/* Sections Skeleton */}
      {[1, 2].map((sectionIndex) => (
        <div key={sectionIndex} className="mb-8 p-6" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
          {/* Section Title */}
          <div style={{ height: '24px', width: '150px', backgroundColor: '#cbd5e1', borderRadius: '4px', marginBottom: '24px' }}></div>
          
          {/* Form Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {[1, 2, 3, 4].map((fieldIndex) => (
              <div key={fieldIndex} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ height: '16px', width: '120px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></div>
                <div style={{ height: '42px', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0' }}></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
