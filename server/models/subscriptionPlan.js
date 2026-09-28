import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    planId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    dailyLimit: { type: Number, required: true }, // -1 for unlimited
    badge: { type: String, required: true },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.SubscriptionPlan ||
  mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
