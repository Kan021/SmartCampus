interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}
export declare function sendEmail(options: EmailOptions): Promise<void>;
export declare function sendVerificationEmail(email: string, otp: string): Promise<void>;
export declare function sendPasswordResetEmail(email: string, otp: string): Promise<void>;
export declare function sendNoticeNotification(to: string, opts: {
    recipientName: string;
    noticeTitle: string;
    category: string;
    postedBy: string;
}): Promise<void>;
export declare function sendClassNoteNotification(to: string, opts: {
    recipientName: string;
    noteTitle: string;
    classroomName: string;
    uploaderName: string;
    description?: string;
}): Promise<void>;
export declare function sendClassMessageNotification(to: string, opts: {
    recipientName: string;
    classroomName: string;
    senderName: string;
    messagePreview: string;
}): Promise<void>;
export {};
//# sourceMappingURL=emailService.d.ts.map