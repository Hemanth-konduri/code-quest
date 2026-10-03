import mongoose from "mongoose";

const userSuspensionSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, unique: true },
    reason: { type: String, required: true },
    suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    isPermanent: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.UserSuspension ||
  mongoose.model("UserSuspension", userSuspensionSchema);
