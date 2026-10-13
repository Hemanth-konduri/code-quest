import express from "express";
import auth from "../middleware/auth.js";
import {
  getMyReputation,
  getUserReputation,
  getReputationHistory,
  getReputationRules,
  reconcileReputation,
} from "../controller/reputation.js";

const router = express.Router();

router.get("/me", auth, getMyReputation);
router.get("/rules", getReputationRules);
router.get("/history", auth, getReputationHistory);
router.post("/reconcile", auth, reconcileReputation);
router.get("/user/:userId", getUserReputation);

export default router;
