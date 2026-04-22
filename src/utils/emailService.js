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
            },
            tls: { rejectUnauthorized: false }
        });

        logger.info(`[EMAIL] Nodemailer config: host=${appConfig.email.host}, port=${appConfig.email.port}, user=${appConfig.email.user}`);
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
                                    <h1 style="margin:0; font-size:24px;">LinguaLearn</h1>
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
            logger.info(`[EMAIL] Attempting to send email to: ${to}, subject: ${subject}`);
            logger.info(`[EMAIL] SMTP config: host=${appConfig.email.host}, port=${appConfig.email.port}, user=${appConfig.email.user}`);
            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`[EMAIL] Email sent successfully: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error('[EMAIL] Email sending failed:', error);
            if (error.response) logger.error('[EMAIL] SMTP response:', error.response);
            if (error.code) logger.error('[EMAIL] SMTP error code:', error.code);
            return false;
        }
    }

    async sendEmail(to, subject, html) {
        return this.sendMail({ to, subject, html });
    }

    /* =========================
       RESET PASSWORD
    ========================== */
    async sendPasswordResetOTP(email, otp, expiresInMinutes = 10) {
        // Crée un message HTML pour l'OTP
        const html = this.emailTemplate({
            title: 'Password Reset OTP',
            message: `
                <p>You requested to reset your password.</p>
                <p>Your OTP code is: <strong>${otp}</strong></p>
                <p>This code will expire in ${expiresInMinutes} minutes.</p>
            `,
            buttonText: 'Go to Reset Page',
            buttonLink: `${appConfig.clientUrl}/reset-password`,
            color: '#2563eb',
            footerNote: 'If you did not request a password reset, please ignore this email.'
        });

        // Envoie l'email
        return this.sendEmail(email, 'Password Reset OTP', html);
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

    /* =========================
       BIENVENUE & INSCRIPTION ENFANT
    ========================== */
    async sendWelcomeChildEmail(email, username) {
        const html = this.emailTemplate({
            title: 'Bienvenue sur Lingualearn !',
            message: `
                <p>Votre compte enfant a bien été créé.</p>
                <p>Voici vos informations de connexion :</p>
                <ul>
                  <li><strong>Nom d'utilisateur :</strong> <span style="color:#2563eb;">${username}</span></li>
                  <li><strong>Mot de passe :</strong> Celui que vous avez défini ou reçu</li>
                </ul>
                <p>Conservez bien ces informations pour accéder à la plateforme.</p>
            `,
            color: '#2563eb',
            footerNote: 'Pour toute question, contactez notre support.'
        });
        return this.sendEmail(email, 'Bienvenue sur Lingualearn', html);
    }

    /* =========================
       NOTIFICATION PARENT — CRÉATION SOUS-COMPTE
    ========================== */
    async sendParentChildCreatedEmail(parentEmail, parentName, childUsername, childPassword, childFirstName) {
        const html = this.emailTemplate({
            title: 'Nouveau sous-compte créé',
            message: `
                <p>Bonjour <strong>${parentName}</strong>,</p>
                <p>Un compte enfant a été créé avec succès sur Lingualearn pour <strong>${childFirstName}</strong>.</p>
                <p>Voici les informations de connexion du sous-compte :</p>
                <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                    <tr style="background:#f3f4f6;">
                        <td style="padding:10px 14px; font-weight:bold; color:#374151;">Nom d'utilisateur</td>
                        <td style="padding:10px 14px; color:#2563eb; font-weight:bold;">${childUsername}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px 14px; font-weight:bold; color:#374151;">Mot de passe</td>
                        <td style="padding:10px 14px; color:#374151;">${childPassword}</td>
                    </tr>
                </table>
                <p style="color:#dc2626; font-size:13px;">⚠️ Conservez ces informations en lieu sûr. Vous pouvez modifier le mot de passe depuis votre espace parent à tout moment.</p>
            `,
            color: '#2563eb',
            footerNote: 'Si vous n\'êtes pas à l\'origine de cette action, contactez notre support immédiatement.'
        });
        return this.sendEmail(parentEmail, '✅ Sous-compte créé — Lingualearn', html);
    }

    /* =========================
       NOTIFICATION PARENT — MOT DE PASSE SOUS-COMPTE MODIFIÉ
    ========================== */
    async sendParentChildPasswordChangedEmail(parentEmail, parentName, childUsername, newPassword) {
        const html = this.emailTemplate({
            title: 'Mot de passe du sous-compte modifié',
            message: `
                <p>Bonjour <strong>${parentName}</strong>,</p>
                <p>Le mot de passe du sous-compte <strong>${childUsername}</strong> a été modifié avec succès.</p>
                <p>Nouveau mot de passe :</p>
                <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                    <tr style="background:#f3f4f6;">
                        <td style="padding:10px 14px; font-weight:bold; color:#374151;">Nom d'utilisateur</td>
                        <td style="padding:10px 14px; color:#2563eb; font-weight:bold;">${childUsername}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px 14px; font-weight:bold; color:#374151;">Nouveau mot de passe</td>
                        <td style="padding:10px 14px; color:#374151;">${newPassword}</td>
                    </tr>
                </table>
                <p style="color:#dc2626; font-size:13px;">⚠️ Conservez ces informations en lieu sûr.</p>
            `,
            color: '#f59e0b',
            footerNote: 'Si vous n\'êtes pas à l\'origine de cette action, contactez notre support immédiatement.'
        });
        return this.sendEmail(parentEmail, '🔑 Mot de passe sous-compte modifié — Lingualearn', html);
    }
}

const emailService = new EmailService();
module.exports = { emailService };
