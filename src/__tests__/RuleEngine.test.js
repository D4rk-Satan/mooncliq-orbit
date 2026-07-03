import { evaluateExecutionCriteria } from '../utils/ruleEngine';

describe('Rule Engine Evaluator', () => {
  const lead = {
    stageId: 'stage-1',
    firstName: 'John',
    lastName: 'Doe',
    budget: '5000',
    source: 'Inbound',
    customData: {
      industry: 'Tech',
      companySize: '100'
    }
  };

  test('Evaluates empty criteria to TRUE (allows all records)', () => {
    const criteria = { type: 'all', conditions: [] };
    expect(evaluateExecutionCriteria(lead, criteria)).toBe(true);
    expect(evaluateExecutionCriteria(lead, null)).toBe(true);
  });

  test('Evaluates simple matching string (is)', () => {
    const criteria = {
      conditions: [{ field: 'firstName', operator: 'is', value: 'John' }]
    };
    expect(evaluateExecutionCriteria(lead, criteria)).toBe(true);

    const falseCriteria = {
      conditions: [{ field: 'firstName', operator: 'is', value: 'Jane' }]
    };
    expect(evaluateExecutionCriteria(lead, falseCriteria)).toBe(false);
  });

  test('Evaluates negative matching string (isn\'t)', () => {
    const criteria = {
      conditions: [{ field: 'lastName', operator: "isn't", value: 'Smith' }]
    };
    expect(evaluateExecutionCriteria(lead, criteria)).toBe(true);
  });

  test('Evaluates partial matches (contains / doesn\'t contain)', () => {
    const criteriaContains = {
      conditions: [{ field: 'source', operator: 'contains', value: 'bound' }]
    };
    expect(evaluateExecutionCriteria(lead, criteriaContains)).toBe(true);

    const criteriaNotContains = {
      conditions: [{ field: 'source', operator: "doesn't contain", value: 'Outbound' }]
    };
    expect(evaluateExecutionCriteria(lead, criteriaNotContains)).toBe(true);
  });

  test('Evaluates existence (is empty / is not empty)', () => {
    const criteriaNotEmpty = {
      conditions: [{ field: 'budget', operator: 'is not empty' }]
    };
    expect(evaluateExecutionCriteria(lead, criteriaNotEmpty)).toBe(true);

    const criteriaEmpty = {
      conditions: [{ field: 'phone', operator: 'is empty' }]
    };
    expect(evaluateExecutionCriteria(lead, criteriaEmpty)).toBe(true);
  });

  test('Evaluates custom fields fallback (customData)', () => {
    const criteria = {
      conditions: [{ field: 'industry', operator: 'is', value: 'tech' }]
    };
    expect(evaluateExecutionCriteria(lead, criteria)).toBe(true);
  });

  test('Evaluates multiple criteria using AND', () => {
    const criteria = {
      conditions: [
        { field: 'firstName', operator: 'is', value: 'John' },
        { field: 'industry', operator: 'is', value: 'tech', logical: 'AND' }
      ]
    };
    expect(evaluateExecutionCriteria(lead, criteria)).toBe(true);

    const falseCriteria = {
      conditions: [
        { field: 'firstName', operator: 'is', value: 'John' },
        { field: 'industry', operator: 'is', value: 'finance', logical: 'AND' }
      ]
    };
    expect(evaluateExecutionCriteria(lead, falseCriteria)).toBe(false);
  });

  test('Evaluates multiple criteria using OR', () => {
    const criteria = {
      conditions: [
        { field: 'firstName', operator: 'is', value: 'Jane' }, // False
        { field: 'industry', operator: 'is', value: 'tech', logical: 'OR' } // True
      ]
    };
    expect(evaluateExecutionCriteria(lead, criteria)).toBe(true);
  });

  test('Evaluates mixed logic sequentially (Left-to-Right)', () => {
    // False AND False OR True -> (F & F) | T -> True
    const criteria = {
      conditions: [
        { field: 'firstName', operator: 'is', value: 'Jane' }, // False
        { field: 'source', operator: 'is', value: 'Outbound', logical: 'AND' }, // False
        { field: 'budget', operator: 'is', value: '5000', logical: 'OR' } // True
      ]
    };
    expect(evaluateExecutionCriteria(lead, criteria)).toBe(true);
  });
});
