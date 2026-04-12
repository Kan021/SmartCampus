import { z } from 'zod';

// ─── Create Attendance Session ─────────────────────────────────────────
export const createSessionSchema = z.object({
  subject: z.string().min(2, 'Subject must be at least 2 characters').max(200),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  duration: z.number().int().min(5, 'Duration must be at least 5 minutes').max(180, 'Duration cannot exceed 3 hours').default(15),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

// ─── Mark Attendance ───────────────────────────────────────────────────
export const markAttendanceSchema = z.object({
  sessionCode: z.string().length(8, 'Session code must be 8 characters'),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
