import express from "express";
import {
  getPlans,
  getCurrentSubscription,
  createOrder,
  verifyPayment,
  cancelSubscription,
  getUserInvoices,
  handleWebhook,
  getAdminSubscriptions,
  adminModifySubscription,
} from "../controller/subscription.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/plans", getPlans);
router.get("/current", auth, getCurrentSubscription);
router.post("/create-order", auth, createOrder);
router.post("/verify-payment", auth, verifyPayment);
router.post("/cancel", auth, cancelSubscription);
router.get("/invoices", auth, getUserInvoices);
router.post("/webhook", express.json({ type: "application/json" }), handleWebhook);

// Admin routes
router.get("/admin/all", auth, getAdminSubscriptions);
router.post("/admin/modify", auth, adminModifySubscription);

export default router;
