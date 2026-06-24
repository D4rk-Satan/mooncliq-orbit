import { z } from 'zod';

// Define the shape of a dynamic Field
export const FieldSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Field name is required"), // JSON key, e.g., "industry"
  label: z.string().min(1, "Field label is required"), // Display name, e.g., "Industry"
  type: z.enum(["text", "number", "select", "currency", "email", "phone", "date"]),
  options: z.array(z.string()).optional(), // For select fields
  isRequired: z.boolean().default(false),
  orderIndex: z.number().int().nonnegative()
});

// Define the shape of a Stage
export const StageSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Stage name is required"),
  orderIndex: z.number().int().nonnegative(),
  requiredFields: z.array(z.string()), // Array of Field 'name's required to enter this stage
  color: z.string().optional()
});

// Define the overall Blueprint
export const BlueprintSchema = z.object({
  id: z.string().uuid().optional(),
  moduleType: z.string().min(1, "Module type is required"), // e.g., "Lead"
  version: z.number().int().positive().default(1),
  fields: z.array(FieldSchema),
  stages: z.array(StageSchema)
});

// Export TypeScript types inferred from Zod schemas
export type Field = z.infer<typeof FieldSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type Blueprint = z.infer<typeof BlueprintSchema>;

// Define the dynamic Lead data structure
export const LeadSchema = z.object({
  id: z.string().uuid().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  owner: z.string().optional(),
  stageId: z.string().uuid("Invalid stage ID"),
  customData: z.record(z.string(), z.any()) // Flexible JSON object for dynamic fields
});

export type Lead = z.infer<typeof LeadSchema>;
