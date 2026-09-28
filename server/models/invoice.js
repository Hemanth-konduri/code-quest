import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    razorpayPaymentId: { type: String },
    planId: { type: String, required: true },
    planName: { type: String, required: true },
    amount: { type: Number, required: true },
    gst: { type: Number, required: true }, // 18% GST
    total: { type: Number, required: true },
    issuedAt: { type: Date, default: Date.now },
    dueDate: { type: Date },
    status: { type: String, enum: ["paid", "refunded", "cancelled"], default: "paid" },
  },
  { timestamps: true }
);

export default mongoose.models.Invoice ||
  mongoose.model("Invoice", invoiceSchema);
