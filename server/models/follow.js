import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
  {
    followerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    followingId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  },
  { timestamps: true }
);

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followerId: 1 });
followSchema.index({ followingId: 1 });

export default mongoose.models.Follow ||
  mongoose.model("Follow", followSchema);
