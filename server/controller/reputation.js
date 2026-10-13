import mongoose from "mongoose";
import UserReputation from "../models/userReputation.js";
import ReputationTransaction from "../models/reputationTransaction.js";
import {
  getUserReputationData,
  reconcileUserReputation,
} from "../services/reputationService.js";
import {
  REPUTATION_RULES,
  PRIVILEGES,
  TRANSFER_LIMITS,
  getReputationBadge,
} from "../utils/reputationRules.js";

/**
 * GET /reputation/me
 * Get authenticated user's reputation overview, privileges, and stats
 */
export const getMyReputation = async (req, res) => {
  try {
    const userId = req.userid;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const data = await getUserReputationData(userId);
    res.status(200).json({ data });
  } catch (error) {
    console.error("getMyReputation error:", error);
    res.status(500).json({ message: "Failed to retrieve reputation data" });
  }
};

/**
 * GET /reputation/user/:userId
 * Public reputation profile for any user
 */
export const getUserReputation = async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const data = await getUserReputationData(userId);

    // Get recent public activities (hide sensitive details)
    const recentActivity = await ReputationTransaction.find({
      userId: new mongoose.Types.ObjectId(String(userId)),
      isPublic: true,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("activityType pointsChange description createdAt relatedEntityType")
      .lean();

    res.status(200).json({
      data: {
        userId: data.userId,
        points: data.points,
        badge: data.badge,
        unlockedPrivileges: data.unlockedPrivileges,
        nextPrivilege: data.nextPrivilege,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("getUserReputation error:", error);
    res.status(500).json({ message: "Failed to retrieve user reputation profile" });
  }
};

/**
 * GET /reputation/history
 * Detailed chronological transaction ledger for authenticated user
 */
export const getReputationHistory = async (req, res) => {
  try {
    const userId = req.userid;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = req.query.filter || "all";
    const skip = (page - 1) * limit;

    const query = { userId: new mongoose.Types.ObjectId(String(userId)) };

    if (filter === "earned") {
      query.pointsChange = { $gt: 0 };
    } else if (filter === "deducted") {
      query.pointsChange = { $lt: 0 };
    } else if (filter === "transfers") {
      query.activityType = {
        $in: [
          "reputation_transfer_sent",
          "reputation_transfer_received",
          "reputation_transfer_reversed",
        ],
      };
    }

    const [transactions, total] = await Promise.all([
      ReputationTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReputationTransaction.countDocuments(query),
    ]);

    res.status(200).json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getReputationHistory error:", error);
    res.status(500).json({ message: "Failed to retrieve reputation history" });
  }
};

/**
 * GET /reputation/rules
 * Central configuration of reputation points, privileges, and limits
 */
export const getReputationRules = async (req, res) => {
  try {
    res.status(200).json({
      data: {
        rules: REPUTATION_RULES,
        privileges: PRIVILEGES,
        transferLimits: TRANSFER_LIMITS,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve rules" });
  }
};

/**
 * POST /reputation/reconcile
 * Audit and reconcile balance with transaction ledger
 */
export const reconcileReputation = async (req, res) => {
  try {
    const userId = req.userid;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const result = await reconcileUserReputation(userId);
    res.status(200).json({ data: result, message: "Reputation ledger successfully reconciled" });
  } catch (error) {
    console.error("reconcileReputation error:", error);
    res.status(500).json({ message: "Failed to reconcile reputation" });
  }
};
