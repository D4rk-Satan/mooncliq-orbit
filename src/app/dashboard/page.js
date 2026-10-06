"use client";

import React, { useState } from "react";
import SlideOverPanel from "../../components/SlideOverPanel";
import Sidebar from "../../components/Sidebar";
import { fetchAuthSession } from 'aws-amplify/auth';
import { useEffect } from 'react';
import GlobalLoader from "../../components/ui/GlobalLoader";


// ---- 1. Top KPI Cards ----
const KPICard = ({ title, value, percentage, isUp, sparklineColor }) => (
  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>{title}</span>
      <span style={{ fontSize: '0.8rem', color: isUp ? '#10b981' : '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: isUp ? '#d1fae5' : '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
        {isUp ? '↑' : '↓'} {percentage}
      </span>
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
    <div style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
      See more details <span style={{ fontSize: '1rem' }}>›</span>
    </div>

    {/* SVG Sparkline Background */}
    <div style={{ position: 'absolute', bottom: '-10px', left: 0, right: 0, height: '60px', opacity: 0.15, zIndex: 0 }}>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <path d="M0,30 Q25,10 50,20 T100,5" fill="none" stroke={sparklineColor} strokeWidth="2" />
        <path d="M0,30 Q25,10 50,20 T100,5 L100,30 L0,30 Z" fill={sparklineColor} stroke="none" />
      </svg>
    </div>
  </div>
);

// ---- 2. Main Opportunity Area Chart (Pure SVG) ----
const OpportunitySummary = ({ data }) => {
  const tsData = data || [];
  const hasData = tsData.length > 0;

  // Find max value to scale the Y-Axis (Minimum 10 to avoid flatlines on empty data)
  const maxVal = hasData ? Math.max(...tsData.map(d => Math.max(d.won, d.lost)), 10) : 10;

  // Helper to generate a curved SVG path dynamically
  const getPath = (key) => {
    if (!hasData) return "M0,100 L100,100";
    let path = "";
    tsData.forEach((d, i) => {
      const x = (i / (tsData.length - 1)) * 100;
      const y = 100 - (d[key] / maxVal) * 90; // Using 90% of max height for breathing room

      if (i === 0) {
        path += `M${x},${y} `;
      } else {
        const prevX = ((i - 1) / (tsData.length - 1)) * 100;
        const prevY = 100 - (tsData[i - 1][key] / maxVal) * 90;
        const cp1x = prevX + (x - prevX) * 0.5;
        path += `C${cp1x},${prevY} ${cp1x},${y} ${x},${y} `;
      }
    });
    return path;
  };

  const wonPath = getPath('won');
  const lostPath = getPath('lost');

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 600 }}>Opportunity Summary</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Last 7 Days</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6' }}></div> Closed Won
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#c084fc' }}></div> Closed Lost
          </div>
        </div>
      </div>

      <div style={{ height: '280px', position: 'relative' }}>
        {/* Y Axis Labels dynamically generated */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0, color: '#94a3b8', fontSize: '0.8rem', zIndex: 1 }}>
          <span>{Math.ceil(maxVal)}</span>
          <span>{Math.ceil(maxVal * 0.75)}</span>
          <span>{Math.ceil(maxVal * 0.5)}</span>
          <span>{Math.ceil(maxVal * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Grid Lines */}
        <div style={{ position: 'absolute', left: '25px', right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ borderBottom: '1px dashed #e2e8f0', height: '1px', width: '100%' }}></div>
          <div style={{ borderBottom: '1px dashed #e2e8f0', height: '1px', width: '100%' }}></div>
          <div style={{ borderBottom: '1px dashed #e2e8f0', height: '1px', width: '100%' }}></div>
          <div style={{ borderBottom: '1px dashed #e2e8f0', height: '1px', width: '100%' }}></div>
          <div style={{ borderBottom: '1px solid #e2e8f0', height: '1px', width: '100%' }}></div>
        </div>

        {/* Dynamic SVG Spline Chart */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: 'calc(100% - 25px)', height: '100%', marginLeft: '25px', position: 'relative', zIndex: 2, overflow: 'visible' }}>
          {/* Closed Lost Area (Lighter Purple) */}
          <path d={`${lostPath} L100,100 L0,100 Z`} fill="#c084fc" fillOpacity="0.1" stroke="none" />
          <path d={lostPath} fill="none" stroke="#c084fc" strokeWidth="1.5" />

          {/* Closed Won Area (Dark Purple) */}
          <path d={`${wonPath} L100,100 L0,100 Z`} fill="#8b5cf6" fillOpacity="0.15" stroke="none" />
          <path d={wonPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />

          {/* Dynamic Hover Dots on last points */}
          {hasData && (
            <>
              <circle cx="100" cy={100 - (tsData[tsData.length - 1].won / maxVal) * 90} r="2.5" fill="#8b5cf6" stroke="#fff" strokeWidth="1" />
              <circle cx="100" cy={100 - (tsData[tsData.length - 1].lost / maxVal) * 90} r="2.5" fill="#c084fc" stroke="#fff" strokeWidth="1" />
            </>
          )}
        </svg>
      </div>

      {/* Dynamic X Axis Dates */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '25px', marginTop: '10px', color: '#94a3b8', fontSize: '0.8rem' }}>
        {hasData ? tsData.map((d, i) => (
          <span key={i}>{d.day}</span>
        )) : (
          <span>No Data Available</span>
        )}
      </div>
    </div>
  );
};

