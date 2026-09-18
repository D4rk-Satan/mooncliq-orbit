import { NextResponse } from 'next/server';
import { getAuthUser } from './auth';

export function withPermission(moduleName, action, handler) {
  return async (request, ...args) => {
    try {
      // 1. Get current logged-in user
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // 2. Super Admin Check: Agar user ke paas settings ka access hai, toh usko sab allowed hai.
      if (user.profile?.canAccessSettings) {
        return handler(request, user, ...args);
      }

      // 3. Module Specific Check: JSON permissions check karo
      // Example: user.profile.permissions['Lead']['create']
      const hasPermission = user.profile?.permissions?.[moduleName]?.[action];
      
      if (!hasPermission) {
        return NextResponse.json(
          { error: `Forbidden: You do not have permission to ${action} ${moduleName}` }, 
          { status: 403 }
        );
      }

      // 4. Sab sahi hai, toh main function run karo (aur user object pass kardo)
      return handler(request, user, ...args);
      
    } catch (error) {
      console.error("RBAC Middleware Error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
