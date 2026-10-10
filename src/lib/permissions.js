/**
 * Checks if a user has permission to perform a specific action on a module.
 * @param {Object} user - The current user object containing profile and permissions.
 * @param {string} moduleName - The name of the module (e.g., 'Lead', 'Task', 'Deal').
 * @param {string} action - The action to check (e.g., 'view', 'create', 'edit', 'delete').
 * @returns {boolean} True if permitted, false otherwise.
 */
export const hasPermission = (user, moduleName, action) => {
  if (!user || !user.profile) return false;

  // Super Admin Check: If the user has access to settings, they have full access.
  if (user.profile.canAccessSettings) return true;

  // Check specific module action permission
  return !!user.profile.permissions?.[moduleName]?.[action];
};

/**
 * Checks if a user is allowed to export data.
 * @param {Object} user - The current user object.
 * @returns {boolean} True if permitted, false otherwise.
 */
export const canExport = (user) => {
  if (!user || !user.profile) return false;

  // Super Admin Check or Specific Export Flag Check
  return user.profile.canAccessSettings || !!user.profile.canExportData;
};
