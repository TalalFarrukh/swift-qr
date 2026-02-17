import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a 6-digit hex color like #000000')
  .optional();

const customizationSchema = z
  .object({
    fgColor: hexColor,
    bgColor: hexColor,
    logoUrl: z
      .union([
        z
          .string()
          .trim()
          .url('Enter a valid logo URL'),
        z.literal(''),
      ])
      .optional(),
    style: z.enum(['classic', 'rounded', 'dots']).optional(),
  })
  .optional();

export const createDynamicQRSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['url', 'text']),
  destinationUrl: z.string().min(1, 'Destination is required').url('Enter a valid URL'),
  customization: customizationSchema,
});

export type CreateDynamicQRInput = z.infer<typeof createDynamicQRSchema>;

export const updateDynamicQRSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  destinationUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  isPasswordProtected: z.boolean().optional(),
  password: z.string().min(4, 'Password must be at least 4 characters').optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export type UpdateDynamicQRInput = z.infer<typeof updateDynamicQRSchema>;

