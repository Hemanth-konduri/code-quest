import mongoose from "mongoose";

const loginActivitySchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    sessionId: { type: String, default: null },
    ip: { type: String, default: "127.0.0.1" },
    userAgent: { type: String, default: "" },
    browser: { type: String, default: "Unknown Browser" },
    os: { type: String, default: "Unknown OS" },
    deviceType: { type: String, default: "Desktop" },
    location: { type: String, default: "Local Network" },
    loginResult: { type: String, enum: ["success", "failed", "otp_required"], required: true },
    authMethod: { type: String, default: "password" },
    recognitionStatus: {
      type: String,
      enum: ["recognized", "unrecognized", "suspicious"],
      default: "unrecognized",
    },
  },
  { timestamps: true }
);

loginActivitySchema.index({ userid: 1, createdAt: -1 });
loginActivitySchema.index({ ip: 1 });

export default mongoose.models.LoginActivity ||
  mongoose.model("LoginActivity", loginActivitySchema);
