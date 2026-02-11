import { Resend } from 'resend';
import crypto from "crypto";

if (!process.env.RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set in environment variables");
}

if (!process.env.FRONTEND_URL) {
  console.error("FRONTEND_URL is not set in environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email, verificationToken, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL;
  const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

  const emailData = {
    from: 'Chatify <chatify-noreply@pragyesh.tech>',
    to: email,
    subject: "Verify Your Chatify Account",
    html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div
            style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #2563eb; text-align: center;">Welcome to Chatify!</h2>
            <p>Hi ${fullName},</p>
            <p>Thank you for signing up for Chatify! Please verify your email address to complete your registration.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}"
                    style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Verify Email Address
                </a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
            <br>
            <p>This is an system generated email. Please do not reply to this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
                Best regards,<br>The Chatify Team
            </p>
        </div>
    `,
  };

  try {
    const result = await resend.emails.send(emailData);
    console.log("Verification email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const sendEmailChangeVerification = async (newEmail, emailChangeToken, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL;
  const verificationUrl = `${frontendUrl}/verify-email-change?token=${emailChangeToken}`;

  const emailData = {
    from: 'Chatify <chatify-noreply@pragyesh.tech>',
    to: newEmail,
    subject: "Verify Your New Email Address - Chatify",
    html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div
            style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #2563eb; text-align: center;">Verify Your New Email Address</h2>
            <p>Hi ${fullName},</p>
            <p>You have requested to change your email address on Chatify. Please verify your new email address to complete the change.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}"
                    style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Verify New Email Address
                </a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't request this email change, please ignore this email and your account will remain unchanged.</p>
            <br>
            <p>This is an system generated email. Please do not reply to this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
                Best regards,<br>The Chatify Team
            </p>
        </div>
    `,
  };

  try {
    const result = await resend.emails.send(emailData);
    console.log("Email change verification sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Error sending email change verification:", error);
    throw new Error("Failed to send email change verification");
  }
};

export const sendPasswordResetEmail = async (email, resetToken, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL;
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const emailData = {
    from: 'Chatify <chatify-noreply@pragyesh.tech>',
    to: email,
    subject: "Reset Your Chatify Password",
    html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div
            style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #2563eb; text-align: center;">Reset Your Password</h2>
            <p>Hi ${fullName},</p>
            <p>You have requested to reset your password for your Chatify account. Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}"
                    style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
            <p>This reset link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
            <br>
            <p>This is an system generated email. Please do not reply to this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
                Best regards,<br>The Chatify Team
            </p>
        </div>
    `,
  };

  try {
    const result = await resend.emails.send(emailData);
    console.log("Password reset email sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};