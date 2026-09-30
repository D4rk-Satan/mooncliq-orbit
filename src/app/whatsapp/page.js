"use client";

import React, { useState, useEffect } from 'react';


// Use your actual test number here for testing
const MOCK_LEADS = [
  { id: '1', name: 'Gaurav (Test)', phone: '+917016309253', stage: 'Qualified', value: '₹5,00,000', unread: 2, lastMsg: 'I want to know about pricing.', time: '10:30 AM', avatar: 'G' },
  { id: '2', name: 'Boss', phone: '+917600898070', stage: 'Negotiation', value: '₹12,00,000', unread: 0, lastMsg: 'Can we schedule a call tomorrow?', time: 'Yesterday', avatar: 'RS' },
  { id: '3', name: 'Priya Verma', phone: '+919876543212', stage: 'New', value: '₹2,50,000', unread: 0, lastMsg: 'Please send the brochure.', time: 'Monday', avatar: 'PV' },
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

export default function WhatsAppWebClone() {
  const [activeLeadId, setActiveLeadId] = useState('1');
  const [messageInput, setMessageInput] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [localChats, setLocalChats] = useState(MOCK_CHATS);

  const activeLead = MOCK_LEADS.find(l => l.id === activeLeadId);
  const activeChats = localChats[activeLeadId] || [];

  // --- NAYA CODE YAHAN SE SHURU ---
  useEffect(() => {
    if (!activeLead) return;

    const fetchChats = async () => {
      try {
        // API ko call karo active customer ke phone number ke sath
        const res = await fetch(`/api/whatsapp/messages?phone=${activeLead.phone}`);
        const data = await res.json();

        if (data.messages) {
          // Database ke format ko apne UI ke format me badlo
          const formattedMessages = data.messages.map(m => ({
            id: m.id,
            sender: m.direction === 'inbound' ? 'them' : 'us',
            text: m.body,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: m.status
          }));

          // UI me update kar do
          setLocalChats(prev => ({ ...prev, [activeLeadId]: formattedMessages }));
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      }
    };

    fetchChats();

    // Har 5 second me auto-refresh karne ke liye (Optional Realtime feel)
    const interval = setInterval(fetchChats, 2000);
    return () => clearInterval(interval);

  }, [activeLeadId, activeLead]);
  // --- NAYA CODE YAHAN KHATAM ---

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
      [activeLeadId]: [...(prev[activeLeadId] || []), newMsg]
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
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dfe5e7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#54656f', overflow: 'hidden' }}>
              <img src="https://ui-avatars.com/api/?name=User&background=dfe5e7&color=54656f" alt="Profile" style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '25px', color: '#54656f', paddingRight: '10px' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12.072 1.761a10.05 10.05 0 00-9.303 5.658l-1.078 2.62a1.42 1.42 0 001.325 1.942l2.802-.014a10.046 10.046 0 0011.666-6.657 1.422 1.422 0 00-.73-1.78l-2.614-1.096a10.048 10.048 0 00-2.068-.673zM2.85 15.651a1.42 1.42 0 00-1.47 1.834l1.109 4.14 4.14 1.109a1.42 1.42 0 001.834-1.47l-.801-2.986-1.826-1.827-2.986-.8z"></path></svg>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.81v15.37c0 1.021.642 1.635 1.674 1.635h14.33c1.032 0 1.896-.614 1.896-1.635V4.81c0-1.021-.864-1.635-1.895-1.635zM10.82 17.001l-4.275-4.275 1.155-1.155 3.12 3.12 7.125-7.125 1.155 1.155-8.28 8.28z"></path></svg>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 7a2 2 0 10-.001-4.001A2 2 0 0012 7zm0 2a2 2 0 10-.001 3.999A2 2 0 0012 9zm0 6a2 2 0 10-.001 3.999A2 2 0 0012 15z"></path></svg>
            </div>
          </header>

          {/* Search Bar */}
          <div style={{ padding: '7px 12px', borderBottom: '1px solid #f2f2f2', display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f0f2f5', borderRadius: '8px', padding: '0 12px', width: '100%', height: '35px' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#54656f"><path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 001.256-3.386 5.207 5.207 0 10-5.207 5.208 5.183 5.183 0 003.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.605 3.605 0 110-7.21 3.605 3.605 0 010 7.21z"></path></svg>
              <input type="text" placeholder="Search or start new chat" style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', marginLeft: '25px', width: '100%', fontSize: '15px', color: '#111b21' }} />
            </div>
          </div>

          {/* Chat List */}
          <div style={{ overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
            {MOCK_LEADS.map((lead, idx) => (
              <div
                key={lead.id}
                onClick={() => setActiveLeadId(lead.id)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '0 12px 0 13px', height: '72px', cursor: 'pointer',
                  backgroundColor: activeLeadId === lead.id ? '#f0f2f5' : '#ffffff',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => { if (activeLeadId !== lead.id) e.currentTarget.style.backgroundColor = '#f5f6f6' }}
                onMouseLeave={(e) => { if (activeLeadId !== lead.id) e.currentTarget.style.backgroundColor = '#ffffff' }}
              >
                <div style={{ width: '49px', height: '49px', borderRadius: '50%', overflow: 'hidden', marginRight: '15px', flexShrink: 0 }}>
                  <img src={`https://ui-avatars.com/api/?name=${lead.name.replace(' ', '+')}&background=random`} alt="Avatar" style={{ width: '100%', height: '100%' }} />
                </div>
                <div style={{ flex: 1, borderBottom: (idx === MOCK_LEADS.length - 1) ? 'none' : '1px solid #f2f2f2', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 400, color: '#111b21' }}>{lead.name}</h4>
                    <span style={{ fontSize: '12px', color: lead.unread > 0 ? '#00a884' : '#667781' }}>{lead.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#667781', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                      {lead.lastMsg}
                    </p>
                    {lead.unread > 0 && (
                      <span style={{ backgroundColor: '#00a884', color: '#ffffff', fontSize: '12px', padding: '0 6px', borderRadius: '10px', minWidth: '20px', textAlign: 'center', fontWeight: 500 }}>{lead.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANE (Chat Canvas) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#efeae2', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain', backgroundRepeat: 'repeat' }}>

          {/* Chat Header */}
          {activeLead ? (
            <>
              <header onClick={() => setShowContactInfo(!showContactInfo)} style={{ height: '59px', backgroundColor: '#f0f2f5', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', flexShrink: 0, borderLeft: '1px solid #d1d7db' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
                  <img src={`https://ui-avatars.com/api/?name=${activeLead.name.replace(' ', '+')}&background=random`} alt="Avatar" style={{ width: '100%', height: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontWeight: 400, color: '#111b21', fontSize: '16px' }}>{activeLead.name}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#667781', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>click here for contact info</p>
                </div>
                <div style={{ display: 'flex', gap: '20px', color: '#54656f', paddingRight: '10px' }}>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3 0-3.7-3-6.7-6.7-6.7S3 6 3 9.7s3 6.7 6.7 6.7c1.6 0 3.2-.6 4.3-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5-5.2zm-6.2 0c-2.6 0-4.6-2.1-4.6-4.6s2.1-4.6 4.6-4.6 4.6 2.1 4.6 4.6-2 4.6-4.6 4.6z"></path></svg>
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 7a2 2 0 10-.001-4.001A2 2 0 0012 7zm0 2a2 2 0 10-.001 3.999A2 2 0 0012 9zm0 6a2 2 0 10-.001 3.999A2 2 0 0012 15z"></path></svg>
                </div>
              </header>

              {/* Chat Messages Area */}
              <div style={{ flex: 1, padding: '20px 5%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activeChats.map((msg, index) => {
                  const isLastUs = msg.sender === 'us' && (index === activeChats.length - 1 || activeChats[index + 1]?.sender !== 'us');
                  const isLastThem = msg.sender === 'them' && (index === activeChats.length - 1 || activeChats[index + 1]?.sender !== 'them');
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'us' ? 'flex-end' : 'flex-start', marginBottom: (isLastUs || isLastThem) ? '8px' : '2px' }}>
                      <div style={{
                        position: 'relative',
                        backgroundColor: msg.sender === 'us' ? '#d9fdd3' : '#ffffff',
                        padding: '6px 7px 8px 9px',
                        borderRadius: '7.5px',
                        borderTopRightRadius: (msg.sender === 'us' && isLastUs) ? '0' : '7.5px',
                        borderTopLeftRadius: (msg.sender === 'them' && isLastThem) ? '0' : '7.5px',
                        boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                        maxWidth: '65%',
                        minWidth: '110px'
                      }}>
                        <span style={{ color: '#111b21', fontSize: '14.2px', lineHeight: '19px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</span>

                        <div style={{ float: 'right', marginLeft: '10px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontSize: '11px', color: '#667781' }}>{msg.time}</span>
                          {msg.sender === 'us' && (
                            <svg viewBox="0 0 16 15" width="16" height="15" fill={msg.status === 'read' ? '#53bdeb' : '#8696a0'}>
                              <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Chat Input */}
              <div style={{ height: '62px', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', padding: '10px 16px', gap: '15px', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="#54656f" style={{ cursor: 'pointer' }}><path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.002z"></path></svg>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="#54656f" style={{ cursor: 'pointer' }}><path d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.959.958 2.423 1.053 3.263.215l5.511-5.512c.28-.28.267-.722.053-.936l-.244-.244c-.191-.191-.567-.349-.957.04l-5.506 5.506c-.18.18-.635.127-.976-.214-.098-.097-.576-.613-.213-.973l7.915-7.917c.818-.817 2.267-.699 3.23.262.5.501.802 1.1.849 1.685.051.573-.156 1.111-.589 1.543l-9.547 9.549a3.97 3.97 0 0 1-2.829 1.171 3.975 3.975 0 0 1-2.83-1.173 3.973 3.973 0 0 1-1.172-2.828c0-1.071.415-2.076 1.172-2.83l7.209-7.211c.157-.157.264-.579.028-.814L11.5 4.36a.572.572 0 0 0-.834.018l-7.205 7.207a5.577 5.577 0 0 0-1.645 3.971z"></path></svg>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message"
                  style={{ flex: 1, height: '42px', padding: '9px 12px', borderRadius: '8px', border: 'none', outline: 'none', backgroundColor: '#ffffff', fontSize: '15px', color: '#111b21', boxShadow: 'none' }}
                />
                {messageInput.trim() ? (
                  <svg onClick={handleSendMessage} viewBox="0 0 24 24" width="26" height="26" fill="#54656f" style={{ cursor: 'pointer' }}><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="#54656f" style={{ cursor: 'pointer' }}><path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.349 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H3.761c0 4.001 3.178 7.297 7.061 7.885v3.884h2.354v-3.884c3.884-.588 7.061-3.884 7.061-7.885h-2.002z"></path></svg>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', backgroundColor: '#f0f2f5', borderBottom: '6px solid #43c561' }}>
              <h1 style={{ color: '#41525d', fontWeight: 300, fontSize: '32px', marginTop: '28px' }}>WhatsApp for CRM</h1>
              <p style={{ color: '#667781', fontSize: '14px', marginTop: '16px' }}>Send and receive messages without keeping your phone online.</p>
            </div>
          )}
        </div>

        {/* 3RD COLUMN (Contact Info) */}
        {showContactInfo && activeLead && (
          <div style={{ width: '30%', minWidth: '300px', maxWidth: '350px', borderLeft: '1px solid #d1d7db', backgroundColor: '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
            <header style={{ height: '59px', backgroundColor: '#f0f2f5', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid #d1d7db', flexShrink: 0 }}>
              <svg onClick={() => setShowContactInfo(false)} viewBox="0 0 24 24" width="24" height="24" fill="#54656f" style={{ cursor: 'pointer' }}><path d="M12 4l1.4 1.4L7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8 8-8z"></path></svg>
              <h2 style={{ fontSize: '16px', fontWeight: 400, color: '#111b21', margin: 0 }}>Contact info</h2>
            </header>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '28px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 1px 3px rgba(11,20,26,.08)', marginBottom: '10px' }}>
                <div style={{ width: '200px', height: '200px', borderRadius: '50%', overflow: 'hidden', marginBottom: '20px' }}>
                  <img src={`https://ui-avatars.com/api/?name=${activeLead.name.replace(' ', '+')}&background=random`} alt="Avatar" style={{ width: '100%', height: '100%' }} />
                </div>
                <h2 style={{ margin: '0 0 5px', fontSize: '24px', fontWeight: 400, color: '#111b21' }}>{activeLead.name}</h2>
                <p style={{ margin: 0, fontSize: '16px', color: '#667781' }}>{activeLead.phone}</p>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '14px 20px', boxShadow: '0 1px 3px rgba(11,20,26,.08)', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', color: '#008069' }}>CRM Details</span>
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '16px', color: '#111b21' }}>Stage</span>
                  <span style={{ fontSize: '14px', color: '#667781' }}>{activeLead.stage}</span>
                </div>
                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '16px', color: '#111b21' }}>Value</span>
                  <span style={{ fontSize: '14px', color: '#667781' }}>{activeLead.value}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}