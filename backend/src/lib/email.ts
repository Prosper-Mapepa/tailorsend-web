import nodemailer from "nodemailer";
import { config, isDev } from "../config.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!config.smtp.host || !config.smtp.user) return null;
  transporter ??= nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
  return transporter;
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<{ sent: boolean; devLink?: string }> {
  const transport = getTransporter();
  if (!transport) {
    if (isDev()) {
      console.log(`[dev] Password reset link for ${email}: ${resetUrl}`);
      return { sent: false, devLink: resetUrl };
    }
    throw new Error("Email is not configured. Set SMTP_* environment variables.");
  }

  await transport.sendMail({
    from: config.smtp.from,
    to: email,
    subject: "Reset your TailorSend password",
    text: `Reset your password by visiting this link (expires in ${config.resetTokenHours} hour(s)):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Reset your password by clicking the link below (expires in ${config.resetTokenHours} hour(s)):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, ignore this email.</p>`,
  });

  return { sent: true };
}
