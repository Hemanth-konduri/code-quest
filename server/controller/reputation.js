import mongoose from "mongoose";
import UserReputation from "../models/userReputation.js";
import ReputationTransaction from "../models/reputationTransaction.js";
import ReputationTransfer from "../models/reputationTransfer.js";
import ReputationAuditLog from "../models/reputationAuditLog.js";
import ReputationRule from "../models/reputationRule.js";
import User from "../models/auth.js";
import {
  getUserReputationData,
  reconcileUserReputation,
  transferReputation,
  reverseReputationTransfer,
  getTransferEligibility,
  adminManualReputationAdjustment,
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

// ============================================================
// REPUTATION TRANSFERS (DAY 2)
// ============================================================

/**
 * POST /reputation/transfer
 * Transfer reputation points to another user
 */
export const initiateTransfer = async (req, res) => {
  try {
    const senderId = req.userid;
    const { recipientId, points, reason, idempotencyKey } = req.body;

    if (!senderId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const result = await transferReputation({
      senderId,
      recipientId,
      points,
      reason,
      idempotencyKey,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message, ...result });
    }

    res.status(200).json({
      message: "Reputation transfer completed successfully",
      transfer: result.transfer,
      newSenderBalance: result.newSenderBalance,
      duplicate: result.duplicate || false,
    });
  } catch (error) {
    console.error("initiateTransfer error:", error);
    res.status(500).json({ message: "Failed to complete reputation transfer" });
  }
};

/**
 * GET /reputation/transfer-eligibility
 * Check if current user can transfer and their remaining daily limits
 */
export const getTransferLimits = async (req, res) => {
  try {
    const userId = req.userid;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const eligibility = await getTransferEligibility(userId);
    res.status(200).json({ data: eligibility });
  } catch (error) {
    console.error("getTransferLimits error:", error);
    res.status(500).json({ message: "Failed to retrieve transfer eligibility" });
  }
};

/**
 * GET /reputation/transfers
 * View user's sent and received transfer history
 */
export const getTransfersHistory = async (req, res) => {
  try {
    const userId = req.userid;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type || "all"; // all, sent, received
    const skip = (page - 1) * limit;

    const parsedUserId = new mongoose.Types.ObjectId(String(userId));
    let query = {};

    if (type === "sent") {
      query.senderId = parsedUserId;
    } else if (type === "received") {
      query.recipientId = parsedUserId;
    } else {
      query.$or = [{ senderId: parsedUserId }, { recipientId: parsedUserId }];
    }

    const [transfers, total] = await Promise.all([
      ReputationTransfer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("senderId", "name email")
        .populate("recipientId", "name email")
        .lean(),
      ReputationTransfer.countDocuments(query),
    ]);

    res.status(200).json({
      data: transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getTransfersHistory error:", error);
    res.status(500).json({ message: "Failed to retrieve transfer history" });
  }
};

// ============================================================
// ADMINISTRATOR CONTROLS (DAY 2)
// ============================================================

const checkAdmin = async (userId) => {
  if (!userId) return false;
  const u = await User.findById(userId).select("role");
  return u && u.role === "admin";
};

/**
 * GET /reputation/admin/overview
 * System-wide reputation statistics and counts
 */
export const adminGetOverview = async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req.userid);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const [
      totalUsersWithRep,
      totalTransactions,
      totalTransfers,
      totalAuditLogs,
      pointsAgg,
    ] = await Promise.all([
      UserReputation.countDocuments(),
      ReputationTransaction.countDocuments(),
      ReputationTransfer.countDocuments(),
      ReputationAuditLog.countDocuments(),
      UserReputation.aggregate([
        {
          $group: {
            _id: null,
            totalPoints: { $sum: "$points" },
            totalEarned: { $sum: "$totalEarned" },
            totalDeducted: { $sum: "$totalDeducted" },
            totalTransferred: { $sum: "$totalTransferred" },
          },
        },
      ]),
    ]);

    const stats = pointsAgg[0] || {
      totalPoints: 0,
      totalEarned: 0,
      totalDeducted: 0,
      totalTransferred: 0,
    };

    res.status(200).json({
      data: {
        totalUsers: totalUsersWithRep,
        totalTransactions,
        totalTransfers,
        totalAuditLogs,
        ...stats,
      },
    });
  } catch (error) {
    console.error("adminGetOverview error:", error);
    res.status(500).json({ message: "Failed to retrieve admin overview" });
  }
};

