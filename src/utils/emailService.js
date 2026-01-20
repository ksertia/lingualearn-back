const nodemailer = require('nodemailer');
const { appConfig } = require('../config/appConfig');
const { logger } = require('./logger');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: appConfig.email.host,
            port: appConfig.email.port,
            secure: appConfig.email.secure || false,
            auth: {
                user: appConfig.email.user,
                pass: appConfig.email.pass
            }
        });

        logger.info(`Nodemailer configured for user: ${appConfig.email.user}`);
    }

    /* =========================
       TEMPLATE EMAIL GLOBAL
    ========================== */
    emailTemplate({ title, message, buttonText, buttonLink, color = '#2563eb', footerNote }) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0; padding:0; background:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center">
                        <table width="600" style="background:#ffffff; margin:40px auto; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.08); overflow:hidden;">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background:${color}; padding:25px; text-align:center; color:#ffffff;">
                                    <h1 style="margin:0; font-size:24px;">Lingualearn</h1>
                                </td>
                            </tr>

                            <!-- Content -->
                            <tr>
                                <td style="padding:30px;">
                                    <h2 style="color:#111827; margin-bottom:15px;">${title}</h2>
                                    <div style="color:#374151; font-size:15px; line-height:1.7;">
                                        ${message}
                                    </div>

                                    ${
                                        buttonText
                                            ? `
                                    <div style="text-align:center; margin:35px 0;">
                                        <a href="${buttonLink}" 
                                           style="background:${color}; color:#ffffff; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">
                                            ${buttonText}
                                        </a>
                                    </div>
                                    `
                                            : ''
                                    }

                                    ${
                                        footerNote
                                            ? `<p style="font-size:13px; color:#6b7280;">${footerNote}</p>`
                                            : ''
                                    }
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background:#f9fafb; padding:18px; text-align:center; font-size:12px; color:#9ca3af;">
                                    © ${new Date().getFullYear()} Lingualearn. All rights reserved.
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;
    }

    /* =========================
       ENVOI EMAIL GÉNÉRIQUE
    ========================== */
    async sendMail({ to, subject, html }) {
        try {
            const mailOptions = {
                from: `"Lingualearn Auth" <${appConfig.email.user}>`,
                to,
                subject,
                html
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent successfully: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error('Email sending failed:', error);
            return false;
        }
    }

    async sendEmail(to, subject, html) {
        return this.sendMail({ to, subject, html });
    }

    /* =========================
       RESET PASSWORD
    ========================== */
    async sendPasswordResetEmail(email, resetToken) {
        const resetLink = `${appConfig.clientUrl}/reset-password?token=${resetToken}`;

        const html = this.emailTemplate({
            title: 'Password Reset Request',
            message: `
                <p>You requested to reset your password.</p>
                <p>Please click the button below to continue.</p>
            `,
            buttonText: 'Reset Password',
            buttonLink: resetLink,
            color: '#2563eb',
            footerNote: 'This link will expire in 1 hour. If you did not request a password reset, please ignore this email.'
        });

        return this.sendEmail(email, 'Password Reset Request', html);
    }

    /* =========================
       EMAIL VERIFICATION
    ========================== */
    async sendVerificationEmail(email, verificationToken) {
        const verifyLink = `${appConfig.clientUrl}/verify-email?token=${verificationToken}`;

        const html = this.emailTemplate({
            title: 'Verify Your Email Address',
            message: `
                <p>Thank you for creating an account with Lingualearn.</p>
                <p>Please verify your email address to activate your account.</p>
            `,
            buttonText: 'Verify Email',
            buttonLink: verifyLink,
            color: '#16a34a',
            footerNote: 'This verification link will expire in 24 hours.'
        });

        return this.sendEmail(email, 'Verify Your Email', html);
    }

    /* =========================
       PASSWORD CHANGED
    ========================== */
    async sendPasswordChangedEmail(email) {
        const html = this.emailTemplate({
            title: 'Password Changed Successfully',
            message: `
                <p>Your password has been changed successfully.</p>
                <p>If you did not perform this action, please contact our support team immediately.</p>
            `,
            color: '#dc2626'
        });

        return this.sendEmail(email, 'Password Changed Successfully', html);
    }
}

const emailService = new EmailService();
module.exports = { emailService };
