import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SlideOverPanel from '../components/SlideOverPanel';

// Mock FieldRegistry to avoid rendering complex nested components
jest.mock('../components/FieldRegistry', () => {
  return function DummyDynamicField(props) {
    const { value, onChange, field } = props;
    return (
      <div data-testid={`field-${field ? field.name : 'unknown'}`}>
        <label>{field ? field.label : 'unknown-label'}</label>
        <input 
          aria-label={field ? field.label : 'unknown-label'}
          value={value || ''} 
          onChange={(e) => onChange(field ? field.name : 'unknown', e.target.value)} 
        />
      </div>
    );
  };
});

describe('SlideOverPanel (Friction & Validation Logic)', () => {
  const mockLead = {
    id: 'lead-1',
    stageId: 'stage-1',
    firstName: 'John',
    lastName: 'Doe',
  };

  const mockBlueprint = {
    stages: [
      { id: 'stage-1', name: 'New' },
      { id: 'stage-2', name: 'Contacted' }
    ],
    fields: [
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone', type: 'text' }
    ],
    transitions: []
  };

  const onTransitionMock = jest.fn();
  const onCloseMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  test('Does not render if isOpen is false', () => {
    render(<SlideOverPanel isOpen={false} lead={mockLead} blueprint={mockBlueprint} />);
    expect(screen.queryByText(/transition/i)).not.toBeInTheDocument();
  });

  test('Fires handleDirectTransition immediately if rule applies but requires no fields', () => {
    const blueprintWithNoFields = {
      ...mockBlueprint,
      transitions: [{
        id: 'rule-1',
        name: 'Move to Contacted',
        fromStages: [{ id: 'stage-1' }],
        toStageId: 'stage-2',
        isGlobal: false,
        requiredFields: [],
        necessaryFields: [],
        executionCriteria: { type: 'all', conditions: [] }
      }]
    };

    render(
      <SlideOverPanel 
        isOpen={true} 
        lead={mockLead} 
        blueprint={blueprintWithNoFields} 
        onTransition={onTransitionMock}
        onClose={onCloseMock}
      />
    );

    const transitionBtn = screen.getByText('Move to Contacted');
    fireEvent.click(transitionBtn);

    expect(onTransitionMock).toHaveBeenCalledWith('lead-1', 'stage-2', undefined);
  });

  test('Opens SlideOverPanel if rule is triggered but needs user interaction (Show on Transition)', () => {
    const blueprintWithShowField = {
      ...mockBlueprint,
      transitions: [{
        id: 'rule-2',
        name: 'Move to Contacted',
        fromStages: [{ id: 'stage-1' }],
        toStageId: 'stage-2',
        isGlobal: false,
        requiredFields: ['email'],
        necessaryFields: [], // Not strictly required
        executionCriteria: { type: 'all', conditions: [] }
      }]
    };

    render(
      <SlideOverPanel 
        isOpen={true} 
        lead={mockLead} 
        blueprint={blueprintWithShowField} 
        onTransition={onTransitionMock}
        onClose={onCloseMock}
      />
    );

    const transitionBtn = screen.getByText('Move to Contacted');
    fireEvent.click(transitionBtn);

    // Should NOT fire immediately
    expect(onTransitionMock).not.toHaveBeenCalled();
    // Should display the panel with the field
    expect(screen.getByText('Update Prompts')).toBeInTheDocument();
    expect(screen.getByTestId('field-email')).toBeInTheDocument();
  });

  test('Blocks submission and shows UI error if "Required (Confirm)" fields are blank', async () => {
    const blueprintWithRequiredField = {
      ...mockBlueprint,
      transitions: [{
        id: 'rule-3',
        name: 'Move to Contacted',
        fromStages: [{ id: 'stage-1' }],
        toStageId: 'stage-2',
        isGlobal: false,
        requiredFields: ['email'],
        necessaryFields: [], // No security mode
        executionCriteria: { type: 'all', conditions: [] }
      }]
    };

    render(
      <SlideOverPanel 
        isOpen={true} 
        lead={mockLead} 
        blueprint={blueprintWithRequiredField} 
        onTransition={onTransitionMock}
      />
    );

    const transitionBtn = screen.getByText('Move to Contacted');
    fireEvent.click(transitionBtn);

    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    // 1. Missing Mode
    const missingBtn = screen.getByText('Save & Continue');
    fireEvent.click(missingBtn);

    // Should show validation error state (alert)
    expect(alertMock).toHaveBeenCalledWith('Please fill out the required field: email');
    
    // Should not transition
    expect(onTransitionMock).not.toHaveBeenCalled();

    alertMock.mockRestore();
  });

  test('Allows full transition flow when fields are filled', () => {
    const blueprintFull = {
      ...mockBlueprint,
      transitions: [{
        id: 'rule-full',
        name: 'Move to Contacted',
        fromStages: [{ id: 'stage-1' }],
        toStageId: 'stage-2',
        isGlobal: false,
        requiredFields: ['email'],
        necessaryFields: [], 
        executionCriteria: { type: 'all', conditions: [] }
      }]
    };

    render(
      <SlideOverPanel 
        isOpen={true} 
        lead={mockLead} 
        blueprint={blueprintFull} 
        onTransition={onTransitionMock}
      />
    );

    const transitionBtn = screen.getByText('Move to Contacted');
    fireEvent.click(transitionBtn);

    // 1. Missing Mode
    const input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    // 2. Confirm Mode
    // It should now show "Are you sure?"
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    
    // Click proceed
    fireEvent.click(screen.getByText('Yes, Proceed'));

    // Should transition
    expect(onTransitionMock).toHaveBeenCalledWith('lead-1', 'stage-2', expect.objectContaining({ email: 'test@example.com' }), 'rule-full');
  });
});