/**
 * GET /reputation/admin/users
 * Search and manage user reputation balances
 */
export const adminGetUsers = async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req.userid);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    let userQuery = {};
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const matchedUsers = await User.find(userQuery).select("_id name email role").lean();
    const userIds = matchedUsers.map((u) => u._id);

    const [repRecords, total] = await Promise.all([
      UserReputation.find({ userId: { $in: userIds } })
        .sort({ points: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email role")
        .lean(),
      UserReputation.countDocuments({ userId: { $in: userIds } }),
    ]);

    const enriched = repRecords.map((r) => ({
      ...r,
      badge: getReputationBadge(r.points || 0),
    }));

    res.status(200).json({
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("adminGetUsers error:", error);
    res.status(500).json({ message: "Failed to retrieve user reputation list" });
  }
};

/**
 * GET /reputation/admin/ledger
 * Full authoritative ledger inspection for administrators
 */
export const adminGetLedger = async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req.userid);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const activityType = req.query.activityType;
    const userId = req.query.userId;
    const skip = (page - 1) * limit;

    const query = {};
    if (activityType) query.activityType = activityType;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = new mongoose.Types.ObjectId(String(userId));
    }

    const [ledger, total] = await Promise.all([
      ReputationTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email")
        .lean(),
      ReputationTransaction.countDocuments(query),
    ]);

    res.status(200).json({
      data: ledger,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("adminGetLedger error:", error);
    res.status(500).json({ message: "Failed to retrieve ledger entries" });
  }
};

/**
 * GET /reputation/admin/transfers
 * System-wide transfer monitor
 */
export const adminGetTransfers = async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req.userid);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    const [transfers, total] = await Promise.all([
      ReputationTransfer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("senderId", "name email")
        .populate("recipientId", "name email")
        .populate("reversedBy", "name email")
        .lean(),
      ReputationTransfer.countDocuments(query),
    ]);

    res.status(200).json({
      data: transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("adminGetTransfers error:", error);
    res.status(500).json({ message: "Failed to retrieve transfers list" });
  }
};

/**
 * POST /reputation/admin/adjust
 * Authorized manual adjustment of user reputation balance
 */
export const adminAdjustReputation = async (req, res) => {
  try {
    const adminId = req.userid;
    const isAdmin = await checkAdmin(adminId);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { targetUserId, pointsChange, reason } = req.body;
    if (!targetUserId || pointsChange === undefined || !reason) {
      return res.status(400).json({ message: "Target user ID, points change, and reason are required" });
    }

    const result = await adminManualReputationAdjustment({
      targetUserId,
      pointsChange,
      reason,
      adminId,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.status(200).json({
      message: "Reputation successfully adjusted",
      data: result,
    });
  } catch (error) {
    console.error("adminAdjustReputation error:", error);
    res.status(500).json({ message: "Failed to adjust user reputation" });
  }
};

/**
 * POST /reputation/admin/transfer/:transferId/reverse
 * Reverse fraudulent or unauthorized transfer
 */
export const adminReverseTransfer = async (req, res) => {
  try {
    const adminId = req.userid;
    const isAdmin = await checkAdmin(adminId);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { transferId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "A reason must be provided for reversing a transfer" });
    }

    const result = await reverseReputationTransfer({
      transferId,
      adminId,
      reason: reason.trim(),
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.status(200).json({
      message: "Transfer reversed successfully",
      data: result.transfer,
    });
  } catch (error) {
    console.error("adminReverseTransfer error:", error);
    res.status(500).json({ message: "Failed to reverse transfer" });
  }
};

/**
 * PATCH /reputation/admin/rules
 * Configure point values and privilege thresholds dynamically
 */
export const adminUpdateRules = async (req, res) => {
  try {
    const adminId = req.userid;
    const isAdmin = await checkAdmin(adminId);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { key, category, points, description } = req.body;
    if (!key || points === undefined) {
      return res.status(400).json({ message: "Rule key and points are required" });
    }

    const updatedRule = await ReputationRule.findOneAndUpdate(
      { key },
      { $set: { category, points: Number(points), description, isActive: true } },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: "Reputation rule updated successfully",
      rule: updatedRule,
    });
  } catch (error) {
    console.error("adminUpdateRules error:", error);
    res.status(500).json({ message: "Failed to update reputation rule" });
  }
};
