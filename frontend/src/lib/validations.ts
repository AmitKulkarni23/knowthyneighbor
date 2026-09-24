import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const profileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Name is too long'),
  age: z
    .number({ error: 'Age is required' })
    .int({ error: 'Age must be a whole number' })
    .min(18, { error: 'Must be at least 18' })
    .max(120, { error: 'Enter a valid age' }),
  hasKids: z.boolean(),
  numKids: z.number().int().min(0).max(20).optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const coupleSchema = z.object({
  coupleName: z.string().max(100, 'Name is too long').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional().or(z.literal('')),
  zipCode: z
    .string()
    .min(1, 'Zip code is required')
    .regex(/^\d{5}(-\d{4})?$/, 'Enter a valid US zip code (e.g. 90210)'),
  hostingPreference: z.enum(['host', 'visit', 'both']),
  partnerName: z
    .string()
    .min(1, "Partner's name is required")
    .max(100, 'Name is too long'),
  partnerAge: z
    .number({ error: "Partner's age is required" })
    .int({ error: 'Age must be a whole number' })
    .min(18, { error: 'Must be at least 18' })
    .max(120, { error: 'Enter a valid age' }),
  partnerHasKids: z.boolean(),
  partnerNumKids: z.number().int().min(0).max(20).optional(),
});

export type CoupleFormData = z.infer<typeof coupleSchema>;

export const mealProposalSchema = z.object({
  mealType: z.enum(['brunch', 'lunch', 'dinner']),
  mealDate: z.string().min(1, 'Pick a date and time'),
});

export type MealProposalFormData = z.infer<typeof mealProposalSchema>;

export const joinRequestSchema = z.object({
  mealType: z.enum(['brunch', 'lunch', 'dinner']),
  message: z.string().max(500, 'Message must be under 500 characters').optional().or(z.literal('')),
});

export type JoinRequestFormData = z.infer<typeof joinRequestSchema>;
