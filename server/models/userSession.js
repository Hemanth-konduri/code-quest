import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    sessionTokenHash: { type: String, required: true, unique: true },
    deviceName: { type: String, default: "Unknown Device" },
    browser: { type: String, default: "Chrome" },
    os: { type: String, default: "Windows" },
    deviceType: { type: String, default: "Desktop" },
    ip: { type: String, default: "127.0.0.1" },
    location: { type: String, default: "Local Network" },
    authMethod: { type: String, default: "password" },
    recognitionStatus: {
      type: String,
      enum: ["recognized", "unrecognized", "suspicious"],
      default: "unrecognized",
    },
    lastActivityAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "expired", "revoked"],
      default: "active",
    },
  },
  { timestamps: true }
);

userSessionSchema.index({ userid: 1, status: 1 });
userSessionSchema.index({ sessionTokenHash: 1 });

export default mongoose.models.UserSession ||
  mongoose.model("UserSession", userSessionSchema);
