import mongoose from "mongoose";

const securityEventSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    eventType: {
      type: String,
      enum: [
        "login_success",
        "login_failed",
        "unrecognized_login_otp_required",
        "session_revoked",
        "all_sessions_revoked",
        "trusted_device_added",
        "trusted_device_removed",
        "password_changed",
      ],
      required: true,
    },
    ip: { type: String, default: "127.0.0.1" },
    userAgent: { type: String, default: "" },
    details: { type: String, default: "" },
  },
  { timestamps: true }
);

securityEventSchema.index({ userid: 1, createdAt: -1 });

export default mongoose.models.SecurityEvent ||
  mongoose.model("SecurityEvent", securityEventSchema);
