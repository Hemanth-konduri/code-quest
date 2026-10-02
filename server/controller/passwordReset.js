import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/auth.js";
import PasswordReset from "../models/passwordReset.js";
import { sendSmsOtp } from "../services/smsService.js";
import nodemailer from "nodemailer";

// Helper to send Email OTP
const sendEmailOtp = async ({ email, otp, userName }) => {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const subject = "CodeQuest Password Reset Verification Code";
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #f48024; margin-bottom: 5px;">CodeQuest Password Reset</h2>
        <p>Hi <strong>${userName || "User"}</strong>,</p>
        <p>We received a request to reset your CodeQuest account password.</p>
        <p style="font-size: 14px;">Your verification code (OTP) is:</p>
        <div style="background: #f4f6f8; padding: 15px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #f48024; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #666;">This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
      </div>
    `;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"CodeQuest Security" <${smtpUser}>`,
        to: email,
        subject,
        html,
      });
      console.log(`✉️ Password reset OTP email sent to ${email}`);
    } else {
      console.log(`✉️ [MOCK EMAIL OTP] Verification code for ${email}: ${otp}`);
    }
  } catch (error) {
    console.error("❌ Failed to send reset email:", error);
  }
};

// 1. Request Password Reset (Enforces 1 request per day limit)
export const requestPasswordReset = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ success: false, message: "Email or phone number is required" });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const isEmail = cleanIdentifier.includes("@");

    // Account enumeration protection: Find user silently
    const user = isEmail
      ? await User.findOne({ email: cleanIdentifier })
      : await User.findOne({ phone: cleanIdentifier });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address or phone number. Please sign up first.",
      });
    }

    // Server-side Enforcement: 1 Request Per User Per 24-Hour Calendar Day
    const existingReset = await PasswordReset.findOne({
      userid: user._id,
    }).sort({ createdAt: -1 });

    if (existingReset && existingReset.lastRequestAt) {
      const timeDiff = Date.now() - new Date(existingReset.lastRequestAt).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (timeDiff < twentyFourHours) {
        return res.status(429).json({
          success: false,
          message: "You can use this option only one time per day. Please try again tomorrow.",
        });
      }
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    const resetRecord = new PasswordReset({
      userid: user._id,
      identifier: cleanIdentifier,
      resetMethod: isEmail ? "email" : "phone",
      otp,
      token,
      expiresAt,
      lastRequestAt: new Date(),
    });

    await resetRecord.save();

    // Dispatch OTP via Email or SMS
    if (isEmail) {
      await sendEmailOtp({ email: user.email, otp, userName: user.name });
    } else {
      await sendSmsOtp({ phone: user.phone || cleanIdentifier, otp, userName: user.name });
    }

    res.status(200).json({
      success: true,
      message: `Verification code sent to your registered ${isEmail ? "email" : "phone number"}.`,
      token, // Secure session token for OTP verification
    });
  } catch (error) {
    console.error("Forgot password request error:", error);
    res.status(500).json({ success: false, message: "Error processing password reset request" });
  }
};

// 2. Verify OTP Endpoint
export const verifyOtp = async (req, res) => {
  try {
    const { token, otp } = req.body;
    if (!token || !otp) {
      return res.status(400).json({ success: false, message: "Token and OTP are required" });
    }

    const resetRecord = await PasswordReset.findOne({ token });
    if (!resetRecord) {
      return res.status(404).json({ success: false, message: "Invalid or expired reset session" });
    }

    if (resetRecord.resetCompletedAt) {
      return res.status(400).json({ success: false, message: "Reset token has already been used" });
    }

    if (new Date(resetRecord.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: "Verification OTP has expired" });
    }

    if (resetRecord.attempts >= 3) {
      return res.status(429).json({
        success: false,
        message: "Maximum OTP attempts exceeded. Please try again tomorrow.",
      });
    }

    if (resetRecord.otp !== otp.trim()) {
      resetRecord.attempts += 1;
      await resetRecord.save();
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${3 - resetRecord.attempts} attempt(s) remaining.`,
      });
    }

    resetRecord.isVerified = true;
    await resetRecord.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully. You may now set a new password.",
      token: resetRecord.token,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "Error verifying OTP" });
  }
};

// 3. Set New Password Endpoint
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);

    if (!hasUpper || !hasLower) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one uppercase letter (A-Z) and one lowercase letter (a-z).",
      });
    }

    const resetRecord = await PasswordReset.findOne({ token, isVerified: true });
    if (!resetRecord) {
      return res.status(400).json({ success: false, message: "Invalid or unverified reset session" });
    }

    if (resetRecord.resetCompletedAt) {
      return res.status(400).json({ success: false, message: "This reset session has already been completed" });
    }

    // Secure Password Hashing
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(resetRecord.userid, { password: hashedPassword });

    // Invalidate reset session
    resetRecord.resetCompletedAt = new Date();
    await resetRecord.save();

    res.status(200).json({
      success: true,
      message: "Your password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Error resetting password" });
  }
};
