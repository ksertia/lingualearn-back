const nodemailer = require('nodemailer');
const { appConfig } = require('../config/appConfig');
const { logger } = require('./logger');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: appConfig.email.host,
            port: appConfig.email.port,
            secure: false,
            auth: {
                user: appConfig.email.user,
                pass: appConfig.email.pass
            }
        });
    }

    // Fonction utilitaire générique
    async sendMail({ to, subject, html }) {
        try {
            const mailOptions = {
                from: `"Lingualearn Auth" <${appConfig.email.user}>`,
                to,
                subject,
                html
            };
            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error('Email sending failed:', error);
            return false;
        }
    }

    async sendEmail(to, subject, html) {
        return this.sendMail({ to, subject, html });
    }

    async sendPasswordResetEmail(email, resetToken) {
        const resetLink = `${appConfig.clientUrl}/reset-password?token=${resetToken}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>You requested to reset your password. Click the link below to proceed:</p>
                <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                    Reset Password
                </a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        `;

        return this.sendEmail(email, 'Password Reset Request', html);
    }

    async sendVerificationEmail(email, verificationToken) {
        const verifyLink = `${appConfig.clientUrl}/verify-email?token=${verificationToken}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Verify Your Email</h2>
                <p>Thank you for registering! Please verify your email by clicking the link below:</p>
                <a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">
                    Verify Email
                </a>
                <p>This link will expire in 24 hours.</p>
            </div>
        `;

        return this.sendEmail(email, 'Verify Your Email', html);
    }

    async sendPasswordChangedEmail(email) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Changed Successfully</h2>
                <p>Your password has been changed successfully.</p>
                <p>If you didn't make this change, please contact our support immediately.</p>
                <p>For security reasons, we recommend using a strong, unique password.</p>
            </div>
        `;

        return this.sendEmail(email, 'Password Changed Successfully', html);
    }
}

const emailService = new EmailService();
module.exports = { emailService };
