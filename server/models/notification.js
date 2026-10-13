import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "reply",
        "mention",
        "follow",
        "reputation_earned",
        "reputation_deducted",
        "reputation_transfer_received",
        "reputation_transfer_sent",
        "privilege_unlocked",
        "reputation_adjusted",
      ],
      required: true,
    },
    postid: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    commentid: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    pointsChange: { type: Number, default: 0 },
    message: { type: String, default: "" },
    privilege: { type: String, default: "" },
    entityId: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, read: 1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
