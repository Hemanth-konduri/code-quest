import mongoose from "mongoose";
import UserReputation from "../models/userReputation.js";
import ReputationTransaction from "../models/reputationTransaction.js";
import ReputationAuditLog from "../models/reputationAuditLog.js";
import Notification from "../models/notification.js";
import {
  REPUTATION_RULES,
  getUnlockedPrivileges,
  getNextPrivilege,
  getReputationBadge,
} from "../utils/reputationRules.js";

/**
 * Core engine to record a reputation change atomically in ledger and user reputation balance
 */
export const recordReputationChange = async ({
  userId,
  activityType,
  pointsChange,
  relatedEntityId = null,
  relatedEntityType = "system",
  uniqueEventId = null,
  description,
  isPublic = true,
  metadata = {},
  actorId = null,
}) => {
  if (!userId) return { success: false, message: "User ID required" };

  const parsedUserId = new mongoose.Types.ObjectId(String(userId));

  // 1. Idempotency Check: if uniqueEventId is provided, check if already recorded
  if (uniqueEventId) {
    const existingTx = await ReputationTransaction.findOne({ uniqueEventId });
    if (existingTx) {
      return {
        success: false,
        duplicate: true,
        message: "Reputation reward or deduction already recorded for this event",
        transaction: existingTx,
      };
    }
  }

  // 2. Fetch or initialize UserReputation
  let userRep = await UserReputation.findOne({ userId: parsedUserId });
  if (!userRep) {
    userRep = await UserReputation.create({
      userId: parsedUserId,
      points: 0,
      totalEarned: 0,
      totalDeducted: 0,
      unlockedPrivileges: [],
    });
  }

  const previousBalance = Number(userRep.points) || 0;
  // Reputation cannot drop below 0
  const newBalance = Math.max(0, previousBalance + pointsChange);
  const effectiveChange = newBalance - previousBalance;

  // Track stats
  if (pointsChange > 0) {
    userRep.totalEarned = (userRep.totalEarned || 0) + pointsChange;
  } else if (pointsChange < 0) {
    userRep.totalDeducted = (userRep.totalDeducted || 0) + Math.abs(pointsChange);
  }

  userRep.points = newBalance;

  // Calculate privilege unlocks
  const oldPrivileges = userRep.unlockedPrivileges || [];
  const currentPrivileges = getUnlockedPrivileges(newBalance);
  userRep.unlockedPrivileges = currentPrivileges;

  // Check for newly unlocked privileges
  const newlyUnlocked = currentPrivileges.filter(
    (priv) => !oldPrivileges.includes(priv)
  );

  await userRep.save();

  // 3. Create authoritative ledger record
  let transaction;
  try {
    transaction = await ReputationTransaction.create({
      userId: parsedUserId,
      activityType,
      pointsChange,
      previousBalance,
      newBalance,
      relatedEntityId: relatedEntityId ? String(relatedEntityId) : null,
      relatedEntityType,
      uniqueEventId,
      description: description || `Reputation changed by ${pointsChange} points`,
      isPublic,
      metadata,
    });
  } catch (err) {
    // If unique key collision occurred concurrently
    if (err.code === 11000 && uniqueEventId) {
      const existing = await ReputationTransaction.findOne({ uniqueEventId });
      return {
        success: false,
        duplicate: true,
        message: "Duplicate event detected concurrently",
        transaction: existing,
      };
    }
    throw err;
  }

  // 4. Generate In-App Notifications
  try {
    // Notification for newly unlocked privilege
    for (const priv of newlyUnlocked) {
      await Notification.create({
        recipientId: parsedUserId,
        actorId: actorId ? new mongoose.Types.ObjectId(String(actorId)) : null,
        type: "privilege_unlocked",
        pointsChange: 0,
        privilege: priv,
        message: `Congratulations! You unlocked the privilege: ${priv.replace("_", " ")}`,
        read: false,
      });
    }

    // Notification for reputation earned or deducted
    if (pointsChange !== 0) {
      await Notification.create({
        recipientId: parsedUserId,
        actorId: actorId ? new mongoose.Types.ObjectId(String(actorId)) : null,
        type: pointsChange > 0 ? "reputation_earned" : "reputation_deducted",
        pointsChange,
        entityId: relatedEntityId ? String(relatedEntityId) : "",
        message: `${pointsChange > 0 ? `+${pointsChange}` : pointsChange} reputation points: ${description}`,
        read: false,
      });
    }
  } catch (notifErr) {
    console.error("Failed to create reputation notification:", notifErr);
  }

  return {
    success: true,
    transaction,
    userRep,
    newlyUnlocked,
  };
};

