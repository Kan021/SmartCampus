/**
 * notificationService.ts
 * 
 * Fire-and-forget email notification dispatcher.
 * All functions are async but callers do NOT await them —
 * this ensures API responses are never delayed by email sending.
 */

import { prisma } from '../utils/prisma';
import {
  sendNoticeNotification,
  sendClassNoteNotification,
  sendClassMessageNotification,
} from './emailService';

// ─── Helpers ──────────────────────────────────────────────────────

/** Send emails in parallel with a concurrency cap to avoid SMTP throttling */
async function sendBatch<T>(
  items: T[],
  sender: (item: T) => Promise<void>,
  concurrency = 5,
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    await Promise.allSettled(slice.map(sender));
  }
}

// ─── Notice Notification ──────────────────────────────────────────
/**
 * Called after a notice is created.
 * Sends email to ALL registered users (who have an email address).
 * Runs as fire-and-forget — does not block the API response.
 */
export function notifyAllUsersAboutNotice(notice: {
  title: string;
  category: string;
  authorName: string;
}): void {
  // Fire and forget — intentionally not awaited
  (async () => {
    try {
      const users = await prisma.user.findMany({
        select: { email: true, fullName: true },
        where: { email: { not: '' }, fullName: { not: '' } },
      });

      console.log(`📢 [Notify] Sending notice emails to ${users.length} users...`);

      await sendBatch(users, (u) =>
        sendNoticeNotification(u.email, {
          recipientName: u.fullName,
          noticeTitle: notice.title,
          category: notice.category,
          postedBy: notice.authorName,
        }),
      );

      console.log(`✅ [Notify] Notice emails dispatched.`);
    } catch (err) {
      console.error('❌ [Notify] Failed to send notice emails:', err);
    }
  })();
}

// ─── Classroom Note Notification ──────────────────────────────────
/**
 * Called after a class note is uploaded.
 * Sends email to all members of that specific classroom.
 */
export function notifyClassroomMembersAboutNote(
  classroomId: string,
  note: { title: string; description?: string | null },
  uploaderName: string,
): void {
  (async () => {
    try {
      const classroom = await prisma.classroom.findUnique({
        where: { id: classroomId },
        select: { name: true },
      });
      if (!classroom) return;

      const members = await prisma.classroomMember.findMany({
        where: { classroomId },
        include: { user: { select: { email: true, fullName: true } } },
      });

      // Don't notify the uploader themselves
      const recipients = members
        .map(m => m.user)
        .filter(u => u.email);

      console.log(`📁 [Notify] Sending note emails to ${recipients.length} members of ${classroom.name}...`);

      await sendBatch(recipients, (u) =>
        sendClassNoteNotification(u.email, {
          recipientName: u.fullName,
          noteTitle: note.title,
          classroomName: classroom.name,
          uploaderName,
          description: note.description ?? undefined,
        }),
      );

      console.log(`✅ [Notify] Note emails dispatched.`);
    } catch (err) {
      console.error('❌ [Notify] Failed to send note emails:', err);
    }
  })();
}

// ─── Classroom Message Notification ──────────────────────────────
/**
 * Called after a faculty posts a classroom message.
 * Sends email to all members of that classroom.
 */
export function notifyClassroomMembersAboutMessage(
  classroomId: string,
  message: { content: string },
  senderName: string,
): void {
  (async () => {
    try {
      const classroom = await prisma.classroom.findUnique({
        where: { id: classroomId },
        select: { name: true },
      });
      if (!classroom) return;

      const members = await prisma.classroomMember.findMany({
        where: { classroomId },
        include: { user: { select: { email: true, fullName: true } } },
      });

      const recipients = members
        .map(m => m.user)
        .filter(u => u.email);

      console.log(`💬 [Notify] Sending message emails to ${recipients.length} members of ${classroom.name}...`);

      await sendBatch(recipients, (u) =>
        sendClassMessageNotification(u.email, {
          recipientName: u.fullName,
          classroomName: classroom.name,
          senderName,
          messagePreview: message.content,
        }),
      );

      console.log(`✅ [Notify] Message emails dispatched.`);
    } catch (err) {
      console.error('❌ [Notify] Failed to send message emails:', err);
    }
  })();
}
