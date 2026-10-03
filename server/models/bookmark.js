import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    postid: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  },
  { timestamps: true }
);

bookmarkSchema.index({ userid: 1, postid: 1 }, { unique: true });
bookmarkSchema.index({ userid: 1, createdAt: -1 });

export default mongoose.models.Bookmark ||
  mongoose.model("Bookmark", bookmarkSchema);
