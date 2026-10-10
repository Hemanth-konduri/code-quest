import mongoose from "mongoose";

const trustedDeviceSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    deviceLabel: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true },
    browser: { type: String },
    os: { type: String },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

trustedDeviceSchema.index({ userid: 1 });
trustedDeviceSchema.index({ tokenHash: 1 });

export default mongoose.models.TrustedDevice ||
  mongoose.model("TrustedDevice", trustedDeviceSchema);
