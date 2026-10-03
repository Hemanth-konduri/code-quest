import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    content: { type: String, required: true, maxlength: 3000 },
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, default: "image" },
      },
    ],
    codeSnippet: {
      language: { type: String, default: "javascript" },
      code: { type: String, maxlength: 5000 },
    },
    projectLink: { type: String },
    hashtags: [{ type: String, lowercase: true }],
    mentions: [{ type: String }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "removed"], default: "active" },
  },
  { timestamps: true }
);

postSchema.index({ userid: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ trendingScore: -1, createdAt: -1 });

export default mongoose.models.Post || mongoose.model("Post", postSchema);
