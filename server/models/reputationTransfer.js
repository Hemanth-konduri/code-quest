import mongoose from "mongoose";

const reputationTransferSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["completed", "failed", "reversed"],
      default: "completed",
      index: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
    },
    senderTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReputationTransaction",
      default: null,
    },
    recipientTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReputationTransaction",
      default: null,
    },
    reversalReason: {
      type: String,
      default: null,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true }
);

reputationTransferSchema.index({ senderId: 1, createdAt: -1 });
reputationTransferSchema.index({ recipientId: 1, createdAt: -1 });

export default mongoose.models.ReputationTransfer ||
  mongoose.model("ReputationTransfer", reputationTransferSchema);
