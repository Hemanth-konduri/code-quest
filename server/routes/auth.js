import express from "express";
import {
  getallusers,
  Login,
  Signup,
  updateprofile,
} from "../controller/auth.js";
import {
  requestPasswordReset,
  verifyOtp,
  resetPassword,
} from "../controller/passwordReset.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", Signup);
router.post("/login", Login);
router.get("/getalluser", getallusers);
router.patch("/update/:id", auth, updateprofile);

// Password Reset Routes
router.post("/forgot-password", requestPasswordReset);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

export default router;
