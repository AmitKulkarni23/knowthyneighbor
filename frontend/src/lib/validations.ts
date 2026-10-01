import { z } from 'zod';
import { COUNTRIES } from '@/lib/countries';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Limits match the contact-us edge function, which re-checks them server-side
export const contactSchema = loginSchema.extend({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be under 100 characters'),
  message: z.string().trim().min(1, 'Message is required').max(2000, 'Message must be under 2000 characters'),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const profileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Name is too long')
    .regex(/^[^\p{Cc}<>]+$/u, 'Name contains invalid characters'),
  age: z
    .number({ error: 'Age is required' })
    .int({ error: 'Age must be a whole number' })
    .min(18, { error: 'Must be at least 18' })
    .max(120, { error: 'Enter a valid age' }),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

const noControlOrHtml = /^[^\p{Cc}<>]+$/u;

export const coupleSchema = z.object({
  coupleName: z.string().min(1, 'Couple name is required').max(100, 'Name is too long')
    .regex(noControlOrHtml, 'Name contains invalid characters'),
  bio: z.string().max(300, 'Bio must be under 300 characters').optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100, 'City name is too long')
    .regex(noControlOrHtml, 'City contains invalid characters'),
  state: z.string().min(1, 'State / province is required').max(100, 'State name is too long')
    .regex(noControlOrHtml, 'State contains invalid characters'),
  country: z.enum(COUNTRIES, { error: 'Pick your country' }),
  zipCode: z
    .string()
    .min(5, 'Zip code must be at least 5 digits')
    .max(10, 'Zip code is too long')
    .regex(/^\d{5}(-\d{4})?$/, 'Enter a valid US zip code (e.g. 92129 or 92129-1234)'),
  hostingPreference: z.enum(['host', 'visit', 'both']),
  partnerName: z
    .string()
    .min(1, "Partner's name is required")
    .max(100, 'Name is too long')
    .regex(noControlOrHtml, 'Name contains invalid characters'),
  partnerAge: z
    .number({ error: "Partner's age is required" })
    .int({ error: 'Age must be a whole number' })
    .min(18, { error: 'Must be at least 18' })
    .max(120, { error: 'Enter a valid age' }),
});

export type CoupleFormData = z.infer<typeof coupleSchema>;

export const joinRequestSchema = z.object({
  slot: z.string().min(1, 'Pick a date and meal'),
  message: z.string().min(1, 'Add a note to introduce yourselves').max(300, 'Message must be under 300 characters'),
});

export type JoinRequestFormData = z.infer<typeof joinRequestSchema>;
