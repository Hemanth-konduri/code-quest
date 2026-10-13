import mongoose from "mongoose";

const reputationAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["manual_adjustment", "transfer_reversed", "rule_updated", "abuse_investigated"],
      required: true,
    },
    pointsChange: {
      type: Number,
      default: 0,
    },
    reason: {
      type: String,
      required: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReputationTransaction",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

reputationAuditLogSchema.index({ createdAt: -1 });

export default mongoose.models.ReputationAuditLog ||
  mongoose.model("ReputationAuditLog", reputationAuditLogSchema);
