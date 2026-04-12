"use strict";
/**
 * notificationService.ts
 *
 * Fire-and-forget email notification dispatcher.
 * All functions are async but callers do NOT await them —
 * this ensures API responses are never delayed by email sending.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyAllUsersAboutNotice = notifyAllUsersAboutNotice;
exports.notifyClassroomMembersAboutNote = notifyClassroomMembersAboutNote;
exports.notifyClassroomMembersAboutMessage = notifyClassroomMembersAboutMessage;
const prisma_1 = require("../utils/prisma");
const emailService_1 = require("./emailService");
// ─── Helpers ──────────────────────────────────────────────────────
/** Send emails in parallel with a concurrency cap to avoid SMTP throttling */
async function sendBatch(items, sender, concurrency = 5) {
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
function notifyAllUsersAboutNotice(notice) {
    // Fire and forget — intentionally not awaited
    (async () => {
        try {
            const users = await prisma_1.prisma.user.findMany({
                select: { email: true, fullName: true },
                where: { email: { not: '' } },
            });
            console.log(`📢 [Notify] Sending notice emails to ${users.length} users...`);
            await sendBatch(users, (u) => (0, emailService_1.sendNoticeNotification)(u.email, {
                recipientName: u.fullName,
                noticeTitle: notice.title,
                category: notice.category,
                postedBy: notice.authorName,
            }));
            console.log(`✅ [Notify] Notice emails dispatched.`);
        }
        catch (err) {
            console.error('❌ [Notify] Failed to send notice emails:', err);
        }
    })();
}
// ─── Classroom Note Notification ──────────────────────────────────
/**
 * Called after a class note is uploaded.
 * Sends email to all members of that specific classroom.
 */
function notifyClassroomMembersAboutNote(classroomId, note, uploaderName) {
    (async () => {
        try {
            const classroom = await prisma_1.prisma.classroom.findUnique({
                where: { id: classroomId },
                select: { name: true },
            });
            if (!classroom)
                return;
            const members = await prisma_1.prisma.classroomMember.findMany({
                where: { classroomId },
                include: { user: { select: { email: true, fullName: true } } },
            });
            // Don't notify the uploader themselves
            const recipients = members
                .map(m => m.user)
                .filter(u => u.email);
            console.log(`📁 [Notify] Sending note emails to ${recipients.length} members of ${classroom.name}...`);
            await sendBatch(recipients, (u) => (0, emailService_1.sendClassNoteNotification)(u.email, {
                recipientName: u.fullName,
                noteTitle: note.title,
                classroomName: classroom.name,
                uploaderName,
                description: note.description ?? undefined,
            }));
            console.log(`✅ [Notify] Note emails dispatched.`);
        }
        catch (err) {
            console.error('❌ [Notify] Failed to send note emails:', err);
        }
    })();
}
// ─── Classroom Message Notification ──────────────────────────────
/**
 * Called after a faculty posts a classroom message.
 * Sends email to all members of that classroom.
 */
function notifyClassroomMembersAboutMessage(classroomId, message, senderName) {
    (async () => {
        try {
            const classroom = await prisma_1.prisma.classroom.findUnique({
                where: { id: classroomId },
                select: { name: true },
            });
            if (!classroom)
                return;
            const members = await prisma_1.prisma.classroomMember.findMany({
                where: { classroomId },
                include: { user: { select: { email: true, fullName: true } } },
            });
            const recipients = members
                .map(m => m.user)
                .filter(u => u.email);
            console.log(`💬 [Notify] Sending message emails to ${recipients.length} members of ${classroom.name}...`);
            await sendBatch(recipients, (u) => (0, emailService_1.sendClassMessageNotification)(u.email, {
                recipientName: u.fullName,
                classroomName: classroom.name,
                senderName,
                messagePreview: message.content,
            }));
            console.log(`✅ [Notify] Message emails dispatched.`);
        }
        catch (err) {
            console.error('❌ [Notify] Failed to send message emails:', err);
        }
    })();
}
//# sourceMappingURL=notificationService.js.map