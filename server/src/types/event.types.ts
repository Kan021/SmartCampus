import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  venue: z.string().min(2).max(300),
  eventDate: z.string().datetime({ offset: true }).or(z.string().min(1)),
  endDate: z.string().optional().nullable(),
  category: z.enum(['cultural', 'technical', 'sports', 'academic', 'workshop', 'seminar', 'general']).default('general'),
  organizerType: z.enum(['club', 'faculty', 'admin', 'department']).default('club'),
  organizerName: z.string().min(2).max(200),
  clubName: z.string().optional().nullable(),
  clubContact: z.string().optional().nullable(),
  clubLogoBase64: z.string().optional().nullable(),
  facultyName: z.string().optional().nullable(),
  facultyPhone: z.string().optional().nullable(),
  facultyEmail: z.string().email().optional().nullable().or(z.literal('')),
  registrationLink: z.string().url().optional().nullable().or(z.literal('')),
  maxParticipants: z.number().int().positive().optional().nullable(),
  tags: z.string().optional().default(''),
  isPublished: z.boolean().optional().default(true),
});

export const updateEventSchema = createEventSchema.partial();

export const addFileSchema = z.object({
  fileName: z.string().min(1).max(300),
  fileBase64: z.string().min(1),
  fileType: z.enum(['pdf', 'image', 'doc', 'ppt', 'other']),
  fileSizeKb: z.number().int().optional().nullable(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type AddFileInput = z.infer<typeof addFileSchema>;
