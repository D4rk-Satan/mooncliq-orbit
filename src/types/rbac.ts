import { z } from 'zod';

const ModulePermissionSchema = z.object({
  view: z.boolean().default(false),
  create: z.boolean().default(false),
  edit: z.boolean().default(false),
  delete: z.boolean().default(false),
  visibility: z.enum(['private', 'public', 'hierarchy']).default('private')
});

export const PermissionSchema = z.object({
  Lead: ModulePermissionSchema.optional(),
  Deal: ModulePermissionSchema.optional(),
  Account: ModulePermissionSchema.optional(),
  Task: ModulePermissionSchema.optional(),
  Product: ModulePermissionSchema.optional(),
  // Hum future me aur modules yahan add kar sakte hain (jaise Custom Modules)
}).catchall(ModulePermissionSchema.optional()); // Allows dynamic modules

// Ye function validate karega ki frontend se aane wala JSON sahi format me hai
export function validatePermissions(permissionsJson) {
  return PermissionSchema.safeParse(permissionsJson);
}
