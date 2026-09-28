import mongoose from "mongoose";

const userSubscriptionSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    planId: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "Cancelled", "Expired", "Pending"],
      default: "Active",
    },
    startDate: { type: Date, default: Date.now },
    renewalDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySubscriptionId: { type: String },
    autoRenew: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.UserSubscription ||
  mongoose.model("UserSubscription", userSubscriptionSchema);
