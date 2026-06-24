import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeadModule from '../../src/app/lead/page';

describe('LeadBoard Kanban Drag & Drop Engine', () => {
  const mockBlueprint = {
    stages: [
      { id: 's1', name: 'New', color: '#fff' },
      { id: 's2', name: 'Negotiation', color: '#fff' },
      { id: 's3', name: 'Junk', color: '#fff' }
    ],
    fields: [{ id: 'f1', name: 'budget', label: 'Budget', type: 'number' }],
    transitions: [
      // Only valid from New -> Negotiation (requires budget)
      { id: 't1', name: 'Qualify', fromStages: [{ id: 's1' }], isGlobal: false, toStageId: 's2', requiredFields: ['budget'] }
    ]
  };

  const mockLeads = [
    {
      id: 'lead1',
      firstName: 'John',
      lastName: 'Doe',
      stageId: 's1', // In "New"
      createdAt: new Date().toISOString(),
      customData: {} // Missing budget
    }
  ];

  beforeEach(() => {
    // Setup fetch mock to return our test data
    global.fetch.mockImplementation((url) => {
      if (url.includes('blueprint')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBlueprint) });
      if (url.includes('leads')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockLeads) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    
    // Mock window.alert
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('blocks drag-and-drop if no valid transition rule exists', async () => {
    render(<LeadModule />);

    // Wait for leads to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const leadCard = screen.getByText('John Doe').closest('.kanban-card');
    const junkColumn = screen.getByText('Junk').closest('.kanban-column');

    // Simulate drag start
    const mockDataTransfer = { getData: jest.fn().mockReturnValue('lead1'), setData: jest.fn() };
    fireEvent.dragStart(leadCard, { dataTransfer: mockDataTransfer });

    // Simulate drop onto Junk (no transition from s1 -> s3 exists)
    fireEvent.drop(junkColumn, { dataTransfer: mockDataTransfer });

    // Should alert the user it's invalid
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Invalid transition!'));
  });

  test('interrupts drag-and-drop and opens SlideOver if required fields are missing', async () => {
    render(<LeadModule />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const leadCard = screen.getByText('John Doe').closest('.kanban-card');
    const negColumn = screen.getByText('Negotiation').closest('.kanban-column');

    const mockDataTransfer = { getData: jest.fn().mockReturnValue('lead1'), setData: jest.fn() };
    fireEvent.dragStart(leadCard, { dataTransfer: mockDataTransfer });

    // Simulate drop onto Negotiation (valid transition, but missing budget)
    fireEvent.drop(negColumn, { dataTransfer: mockDataTransfer });

    // Should alert about missing fields
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('To move this lead, you must provide: budget'));
    
    // The Slide-Over panel should open (we can check if Qualify button is visible or "John Doe" is in a header)
    // Since SlideOverPanel opens for selectedLead, 'Qualify' button should render
    expect(screen.getByText('Qualify')).toBeInTheDocument();
  });
});
