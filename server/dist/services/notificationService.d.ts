/**
 * notificationService.ts
 *
 * Fire-and-forget email notification dispatcher.
 * All functions are async but callers do NOT await them —
 * this ensures API responses are never delayed by email sending.
 */
/**
 * Called after a notice is created.
 * Sends email to ALL registered users (who have an email address).
 * Runs as fire-and-forget — does not block the API response.
 */
export declare function notifyAllUsersAboutNotice(notice: {
    title: string;
    category: string;
    authorName: string;
}): void;
/**
 * Called after a class note is uploaded.
 * Sends email to all members of that specific classroom.
 */
export declare function notifyClassroomMembersAboutNote(classroomId: string, note: {
    title: string;
    description?: string | null;
}, uploaderName: string): void;
/**
 * Called after a faculty posts a classroom message.
 * Sends email to all members of that classroom.
 */
export declare function notifyClassroomMembersAboutMessage(classroomId: string, message: {
    content: string;
}, senderName: string): void;
//# sourceMappingURL=notificationService.d.ts.map