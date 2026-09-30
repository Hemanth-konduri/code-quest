import mongoose from "mongoose";

const userschema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  password: { type: String, required: true },
  about: { type: String },
  tags: { type: [String] },
  joinDate: { type: Date, default: Date.now },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  currentPlan: { type: String, default: "free" },
  planBadge: { type: String, default: "Free" },
  subscriptionExpiry: { type: Date },
  bookmarks: [{ type: String }],
});

export default mongoose.models.user || mongoose.model("user", userschema);
