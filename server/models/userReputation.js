import mongoose from "mongoose";

const userReputationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
      index: true,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    totalDeducted: {
      type: Number,
      default: 0,
    },
    totalTransferred: {
      type: Number,
      default: 0,
    },
    totalReceived: {
      type: Number,
      default: 0,
    },
    hasProfileBonus: {
      type: Boolean,
      default: false,
    },
    unlockedPrivileges: {
      type: [String],
      default: [],
    },
    lastReconciledAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.UserReputation ||
  mongoose.model("UserReputation", userReputationSchema);
