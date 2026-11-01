"use client";

import React, { useState, useEffect } from 'react';

// Sample mock leads with assigned ownership metadata
const MOCK_LEADS = [
  { id: '1', name: 'Gaurav (Test)', phone: '+917016309253', stage: 'Qualified', value: '₹5,00,000', unread: 2, lastMsg: 'I want to know about pricing.', time: '10:30 AM', avatar: 'G', isMyLead: true },
  { id: '2', name: 'Boss', phone: '+917600898070', stage: 'Negotiation', value: '₹12,00,000', unread: 0, lastMsg: 'Can we schedule a call tomorrow?', time: 'Yesterday', avatar: 'RS', isMyLead: false },
  { id: '3', name: 'Priya Verma', phone: '+919876543212', stage: 'New', value: '₹2,50,000', unread: 0, lastMsg: 'Please send the brochure.', time: 'Monday', avatar: 'PV', isMyLead: true },
];

const MOCK_CHATS = {
  '1': [
    { id: 'm1', sender: 'them', text: 'Hi, I saw your ad on Facebook.', time: '10:00 AM' },
    { id: 'm2', sender: 'us', text: 'Hello Gaurav! Thanks for reaching out. How can I help you today?', time: '10:05 AM', status: 'read' },
    { id: 'm3', sender: 'them', text: 'I want to know about pricing.', time: '10:30 AM' },
  ],
  '2': [
    { id: 'm4', sender: 'us', text: 'Hi Rahul, here is the proposal you requested.', time: 'Yesterday 4:00 PM', status: 'read' },
    { id: 'm5', sender: 'them', text: 'Can we schedule a call tomorrow?', time: 'Yesterday 5:30 PM' },
  ]
};

