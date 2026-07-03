import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LeadPage from '../app/lead/page';

// Mock dependencies
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn().mockResolvedValue({
    tokens: { idToken: { toString: () => 'mock-token' } }
  }),
  getCurrentUser: jest.fn().mockResolvedValue({})
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/lead'
}));

// We need to mock the SlideOverPanel to avoid dealing with portal issues or complex nested rendering
jest.mock('../components/SlideOverPanel', () => {
  return function MockSlideOverPanel({ isOpen, onClose, mode, toStageName, onSubmit, requiredFields = [], necessaryFields = [] }) {
    console.log("MockSlideOverPanel rendered with isOpen:", isOpen);
    if (!isOpen) return null;
    return (
      <div data-testid="mock-slide-panel">
        <div>Mode: {mode}</div>
        <div>Moving to: {toStageName}</div>
        <button onClick={() => onSubmit({ testField: 'value' })}>Submit Mock</button>
        <button onClick={onClose}>Close Panel</button>
      </div>
    );
  };
});

const mockBlueprint = {
  id: 'bp-1',
  moduleType: 'Lead',
  fields: [
    { id: 'f1', name: 'email', label: 'Email', type: 'text', isRequired: true }
  ],
  stages: [
    { id: 'stage-1', name: 'New', color: '#fde68a' },
    { id: 'stage-2', name: 'Contacted', color: '#bfdbfe' }
  ],
  transitions: [
    {
      id: 'rule-1',
      name: 'Contact Lead',
      fromStages: [{ id: 'stage-1' }],
      toStageId: 'stage-2',
      isGlobal: false,
      requiredFields: ['email'],
      necessaryFields: []
    }
  ]
};

const mockLeads = [
  { id: 'lead-1', firstName: 'Test', lastName: 'Lead', stageId: 'stage-1', stageHistory: [], customData: {} }
];

const mockTags = [
  { id: 'tag-1', name: 'VIP', color: '#ef4444' }
];

describe('LeadPage Kanban Board', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      console.log('MOCK FETCH CALLED WITH:', url);
      if (url.includes('/api/blueprint')) {
        console.log('RETURNING MOCK BLUEPRINT:', mockBlueprint);
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBlueprint) });
      }
      if (url.includes('/api/leads')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockLeads) });
      }
      if (url.includes('/api/tags')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTags) });
      }
      return Promise.reject(new Error('not found'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Renders Kanban board columns and leads', async () => {
    render(<LeadPage />);
    
    // Wait for the board to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading Platform Data/i)).not.toBeInTheDocument();
    });

    // Check columns
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Contacted')).toBeInTheDocument();

    // Check leads
    expect(screen.getByText('Test Lead')).toBeInTheDocument();
  });

  test('Fires transition logic when lead is dropped into a new stage', async () => {
    render(<LeadPage />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading Platform Data/i)).not.toBeInTheDocument();
    });

    // Mock the drop event
    const leadCard = screen.getByText('Test Lead').closest('[draggable="true"]');
    expect(leadCard).toBeInTheDocument();

    const contactedColumn = screen.getByText('Contacted').closest('.kanban-column');
    
    // Fire drag start
    fireEvent.dragStart(leadCard, { dataTransfer: { setData: jest.fn(), getData: () => 'lead-1' } });
    
    // Fire drop
    fireEvent.drop(contactedColumn, { dataTransfer: { getData: () => 'lead-1' } });

    // The SlideOverPanel should open because of the rule-1 transition!
    await waitFor(() => {
      expect(screen.getByTestId('mock-slide-panel')).toBeInTheDocument();
    });
  });
});
