"use client";

import { useState } from 'react';

const MOCK_LEADS = [
  { id: '1', name: 'Rahul Sharma', phone: '+919876543210', stage: 'Qualified', value: '₹5,00,000', unread: 2, lastMsg: 'I want to know about pricing.', time: '10:30 AM', avatar: 'RS' },
  { id: '2', name: 'Priya Verma', phone: '+919876543211', stage: 'Negotiation', value: '₹12,00,000', unread: 0, lastMsg: 'Can we schedule a call tomorrow?', time: 'Yesterday', avatar: 'PV' },
  { id: '3', name: 'Amit Singh', phone: '+919876543212', stage: 'New', value: '₹2,50,000', unread: 1, lastMsg: 'Please send the brochure.', time: 'Monday', avatar: 'AS' },
];

const MOCK_CHATS = {
  '1': [
    { id: 'm1', sender: 'them', text: 'Hi, I saw your ad on Facebook.', time: '10:00 AM' },
    { id: 'm2', sender: 'us', text: 'Hello Rahul! Thanks for reaching out. How can I help you today?', time: '10:05 AM', status: 'read' },
    { id: 'm3', sender: 'them', text: 'I want to know about pricing.', time: '10:30 AM' },
  ],
  '2': [
    { id: 'm4', sender: 'us', text: 'Hi Priya, here is the proposal you requested.', time: 'Yesterday 4:00 PM', status: 'read' },
    { id: 'm5', sender: 'them', text: 'Can we schedule a call tomorrow?', time: 'Yesterday 5:30 PM' },
  ]
};

export default function GlobalInboxPage() {
  const [activeLeadId, setActiveLeadId] = useState('1');
  const [messageInput, setMessageInput] = useState('');

  const activeLead = MOCK_LEADS.find(l => l.id === activeLeadId);
  const activeChats = MOCK_CHATS[activeLeadId] || [];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', overflow: 'hidden', width: '100%' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '1rem 2rem', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Global Inbox</h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Manage all WhatsApp conversations across leads</p>
          </div>
        </header>

        {/* 3-Column Layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Column 1: Chat List (25%) */}
          <div style={{ width: '300px', borderRight: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0' }}>
              <input type="text" placeholder="Search chats..." style={{ width: '100%', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {MOCK_LEADS.map(lead => (
                <div 
                  key={lead.id} 
                  onClick={() => setActiveLeadId(lead.id)}
                  style={{ 
                    padding: '1rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', gap: '0.75rem',
                    backgroundColor: activeLeadId === lead.id ? '#f8fafc' : 'white',
                    borderLeft: activeLeadId === lead.id ? '4px solid #4f46e5' : '4px solid transparent'
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>
                    {lead.avatar}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <h4 style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{lead.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{lead.time}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.lastMsg}</p>
                      {lead.unread > 0 && (
                        <span style={{ backgroundColor: '#22c55e', color: 'white', fontSize: '0.75rem', padding: '0 0.4rem', borderRadius: '10px', fontWeight: 600 }}>{lead.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Chat Canvas (50%) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#efeae2', backgroundImage: 'url("https://www.transparenttextures.com/patterns/always-grey.png")' }}>
            
            {/* Chat Header */}
            {activeLead && (
              <div style={{ padding: '1rem', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #d1d7db' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                  {activeLead.avatar}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>{activeLead.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{activeLead.phone}</p>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeChats.map(msg => (
                <div key={msg.id} style={{ alignSelf: msg.sender === 'us' ? 'flex-end' : 'flex-start', maxWidth: '65%' }}>
                  <div style={{ 
                    backgroundColor: msg.sender === 'us' ? '#d9fdd3' : 'white', 
                    padding: '0.5rem 0.75rem', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    borderTopRightRadius: msg.sender === 'us' ? 0 : '8px',
                    borderTopLeftRadius: msg.sender === 'them' ? 0 : '8px'
                  }}>
                    <p style={{ margin: 0, color: '#111b21', fontSize: '0.9rem' }}>{msg.text}</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: '#667781' }}>{msg.time}</span>
                      {msg.sender === 'us' && msg.status === 'read' && (
                        <svg viewBox="0 0 16 15" width="16" height="15" fill="#53bdeb"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path></svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div style={{ padding: '1rem', backgroundColor: '#f0f2f5', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.002z"></path></svg>
              </button>
              <button style={{ background: 'none', border: 'none', color: '#54656f', cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.959.958 2.423 1.053 3.263.215l5.511-5.512c.28-.28.267-.722.053-.936l-.244-.244c-.191-.191-.567-.349-.957.04l-5.506 5.506c-.18.18-.635.127-.976-.214-.098-.097-.576-.613-.213-.973l7.915-7.917c.818-.817 2.267-.699 3.23.262.5.501.802 1.1.849 1.685.051.573-.156 1.111-.589 1.543l-9.547 9.549a3.97 3.97 0 0 1-2.829 1.171 3.975 3.975 0 0 1-2.83-1.173 3.973 3.973 0 0 1-1.172-2.828c0-1.071.415-2.076 1.172-2.83l7.209-7.211c.157-.157.264-.579.028-.814L11.5 4.36a.572.572 0 0 0-.834.018l-7.205 7.207a5.577 5.577 0 0 0-1.645 3.971z"></path></svg>
              </button>
              <input 
                type="text" 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message" 
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', outline: 'none', backgroundColor: 'white' }} 
              />
              <button 
                style={{ 
                  backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', 
                  padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                Send
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>

          {/* Column 3: CRM Context Panel (25%) */}
          <div style={{ width: '320px', borderLeft: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
            {activeLead ? (
              <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 600, margin: '0 auto 1rem' }}>
                    {activeLead.avatar}
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{activeLead.name}</h2>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>{activeLead.phone}</p>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Stage</span>
                    <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '0.1rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>{activeLead.stage}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Deal Value</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{activeLead.value}</span>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Quick Actions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#475569', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.borderColor = '#4f46e5'} onMouseLeave={e => e.target.style.borderColor = '#e2e8f0'}>View Full Profile</button>
                    <button style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#475569', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.borderColor = '#4f46e5'} onMouseLeave={e => e.target.style.borderColor = '#e2e8f0'}>Create Task</button>
                    <button style={{ padding: '0.5rem', border: 'none', borderRadius: '8px', background: '#10b981', color: 'white', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', marginTop: '0.5rem' }}>Convert to Deal</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                Select a chat to view details
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
