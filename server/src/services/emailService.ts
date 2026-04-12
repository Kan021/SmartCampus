import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// In development, log emails to console instead of sending
const isDev = process.env.NODE_ENV !== 'production';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (isDev) {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║           📧  EMAIL (DEV MODE)                ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  To:      ${options.to}`);
    console.log(`║  Subject: ${options.subject}`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log(options.html.replace(/<[^>]*>/g, ''));
    console.log('╚══════════════════════════════════════════════╝\n');
    return;
  }

  await transporter.sendMail({
    from: `"Smart Campus" <${process.env.SMTP_USER}>`,
    ...options,
  });
}

export async function sendVerificationEmail(email: string, otp: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Smart Campus — Verify Your Email',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f172a; color: #e2e8f0; border-radius: 16px;">
        <h1 style="color: #818cf8; margin-bottom: 8px;">🎓 Smart Campus</h1>
        <p style="font-size: 16px; color: #94a3b8;">Verify your email address</p>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #94a3b8;">Your verification code</p>
          <p style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #818cf8; margin: 0;">${otp}</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">This code expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, otp: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Smart Campus — Reset Your Password',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f172a; color: #e2e8f0; border-radius: 16px;">
        <h1 style="color: #818cf8; margin-bottom: 8px;">🎓 Smart Campus</h1>
        <p style="font-size: 16px; color: #94a3b8;">Password reset request</p>
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 14px; color: #94a3b8;">Your reset code</p>
          <p style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #f472b6; margin: 0;">${otp}</p>
        </div>
        <p style="font-size: 13px; color: #64748b;">This code expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
}

// ─── Notification Email Styles (shared BBD theme) ────────────────
const notifBase = (accentColor: string, icon: string, tagline: string, body: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:2px solid #000;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:${accentColor};padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:32px;">${icon}</span></td>
              <td style="padding-left:14px;">
                <div style="color:#fff;font-size:20px;font-weight:900;letter-spacing:-0.3px;">Smart Campus</div>
                <div style="color:rgba(255,255,255,0.75);font-size:13px;">Babu Banarasi Das University</div>
              </td>
              <td align="right">
                <div style="background:rgba(255,255,255,0.18);color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;">${tagline}</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8f9fb;padding:16px 32px;border-top:1px solid rgba(0,0,0,0.08);">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            This is an automated notification from <strong>Smart Campus — BBDU</strong>.<br>
            Please do not reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── New Notice Notification ──────────────────────────────────────
export async function sendNoticeNotification(to: string, opts: {
  recipientName: string;
  noticeTitle: string;
  category: string;
  postedBy: string;
}): Promise<void> {
  const catColors: Record<string, string> = {
    general: '#37474f', academic: '#C62828', hostel: '#1565C0',
    finance: '#2e7d32', exam: '#6a1b9a', sports: '#e65100', cultural: '#c2185b',
  };
  const catColor = catColors[opts.category] || '#C62828';

  const body = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:900;color:#1a1a2e;">📢 New Notice Posted</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Hi ${opts.recipientName}, a new notice has been published on the campus board.</p>

    <div style="border-left:4px solid ${catColor};background:#f8f9fb;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${opts.category.toUpperCase()} NOTICE</div>
      <div style="font-size:18px;font-weight:900;color:#1a1a2e;margin-bottom:6px;">${opts.noticeTitle}</div>
      <div style="font-size:13px;color:#64748b;">Posted by <strong style="color:#C62828;">${opts.postedBy}</strong></div>
    </div>

    <a href="${process.env.CLIENT_URL || 'http://localhost:5174'}/notices"
       style="display:inline-block;background:#C62828;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;margin-bottom:8px;">
      View Notice →
    </a>
    <p style="margin:12px 0 0;font-size:13px;color:#94a3b8;">Log in to Smart Campus to read the full notice and any attachments.</p>
  `;

  await sendEmail({
    to,
    subject: `📢 New Notice: ${opts.noticeTitle} — Smart Campus BBDU`,
    html: notifBase('#C62828', '📢', 'Notice', body),
  });
}

// ─── New Classroom Note Notification ─────────────────────────────
export async function sendClassNoteNotification(to: string, opts: {
  recipientName: string;
  noteTitle: string;
  classroomName: string;
  uploaderName: string;
  description?: string;
}): Promise<void> {
  const body = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:900;color:#1a1a2e;">📁 New Study Material Added</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Hi ${opts.recipientName}, a new note has been uploaded to your classroom.</p>

    <div style="border-left:4px solid #1565C0;background:#f8f9fb;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">📚 ${opts.classroomName}</div>
      <div style="font-size:18px;font-weight:900;color:#1a1a2e;margin-bottom:4px;">${opts.noteTitle}</div>
      ${opts.description ? `<div style="font-size:13px;color:#64748b;margin-bottom:6px;">${opts.description}</div>` : ''}
      <div style="font-size:13px;color:#64748b;">Uploaded by <strong style="color:#1565C0;">${opts.uploaderName}</strong></div>
    </div>

    <a href="${process.env.CLIENT_URL || 'http://localhost:5174'}/classroom"
       style="display:inline-block;background:#1565C0;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;margin-bottom:8px;">
      Open Classroom →
    </a>
    <p style="margin:12px 0 0;font-size:13px;color:#94a3b8;">Log in to Smart Campus to download and view the file.</p>
  `;

  await sendEmail({
    to,
    subject: `📁 New Note in ${opts.classroomName}: ${opts.noteTitle} — Smart Campus BBDU`,
    html: notifBase('#1565C0', '📁', 'Classroom', body),
  });
}

// ─── New Classroom Message Notification ──────────────────────────
export async function sendClassMessageNotification(to: string, opts: {
  recipientName: string;
  classroomName: string;
  senderName: string;
  messagePreview: string;
}): Promise<void> {
  const preview = opts.messagePreview.length > 180
    ? opts.messagePreview.substring(0, 180) + '…'
    : opts.messagePreview;

  const body = `
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:900;color:#1a1a2e;">💬 New Classroom Message</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Hi ${opts.recipientName}, your faculty posted a message in your classroom.</p>

    <div style="border-left:4px solid #2e7d32;background:#f8f9fb;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">💬 ${opts.classroomName}</div>
      <div style="font-size:15px;color:#1a1a2e;line-height:1.6;margin-bottom:8px;">"${preview}"</div>
      <div style="font-size:13px;color:#64748b;">— <strong style="color:#2e7d32;">${opts.senderName}</strong></div>
    </div>

    <a href="${process.env.CLIENT_URL || 'http://localhost:5174'}/classroom"
       style="display:inline-block;background:#2e7d32;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;margin-bottom:8px;">
      Go to Classroom →
    </a>
    <p style="margin:12px 0 0;font-size:13px;color:#94a3b8;">Log in to Smart Campus to reply or view the full conversation.</p>
  `;

  await sendEmail({
    to,
    subject: `💬 New message in ${opts.classroomName} from ${opts.senderName} — Smart Campus BBDU`,
    html: notifBase('#2e7d32', '💬', 'Classroom', body),
  });
}

