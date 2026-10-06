import mongoose from "mongoose";

const languageOtpSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    targetLanguage: {
      type: String,
      enum: ["en", "es", "hi", "pt", "zh", "fr"],
      required: true,
    },
    method: {
      type: String,
      enum: ["email", "mobile"],
      required: true,
    },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    resendAvailableAt: { type: Date, required: true },
  },
  { timestamps: true }
);

languageOtpSchema.index({ userid: 1, targetLanguage: 1 });

export default mongoose.models.LanguageOtp ||
  mongoose.model("LanguageOtp", languageOtpSchema);
