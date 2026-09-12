import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.initTransporter();
  }

  private async initTransporter() {
    try {
      // If SMTP_URL is provided in .env, use it (e.g. smtps://user:pass@smtp.gmail.com)
      if (process.env.SMTP_URL) {
        this.transporter = nodemailer.createTransport(process.env.SMTP_URL);
        this.logger.log('Mail transporter initialized with custom SMTP_URL');
        return;
      }

      // Otherwise, create an Ethereal test account automatically
      this.logger.log('No SMTP_URL found. Generating Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user, // generated ethereal user
          pass: testAccount.pass, // generated ethereal password
        },
      });
      this.logger.log('Ethereal test mail transporter initialized');
    } catch (error) {
      this.logger.error('Failed to initialize mail transporter', error);
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string) {
    if (!this.transporter) {
      this.logger.error('Mail transporter not ready');
      return;
    }

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const info = await this.transporter.sendMail({
      from: '"Aile Finans" <noreply@ailefinans.com>',
      to: to,
      subject: 'Şifre Sıfırlama İsteği',
      text: `Şifrenizi sıfırlamak için şu linke tıklayın: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Şifre Sıfırlama Talebi</h2>
          <p>Merhaba,</p>
          <p>Aile Finans hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Şifremi Sıfırla</a>
          </div>
          <p>Bu bağlantının süresi 1 saat sonra dolacaktır.</p>
          <p>Eğer bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
          <hr style="border: 1px solid #eee; margin-top: 30px;" />
          <p style="font-size: 12px; color: #888;">Eğer butona tıklayamıyorsanız şu linki kopyalayıp tarayıcınıza yapıştırın:<br />${resetUrl}</p>
        </div>
      `,
    });

    this.logger.log(`Password reset email sent: ${info.messageId}`);
    
    // Preview only available when sending through an Ethereal account
    if (info.messageId && info.envelope.from === 'noreply@ailefinans.com' && !process.env.SMTP_URL) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      this.logger.log(`Preview Password Reset Email: ${previewUrl}`);
      // Also log it clearly so the user sees it in the dev console
      console.log('\n========================================================================');
      console.log(`TEST E-POSTASI GÖNDERİLDİ! Aşağıdaki linkten gönderilen maili görebilirsiniz:`);
      console.log(previewUrl);
      console.log('========================================================================\n');
    }
  }
}
