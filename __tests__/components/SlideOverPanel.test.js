import { render, screen, fireEvent } from '@testing-library/react';
import SlideOverPanel from '../../src/components/SlideOverPanel';

describe('SlideOverPanel Workflow Engine Logic', () => {
  const mockBlueprint = {
    stages: [{ id: 's1', name: 'New' }],
    fields: [{ id: 'f1', name: 'budget', label: 'Budget', type: 'number' }],
    transitions: [
      { id: 't1', name: 'Qualify Deal', fromStages: [{ id: 's1' }], isGlobal: false, toStageId: 's2', requiredFields: ['budget'] },
      { id: 't2', name: 'Move to Trash', fromStages: [], isGlobal: true, toStageId: 's3', requiredFields: [] }
    ]
  };

  const mockLead = {
    id: 'lead1',
    firstName: 'John',
    lastName: 'Doe',
    stageId: 's1',
    createdAt: new Date().toISOString(),
    customData: {} // Empty custom data, so required fields are missing
  };

  test('renders both global and stage-specific transitions', () => {
    render(<SlideOverPanel isOpen={true} lead={mockLead} blueprint={mockBlueprint} onClose={() => {}} onTransition={() => {}} />);
    
    expect(screen.getByText('Qualify Deal')).toBeInTheDocument();
    expect(screen.getByText('Move to Trash')).toBeInTheDocument();
  });

  test('clicking transition with missing required fields opens validation modal', () => {
    render(<SlideOverPanel isOpen={true} lead={mockLead} blueprint={mockBlueprint} onClose={() => {}} onTransition={() => {}} />);
    
    // Click Qualify Deal (requires budget)
    fireEvent.click(screen.getByText('Qualify Deal'));

    // Should open modal asking for Budget
    expect(screen.getByText('Missing Required Fields')).toBeInTheDocument();
    expect(screen.getByText(/please fill out the required fields/i)).toBeInTheDocument();
  });

  test('clicking transition with NO required fields executes immediately', () => {
    const mockOnTransition = jest.fn();
    render(<SlideOverPanel isOpen={true} lead={mockLead} blueprint={mockBlueprint} onClose={() => {}} onTransition={mockOnTransition} />);
    
    fireEvent.click(screen.getByText('Move to Trash'));

    expect(screen.queryByText('Missing Required Fields')).not.toBeInTheDocument();
    expect(mockOnTransition).toHaveBeenCalledWith('lead1', 's3', {});
  });

  test('does NOT render transition if lead is in a stage not listed in fromStages', () => {
    // Lead is in 's4' but Qualify Deal is only from 's1'
    const wrongStageLead = { ...mockLead, stageId: 's4' };
    const { rerender } = render(<SlideOverPanel isOpen={true} lead={wrongStageLead} blueprint={mockBlueprint} onClose={() => {}} onTransition={() => {}} />);
    
    // Custom transition should be hidden
    expect(screen.queryByText('Qualify Deal')).not.toBeInTheDocument();
    // Global transition should still be visible
    expect(screen.getByText('Move to Trash')).toBeInTheDocument();
  });
});