// ---- 3. Donut Chart (Lead by Status) ----
const LeadByStatus = ({ data }) => {
  const total = data?.total || 0;
  const stages = data?.data || [];

  let gradientStr = 'conic-gradient(from 270deg, ';
  let currentAngle = 0;

  if (stages.length === 0) {
    gradientStr += '#e2e8f0 0deg, #e2e8f0 180deg, transparent 180deg)';
  } else {
    stages.forEach((s, idx) => {
      const slice = (s.count / total) * 180;
      gradientStr += `${s.color} ${currentAngle}deg, ${s.color} ${currentAngle + slice}deg${idx < stages.length - 1 ? ', ' : ', '}`;
      currentAngle += slice;
    });
    gradientStr += `transparent 180deg)`;
  }

  let topStage = stages.length > 0 ? [...stages].sort((a, b) => b.count - a.count)[0] : null;
  let topPercentage = topStage && total > 0 ? Math.round((topStage.count / total) * 100) : 0;

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>Lead by Status</h3>
        <span style={{ cursor: 'pointer', color: '#94a3b8' }}>•••</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>{total}</h2>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, position: 'relative' }}>
        <div style={{
          width: '200px', height: '100px',
          background: gradientStr,
          borderRadius: '200px 200px 0 0',
          position: 'relative'
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: '20px', width: '160px', height: '80px', backgroundColor: '#fff', borderRadius: '160px 160px 0 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '10px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{topPercentage}%</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{topStage ? topStage.name : 'No Data'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        {stages.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color }}></div> {s.name}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- 4. Bar Chart (Sales Summary) ----
const SalesSummary = ({ data }) => {
  const tsData = data || [];
  const hasData = tsData.length > 0;

  // Find max sales to scale bars correctly
  const maxSales = hasData ? Math.max(...tsData.map(d => d.sales), 100) : 100;

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>Sales Summary</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Last 7 days</p>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Y Axis Dynamically scaled */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', paddingRight: '15px' }}>
          <span>${Math.ceil(maxSales)}</span>
          <span>${Math.ceil(maxSales * 0.75)}</span>
          <span>${Math.ceil(maxSales * 0.5)}</span>
          <span>${Math.ceil(maxSales * 0.25)}</span>
          <span>$0</span>
        </div>

        {/* Dynamic CSS Bars */}
        <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #e2e8f0', paddingBottom: '5px' }}>
          {hasData ? tsData.map((d, index) => {
            const heightPercent = Math.max((d.sales / maxSales) * 100, 2); // Minimum 2% to always show a tiny bar
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '32px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', height: `${heightPercent}%`, background: 'linear-gradient(180deg, #c084fc 0%, #8b5cf6 100%)', borderRadius: '6px 6px 0 0', position: 'relative', transition: 'height 0.5s ease-out' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: '#d8b4fe', borderRadius: '6px 6px 0 0' }}></div>
                </div>
              </div>
            );
          }) : (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No Sales Data</div>
          )}
        </div>
      </div>

      {/* X Axis Dates */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '45px', marginTop: '10px', color: '#94a3b8', fontSize: '0.8rem' }}>
        {hasData && tsData.map((d, index) => <span key={index} style={{ width: '32px', textAlign: 'center' }}>{d.day}</span>)}
      </div>
    </div>
  );
};

