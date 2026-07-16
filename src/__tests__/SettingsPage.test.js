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

  test('Auto-Create Record UI Flow', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading Settings/i)).not.toBeInTheDocument();
    });

    // Navigate to Workflow
    const bpBtns = await screen.findAllByText(/Workflow Engine/i);
    fireEvent.click(bpBtns[bpBtns.length - 1]);

    // Click on the Rule "Contact Lead" to edit it
    const ruleItem = await screen.findByText('Contact Lead');
    fireEvent.click(ruleItem);

    // Click on the "After" tab inside Rule Editor
    const afterTab = await screen.findByText('After');
    fireEvent.click(afterTab);

    // Open "Auto-Create Record" builder
    const createRecordsSpan = await screen.findByText('Create Records');
    const autoCreateBtn = createRecordsSpan.nextElementSibling;
    fireEvent.click(autoCreateBtn);

    // Ensure Modal Opens
    const modalTitle = await screen.findByText('Auto-Create Record', { selector: 'h3' });
    expect(modalTitle).toBeInTheDocument();

    // Select Target Module
    const moduleSelectLabel = await screen.findByText('Target Module');
    const moduleSelect = moduleSelectLabel.nextElementSibling;
    fireEvent.change(moduleSelect, { target: { value: 'Task' } });
    
    // Check Auto-Link
    const autoLinkCheckbox = await screen.findByLabelText(/Auto-Link to Current Lead/i);
    // By default, autoLink is true when modal opens for a new action
    expect(autoLinkCheckbox).toBeChecked();
    
    // Toggle it off and on to ensure it works
    fireEvent.click(autoLinkCheckbox);
    expect(autoLinkCheckbox).not.toBeChecked();
    fireEvent.click(autoLinkCheckbox);
    expect(autoLinkCheckbox).toBeChecked();

    // Edit Field Mapping (there is 1 default mapping)
    const targetInputs = await screen.findAllByPlaceholderText('Target Field (e.g. name)');
    fireEvent.change(targetInputs[0], { target: { value: 'taskName' } });

    const sourceInputs = await screen.findAllByPlaceholderText(/Source Value/i);
    fireEvent.change(sourceInputs[0], { target: { value: 'Call Lead' } });

    // Save mapping
    const saveMappingBtn = await screen.findByText('Save Auto-Create');
    fireEvent.click(saveMappingBtn);

    // The modal should close and the action should be in the list
    await waitFor(() => {
      expect(screen.queryByText('Auto-Create Record', { selector: 'h3' })).not.toBeInTheDocument();
    });
  });
});
