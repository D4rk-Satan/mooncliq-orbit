import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsPage from '../app/settings/page';

// Mock dependencies
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn().mockResolvedValue({
    tokens: { idToken: { toString: () => 'mock-token' } }
  })
}));

// Mock Next router
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/settings'
}));

// Mock Drag and Drop (react-beautiful-dnd is hard to test in jsdom, we mock it as simple divs)
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }) => <div>{children}</div>,
  Droppable: ({ children }) => children({
    droppableProps: {
      'data-rbd-droppable-id': 'mock-droppable',
      'data-rbd-droppable-context-id': '1'
    },
    innerRef: jest.fn(),
    placeholder: <div>Placeholder</div>
  }, {}),
  Draggable: ({ children }) => children({
    draggableProps: {
      'data-rbd-draggable-context-id': '1',
      'data-rbd-draggable-id': 'mock-draggable'
    },
    dragHandleProps: {
      'data-rbd-drag-handle-draggable-id': 'mock-draggable',
      'data-rbd-drag-handle-context-id': '1',
      tabIndex: 0,
      draggable: false,
      onDragStart: jest.fn()
    },
    innerRef: jest.fn()
  }, { isDragging: false })
}));

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
    { id: 'rule-1', name: 'Contact Lead', fromStages: [{ id: 'stage-1' }], toStageId: 'stage-2', isGlobal: false, requiredFields: [], necessaryFields: [] }
  ]
};

const mockTags = [
  { id: 'tag-1', name: 'VIP', color: '#ef4444' }
];

describe('SettingsPage (Settings Builder)', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/blueprint')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBlueprint)
        });
      }
      if (url.includes('/api/tags')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTags)
        });
      }
      return Promise.reject(new Error('not found'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Renders Hub view by default and loads blueprint', async () => {
    render(<SettingsPage />);
    
    // Check loading state
    expect(screen.getByText(/Loading Settings/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading Settings/i)).not.toBeInTheDocument();
    });

    // We should be in hub view
    expect(screen.getByText('Lead Customization')).toBeInTheDocument();
    expect(screen.getByText('Modules and Fields')).toBeInTheDocument();
  });

  test('Navigates to Fields view', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading Settings/i)).not.toBeInTheDocument();
    });

    const fieldsBtns = await screen.findAllByText(/Modules and Fields/i);
    // There might be one in the sidebar and one in the hub cards
    fireEvent.click(fieldsBtns[fieldsBtns.length - 1]); // click the hub card or sidebar button

    // Should now show Fields config
    await waitFor(() => {
      // Should show the email field label and name
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
    });
  });

  test('Navigates to Workflow Blueprint view', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading Settings/i)).not.toBeInTheDocument();
    });

    const bpBtns = await screen.findAllByText(/Workflow Engine/i);
    fireEvent.click(bpBtns[bpBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/1\. Stage Manager/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Rules Manager/i)).toBeInTheDocument();
      // Should show stages
      expect(screen.getAllByText('New').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Contacted').length).toBeGreaterThan(0);
    });
  });
});
