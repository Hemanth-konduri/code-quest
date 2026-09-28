import mongoose from "mongoose";

const dailyUsageSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    questionsAsked: { type: Number, default: 0 },
    lastQuestionAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

dailyUsageSchema.index({ userid: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyUsage ||
  mongoose.model("DailyUsage", dailyUsageSchema);
