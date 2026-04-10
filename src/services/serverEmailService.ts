import { Resend } from 'resend';
import { writeAuditLog } from './auditLog.js';

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export const serverEmailService = {
  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    category?: string;
  }) {
    if (!resend) {
      console.warn('Resend API key not configured, skipping email to:', params.to);
      return { success: false, error: 'Resend not configured' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: 'SomnoAI Digital Sleep Lab <onboarding@resend.dev>',
        to: [params.to],
        subject: params.subject,
        html: params.html,
      });

      await writeAuditLog({
        source: 'email_service',
        level: error ? 'error' : 'info',
        category: (params.category as any) ?? 'admin',
        action: 'send_email',
        status: error ? 'failed' : 'success',
        message: error ? `Failed to send email to ${params.to}` : `Email sent to ${params.to}`,
        metadata: { 
          to: params.to, 
          subject: params.subject, 
          category: params.category,
          resendId: data?.id 
        },
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('serverEmailService.sendEmail error:', error);
      return { success: false, error };
    }
  },

  async sendBlockNotification(email: string, reason: string) {
    return this.sendEmail({
      to: email,
      subject: 'Account Blocked - SomnoAI Digital Sleep Lab',
      category: 'account_block',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 10px; background-color: #fef2f2;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://sleepsomno.com/logo_512.png" alt="SomnoAI Digital Sleep Lab Logo" style="width: 60px; height: 60px; object-fit: contain;">
          </div>
          <h1 style="color: #dc2626; text-align: center;">Account Blocked</h1>
          <p>Hello,</p>
          <p>Your account at SomnoAI Digital Sleep Lab has been blocked by an administrator.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>If you believe this is a mistake, please contact our support team at <a href="mailto:support@sleepsomno.com">support@sleepsomno.com</a>.</p>
          <p>Best regards,<br>The SomnoAI Digital Sleep Lab Team</p>
        </div>
      `,
    });
  },

  async sendUnblockNotification(email: string) {
    return this.sendEmail({
      to: email,
      subject: 'Account Unblocked - SomnoAI Digital Sleep Lab',
      category: 'account_unblock',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dcfce7; border-radius: 10px; background-color: #f0fdf4;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://sleepsomno.com/logo_512.png" alt="SomnoAI Digital Sleep Lab Logo" style="width: 60px; height: 60px; object-fit: contain;">
          </div>
          <h1 style="color: #16a34a; text-align: center;">Account Unblocked</h1>
          <p>Hello,</p>
          <p>Your account at SomnoAI Digital Sleep Lab has been unblocked. You can now log in and access your dashboard.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://sleepsomno.com/login" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In Now</a>
          </div>
          <p>Best regards,<br>The SomnoAI Digital Sleep Lab Team</p>
        </div>
      `,
    });
  },

  async sendDeleteNotification(email: string) {
    return this.sendEmail({
      to: email,
      subject: 'Account Deleted - SomnoAI Digital Sleep Lab',
      category: 'account_delete',
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://sleepsomno.com/logo_512.png" alt="SomnoAI Digital Sleep Lab Logo" style="width: 60px; height: 60px; object-fit: contain;">
          </div>
          <h1 style="color: #4b5563; text-align: center;">Account Deleted</h1>
          <p>Hello,</p>
          <p>This is to inform you that your account at SomnoAI Digital Sleep Lab has been deleted by an administrator.</p>
          <p>All your personal data has been removed from our active systems.</p>
          <p>If you have any questions, please contact <a href="mailto:support@sleepsomno.com">support@sleepsomno.com</a>.</p>
          <p>Best regards,<br>The SomnoAI Digital Sleep Lab Team</p>
        </div>
      `,
    });
  },

  async sendNewDeviceAlert(email: string, details: { ip: string, location: string, userAgent: string, isNewDevice: boolean, fullName?: string }) {
    return this.sendEmail({
      to: email,
      subject: details.isNewDevice ? 'Security Alert: New Device Login' : 'Login Notification',
      category: 'security_alert',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://sleepsomno.com/logo_512.png" alt="SomnoAI Digital Sleep Lab Logo" style="width: 60px; height: 60px; object-fit: contain;">
          </div>
          <h2 style="color: #1e40af; text-align: center;">${details.isNewDevice ? 'New Device Login Detected' : 'Login Notification'}</h2>
          <p>Hello ${details.fullName || 'User'},</p>
          <p>Your SomnoAI Digital Sleep Lab account was just accessed from a ${details.isNewDevice ? 'new' : ''} device.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toUTCString()}</p>
            <p style="margin: 5px 0;"><strong>IP Address:</strong> ${details.ip}</p>
            <p style="margin: 5px 0;"><strong>Location:</strong> ${details.location}</p>
            <p style="margin: 5px 0;"><strong>Device:</strong> ${details.userAgent}</p>
          </div>
          
          <p>If this was you, you can safely ignore this email. If you don't recognize this activity, please change your password immediately and contact support.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://sleepsomno.com/settings" style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Account Security</a>
          </div>
          
          <p style="margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">
            This is an automated security notification.
          </p>
        </div>
      `,
    });
  },

  async sendContactVerification(email: string, code: string) {
    return this.sendEmail({
      to: email,
      subject: 'Verify your contact request - SomnoAI Digital Sleep Lab',
      category: 'contact_verification',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://sleepsomno.com/logo_512.png" alt="SomnoAI Digital Sleep Lab Logo" style="width: 60px; height: 60px; object-fit: contain;">
          </div>
          <h1 style="color: #1e40af; text-align: center;">Verify Your Email</h1>
          <p>Hello,</p>
          <p>Thank you for reaching out to SomnoAI Digital Sleep Lab. To prevent spam and ensure we can get back to you, please verify your email address by entering the following code on the contact page:</p>
          <div style="margin: 30px 0; text-align: center;">
            <span style="background-color: #1e40af; color: white; padding: 15px 30px; border-radius: 10px; font-size: 24px; font-weight: bold; letter-spacing: 5px;">${code}</span>
          </div>
          <p>This code will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Best regards,<br>The SomnoAI Digital Sleep Lab Team</p>
        </div>
      `,
    });
  }
};
