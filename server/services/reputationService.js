import mongoose from "mongoose";
import UserReputation from "../models/userReputation.js";
import ReputationTransaction from "../models/reputationTransaction.js";
import ReputationAuditLog from "../models/reputationAuditLog.js";
import ReputationTransfer from "../models/reputationTransfer.js";
import Notification from "../models/notification.js";
import User from "../models/auth.js";
import {
  REPUTATION_RULES,
  PRIVILEGES,
  TRANSFER_LIMITS,
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
    const txData = {
      userId: parsedUserId,
      activityType,
      pointsChange,
      previousBalance,
      newBalance,
      relatedEntityId: relatedEntityId ? String(relatedEntityId) : null,
      relatedEntityType,
      description: description || `Reputation changed by ${pointsChange} points`,
      isPublic,
      metadata,
    };
    if (uniqueEventId) {
      txData.uniqueEventId = uniqueEventId;
    }
    transaction = await ReputationTransaction.create(txData);
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

/**
 * Transfer reputation points from sender to recipient
 */
export const transferReputation = async ({
  senderId,
  recipientId,
  points,
  reason,
  idempotencyKey = null,
}) => {
  if (!senderId || !recipientId) {
    return { success: false, message: "Sender and recipient are required" };
  }

  const parsedSenderId = new mongoose.Types.ObjectId(String(senderId));
  const parsedRecipientId = new mongoose.Types.ObjectId(String(recipientId));

  if (parsedSenderId.equals(parsedRecipientId)) {
    return { success: false, message: "You cannot transfer reputation points to yourself" };
  }

  const transferAmount = parseInt(points, 10);
  if (isNaN(transferAmount) || transferAmount < 1 || transferAmount > 50) {
    return {
      success: false,
      message: "Transfer amount must be an integer between 1 and 50 points",
    };
  }

  if (!reason || !reason.trim()) {
    return { success: false, message: "A valid transfer reason must be provided" };
  }

  // Idempotency check
  if (idempotencyKey) {
    const existingTransfer = await ReputationTransfer.findOne({ idempotencyKey });
    if (existingTransfer) {
      return {
        success: true,
        duplicate: true,
        message: "Transfer already completed with this idempotency key",
        transfer: existingTransfer,
      };
    }
  }

  // Verify recipient exists
  const recipientUser = await User.findById(parsedRecipientId).select("name email role");
  if (!recipientUser) {
    return { success: false, message: "Recipient user not found" };
  }

  const senderUser = await User.findById(parsedSenderId).select("name email role");
  if (!senderUser) {
    return { success: false, message: "Sender user not found" };
  }

  // Check sender balance & eligibility
  const senderRep = await UserReputation.findOne({ userId: parsedSenderId });
  const currentSenderPoints = senderRep?.points || 0;

  // Sender must have strictly MORE than 50 points (> 50)
  if (currentSenderPoints <= 50) {
    return {
      success: false,
      message: "You must have more than 50 reputation points to transfer points to others.",
      currentPoints: currentSenderPoints,
      minRequired: 51,
    };
  }

  if (currentSenderPoints < transferAmount) {
    return {
      success: false,
      message: "Insufficient reputation balance for this transfer",
      currentPoints: currentSenderPoints,
    };
  }

  // Rolling 24-hour limit: max 100 points
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentTransfers = await ReputationTransfer.find({
    senderId: parsedSenderId,
    status: "completed",
    createdAt: { $gte: since24h },
  });

  const transferredLast24h = recentTransfers.reduce((sum, tx) => sum + tx.points, 0);
  if (transferredLast24h + transferAmount > 100) {
    const remaining = Math.max(0, 100 - transferredLast24h);
    return {
      success: false,
      message: `Transfer exceeds daily 100-point limit. You have transferred ${transferredLast24h} points in the past 24 hours (remaining: ${remaining}).`,
      transferredLast24h,
      remainingDailyLimit: remaining,
    };
  }

  // Atomic deduction from sender (prevent concurrent double spending)
  const updatedSenderRep = await UserReputation.findOneAndUpdate(
    {
      userId: parsedSenderId,
      points: { $gte: transferAmount, $gt: 50 },
    },
    {
      $inc: { points: -transferAmount, totalTransferred: transferAmount },
    },
    { new: true }
  );

  if (!updatedSenderRep) {
    return {
      success: false,
      message: "Transfer failed: Insufficient balance or concurrent transfer detected",
    };
  }

  // Atomic credit to recipient
  let recipientRep = await UserReputation.findOneAndUpdate(
    { userId: parsedRecipientId },
    {
      $inc: { points: transferAmount, totalReceived: transferAmount },
    },
    { new: true, upsert: true }
  );

  // Update privileges
  updatedSenderRep.unlockedPrivileges = getUnlockedPrivileges(updatedSenderRep.points);
  await updatedSenderRep.save();

  const recipientPrevPrivileges = recipientRep.unlockedPrivileges || [];
  recipientRep.unlockedPrivileges = getUnlockedPrivileges(recipientRep.points);
  await recipientRep.save();

  // Create transfer record
  const transfer = await ReputationTransfer.create({
    senderId: parsedSenderId,
    recipientId: parsedRecipientId,
    points: transferAmount,
    reason: reason.trim(),
    status: "completed",
    idempotencyKey: idempotencyKey || null,
  });

  // Create sender ledger entry
  const senderTx = await ReputationTransaction.create({
    userId: parsedSenderId,
    activityType: "reputation_transfer_sent",
    pointsChange: -transferAmount,
    previousBalance: currentSenderPoints,
    newBalance: updatedSenderRep.points,
    relatedEntityId: transfer._id.toString(),
    relatedEntityType: "transfer",
    description: `Transferred ${transferAmount} points to ${recipientUser.name || "user"}`,
    isPublic: false,
    metadata: { recipientId: parsedRecipientId, reason: reason.trim() },
  });

  // Create recipient ledger entry
  const recipientTx = await ReputationTransaction.create({
    userId: parsedRecipientId,
    activityType: "reputation_transfer_received",
    pointsChange: transferAmount,
    previousBalance: recipientRep.points - transferAmount,
    newBalance: recipientRep.points,
    relatedEntityId: transfer._id.toString(),
    relatedEntityType: "transfer",
    description: `Received ${transferAmount} points from ${senderUser.name || "user"}`,
    isPublic: false,
    metadata: { senderId: parsedSenderId, reason: reason.trim() },
  });

  // Link transaction IDs
  transfer.senderTransactionId = senderTx._id;
  transfer.recipientTransactionId = recipientTx._id;
  await transfer.save();

  // In-app notifications
  try {
    // Recipient notification
    await Notification.create({
      recipientId: parsedRecipientId,
      actorId: parsedSenderId,
      type: "reputation_transfer_received",
      pointsChange: transferAmount,
      entityId: transfer._id.toString(),
      message: `${senderUser.name || "A user"} transferred ${transferAmount} reputation points to you: "${reason.trim()}"`,
      read: false,
    });

    // Sender notification
    await Notification.create({
      recipientId: parsedSenderId,
      actorId: parsedRecipientId,
      type: "reputation_transfer_sent",
      pointsChange: -transferAmount,
      entityId: transfer._id.toString(),
      message: `You transferred ${transferAmount} reputation points to ${recipientUser.name || "user"}`,
      read: false,
    });

    // Check if recipient unlocked new privilege
    const newlyUnlockedRecipient = recipientRep.unlockedPrivileges.filter(
      (p) => !recipientPrevPrivileges.includes(p)
    );
    for (const priv of newlyUnlockedRecipient) {
      await Notification.create({
        recipientId: parsedRecipientId,
        actorId: null,
        type: "privilege_unlocked",
        pointsChange: 0,
        privilege: priv,
        message: `Congratulations! You unlocked the privilege: ${priv.replace("_", " ")}`,
        read: false,
      });
    }
  } catch (notifErr) {
    console.error("Transfer notification error:", notifErr);
  }

  return {
    success: true,
    transfer,
    newSenderBalance: updatedSenderRep.points,
    newRecipientBalance: recipientRep.points,
  };
};

/**
 * Reverses a completed transfer by administrative order
 */
export const reverseReputationTransfer = async ({
  transferId,
  adminId,
  reason,
}) => {
  if (!transferId || !adminId || !reason) {
    return { success: false, message: "Transfer ID, admin ID, and reason are required" };
  }

  const transfer = await ReputationTransfer.findById(transferId);
  if (!transfer) {
    return { success: false, message: "Transfer not found" };
  }

  if (transfer.status !== "completed") {
    return { success: false, message: `Cannot reverse transfer with status: ${transfer.status}` };
  }

  const { senderId, recipientId, points } = transfer;

  // Fetch current balances
  const recipientRep = await UserReputation.findOne({ userId: recipientId });
  const senderRep = await UserReputation.findOne({ userId: senderId });

  const recipientPrev = recipientRep?.points || 0;
  const senderPrev = senderRep?.points || 0;

  // Deduct from recipient (non-negative)
  const recipientNew = Math.max(0, recipientPrev - points);
  await UserReputation.updateOne(
    { userId: recipientId },
    {
      $set: {
        points: recipientNew,
        unlockedPrivileges: getUnlockedPrivileges(recipientNew),
      },
      $inc: { totalReceived: -points },
    }
  );

  // Refund to sender
  const senderNew = senderPrev + points;
  await UserReputation.updateOne(
    { userId: senderId },
    {
      $set: {
        points: senderNew,
        unlockedPrivileges: getUnlockedPrivileges(senderNew),
      },
      $inc: { totalTransferred: -points },
    }
  );

  // Compensating ledger entries
  const recipientCompTx = await ReputationTransaction.create({
    userId: recipientId,
    activityType: "reputation_transfer_reversed",
    pointsChange: -(recipientPrev - recipientNew),
    previousBalance: recipientPrev,
    newBalance: recipientNew,
    relatedEntityId: transfer._id.toString(),
    relatedEntityType: "transfer",
    description: `Transfer of ${points} points reversed by admin: ${reason}`,
    isPublic: false,
    metadata: { transferId, adminId, reason },
  });

  const senderCompTx = await ReputationTransaction.create({
    userId: senderId,
    activityType: "reputation_transfer_reversed",
    pointsChange: points,
    previousBalance: senderPrev,
    newBalance: senderNew,
    relatedEntityId: transfer._id.toString(),
    relatedEntityType: "transfer",
    description: `Transfer of ${points} points refunded by admin: ${reason}`,
    isPublic: false,
    metadata: { transferId, adminId, reason },
  });

  // Mark transfer as reversed
  transfer.status = "reversed";
  transfer.reversalReason = reason;
  transfer.reversedAt = new Date();
  transfer.reversedBy = new mongoose.Types.ObjectId(String(adminId));
  await transfer.save();

  // Audit log
  await ReputationAuditLog.create({
    adminId: new mongoose.Types.ObjectId(String(adminId)),
    targetUserId: recipientId,
    action: "transfer_reversed",
    pointsChange: -points,
    reason,
    transactionId: recipientCompTx._id,
    metadata: { transferId, senderId, recipientId, points },
  });

  // In-app notifications
  try {
    await Notification.create({
      recipientId,
      actorId: adminId,
      type: "reputation_deducted",
      pointsChange: -points,
      entityId: transfer._id.toString(),
      message: `A received transfer of ${points} points was reversed by administrator: ${reason}`,
      read: false,
    });

    await Notification.create({
      recipientId: senderId,
      actorId: adminId,
      type: "reputation_earned",
      pointsChange: points,
      entityId: transfer._id.toString(),
      message: `A transfer of ${points} points was refunded to your balance by administrator: ${reason}`,
      read: false,
    });
  } catch (notifErr) {
    console.error("Reversal notification error:", notifErr);
  }

  return {
    success: true,
    message: "Transfer successfully reversed",
    transfer,
  };
};

/**
 * Get transfer eligibility and limits for a user
 */
export const getTransferEligibility = async (userId) => {
  const parsedUserId = new mongoose.Types.ObjectId(String(userId));
  const userRep = await UserReputation.findOne({ userId: parsedUserId });
  const currentPoints = userRep?.points || 0;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentTransfers = await ReputationTransfer.find({
    senderId: parsedUserId,
    status: "completed",
    createdAt: { $gte: since24h },
  });

  const transferredLast24h = recentTransfers.reduce((sum, tx) => sum + tx.points, 0);
  const remainingDailyLimit = Math.max(0, 100 - transferredLast24h);
  const canTransfer = currentPoints > 50 && remainingDailyLimit > 0;

  return {
    canTransfer,
    currentPoints,
    minRequired: 51,
    transferredLast24h,
    remainingDailyLimit,
    maxPerTx: 50,
    dailyLimit: 100,
  };
};

/**
 * Admin manual reputation adjustment with mandatory reason
 */
export const adminManualReputationAdjustment = async ({
  targetUserId,
  pointsChange,
  reason,
  adminId,
}) => {
  if (!targetUserId || !pointsChange || !reason || !adminId) {
    return { success: false, message: "Target user, points change, reason, and admin ID required" };
  }

  const result = await recordReputationChange({
    userId: targetUserId,
    activityType: "admin_adjustment",
    pointsChange: Number(pointsChange),
    description: `Administrative adjustment: ${reason}`,
    actorId: adminId,
    metadata: { adminId, reason },
  });

  if (result.success && result.transaction) {
    await ReputationAuditLog.create({
      adminId: new mongoose.Types.ObjectId(String(adminId)),
      targetUserId: new mongoose.Types.ObjectId(String(targetUserId)),
      action: "manual_adjustment",
      pointsChange: Number(pointsChange),
      reason,
      transactionId: result.transaction._id,
      metadata: { previousBalance: result.transaction.previousBalance, newBalance: result.transaction.newBalance },
    });
  }

  return result;
};
