import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postid: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    content: { type: String, required: true, maxlength: 1000 },
    mentions: [{ type: String }],
    likesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ postid: 1, createdAt: 1 });
commentSchema.index({ parentCommentId: 1 });

export default mongoose.models.Comment ||
  mongoose.model("Comment", commentSchema);
