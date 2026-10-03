import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    postid: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    commentid: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    reason: {
      type: String,
      enum: [
        "Spam",
        "Harassment",
        "Inappropriate content",
        "Hate/abusive content",
        "Copyright issue",
        "Misleading content",
        "Other",
      ],
      required: true,
    },
    details: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: ["pending", "resolved", "rejected"],
      default: "pending",
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    actionTaken: { type: String, default: null },
  },
  { timestamps: true }
);

reportSchema.index({ postid: 1, reporterId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Report ||
  mongoose.model("Report", reportSchema);