/**
 * Reward publishing an answer (+5 points)
 */
export const awardAnswerPosted = async (userId, questionId, answerId) => {
  return await recordReputationChange({
    userId,
    activityType: "answer_posted",
    pointsChange: REPUTATION_RULES.ANSWER_POSTED.points,
    relatedEntityId: answerId,
    relatedEntityType: "answer",
    uniqueEventId: `answer_posted_${answerId}`,
    description: "Earned +5 points for posting an answer",
    metadata: { questionId, answerId },
  });
};

/**
 * Reward receiving accepted answer (+10 points)
 */
export const awardAnswerAccepted = async (authorId, questionId, answerId) => {
  return await recordReputationChange({
    userId: authorId,
    activityType: "answer_accepted",
    pointsChange: REPUTATION_RULES.ANSWER_ACCEPTED.points,
    relatedEntityId: answerId,
    relatedEntityType: "answer",
    uniqueEventId: `answer_accepted_${answerId}`,
    description: "Earned +10 points: Answer was accepted by question author",
    metadata: { questionId, answerId },
  });
};

/**
 * Reverse accepted answer bonus (-10 points) when unaccepted or replaced
 */
export const reverseAnswerAccepted = async (authorId, questionId, answerId) => {
  return await recordReputationChange({
    userId: authorId,
    activityType: "acceptance_reversed",
    pointsChange: -REPUTATION_RULES.ANSWER_ACCEPTED.points,
    relatedEntityId: answerId,
    relatedEntityType: "answer",
    uniqueEventId: `answer_unaccepted_${answerId}_${Date.now()}`,
    description: "Reversed -10 points: Answer acceptance was removed",
    metadata: { questionId, answerId },
  });
};

/**
 * Reward answer reaching 5 upvotes milestone (+5 points once)
 */
export const awardAnswerMilestone5Upvotes = async (authorId, questionId, answerId) => {
  return await recordReputationChange({
    userId: authorId,
    activityType: "answer_milestone_5_upvotes",
    pointsChange: REPUTATION_RULES.ANSWER_5_UPVOTES.points,
    relatedEntityId: answerId,
    relatedEntityType: "answer",
    uniqueEventId: `answer_5upvotes_${answerId}`,
    description: "Earned +5 points: Answer reached 5 upvotes milestone",
    metadata: { questionId, answerId },
  });
};

/**
 * Reward question reaching 10 upvotes milestone (+2 points once)
 */
export const awardQuestionMilestone10Upvotes = async (authorId, questionId) => {
  return await recordReputationChange({
    userId: authorId,
    activityType: "question_milestone_10_upvotes",
    pointsChange: REPUTATION_RULES.QUESTION_10_UPVOTES.points,
    relatedEntityId: questionId,
    relatedEntityType: "question",
    uniqueEventId: `question_10upvotes_${questionId}`,
    description: "Earned +2 points: Question reached 10 upvotes milestone",
    metadata: { questionId },
  });
};

/**
 * One-time profile completion bonus (+10 points)
 */
export const awardProfileCompleted = async (userId) => {
  const result = await recordReputationChange({
    userId,
    activityType: "profile_completed",
    pointsChange: REPUTATION_RULES.PROFILE_COMPLETED.points,
    relatedEntityId: userId,
    relatedEntityType: "profile",
    uniqueEventId: `profile_completed_${userId}`,
    description: "Earned +10 points: Completed all mandatory profile fields",
  });

  if (result.success) {
    await UserReputation.updateOne(
      { userId: new mongoose.Types.ObjectId(String(userId)) },
      { $set: { hasProfileBonus: true } }
    );
  }

  return result;
};

/**
 * Deduct points for receiving a downvote (-2 points)
 */
export const deductDownvote = async (authorId, relatedEntityId, entityType = "answer", voterId = null) => {
  return await recordReputationChange({
    userId: authorId,
    activityType: "downvote_received",
    pointsChange: REPUTATION_RULES.DOWNVOTE_RECEIVED.points,
    relatedEntityId,
    relatedEntityType: entityType,
    description: `Deducted 2 points: Received a downvote on your ${entityType}`,
    metadata: { voterId },
    actorId: voterId,
  });
};

/**
 * Deduct points when answer is deleted (-5 points plus reversing milestones if applicable)
 */
