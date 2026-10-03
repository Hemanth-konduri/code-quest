import mongoose from "mongoose";

const hashtagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

hashtagSchema.index({ name: 1 });
hashtagSchema.index({ postCount: -1 });

export default mongoose.models.Hashtag ||
  mongoose.model("Hashtag", hashtagSchema);