// ---- 5. Right Sidebar (Recent Leads) ----
// ---- 5. Right Sidebar (Recent Leads) ----
const RecentLeads = ({ data, onRowClick }) => ( // <-- Yahan onRowClick add kiya
  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>Recent Leads</h3>
      <span style={{ cursor: 'pointer', color: '#94a3b8' }}>•••</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {data && data.length > 0 ? data.map((lead, i) => (
        <div
          key={i}
          onClick={() => onRowClick(lead)} // <-- Yahan Click Event laga diya!
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: i < data.length - 1 ? '1px solid #f1f5f9' : 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: lead.stage?.color || '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>
              {lead.fullName ? lead.fullName.charAt(0).toUpperCase() : 'L'}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{lead.fullName || 'Unknown Lead'}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}><span style={{ color: '#38bdf8' }}>{lead.email || 'No email'}</span> • {lead.stage?.name}</div>
            </div>
          </div>
          <span style={{ color: '#cbd5e1' }}>›</span>
        </div>
      )) : (
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No recent leads found.</div>
      )}
    </div>
  </div>
);


// ---- 6. Right Sidebar (My Tasks) ----
// ---- 6. Right Sidebar (My Tasks) ----
const MyTasks = ({ data, onTaskClick }) => (
  <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>My Tasks</h3>
      <span style={{ cursor: 'pointer', color: '#94a3b8' }}>•••</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {data && data.length > 0 ? data.map((task, i) => {
        const isChecked = false; // Add real status logic if you have it in DB
        const dateStr = task.dueDateTime ? new Date(task.dueDateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No Due Date';

        return (
          <div
            key={i}
            onClick={() => onTaskClick(task)} // <-- Click Event lagaya
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '12px', opacity: isChecked ? 0.6 : 1 }}
          >
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: isChecked ? 'none' : '2px solid #e2e8f0', backgroundColor: isChecked ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isChecked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', textDecoration: isChecked ? 'line-through' : 'none' }}>{task.taskName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🗓 {dateStr}</span>
              </div>
            </div>
          </div>
        )
      }) : (
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No tasks pending! 🎉</div>
      )}
    </div>
  </div>
);


