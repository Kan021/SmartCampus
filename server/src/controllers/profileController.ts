import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { updateProfileSchema, updateUserRoleSchema, listUsersQuerySchema } from '../types/profile.types';

// ─── Helper: generate campus ID card number ───────────────────────────────
function generateIdCardNumber(role: string): string {
  const prefix = role === 'student' ? 'SC-STU' : role === 'faculty' ? 'SC-FAC' : 'SC-ADM';
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${year}-${random}`;
}

// ─── Helper: get or create profile ───────────────────────────────────────
async function getOrCreateProfile(userId: string, role: string) {
  let profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId,
        idCardNumber: generateIdCardNumber(role),
      },
    });
  }
  return profile;
}

// ─── GET /api/profile/me ─────────────────────────────────────────────────
export async function getMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const profile = await getOrCreateProfile(userId, role);

    res.json({
      success: true,
      data: { ...user, profile },
    });
  } catch (err) {
    console.error('getMyProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}

// ─── PUT /api/profile/me ─────────────────────────────────────────────────
export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const { userId, role } = req.user!;

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    // Ensure profile exists first
    await getOrCreateProfile(userId, role);

    const updated = await prisma.profile.update({
      where: { userId },
      data: { ...parsed.data },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: updated,
    });
  } catch (err) {
    console.error('updateMyProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

// ─── GET /api/profile/users — Admin only ──────────────────────────────────
export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const parsed = listUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { page, limit, role, search, year, section, course } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }
    // Profile-level filters
    const profileFilter: any = {};
    if (year) profileFilter.year = year;
    if (section) profileFilter.section = section;
    if (course) profileFilter.course = course;
    if (Object.keys(profileFilter).length > 0) {
      where.profile = profileFilter;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isVerified: true,
          createdAt: true,
          lastLoginAt: true,
          profile: {
            select: {
              idCardNumber: true,
              department: true,
              rollNumber: true,
              employeeId: true,
              avatarBase64: true,
              year: true,
              section: true,
              course: true,
              bloodGroup: true,
              hostelName: true,
              hostelRoom: true,
              phone: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ success: false, message: 'Failed to list users.' });
  }
}

// ─── GET /api/profile/:userId — Admin only ──────────────────────────────
export async function getUserProfile(req: Request, res: Response): Promise<void> {
  try {
    const targetId = String(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isVerified: true,
        createdAt: true,
        lastLoginAt: true,
        profile: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('getUserProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve user profile.' });
  }
}

// ─── PATCH /api/profile/users/:userId/role — Admin only ──────────────────
export async function updateUserRole(req: Request, res: Response): Promise<void> {
  try {
    const targetId = String(req.params.userId);
    const requestingUserId = req.user!.userId;

    // Prevent self-role-change
    if (targetId === requestingUserId) {
      res.status(403).json({ success: false, message: 'You cannot change your own role.' });
      return;
    }

    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid role value',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: String(targetId) } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role: parsed.data.role },
      select: { id: true, email: true, fullName: true, role: true },
    });

    res.json({
      success: true,
      message: `Role updated to '${parsed.data.role}'.`,
      data: updated,
    });
  } catch (err) {
    console.error('updateUserRole error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user role.' });
  }
}

// ─── PUT /api/profile/users/:userId — Admin edits any user's profile ─────
export async function updateUserProfile(req: Request, res: Response): Promise<void> {
  try {
    const targetId = String(req.params.userId);
    const profile = await prisma.profile.findUnique({ where: { userId: targetId } });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Profile not found.' });
      return;
    }

    const { year, section, course, department, rollNumber, phone, bloodGroup, hostelName, hostelRoom, homeAddress } = req.body;
    const data: any = {};
    if (year !== undefined) data.year = year ? Number(year) : null;
    if (section !== undefined) data.section = section || null;
    if (course !== undefined) data.course = course || null;
    if (department !== undefined) data.department = department || null;
    if (rollNumber !== undefined) data.rollNumber = rollNumber || null;
    if (phone !== undefined) data.phone = phone || null;
    if (bloodGroup !== undefined) data.bloodGroup = bloodGroup || null;
    if (hostelName !== undefined) data.hostelName = hostelName || null;
    if (hostelRoom !== undefined) data.hostelRoom = hostelRoom || null;
    if (homeAddress !== undefined) data.homeAddress = homeAddress || null;

    const updated = await prisma.profile.update({
      where: { userId: targetId },
      data,
    });

    res.json({ success: true, message: 'Profile updated.', data: { profile: updated } });
  } catch (err) {
    console.error('updateUserProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

// ─── POST /api/profile/bulk-update — Admin bulk updates profiles ─────────
export async function bulkUpdateProfiles(req: Request, res: Response): Promise<void> {
  try {
    const { userIds, updates } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ success: false, message: 'userIds array required.' });
      return;
    }
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ success: false, message: 'updates object required.' });
      return;
    }

    const data: any = {};
    if (updates.year !== undefined) data.year = updates.year ? Number(updates.year) : null;
    if (updates.section !== undefined) data.section = updates.section || null;
    if (updates.course !== undefined) data.course = updates.course || null;
    if (updates.department !== undefined) data.department = updates.department || null;

    if (Object.keys(data).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields to update.' });
      return;
    }

    const result = await prisma.profile.updateMany({
      where: { userId: { in: userIds } },
      data,
    });

    res.json({
      success: true,
      message: `Updated ${result.count} profile(s).`,
      data: { updatedCount: result.count },
    });
  } catch (err) {
    console.error('bulkUpdateProfiles error:', err);
    res.status(500).json({ success: false, message: 'Failed to bulk update.' });
  }
}
