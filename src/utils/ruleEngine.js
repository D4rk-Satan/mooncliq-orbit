export function evaluateExecutionCriteria(lead, executionCriteria) {
  if (!executionCriteria || !executionCriteria.conditions || executionCriteria.conditions.length === 0) {
    return true; // No conditions = automatically pass
  }

  const evalCond = (cond) => {
    const rawValue = lead[cond.field] !== undefined ? lead[cond.field] : lead.customData?.[cond.field];
    const leadValue = String(rawValue || "").toLowerCase();
    const condValue = String(cond.value || "").toLowerCase();
    
    switch (cond.operator) {
      case 'is': return leadValue === condValue;
      case "isn't": case 'is_not': return leadValue !== condValue;
      case 'contains': return leadValue.includes(condValue);
      case "doesn't contain": case 'does_not_contain': return !leadValue.includes(condValue);
      case 'starts with': case 'starts_with': return leadValue.startsWith(condValue);
      case 'ends with': case 'ends_with': return leadValue.endsWith(condValue);
      case 'is empty': case 'is_empty': return leadValue === "";
      case 'is not empty': case 'is_not_empty': return leadValue !== "";
      default: return true;
    }
  };

  let finalResult = evalCond(executionCriteria.conditions[0]);

  for (let i = 1; i < executionCriteria.conditions.length; i++) {
    const cond = executionCriteria.conditions[i];
    const condResult = evalCond(cond);

    if (cond.logical === 'OR') {
      finalResult = finalResult || condResult;
    } else {
      finalResult = finalResult && condResult; // Defaults to AND
    }
  }

  return finalResult;
}
