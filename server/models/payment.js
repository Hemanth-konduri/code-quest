import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    planId: { type: String, required: true },
    planName: { type: String, required: true },
    status: {
      type: String,
      enum: ["created", "captured", "failed", "pending"],
      default: "created",
    },
    receipt: { type: String },
    errorDescription: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);
