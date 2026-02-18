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

const campaignTypeSchema = z.enum(['one-shot', 'fidelity', 'membership']).optional();

const campaignFieldsSchema = z.object({
  campaignType: campaignTypeSchema,
  scanLimit: z
    .number()
    .int()
    .positive('Scan limit must be a positive integer')
    .max(1_000_000, 'Scan limit is too large')
    .optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
});

function parseDateOnly(s: string): Date | null {
  if (!s || typeof s !== 'string' || s.length < 10) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

const campaignRefinements = {
  fidelity: (data: { campaignType?: string | null; scanLimit?: number | null }) =>
    data.campaignType !== 'fidelity' ||
    (typeof data.scanLimit === 'number' && data.scanLimit >= 1),
  membershipDates: (data: { campaignType?: string | null; validFrom?: string | null; validUntil?: string | null }) => {
    if (data.campaignType !== 'membership') return true;
    const from = (data.validFrom ?? '').trim();
    const until = (data.validUntil ?? '').trim();
    return from.length > 0 && until.length > 0;
  },
  validUntilAfterToday: (data: { campaignType?: string | null; validUntil?: string | null }) => {
    if (data.campaignType !== 'membership') return true;
    const until = (data.validUntil ?? '').trim();
    if (until.length < 10) return true; // required check handled elsewhere
    const untilDate = parseDateOnly(until);
    if (!untilDate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    untilDate.setHours(0, 0, 0, 0);
    return untilDate > today;
  },
};

export const createDynamicQRSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['url', 'text']),
  destinationUrl: z.string().min(1, 'Destination is required').url('Enter a valid URL'),
  customization: customizationSchema,
})
  .merge(campaignFieldsSchema.partial())
  .refine(campaignRefinements.fidelity, {
    message: 'Scan limit is required for Fidelity campaigns and must be at least 1',
    path: ['scanLimit'],
  })
  .refine(campaignRefinements.membershipDates, {
    message: 'Valid from and Valid until are both required for Membership campaigns',
    path: ['validFrom'],
  })
  .refine(campaignRefinements.validUntilAfterToday, {
    message: "Valid until must be after today (choose tomorrow or a later date)",
    path: ['validUntil'],
  });

export type CreateDynamicQRInput = z.infer<typeof createDynamicQRSchema>;

const updateCampaignFieldsSchema = campaignFieldsSchema
  .extend({
    scanLimit: z
      .number()
      .int()
      .positive('Scan limit must be a positive integer')
      .max(1_000_000, 'Scan limit is too large')
      .nullable()
      .optional(),
    validFrom: z.string().nullable().optional(),
    validUntil: z.string().nullable().optional(),
  })
  .partial();

export const updateDynamicQRSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  destinationUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  isPasswordProtected: z.boolean().optional(),
  password: z.string().min(4, 'Password must be at least 4 characters').optional(),
  folderId: z.string().uuid().nullable().optional(),
})
  .merge(updateCampaignFieldsSchema)
  .refine(campaignRefinements.fidelity, {
    message: 'Scan limit is required for Fidelity campaigns and must be at least 1',
    path: ['scanLimit'],
  })
  .refine(campaignRefinements.membershipDates, {
    message: 'Valid from and Valid until are both required for Membership campaigns',
    path: ['validFrom'],
  })
  .refine(campaignRefinements.validUntilAfterToday, {
    message: "Valid until must be after today (choose tomorrow or a later date)",
    path: ['validUntil'],
  });

export type UpdateDynamicQRInput = z.infer<typeof updateDynamicQRSchema>;

