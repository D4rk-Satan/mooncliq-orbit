import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DynamicField from '../components/FieldRegistry';

describe('FieldRegistry (Dynamic Field Inputs)', () => {
  const onChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Renders a text input', () => {
    const field = { name: 'company', label: 'Company Name', type: 'text' };
    render(<DynamicField field={field} value="Acme" onChange={onChangeMock} />);
    
    const input = screen.getByLabelText(/Company Name/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('Acme');

    fireEvent.change(input, { target: { value: 'Acme Corp' } });
    expect(onChangeMock).toHaveBeenCalledWith('company', 'Acme Corp');
  });

  test('Renders a number input and passes numbers', () => {
    const field = { name: 'employees', label: 'Number of Employees', type: 'number' };
    render(<DynamicField field={field} value={10} onChange={onChangeMock} />);
    
    const input = screen.getByLabelText(/Number of Employees/i);
    expect(input).toHaveAttribute('type', 'number');
    
    fireEvent.change(input, { target: { value: '15' } });
    expect(onChangeMock).toHaveBeenCalledWith('employees', 15);
  });

  test('Renders a currency input with a $ symbol', () => {
    const field = { name: 'budget', label: 'Budget', type: 'currency' };
    render(<DynamicField field={field} value={100} onChange={onChangeMock} />);
    
    expect(screen.getByText('$')).toBeInTheDocument();
    const input = screen.getByLabelText(/Budget/i);
    expect(input).toHaveAttribute('type', 'number');
  });

  test('Renders a select dropdown', () => {
    const field = { name: 'status', label: 'Status', type: 'select', options: ['A', 'B'] };
    render(<DynamicField field={field} value="A" onChange={onChangeMock} />);
    
    const select = screen.getByLabelText(/Status/i);
    expect(select.tagName.toLowerCase()).toBe('select');
    
    fireEvent.change(select, { target: { value: 'B' } });
    expect(onChangeMock).toHaveBeenCalledWith('status', 'B');
  });

  test('Renders a date input', () => {
    const field = { name: 'closeDate', label: 'Close Date', type: 'date' };
    render(<DynamicField field={field} value="2023-01-01" onChange={onChangeMock} />);
    
    const input = screen.getByLabelText(/Close Date/i);
    expect(input).toHaveAttribute('type', 'date');
  });

  test('Renders a checkbox', () => {
    const field = { name: 'isVIP', label: 'Is VIP?', type: 'checkbox' };
    render(<DynamicField field={field} value={false} onChange={onChangeMock} />);
    
    const input = screen.getByLabelText(/Is VIP/i);
    expect(input).toHaveAttribute('type', 'checkbox');
    expect(input).not.toBeChecked();

    fireEvent.click(input);
    expect(onChangeMock).toHaveBeenCalledWith('isVIP', true);
  });

  test('Renders a textarea', () => {
    const field = { name: 'notes', label: 'Notes', type: 'textarea' };
    render(<DynamicField field={field} value="Some notes" onChange={onChangeMock} />);
    
    const input = screen.getByLabelText(/Notes/i);
    expect(input.tagName.toLowerCase()).toBe('textarea');
  });

  test('Renders a fallback error for unsupported types', () => {
    const field = { name: 'unknown', label: 'Unknown', type: 'magic' };
    render(<DynamicField field={field} value="" onChange={onChangeMock} />);
    
    expect(screen.getByText(/Unsupported field type: magic/i)).toBeInTheDocument();
  });

  test('Marks required fields with an asterisk', () => {
    const field = { name: 'reqField', label: 'Req', type: 'text', isRequired: true };
    render(<DynamicField field={field} value="" onChange={onChangeMock} />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByLabelText(/Req/i)).toBeRequired();
  });
});
