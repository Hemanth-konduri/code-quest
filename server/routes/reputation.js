import express from "express";
import auth from "../middleware/auth.js";
import {
  getMyReputation,
  getUserReputation,
  getReputationHistory,
  getReputationRules,
  reconcileReputation,
  initiateTransfer,
  getTransferLimits,
  getTransfersHistory,
  adminGetOverview,
  adminGetUsers,
  adminGetLedger,
  adminGetTransfers,
  adminAdjustReputation,
  adminReverseTransfer,
  adminUpdateRules,
} from "../controller/reputation.js";

const router = express.Router();

// User balance, rules & history
router.get("/me", auth, getMyReputation);
router.get("/rules", getReputationRules);
router.get("/history", auth, getReputationHistory);
router.post("/reconcile", auth, reconcileReputation);
router.get("/user/:userId", getUserReputation);

// Transfer System (Day 2)
router.post("/transfer", auth, initiateTransfer);
router.get("/transfer-eligibility", auth, getTransferLimits);
router.get("/transfers", auth, getTransfersHistory);

// Admin Controls & Auditing (Day 2)
router.get("/admin/overview", auth, adminGetOverview);
router.get("/admin/users", auth, adminGetUsers);
router.get("/admin/ledger", auth, adminGetLedger);
router.get("/admin/transfers", auth, adminGetTransfers);
router.post("/admin/adjust", auth, adminAdjustReputation);
router.post("/admin/transfer/:transferId/reverse", auth, adminReverseTransfer);
router.patch("/admin/rules", auth, adminUpdateRules);

export default router;
