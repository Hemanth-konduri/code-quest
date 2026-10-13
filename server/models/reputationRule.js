import mongoose from "mongoose";

const reputationRuleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      enum: ["reward", "deduction", "privilege", "transfer_limit"],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ReputationRule ||
  mongoose.model("ReputationRule", reputationRuleSchema);
