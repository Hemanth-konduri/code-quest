import express from "express";
import {
  getallusers,
  Login,
  Signup,
  updateprofile,
  verifyLoginOtp,
} from "../controller/auth.js";
import {
  requestPasswordReset,
  verifyOtp,
  resetPassword,
} from "../controller/passwordReset.js";
import {
  requestLanguageOtp,
  verifyLanguageOtp,
} from "../controller/language.js";
import {
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  getTrustedDevices,
  removeTrustedDevice,
} from "../controller/session.js";
import {
  getAdminLoginActivity,
  getAdminUserSessions,
  adminRevokeSession,
  getAdminSecurityEvents,
} from "../controller/adminSecurity.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", Signup);
router.post("/login", Login);
router.post("/verify-login-otp", verifyLoginOtp);
router.get("/getalluser", getallusers);
router.patch("/update/:id", auth, updateprofile);

// Password Reset Routes
router.post("/forgot-password", requestPasswordReset);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// Language Switch Verification Routes
router.post("/request-language-otp", auth, requestLanguageOtp);
router.post("/verify-language-otp", auth, verifyLanguageOtp);

// Active Sessions & User Security Routes
router.get("/sessions", auth, getUserSessions);
router.delete("/sessions/:id", auth, revokeSession);
router.delete("/sessions", auth, revokeAllOtherSessions);
router.get("/trusted-devices", auth, getTrustedDevices);
router.delete("/trusted-devices/:id", auth, removeTrustedDevice);

// Admin Security Monitoring Routes
router.get("/admin/security/login-activity", auth, getAdminLoginActivity);
router.get("/admin/security/sessions", auth, getAdminUserSessions);
router.delete("/admin/security/sessions/:id", auth, adminRevokeSession);
router.get("/admin/security/events", auth, getAdminSecurityEvents);

export default router;
