import mongoose from "mongoose";

const reputationTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: [
        "answer_posted",
        "answer_accepted",
        "answer_milestone_5_upvotes",
        "question_milestone_10_upvotes",
        "profile_completed",
        "upvote_received",
        "downvote_received",
        "answer_deleted",
        "admin_content_removal",
        "reputation_transfer_sent",
        "reputation_transfer_received",
        "reputation_transfer_reversed",
        "acceptance_reversed",
        "admin_adjustment",
        "correction",
      ],
      required: true,
      index: true,
    },
    pointsChange: {
      type: Number,
      required: true,
    },
    previousBalance: {
      type: Number,
      required: true,
    },
    newBalance: {
      type: Number,
      required: true,
    },
    relatedEntityId: {
      type: String,
      default: null,
    },
    relatedEntityType: {
      type: String,
      enum: ["question", "answer", "post", "comment", "transfer", "profile", "admin", "system"],
      default: "system",
    },
    uniqueEventId: {
      type: String,
      index: { unique: true, sparse: true },
    },
    description: {
      type: String,
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

reputationTransactionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.ReputationTransaction ||
  mongoose.model("ReputationTransaction", reputationTransactionSchema);
