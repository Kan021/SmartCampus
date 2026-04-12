import { z } from 'zod';

export const createNoticeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  content: z.string().min(5, 'Content must be at least 5 characters').max(2000),
  category: z.enum(['general', 'academic', 'exam', 'event', 'urgent']).default('general'),
  pdfBase64: z.string().optional(),
  pdfFileName: z.string().optional(),
});

export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;

export const updateNoticeSchema = createNoticeSchema.partial();
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>;
