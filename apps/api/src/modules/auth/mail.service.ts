import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initTransporter();
  }

  private async initTransporter(): Promise<void> {
    try {
      // 1. Check for dedicated Resend API Key
      if (process.env.RESEND_API_KEY) {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 465,
          secure: true,
          auth: {
            user: 'resend',
            pass: process.env.RESEND_API_KEY.trim(),
          },
        });
        this.logger.log('Mail transporter initialized with Resend SMTP (smtp.resend.com:465)');
        return;
      }

      // 2. Check for standard SMTP_URL (e.g. smtps://user:pass@smtp.gmail.com:465)
      if (process.env.SMTP_URL) {
        this.transporter = nodemailer.createTransport(process.env.SMTP_URL.trim());
        this.logger.log('Mail transporter initialized with custom SMTP_URL');
        return;
      }

      // 3. Check for granular SMTP configuration
      if (process.env.SMTP_HOST) {
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const secure = process.env.SMTP_SECURE === 'true' || port === 465;
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST.trim(),
          port,
          secure,
          auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER.trim(),
            pass: (process.env.SMTP_PASS || '').trim(),
          } : undefined,
        });
        this.logger.log(`Mail transporter initialized with custom SMTP_HOST (${process.env.SMTP_HOST}:${port})`);
        return;
      }

      // 4. Fallback: Ethereal test account for local dev / sandbox
      this.logger.warn('No SMTP configuration found (RESEND_API_KEY, SMTP_URL, or SMTP_HOST). Generating Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.logger.log('Ethereal test mail transporter initialized');
    } catch (error) {
      this.logger.error('Failed to initialize mail transporter', error);
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string) {
    await this.initPromise;

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Always log the reset link prominently in development/console for immediate developer access
    console.log('\n========================================================================');
    console.log(`[Aile Finans] ŞİFRE SIFIRLAMA TALEBİ:`);
    console.log(`Hedef E-posta : ${to}`);
    console.log(`Sıfırlama Linki: ${resetUrl}`);
    console.log('========================================================================\n');

    if (!this.transporter) {
      this.logger.error('Mail transporter not available. Email could not be sent.');
      return;
    }

    const defaultFrom = process.env.RESEND_API_KEY
      ? '"Aile Finans" <onboarding@resend.dev>'
      : '"Aile Finans" <noreply@ailefinans.com>';
    const fromAddress = process.env.SMTP_FROM || defaultFrom;

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: to,
        subject: 'Aile Finans - Şifre Sıfırlama Talebi',
        text: `Merhaba,\n\nAile Finans hesabınız için şifre sıfırlama talebinde bulundunuz.\nŞifrenizi sıfırlamak için şu bağlantıya tıklayın:\n${resetUrl}\n\nBu bağlantı 1 saat boyunca geçerlidir. Eğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayın.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 16px;">
            <div style="background-color: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #059669; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Aile Finans</h1>
                <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Akıllı Aile Bütçe Yönetimi</p>
              </div>

              <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-top: 0;">Şifre Sıfırlama Talebi</h2>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Merhaba,
              </p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Aile Finans hesabınızın şifresini yenilemek için talepte bulundunuz. Aşağıdaki butona tıklayarak yeni şifrenizi kolayca belirleyebilirsiniz:
              </p>
              
              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
                  Şifremi Sıfırla
                </a>
              </div>
              
              <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                ⏱️ Bu bağlantı güvenlik nedeniyle <strong>1 saat</strong> sonra geçerliliğini yitirecektir.
              </p>
              <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
                Eğer bu talebi siz yapmadıysanız bu e-postayı güvenle görmezden gelebilirsiniz, hesabınız güvendedir.
              </p>
              
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
              
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
                Butona tıklayamıyorsanız aşağıdaki bağlantıyı tarayıcınıza yapıştırın:<br />
                <a href="${resetUrl}" style="color: #059669; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
            
            <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px;">
              © ${new Date().getFullYear()} Aile Finans. Tüm hakları saklıdır.
            </p>
          </div>
        `,
      });

      this.logger.log(`Password reset email sent successfully to ${to} (Message ID: ${info.messageId})`);

      // If Ethereal was used, log the preview link
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        this.logger.log(`[Ethereal Preview URL]: ${previewUrl}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email to ${to}: ${err.message}`, err.stack);
    }
  }
}
