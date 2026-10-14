/**
 * src/utils/fieldRules.js
 * Centralized Business Logic for Fields (Visibility, Dynamic Options, Layout)
 */

/**
 * 1. Check if a field should be visible based on module and mode (create/edit)
 */
export function isFieldVisible(field, moduleType, mode = 'create') {
  if (!field) return false;

  // Task Creation: hide assignedBy (automatically assigned to creator)
  if (moduleType === 'Task' && mode === 'create' && field.name === 'assignedBy') {
    return false;
  }

  return true;
}

/**
 * 2. Resolve dynamic options for special fields (e.g., relatedModule, taskAutomation)
 */
export function getDynamicFieldOptions(field, { userInfo, customModules = [], taskAutomationOptions = [] } = {}) {
  if (!field) return [];

  // Dynamic relatedModule: Active System Modules + Custom Modules
  if (field.name === 'relatedModule') {
    const activeSystem = (userInfo?.activeModules || ['Lead', 'Deal', 'Account', 'Product'])
      .filter(m => m !== 'Task');
    const customList = (customModules || []).map(m => m.name);
    return ['None', ...activeSystem, ...customList];
  }

  // Task Automation Options (Live Database Workflows)
  if (field.name === 'taskAutomation') {
    if (Array.isArray(taskAutomationOptions) && taskAutomationOptions.length > 0) {
      return ['None', ...taskAutomationOptions.filter(opt => opt !== 'None')];
    }
    return ['None'];
  }

  // Return standard field options
  return field.options || [];
}

/**
 * 3. Check if a field should span full width (gridColumn: '1 / -1')
 */
export function isFieldFullWidth(field) {
  if (!field) return false;
  const type = field.type?.toLowerCase();
  return Boolean(field.fullWidth || type === 'address' || type === 'subform');
}

/**
 * 4. Master helper: transforms field definition with all dynamic rules applied
 */
export function resolveFieldRules(field, { moduleType, mode = 'create', userInfo, customModules = [] } = {}) {
  if (!field) return null;

  const isVisible = isFieldVisible(field, moduleType, mode);
  const options = getDynamicFieldOptions(field, { userInfo, customModules });
  const isFullWidth = isFieldFullWidth(field);

  return {
    ...field,
    isVisible,
    options,
    isFullWidth,
  };
}
