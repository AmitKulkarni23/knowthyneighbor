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
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const coupleSchema = z.object({
  coupleName: z.string().max(100, 'Name is too long').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100, 'City name is too long'),
  state: z.string().min(1, 'State / province is required').max(100, 'State name is too long'),
  country: z.string().min(1, 'Country is required'),
  zipCode: z
    .string()
    .min(1, 'Zip code is required')
    .max(20, 'Zip code is too long'),
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
});

export type CoupleFormData = z.infer<typeof coupleSchema>;

export const joinRequestSchema = z.object({
  slot: z.string().min(1, 'Pick a date and meal'),
  message: z.string().max(500, 'Message must be under 500 characters').optional().or(z.literal('')),
});

export type JoinRequestFormData = z.infer<typeof joinRequestSchema>;
