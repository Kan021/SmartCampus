import { z } from 'zod';

// ─── Update Profile Schema ─────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number')
    .optional()
    .nullable(),
  bio: z.string().max(400, 'Bio must be under 400 characters').optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  avatarBase64: z
    .string()
    .refine(
      (val) => !val || val.startsWith('data:image/'),
      'Avatar must be a valid base64 image data URL'
    )
    .optional()
    .nullable(),

  // Student fields
  rollNumber: z.string().max(30).optional().nullable(),
  year: z.number().int().min(1).max(6).optional().nullable(),
  section: z.string().max(10).optional().nullable(),
  course: z.string().max(100).optional().nullable(),
  bloodGroup: z.string().max(5).optional().nullable(),
  altPhone: z.string().max(20).optional().nullable(),
  universityRollNo: z.string().max(30).optional().nullable(),
  university: z.string().max(50).optional().nullable(),
  hostelName: z.string().max(100).optional().nullable(),
  hostelRoom: z.string().max(20).optional().nullable(),
  homeAddress: z.string().max(500).optional().nullable(),

  // Faculty fields
  employeeId: z.string().max(30).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),

  // Admin fields
  adminCode: z.string().max(30).optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── Admin: Update User Role Schema ───────────────────────────────────────
export const updateUserRoleSchema = z.object({
  role: z.enum(['student', 'faculty', 'admin'], {
    errorMap: () => ({ message: 'Role must be student, faculty, or admin' }),
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// ─── Admin: List Users Query Schema ───────────────────────────────────────
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['student', 'faculty', 'admin']).optional(),
  search: z.string().max(100).optional(),
  year: z.coerce.number().int().min(1).max(6).optional(),
  section: z.string().max(20).optional(),
  course: z.string().max(20).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
