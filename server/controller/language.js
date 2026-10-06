import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/auth.js";
import LanguageOtp from "../models/languageOtp.js";
import nodemailer from "nodemailer";
import { sendSmsOtp } from "../services/smsService.js";

const SUPPORTED_LANGUAGES = ["en", "es", "hi", "pt", "zh", "fr"];

// Helper to mask email (e.g. he****@gmail.com)
const maskEmail = (email = "") => {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? `${name.substring(0, 2)}****` : `${name}****`;
  return `${maskedName}@${domain}`;
};

// Helper to mask phone (e.g. +91 ******1234)
const maskPhone = (phone = "") => {
  if (phone.length <= 4) return "****";
  const start = phone.substring(0, 3);
  const end = phone.substring(phone.length - 4);
  return `${start} ******${end}`;
};

// 1. REQUEST LANGUAGE OTP
export const requestLanguageOtp = async (req, res) => {
  try {
    const userid = req.userid;
    const { targetLanguage } = req.body;

    if (!userid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!targetLanguage || !SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      return res.status(400).json({ success: false, message: "Invalid target language selected." });
    }

    const user = await User.findById(userid);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.language === targetLanguage) {
      return res.status(400).json({ success: false, message: "You are already using this language." });
    }

    // Determine verification method: French -> Email; All others -> Mobile
    const method = targetLanguage === "fr" ? "email" : "mobile";
    const contact = method === "email" ? user.email : user.phone || "+91 9876543210";

    // Rate limiting: Check resend cooldown (30s)
    const existingOtp = await LanguageOtp.findOne({ userid, targetLanguage }).sort({ createdAt: -1 });
    if (existingOtp && existingOtp.resendAvailableAt > new Date()) {
      const remainingSeconds = Math.ceil((new Date(existingOtp.resendAvailableAt).getTime() - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
        resendCooldown: remainingSeconds,
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    const resendAvailableAt = new Date(Date.now() + 30 * 1000); // 30 seconds cooldown

    // Delete any old OTP records for this user & target language
    await LanguageOtp.deleteMany({ userid, targetLanguage });

    await LanguageOtp.create({
      userid,
      targetLanguage,
      method,
      otpHash,
      expiresAt,
      resendAvailableAt,
    });

    // Send OTP via Email or Mobile SMS
    if (method === "email") {
      try {
        const smtpHost = process.env.SMTP_HOST;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpPort = process.env.SMTP_PORT || 587;

        if (smtpHost && smtpUser && smtpPass) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort),
            secure: Number(smtpPort) === 465,
            auth: { user: smtpUser, pass: smtpPass },
          });

          await transporter.sendMail({
            from: `"CodeQuest Security" <${smtpUser}>`,
            to: user.email,
            subject: "CodeQuest Language Change Verification Code",
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #f48024;">Language Change Verification</h2>
                <p>Hi <strong>${user.name}</strong>,</p>
                <p>We've received a request to switch your language to <strong>French (Français)</strong>.</p>
                <div style="background: #f4f6f8; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; color: #f48024; margin: 15px 0;">
                  ${rawOtp}
                </div>
                <p style="font-size: 12px; color: #666;">This code is valid for 5 minutes. Do not share it with anyone.</p>
              </div>
            `,
          });
          console.log(`✉️ Sent French language OTP to ${user.email}`);
        } else {
          console.log(`✉️ [MOCK EMAIL OTP] Language OTP for ${user.email}: ${rawOtp}`);
        }
      } catch (err) {
        console.error("Failed sending email OTP:", err);
      }
    } else {
      await sendSmsOtp({ phone: contact, otp: rawOtp, userName: user.name });
    }

    const maskedContact = method === "email" ? maskEmail(user.email) : maskPhone(contact);

    return res.status(200).json({
      success: true,
      method,
      maskedContact,
      targetLanguage,
      message:
        method === "email"
          ? `We've sent a verification code to your registered email address (${maskedContact}).`
          : `We've sent a verification code to your registered mobile number (${maskedContact}).`,
    });
  } catch (error) {
    console.error("Error requesting language OTP:", error);
    return res.status(500).json({ success: false, message: "Server error while generating verification code." });
  }
};

// 2. VERIFY LANGUAGE OTP & UPDATE PREFERENCE
export const verifyLanguageOtp = async (req, res) => {
  try {
    const userid = req.userid;
    const { targetLanguage, otp } = req.body;

    if (!userid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!targetLanguage || !otp) {
      return res.status(400).json({ success: false, message: "Language and verification code are required." });
    }

    const otpRecord = await LanguageOtp.findOne({ userid, targetLanguage });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "No verification request found. Please request a new code." });
    }

    // Expiry check
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await LanguageOtp.findByIdAndDelete(otpRecord._id);
      return res.status(400).json({ success: false, message: "This verification code has expired. Please request a new one." });
    }

    // Attempts limit check
    if (otpRecord.attempts >= 3) {
      await LanguageOtp.findByIdAndDelete(otpRecord._id);
      return res.status(429).json({ success: false, message: "Too many incorrect attempts. Please request a new verification code." });
    }

    // Verify OTP hash
    const isValid = await bcrypt.compare(otp.trim(), otpRecord.otpHash);
    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 3 - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    // OTP Verified Successfully -> Update User DB Preference & Delete Record
    const updatedUser = await User.findByIdAndUpdate(
      userid,
      { language: targetLanguage },
      { new: true }
    ).select("name email phone role planBadge currentPlan language");

    await LanguageOtp.findByIdAndDelete(otpRecord._id);

    return res.status(200).json({
      success: true,
      language: targetLanguage,
      user: updatedUser,
      message: "Language preference verified and updated successfully!",
    });
  } catch (error) {
    console.error("Error verifying language OTP:", error);
    return res.status(500).json({ success: false, message: "Server error while verifying code." });
  }
};
