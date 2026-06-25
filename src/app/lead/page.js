"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import LeadIntakeForm from "../../components/LeadIntakeForm";
import SlideOverPanel from "../../components/SlideOverPanel";
import { useRouter } from "next/navigation";

const getColumnColor = (color) => color || "#e2e8f0";

export default function LeadModule() {
  const [leads, setLeads] = useState([]);
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" or "list"
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      await getCurrentUser();
      fetchData();
    } catch (err) {
      router.push('/sign-in');
    }
  };

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch Blueprint to get the dynamic stages
      const bpRes = await fetch('/api/blueprint?moduleType=Lead', { headers });
      const bpData = await bpRes.json();
      setBlueprint(bpData);

      // Fetch actual leads
      const leadsRes = await fetch('/api/leads', { headers });
      const leadsData = await leadsRes.json();
      setLeads(leadsData);
    } catch (err) {
      console.error("Failed to load CRM data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLead = async (newLeadPayload) => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLeadPayload)
      });
      const savedLead = await res.json();
      setLeads((prev) => [savedLead, ...prev]);
    } catch (err) {
      console.error("Failed to save lead", err);
    }
  };

  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData("leadId", leadId);
  };

  const handleDrop = async (e, targetStageId) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.stageId === targetStageId) return;

    // 1. Find valid transition
    const validTransition = blueprint.transitions.find(t => 
      (t.isGlobal || (t.fromStages && t.fromStages.some(s => s.id === lead.stageId))) && t.toStageId === targetStageId
    );

    if (!validTransition) {
      alert("Invalid transition! The Blueprint engine prevents moving to this stage directly.");
      return;
    }

    // 2. Check required fields
    const missingFields = validTransition.requiredFields.filter(fieldName => {
      const val = lead.customData?.[fieldName];
      return val === undefined || val === null || val === "";
    });

    if (missingFields.length > 0) {
      alert(`Action Blocked: To move this lead, you must provide: ${missingFields.join(", ")}. Please click the lead card to fill out these fields.`);
      setSelectedLead(lead); // Open the side panel for them
      return;
    }

    // 3. Perform the transition
    handleTransition(lead.id, targetStageId, lead.customData);
  };

  const handleTransition = async (leadId, toStageId, updatedCustomData) => {
    const targetStage = blueprint?.stages?.find(s => s.id === toStageId);

    // Optimistic UI update
    setLeads(prevLeads => prevLeads.map(lead => {
      if (lead.id === leadId) {
        return { ...lead, stageId: toStageId, stage: targetStage || lead.stage, customData: updatedCustomData };
      }
      return lead;
    }));

    try {
      const token = await getAuthToken();
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leadId, stageId: toStageId, customData: updatedCustomData })
      });
    } catch (err) {
      console.error("Failed to transition lead", err);
    }
  };

  const renderEmptyState = () => (
    <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', height: '100%' }}>
      <div className="empty-state-content" style={{ maxWidth: '400px' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background decorative dots */}
            <circle cx="20" cy="30" r="4" fill="#f1f5f9" />
            <circle cx="100" cy="20" r="2" fill="#f1f5f9" />
            <circle cx="90" cy="100" r="6" fill="#f1f5f9" />
            <circle cx="10" cy="90" r="3" fill="#f1f5f9" />

            {/* Document shape */}
            <path d="M40 20H70C75.5228 20 80 24.4772 80 30V80C80 85.5228 75.5228 90 70 90H40C34.4772 90 30 85.5228 30 80V30C30 24.4772 34.4772 20 40 20Z" fill="white" stroke="#cbd5e1" strokeWidth="3" strokeLinejoin="round" />
            <path d="M35 25H65C70.5228 25 75 29.4772 75 35V85C75 90.5228 70.5228 95 65 95H35C29.4772 95 25 90.5228 25 85V35C25 29.4772 29.4772 25 35 25Z" fill="white" stroke="#cbd5e1" strokeWidth="3" strokeLinejoin="round" />

            {/* Document lines */}
            <rect x="40" y="40" width="25" height="4" rx="2" fill="#e2e8f0" />
            <rect x="40" y="55" width="15" height="4" rx="2" fill="#e2e8f0" />
            <rect x="40" y="70" width="20" height="4" rx="2" fill="#e2e8f0" />

            {/* Magnifying Glass */}
            <circle cx="75" cy="70" r="15" fill="white" stroke="#cbd5e1" strokeWidth="3" />
            <path d="M85 80L95 90" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />

            {/* X inside magnifying glass */}
            <path d="M70 65L80 75" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <path d="M80 65L70 75" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>There are no records in this view.</h3>
        <p className="text-muted" style={{ marginBottom: '1.5rem', color: '#64748b' }}>Get started by creating your first lead in the pipeline.</p>
        <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
          + Add First Lead
        </button>
      </div>
    </div>
  );

  const renderKanbanView = () => {
    if (!blueprint?.stages) return null;

    const columns = blueprint.stages.map(stage => {
      const columnLeads = leads.filter(lead => lead.stageId === stage.id);
      return { stage, leads: columnLeads };
    });

    return (
      <div className="kanban-board">
        {columns.map(col => (
          <div
            key={col.stage.id}
            className="kanban-column"
          >
            <div className="kanban-column-header" style={{ backgroundColor: getColumnColor(col.stage.color) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3>{col.stage.name}</h3>
                <span className="kanban-count">{col.leads.length}</span>
              </div>
            </div>
            <div className="kanban-cards">
              {col.leads.map(lead => {
                const dateOptions = { day: 'numeric', month: 'short' };
                const formattedDate = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-US', dateOptions) : 'No due date';
                const title = lead.customData?.companyName || `${lead.firstName} ${lead.lastName}`;
                const subtitle = lead.customData?.industry || lead.email || 'Lead';
                // Mock notification numbers for visual demonstration
                const callCount = Math.floor(Math.random() * 4) + 1;
                const attachCount = Math.floor(Math.random() * 3) + 1;
                
                return (
                  <div
                    key={lead.id}
                    className="kanban-card"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="card-header-top">
                      <h4 className="card-title">{title}</h4>
                      <button className="card-menu-btn" onClick={(e) => { e.stopPropagation(); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                      </button>
                    </div>
                    
                    <div className="card-subtitle">
                      {subtitle}
                    </div>

                    <div className="card-footer-bottom">
                      <div className="date-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        {formattedDate}
                      </div>
                      
                      <div className="card-icons">
                        <div className="card-icon-item">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          <span>{callCount}</span>
                        </div>
                        <div className="card-icon-item">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                          <span>{attachCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {col.leads.length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', opacity: 0.6 }}>
                  <svg width="60" height="60" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 1rem auto' }}>
                    <circle cx="20" cy="30" r="4" fill="#f1f5f9" />
                    <circle cx="100" cy="20" r="2" fill="#f1f5f9" />
                    <path d="M40 20H70C75.5228 20 80 24.4772 80 30V80C80 85.5228 75.5228 90 70 90H40C34.4772 90 30 85.5228 30 80V30C30 24.4772 34.4772 20 40 20Z" fill="white" stroke="#cbd5e1" strokeWidth="4" strokeLinejoin="round" />
                    <path d="M35 25H65C70.5228 25 75 29.4772 75 35V85C75 90.5228 70.5228 95 65 95H35C29.4772 95 25 90.5228 25 85V35C25 29.4772 29.4772 25 35 25Z" fill="white" stroke="#cbd5e1" strokeWidth="4" strokeLinejoin="round" />
                    <rect x="40" y="40" width="25" height="4" rx="2" fill="#e2e8f0" />
                    <rect x="40" y="55" width="15" height="4" rx="2" fill="#e2e8f0" />
                    <circle cx="75" cy="70" r="15" fill="white" stroke="#cbd5e1" strokeWidth="4" />
                    <path d="M85 80L95 90" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
                    <path d="M70 65L80 75" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                    <path d="M80 65L70 75" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <div style={{ fontSize: '0.875rem', color: '#151920ff', fontWeight: 500 }}>No leads in {col.stage.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#13161aff', marginTop: '0.25rem' }}>Drop a card here</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderListView = () => (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Email</th>
            <th>Owner</th>
            <th>Stage</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td className="font-medium">{lead.firstName} {lead.lastName}</td>
              <td>{lead.customData?.companyName || '-'}</td>
              <td>{lead.email || '-'}</td>
              <td>{lead.owner || '-'}</td>
              <td>
                <span className="badge" style={{ backgroundColor: lead.stage?.color || '#eee' }}>
                  {lead.stage?.name || 'Unknown'}
                </span>
              </td>
              <td className="text-muted">{new Date(lead.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-footer">
        Showing {leads.length} of {leads.length} records
      </div>
    </div>
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Leads</h1>
          {leads.length > 0 && (
            <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="view-toggle">
                <button
                  className={`toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                  onClick={() => setViewMode('kanban')}
                >
                  Kanban
                </button>
                <button
                  className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  List
                </button>
              </div>
              <button className="btn-primary" onClick={() => setIsFormOpen(true)}>
                + Add Lead
              </button>
            </div>
          )}
        </header>

        <div className="module-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isLoading ? (
            <div className="p-8 text-center" style={{ margin: 'auto' }}>
              <h3 className="text-xl">Loading Platform Data...</h3>
            </div>
          ) : leads.length === 0 ? (
            renderEmptyState()
          ) : (
            viewMode === 'kanban' ? renderKanbanView() : renderListView()
          )}
        </div>
      </main>

      <LeadIntakeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleAddLead}
      />

      <SlideOverPanel 
        isOpen={!!selectedLead} 
        onClose={() => setSelectedLead(null)} 
        lead={selectedLead} 
        blueprint={blueprint}
        onTransition={handleTransition}
      />
    </div>
  );
}