import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    identifier: { type: String, required: true }, // Email or Phone number
    resetMethod: { type: String, enum: ["email", "phone"], required: true },
    otp: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    lastRequestAt: { type: Date, default: Date.now },
    resetCompletedAt: { type: Date },
  },
  { timestamps: true }
);

passwordResetSchema.index({ identifier: 1, createdAt: -1 });

export default mongoose.models.PasswordReset ||
  mongoose.model("PasswordReset", passwordResetSchema);