export default function Dashboard() {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const closePanel = () => setIsPanelOpen(false);
  const [leadBlueprint, setLeadBlueprint] = useState(null);
  const [taskBlueprint, setTaskBlueprint] = useState(null);
  const [selectedRecordType, setSelectedRecordType] = useState('Lead');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  //data fetching from api
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const { tokens } = await fetchAuthSession();
      const token = tokens?.idToken?.toString();
      const headers = { Authorization: `Bearer ${token}` };

      const [res, bpLeadRes, bpTaskRes] = await Promise.all([
        fetch('/api/dashboard', { headers }),
        fetch('/api/blueprint?moduleType=Lead', { headers }),
        fetch('/api/blueprint?moduleType=Task', { headers })
      ]);

      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      } else {
        console.error("API Error:", res.status);
      }

      if (bpLeadRes.ok) setLeadBlueprint(await bpLeadRes.json());
      if (bpTaskRes.ok) setTaskBlueprint(await bpTaskRes.json());
    } catch (error) {
      console.error("Dashboard Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };




  // Agar data load ho raha hai toh loader dikhao
  if (isLoading || !dashboardData) {
    return (
      <main className="dashboard-main" style={{ backgroundColor: 'var(--bg-primary)', padding: '1.5rem', overflowY: 'auto', position: 'relative', minHeight: '100vh' }}>
        <GlobalLoader overlay={true} />
      </main>
    );
  }


  // AGAR EMPTY HAI TOH SEEDHA WELCOME SCREEN DIKHAO
  if (dashboardData?.isEmpty) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>

          {/* Decorative SVG Illustration (Matched with Project Module) */}
          <div style={{ marginBottom: '2rem', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '180px',
              height: '180px',
              backgroundColor: '#e0e7ff',
              borderRadius: '50%',
              filter: 'blur(40px)',
              opacity: 0.7,
              zIndex: 0
            }}></div>

            <svg style={{ position: 'relative', zIndex: 1 }} width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Dashboard Frame */}
              <rect x="20" y="30" width="120" height="90" rx="8" fill="white" stroke="#c7d2fe" strokeWidth="4" />
              <path d="M20 50H140" stroke="#c7d2fe" strokeWidth="4" />
              {/* UI Elements */}
              <circle cx="35" cy="40" r="4" fill="#818cf8" />
              <circle cx="50" cy="40" r="4" fill="#a5b4fc" />
              <circle cx="65" cy="40" r="4" fill="#e0e7ff" />

              {/* Simple Sparkles/Stars to make it welcoming */}
              <path d="M80 60 L83 70 L93 73 L83 76 L80 86 L77 76 L67 73 L77 70 Z" fill="#6366f1" />
              <circle cx="105" cy="85" r="4" fill="#4f46e5" />
              <circle cx="60" cy="95" r="3" fill="#818cf8" />
            </svg>
          </div>

          <div style={{ textAlign: 'center', maxWidth: '550px' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              color: '#1e293b',
              marginBottom: '1rem',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #4f46e5, #9333ea)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Welcome to Mooncliq Orbit!
            </h1>

            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#475569', marginBottom: '1rem' }}>
              Your CRM Workspace is Ready
            </h2>

            <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
              It's a bit quiet here right now. Let's get your business rolling!
              Get started by adding your first lead or configuring your pipeline settings.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button style={{
                padding: '12px 24px', backgroundColor: '#4f46e5', color: '#ffffff',
                borderRadius: '8px', border: 'none', fontSize: '0.95rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(79, 70, 229, 0.2)'
              }}>
                + Add First Lead
              </button>
              <button style={{
                padding: '12px 24px', backgroundColor: '#ffffff', color: '#475569',
                borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s'
              }}>
                Configure Pipeline
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <>
      <main className="dashboard-main" style={{ backgroundColor: 'var(--bg-primary)', padding: '1.5rem', overflowY: 'auto', position: 'relative' }}>

        {/* Header Section */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', fontWeight: 700 }}>Dashboard</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px' }}>
              <svg width="16" height="16" stroke="#94a3b8" strokeWidth="2" fill="none"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" placeholder="Search" style={{ border: 'none', outline: 'none', marginLeft: '8px', fontSize: '0.9rem' }} />
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: '1px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg> Filter
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#10b981', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
              ↓ Import or Export
            </button>
          </div>
        </header>

        {/* Dashboard Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>

          {/* Left Column (Span 8) */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Top 3 KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <KPICard title="Total Leads" value={dashboardData.totalLeads} percentage="0%" isUp={true} sparklineColor="#10b981" />

              <KPICard title="Total Opportunity" value={dashboardData.totalOpportunity} percentage="0%" isUp={true} sparklineColor="#10b981" />
              <KPICard title="Total Sales" value={`$${dashboardData.totalSales}`} percentage="0%" isUp={true} sparklineColor="#ef4444" />
            </div>

            {/* Opportunity Summary Chart */}
            <OpportunitySummary data={dashboardData.timeSeriesData} />

            {/* Bottom 2 Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <LeadByStatus data={dashboardData.leadByStatus} />
              <SalesSummary data={dashboardData.timeSeriesData} />
            </div>

          </div>

          {/* Right Column (Span 4) */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column' }}>
            <RecentLeads
              data={dashboardData.recentLeads}
              onRowClick={(lead) => {
                setSelectedRecord(lead);
                setIsPanelOpen(true);
              }}
            />

            <MyTasks
              data={dashboardData.myTasks}
              onTaskClick={(task) => {
                setSelectedRecord(task);
                setSelectedRecordType('Task'); // <-- Is baar Task
                setIsPanelOpen(true);
              }}
            />

          </div>

        </div>

      </main>

      <SlideOverPanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        lead={selectedRecord}
        blueprint={selectedRecordType === 'Lead' ? leadBlueprint : taskBlueprint}
      />
    </>
  );
}
