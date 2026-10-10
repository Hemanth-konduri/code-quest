import mongoose from "mongoose";
import user from "../models/auth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import LoginActivity from "../models/loginActivity.js";
import UserSession from "../models/userSession.js";
import TrustedDevice from "../models/trustedDevice.js";
import SecurityEvent from "../models/securityEvent.js";
import LanguageOtp from "../models/languageOtp.js";
import { parseUserAgent, getClientIp, hashToken } from "../utils/deviceParser.js";

// Helper: Mask email
const maskEmail = (email = "") => {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? `${name.substring(0, 2)}****` : `${name}****`;
  return `${maskedName}@${domain}`;
};

// Helper: Send Email OTP
const sendLoginOtpEmail = async (email, otp, userName) => {
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
        to: email,
        subject: "Security Alert: Verification Code for Unrecognized Device Login",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #f48024; margin-bottom: 5px;">Unrecognized Device Login Attempt</h2>
            <p>Hi <strong>${userName || "User"}</strong>,</p>
            <p>A login attempt to your CodeQuest account was initiated from a new or unrecognized device.</p>
            <p style="font-size: 14px;">Your verification code (OTP) is:</p>
            <div style="background: #f4f6f8; padding: 15px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #f48024; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 13px; color: #666;">This code expires in <strong>5 minutes</strong>. If you did not attempt this login, please change your password immediately.</p>
          </div>
        `,
      });
      console.log(`✉️ Sent unrecognized device login OTP to ${email}`);
    } else {
      console.log(`✉️ [MOCK LOGIN OTP] Verification code for ${email}: ${otp}`);
    }
  } catch (error) {
    console.error("Failed to send login OTP email:", error);
  }
};

// 1. SIGNUP
export const Signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const exisitinguser = await user.findOne({ email });
    if (exisitinguser) {
      return res.status(404).json({ message: "User already exist" });
    }
    const hashpassword = await bcrypt.hash(password, 12);
    const newuser = await user.create({
      name,
      email,
      password: hashpassword,
    });

    const token = jwt.sign(
      { email: newuser.email, id: newuser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Create session record
    const { browser, os, deviceType, deviceName } = parseUserAgent(req.headers["user-agent"]);
    const ip = getClientIp(req);
    const tokenHash = hashToken(token);

    await UserSession.create({
      userid: newuser._id,
      sessionTokenHash: tokenHash,
      deviceName,
      browser,
      os,
      deviceType,
      ip,
      location: "Local Network",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await LoginActivity.create({
      userid: newuser._id,
      ip,
      userAgent: req.headers["user-agent"],
      browser,
      os,
      deviceType,
      loginResult: "success",
      recognitionStatus: "recognized",
    });

    res.status(200).json({ data: newuser, token });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json("something went wrong..");
    return;
  }
};

// 2. ENHANCED LOGIN (Device Recognition & OTP)
export const Login = async (req, res) => {
  const { email, password, trustedDeviceToken } = req.body;
  try {
    const exisitinguser = await user.findOne({ email });
    if (!exisitinguser) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const ispasswordcrct = await bcrypt.compare(password, exisitinguser.password);
    if (!ispasswordcrct) {
      const { browser, os, deviceType } = parseUserAgent(req.headers["user-agent"]);
      const ip = getClientIp(req);
      await LoginActivity.create({
        userid: exisitinguser._id,
        ip,
        userAgent: req.headers["user-agent"],
        browser,
        os,
        deviceType,
        loginResult: "failed",
      });
      return res.status(400).json({ message: "Invalid password" });
    }

    const { browser, os, deviceType, deviceName } = parseUserAgent(req.headers["user-agent"]);
    const ip = getClientIp(req);

    // Check risk-based device recognition
    let isRecognized = false;
    const incomingTrustedToken = trustedDeviceToken || req.headers["x-trusted-device-token"];

    if (incomingTrustedToken) {
      const tHash = hashToken(incomingTrustedToken);
      const recognizedDevice = await TrustedDevice.findOne({
        userid: exisitinguser._id,
        tokenHash: tHash,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });

      if (recognizedDevice) {
        isRecognized = true;
        recognizedDevice.lastUsedAt = new Date();
        await recognizedDevice.save();
      }
    }

    // If device is UNRECOGNIZED -> Initiate OTP verification
    if (!isRecognized) {
      const rawOtp = crypto.randomInt(100000, 999999).toString();
      const otpHash = await bcrypt.hash(rawOtp, 10);
      const tempToken = crypto.randomBytes(32).toString("hex");

      // Store temp OTP record using LanguageOtp / temp model
      await LanguageOtp.deleteMany({ userid: exisitinguser._id, targetLanguage: "login_otp" });
      await LanguageOtp.create({
        userid: exisitinguser._id,
        targetLanguage: "login_otp",
        method: "email",
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
        resendAvailableAt: new Date(Date.now() + 30 * 1000),
      });

      await sendLoginOtpEmail(exisitinguser.email, rawOtp, exisitinguser.name);

      await LoginActivity.create({
        userid: exisitinguser._id,
        ip,
        userAgent: req.headers["user-agent"],
        browser,
        os,
        deviceType,
        loginResult: "otp_required",
        recognitionStatus: "unrecognized",
      });

      return res.status(200).json({
        requiresOtp: true,
        tempToken,
        userId: exisitinguser._id,
        maskedContact: maskEmail(exisitinguser.email),
        message: "Unrecognized device login. Please verify the code sent to your email.",
      });
    }

    // Device is RECOGNIZED -> Create Session
    const token = jwt.sign(
      { email: exisitinguser.email, id: exisitinguser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const tokenHash = hashToken(token);
    await UserSession.create({
      userid: exisitinguser._id,
      sessionTokenHash: tokenHash,
      deviceName,
      browser,
      os,
      deviceType,
      ip,
      location: "Local Network",
      recognitionStatus: "recognized",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await LoginActivity.create({
      userid: exisitinguser._id,
      ip,
      userAgent: req.headers["user-agent"],
      browser,
      os,
      deviceType,
      loginResult: "success",
      recognitionStatus: "recognized",
    });

    res.status(200).json({ data: exisitinguser, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json("something went wrong..");
    return;
  }
};

// 3. VERIFY LOGIN OTP (For Unrecognized Device)
export const verifyLoginOtp = async (req, res) => {
  try {
    const { userId, otp, trustDevice } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ message: "User ID and verification code are required." });
    }

    const exisitinguser = await user.findById(userId);
    if (!exisitinguser) {
      return res.status(404).json({ message: "User not found." });
    }

    const otpRecord = await LanguageOtp.findOne({ userid: userId, targetLanguage: "login_otp" });
    if (!otpRecord) {
      return res.status(400).json({ message: "No active verification code found. Please request a new one." });
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      await LanguageOtp.findByIdAndDelete(otpRecord._id);
      return res.status(400).json({ message: "Verification code has expired. Please log in again." });
    }

    if (otpRecord.attempts >= 3) {
      await LanguageOtp.findByIdAndDelete(otpRecord._id);
      return res.status(429).json({ message: "Too many incorrect attempts. Please log in again." });
    }

    const isValid = await bcrypt.compare(otp.trim(), otpRecord.otpHash);
    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ message: `Invalid code. ${3 - otpRecord.attempts} attempt(s) remaining.` });
    }

    // OTP Verified -> Delete OTP record
    await LanguageOtp.findByIdAndDelete(otpRecord._id);

    // If user selected "Trust this device" -> Register trusted device
    let newTrustedToken = null;
    const { browser, os, deviceType, deviceName } = parseUserAgent(req.headers["user-agent"]);
    const ip = getClientIp(req);

    if (trustDevice) {
      newTrustedToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(newTrustedToken);

      await TrustedDevice.create({
        userid: exisitinguser._id,
        deviceLabel: deviceName,
        tokenHash,
        browser,
        os,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trust
      });

      await SecurityEvent.create({
        userid: exisitinguser._id,
        eventType: "trusted_device_added",
        details: `Added trusted device ${deviceName}`,
      });
    }

    // Create Authenticated Session
    const token = jwt.sign(
      { email: exisitinguser.email, id: exisitinguser._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const tokenHash = hashToken(token);
    await UserSession.create({
      userid: exisitinguser._id,
      sessionTokenHash: tokenHash,
      deviceName,
      browser,
      os,
      deviceType,
      ip,
      location: "Local Network",
      recognitionStatus: "unrecognized",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await LoginActivity.create({
      userid: exisitinguser._id,
      ip,
      userAgent: req.headers["user-agent"],
      browser,
      os,
      deviceType,
      loginResult: "success",
      recognitionStatus: "unrecognized",
    });

    res.status(200).json({
      data: exisitinguser,
      token,
      trustedDeviceToken: newTrustedToken,
      message: "Login successful!",
    });
  } catch (error) {
    console.error("Verify login OTP error:", error);
    res.status(500).json({ message: "Server error while verifying login OTP." });
  }
};

export const getallusers = async (req, res) => {
  try {
    const alluser = await user.find();
    res.status(200).json({ data: alluser });
  } catch (error) {
    res.status(500).json("something went wrong..");
    return;
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { name, about, tags } = req.body.editForm;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "User unavailable" });
  }
  try {
    const updateprofile = await user.findByIdAndUpdate(
      _id,
      { $set: { name: name, about: about, tags: tags } },
      { new: true }
    );
    res.status(200).json({ data: updateprofile });
  } catch (error) {
    console.log(error);
    res.status(500).json("something went wrong..");
    return;
  }
};
