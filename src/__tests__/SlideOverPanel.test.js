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
        visibleFields: ['email'],
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

    // Should open the modal (either for missing fields or confirmation)
    expect(screen.getByText('Update Prompts')).toBeInTheDocument();
    
    // Now click proceed (Save & Continue)
    fireEvent.click(screen.getByText('Save & Continue'));
    
    // It should now open the final confirmation modal
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();

    // Now click Yes, Proceed
    fireEvent.click(screen.getByText('Yes, Proceed'));

    expect(onTransitionMock).toHaveBeenCalledWith('lead-1', 'stage-2', {}, 'rule-1');
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
        visibleFields: ['email'],
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
        visibleFields: ['email'],
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
        visibleFields: ['email'],
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

  // EDGE CASE 1: Transition with no field rules should just show confirmation modal
  test('Empty transition triggers confirmation modal immediately', () => {
    const blueprintNoRules = {
      ...mockBlueprint,
      transitions: [{
        id: 'rule-empty',
        name: 'Empty Rule',
        fromStages: [{ id: 'stage-1' }],
        toStageId: 'stage-2',
        isGlobal: false,
        visibleFields: [],
        requiredFields: [],
        necessaryFields: []
      }]
    };

    render(
      <SlideOverPanel 
        isOpen={true} 
        lead={mockLead} 
        blueprint={blueprintNoRules} 
        onTransition={onTransitionMock}
      />
    );

    const transitionBtn = screen.getByText('Empty Rule');
    fireEvent.click(transitionBtn);

    // Should show confirm mode immediately
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText(/You are about to execute/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Yes, Proceed'));
    expect(onTransitionMock).toHaveBeenCalledWith('lead-1', 'stage-2', {}, 'rule-empty');
  });

  // EDGE CASE 2: Transition with a custom message in the confirmation modal
  test('Shows custom message in confirmation modal', () => {
    const blueprintCustomMessage = {
      ...mockBlueprint,
      transitions: [{
        id: 'rule-custom-msg',
        name: 'Special Transition',
        fromStages: [{ id: 'stage-1' }],
        toStageId: 'stage-2',
        isGlobal: false,
        visibleFields: [],
        requiredFields: [],
        necessaryFields: [],
        customMessage: 'Did you check the VIP status?',
        hasCustomMessage: true
      }]
    };

    render(
      <SlideOverPanel 
        isOpen={true} 
        lead={mockLead} 
        blueprint={blueprintCustomMessage} 
        onTransition={onTransitionMock}
      />
    );

    const transitionBtn = screen.getByText('Special Transition');
    fireEvent.click(transitionBtn);

    // Because there are no visible fields, it skips "missing" mode. 
    // It should go straight to "confirm" mode.
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Did you check the VIP status?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Yes, Proceed'));
    expect(onTransitionMock).toHaveBeenCalledWith('lead-1', 'stage-2', {}, 'rule-custom-msg');
  });

  // EDGE CASE 3: Security check fails when necessary data does not match the original lead data
  test('Blocks transition if Double-Verify (security check) fails', () => {
    const blueprintSecurity = {
      ...mockBlueprint,
      transitions: [{
        id: 'rule-security',
        name: 'Secure Transition',
        fromStages: [{ id: 'stage-1' }],
        toStageId: 'stage-2',
        isGlobal: false,
        visibleFields: ['email'],
        requiredFields: ['email'],
        necessaryFields: ['email'] // requires double verify
      }]
    };

    // Original lead has specific data
    const secureLead = {
      ...mockLead,
      email: 'original@example.com'
    };

    render(
      <SlideOverPanel 
        isOpen={true} 
        lead={secureLead} 
        blueprint={blueprintSecurity} 
        onTransition={onTransitionMock}
      />
    );

    const transitionBtn = screen.getByText('Secure Transition');
    fireEvent.click(transitionBtn);

    // 1. Missing Mode
    let input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'original@example.com' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    // 2. Security Mode
    expect(screen.getByText('Security Checkpoint', { exact: false })).toBeInTheDocument();
    
    // Type WRONG email in the security checkpoint
    input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'wrong@example.com' } });
    
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    fireEvent.click(screen.getByText('Verify'));
    
    // It should block transition
    expect(screen.getByText('Verification Failed: The value entered does not match the saved data.')).toBeInTheDocument();
    expect(onTransitionMock).not.toHaveBeenCalled();

    // Now type correct email
    fireEvent.change(input, { target: { value: 'original@example.com' } });
    fireEvent.click(screen.getByText('Verify'));

    // Should proceed to confirm
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Yes, Proceed'));

    expect(onTransitionMock).toHaveBeenCalledWith('lead-1', 'stage-2', expect.objectContaining({ email: 'original@example.com' }), 'rule-security');

    alertMock.mockRestore();
  });
});
