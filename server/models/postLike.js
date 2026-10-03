import mongoose from "mongoose";

const postLikeSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    postid: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  },
  { timestamps: true }
);

postLikeSchema.index({ userid: 1, postid: 1 }, { unique: true });

export default mongoose.models.PostLike ||
  mongoose.model("PostLike", postLikeSchema);