export default function WhatsAppWebClone({ currentUser }) {
  // Check Admin / Manager rights
  const isAdmin = Boolean(
    currentUser?.profile?.name === 'Admin' ||
    currentUser?.role === 'Admin' ||
    currentUser?.profile?.canAccessSettings ||
    currentUser?.isSuperAdmin
  );

  const [chatViewMode, setChatViewMode] = useState('my_chats'); // 'my_chats' | 'all_chats'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLeadId, setActiveLeadId] = useState('1');
  const [messageInput, setMessageInput] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [localChats, setLocalChats] = useState(MOCK_CHATS);

  // Filter leads based on toggle view mode (Normal reps always only see assigned)
  const visibleLeads = MOCK_LEADS.filter(lead => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = lead.name.toLowerCase().includes(q) || lead.phone.includes(q);
      if (!matches) return false;
    }

    // Role-based visibility
    if (!isAdmin || chatViewMode === 'my_chats') {
      return lead.isMyLead;
    }
    return true; // Admin in 'all_chats' mode sees everything
  });

  const activeLead = visibleLeads.find(l => l.id === activeLeadId) || visibleLeads[0];
  const activeChats = activeLead ? (localChats[activeLead.id] || []) : [];

  // Fetch real-time chats from backend
  useEffect(() => {
    if (!activeLead) return;

    const fetchChats = async () => {
      try {
        const res = await fetch(`/api/whatsapp/messages?phone=${activeLead.phone}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.messages && data.messages.length > 0) {
          const formattedMessages = data.messages.map(m => ({
            id: m.id,
            sender: m.direction === 'inbound' ? 'them' : 'us',
            text: m.body,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: m.status
          }));

          setLocalChats(prev => ({ ...prev, [activeLead.id]: formattedMessages }));
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      }
    };

    fetchChats();
    const interval = setInterval(fetchChats, 3000);
    return () => clearInterval(interval);
  }, [activeLead?.id, activeLead?.phone]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeLead) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: 'us',
      text: messageInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setLocalChats(prev => ({
      ...prev,
      [activeLead.id]: [...(prev[activeLead.id] || []), newMsg]
    }));

    const sentMessage = messageInput;
    setMessageInput('');

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeLead.phone,
          type: 'text',
          textBody: sentMessage
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert("Failed to send: " + (errorData.error || "Unknown Error"));
      }
    } catch (error) {
      console.error(error);
      alert("Error sending message");
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', height: '100vh', backgroundColor: '#d1d7db', overflow: 'hidden', width: '100%', fontFamily: '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>

      {/* WhatsApp Web Classic Green Strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '127px', backgroundColor: '#00a884', zIndex: 0 }}></div>

      {/* Main WhatsApp Window */}
      <main style={{ position: 'relative', zIndex: 1, display: 'flex', margin: '19px auto', width: '100%', maxWidth: '1600px', height: 'calc(100vh - 38px)', backgroundColor: '#ffffff', boxShadow: '0 6px 18px rgba(11,20,26,.05)' }}>

        {/* LEFT PANE (Chats List) */}
        <div style={{ width: '30%', minWidth: '350px', maxWidth: '400px', borderRight: '1px solid #e9edef', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>

          {/* Header */}
          <header style={{ height: '59px', backgroundColor: '#f0f2f5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dfe5e7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#54656f', overflow: 'hidden' }}>
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.email || 'User')}&background=dfe5e7&color=54656f`} alt="Profile" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111b21', lineHeight: 1.2 }}>
                  {currentUser?.nickname || currentUser?.email?.split('@')[0] || 'Team User'}
                </span>
                <span style={{ fontSize: '11px', color: '#00a884', fontWeight: 600 }}>
                  {isAdmin ? 'Admin View' : 'Sales Representative'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', color: '#54656f', paddingRight: '5px' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.072 1.761a10.05 10.05 0 00-9.303 5.658l-1.078 2.62a1.42 1.42 0 001.325 1.942l2.802-.014a10.046 10.046 0 0011.666-6.657 1.422 1.422 0 00-.73-1.78l-2.614-1.096a10.048 10.048 0 00-2.068-.673zM2.85 15.651a1.42 1.42 0 00-1.47 1.834l1.109 4.14 4.14 1.109a1.42 1.42 0 001.834-1.47l-.801-2.986-1.826-1.827-2.986-.8z"></path></svg>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.81v15.37c0 1.021.642 1.635 1.674 1.635h14.33c1.032 0 1.896-.614 1.896-1.635V4.81c0-1.021-.864-1.635-1.895-1.635zM10.82 17.001l-4.275-4.275 1.155-1.155 3.12 3.12 7.125-7.125 1.155 1.155-8.28 8.28z"></path></svg>
            </div>
          </header>

          {/* ADMIN-ONLY VISIBILITY TOGGLE BAR */}
          {isAdmin && (
            <div style={{
              display: 'flex',
              padding: '8px 12px',
              gap: '6px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e9edef'
            }}>
              <button
                onClick={() => setChatViewMode('my_chats')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: chatViewMode === 'my_chats' ? '#00a884' : 'transparent',
                  color: chatViewMode === 'my_chats' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                My Assigned ({MOCK_LEADS.filter(l => l.isMyLead).length})
              </button>

              <button
                onClick={() => setChatViewMode('all_chats')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: chatViewMode === 'all_chats' ? '#0f172a' : 'transparent',
                  color: chatViewMode === 'all_chats' ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                All Company Chats ({MOCK_LEADS.length})
              </button>
            </div>
          )}

          {/* Search Bar */}
          <div style={{ padding: '7px 12px', borderBottom: '1px solid #f2f2f2', display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: '8px', padding: '0 12px', width: '100%', height: '35px' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#54656f"><path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 001.256-3.386 5.207 5.207 0 10-5.207 5.208 5.183 5.183 0 003.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 110-7.21 3.605 3.605 0 010 7.21z"></path></svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat"
                style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', marginLeft: '15px', width: '100%', fontSize: '14px', color: '#111b21' }}
              />
            </div>
          </div>

          {/* Chat List */}
          <div style={{ overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
            {visibleLeads.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                No active conversations found.
              </div>
            ) : (
              visibleLeads.map((lead, idx) => (
                <div
                  key={lead.id}
                  onClick={() => setActiveLeadId(lead.id)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '0 12px 0 13px', height: '72px', cursor: 'pointer',
                    backgroundColor: activeLead?.id === lead.id ? '#f0f2f5' : '#ffffff',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (activeLead?.id !== lead.id) e.currentTarget.style.backgroundColor = '#f5f6f6' }}
                  onMouseLeave={(e) => { if (activeLead?.id !== lead.id) e.currentTarget.style.backgroundColor = '#ffffff' }}
                >
                  <div style={{ width: '49px', height: '49px', borderRadius: '50%', overflow: 'hidden', marginRight: '15px', flexShrink: 0 }}>
                    <img src={`https://ui-avatars.com/api/?name=${lead.name.replace(' ', '+')}&background=random`} alt="Avatar" style={{ width: '100%', height: '100%' }} />
                  </div>
                  <div style={{ flex: 1, borderBottom: (idx === visibleLeads.length - 1) ? 'none' : '1px solid #f2f2f2', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 500, color: '#111b21' }}>{lead.name}</h4>
                      <span style={{ fontSize: '12px', color: lead.unread > 0 ? '#00a884' : '#667781' }}>{lead.time}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#667781', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        {lead.lastMsg}
                      </p>
                      {lead.unread > 0 && (
                        <span style={{ backgroundColor: '#00a884', color: '#ffffff', fontSize: '12px', padding: '0 6px', borderRadius: '10px', minWidth: '20px', textAlign: 'center', fontWeight: 500 }}>{lead.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANE (Chat Canvas) */}
        {activeLead ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#efeae2', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain', backgroundRepeat: 'repeat' }}>

            {/* Chat Header */}
            <header style={{ height: '59px', backgroundColor: '#f0f2f5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e9edef', zIndex: 10 }}>
              <div
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setShowContactInfo(!showContactInfo)}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', marginRight: '15px' }}>
                  <img src={`https://ui-avatars.com/api/?name=${activeLead.name.replace(' ', '+')}&background=random`} alt="Active Contact" style={{ width: '100%', height: '100%' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500, color: '#111b21' }}>{activeLead.name}</h3>
                  <span style={{ fontSize: '13px', color: '#667781' }}>{activeLead.phone}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', color: '#54656f' }}>
                <button
                  onClick={() => setShowContactInfo(!showContactInfo)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#54656f', fontSize: '13px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', backgroundColor: showContactInfo ? '#e2e8f0' : 'transparent' }}
                >
                  Contact Info
                </button>
              </div>
            </header>

            {/* Messages Scroll Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 5%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeChats.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.sender === 'us' ? 'flex-end' : 'flex-start',
                      backgroundColor: msg.sender === 'us' ? '#d9fdd3' : '#ffffff',
                      padding: '6px 7px 8px 9px',
                      borderRadius: '8px',
                      boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                      maxWidth: '65%',
                      minWidth: '80px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ fontSize: '14.2px', color: '#111b21', paddingRight: '45px', wordBreak: 'break-word', lineHeight: '19px' }}>
                      {msg.text}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', position: 'absolute', bottom: '4px', right: '7px' }}>
                      <span style={{ fontSize: '11px', color: '#667781' }}>{msg.time}</span>
                      {msg.sender === 'us' && (
                        <span style={{ color: msg.status === 'read' ? '#53bdeb' : '#667781', fontSize: '12px' }}>✓✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <footer style={{ height: '62px', backgroundColor: '#f0f2f5', padding: '5px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="text"
                placeholder="Type a message"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage() }}
                style={{ flex: 1, height: '42px', border: 'none', borderRadius: '8px', padding: '9px 12px', fontSize: '15px', color: '#111b21', outline: 'none' }}
              />
              <button
                onClick={handleSendMessage}
                style={{ backgroundColor: '#00a884', border: 'none', width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ffffff' }}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
              </button>
            </footer>

          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5', color: '#64748b' }}>
            Select a conversation to start messaging
          </div>
        )}

        {/* CONTACT INFO SLIDE-OUT */}
        {showContactInfo && activeLead && (
          <div style={{ width: '350px', backgroundColor: '#ffffff', borderLeft: '1px solid #e9edef', display: 'flex', flexDirection: 'column' }}>
            <header style={{ height: '59px', backgroundColor: '#f0f2f5', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button onClick={() => setShowContactInfo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#111b21', fontWeight: 500 }}>Contact Info</h3>
            </header>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden', marginBottom: '15px' }}>
                <img src={`https://ui-avatars.com/api/?name=${activeLead.name.replace(' ', '+')}&background=random`} alt="Avatar Large" style={{ width: '100%', height: '100%' }} />
              </div>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#111b21' }}>{activeLead.name}</h2>
              <span style={{ fontSize: '14px', color: '#667781' }}>{activeLead.phone}</span>

              <div style={{ width: '100%', marginTop: '30px', borderTop: '1px solid #f2f2f2', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: '#111b21' }}>Stage</span>
                  <span style={{ fontSize: '14px', color: '#00a884', fontWeight: 600 }}>{activeLead.stage}</span>
                </div>
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: '#111b21' }}>Deal Value</span>
                  <span style={{ fontSize: '14px', color: '#111b21', fontWeight: 600 }}>{activeLead.value}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