export const deductAnswerDeleted = async (authorId, questionId, answerId, hadAccepted = false, hadMilestone = false) => {
  // 1. Base penalty for deleting answer (-5)
  const baseResult = await recordReputationChange({
    userId: authorId,
    activityType: "answer_deleted",
    pointsChange: REPUTATION_RULES.ANSWER_DELETED.points,
    relatedEntityId: answerId,
    relatedEntityType: "answer",
    uniqueEventId: `answer_deleted_${answerId}`,
    description: "Deducted 5 points for deleting your answer",
    metadata: { questionId, answerId },
  });

  // 2. Reversal for accepted status if it had one
  if (hadAccepted) {
    await reverseAnswerAccepted(authorId, questionId, answerId);
  }

  // 3. Compensating deduction for milestone bonus if awarded
  if (hadMilestone) {
    await recordReputationChange({
      userId: authorId,
      activityType: "correction",
      pointsChange: -REPUTATION_RULES.ANSWER_5_UPVOTES.points,
      relatedEntityId: answerId,
      relatedEntityType: "answer",
      uniqueEventId: `answer_5upvotes_reversed_${answerId}`,
      description: "Reversed 5 points: 5-upvote milestone cancelled due to answer deletion",
      metadata: { questionId, answerId },
    });
  }

  return baseResult;
};

/**
 * Deduct points for administrative content removal (-10 points)
 */
export const deductAdminContentRemoval = async (authorId, relatedEntityId, entityType, reason, adminId) => {
  const result = await recordReputationChange({
    userId: authorId,
    activityType: "admin_content_removal",
    pointsChange: REPUTATION_RULES.ADMIN_CONTENT_REMOVAL.points,
    relatedEntityId,
    relatedEntityType: entityType,
    description: `Deducted 10 points: Content removed by admin for confirmed violation (${reason})`,
    metadata: { adminId, reason },
    actorId: adminId,
  });

  if (result.success && result.transaction) {
    await ReputationAuditLog.create({
      adminId: new mongoose.Types.ObjectId(String(adminId)),
      targetUserId: new mongoose.Types.ObjectId(String(authorId)),
      action: "manual_adjustment",
      pointsChange: REPUTATION_RULES.ADMIN_CONTENT_REMOVAL.points,
      reason: `Administrative content removal: ${reason}`,
      transactionId: result.transaction._id,
      metadata: { relatedEntityId, entityType },
    });
  }

  return result;
};

/**
 * Get reputation overview for a user
 */
export const getUserReputationData = async (userId) => {
  const parsedUserId = new mongoose.Types.ObjectId(String(userId));
  let userRep = await UserReputation.findOne({ userId: parsedUserId });

  if (!userRep) {
    userRep = await UserReputation.create({
      userId: parsedUserId,
      points: 0,
      totalEarned: 0,
      totalDeducted: 0,
      unlockedPrivileges: [],
    });
  }

  const currentPoints = userRep.points || 0;
  const badge = getReputationBadge(currentPoints);
  const nextPrivilege = getNextPrivilege(currentPoints);
  const unlocked = getUnlockedPrivileges(currentPoints);

  return {
    userId: userRep.userId,
    points: currentPoints,
    totalEarned: userRep.totalEarned || 0,
    totalDeducted: userRep.totalDeducted || 0,
    totalTransferred: userRep.totalTransferred || 0,
    totalReceived: userRep.totalReceived || 0,
    badge,
    unlockedPrivileges: unlocked,
    nextPrivilege,
  };
};

/**
 * Reconcile stored balance against the ledger if needed
 */
export const reconcileUserReputation = async (userId) => {
  const parsedUserId = new mongoose.Types.ObjectId(String(userId));
  const transactions = await ReputationTransaction.find({ userId: parsedUserId });

  const calculatedPoints = transactions.reduce((sum, tx) => sum + (tx.pointsChange || 0), 0);
  const nonNegativePoints = Math.max(0, calculatedPoints);

  const userRep = await UserReputation.findOneAndUpdate(
    { userId: parsedUserId },
    {
      $set: {
        points: nonNegativePoints,
        unlockedPrivileges: getUnlockedPrivileges(nonNegativePoints),
        lastReconciledAt: new Date(),
      },
    },
    { new: true, upsert: true }
  );

  return {
    reconciled: true,
    previousPoints: userRep.points,
    currentPoints: nonNegativePoints,
    totalTransactions: transactions.length,
  };
};
