import mongoose from "mongoose";
import User from "../models/auth.js";
import UserSubscription from "../models/userSubscription.js";
import Payment from "../models/payment.js";
import Invoice from "../models/invoice.js";
import DailyUsage from "../models/dailyUsage.js";
import { PLANS } from "../config/plans.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "../services/razorpayService.js";
import { createInvoiceRecord } from "../services/invoiceService.js";
import { sendPaymentConfirmationEmail } from "../services/emailService.js";

// Get all subscription plans
export const getPlans = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: Object.values(PLANS) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch plans" });
  }
};

// Get current user's active subscription and usage details
export const getCurrentSubscription = async (req, res) => {
  try {
    const userid = req.userid;
    const user = await User.findById(userid).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Auto-check expiry
    if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
      user.currentPlan = "free";
      user.planBadge = "Free";
      await user.save();
    }

    const planConfig = PLANS[user.currentPlan || "free"];
    const today = new Date().toISOString().slice(0, 10);
    const usage = await DailyUsage.findOne({ userid, date: today });

    const activeSubscription = await UserSubscription.findOne({
      userid,
      status: "Active",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        user,
        plan: planConfig,
        subscription: activeSubscription,
        dailyUsage: {
          questionsAsked: usage ? usage.questionsAsked : 0,
          dailyLimit: planConfig.dailyLimit,
          remaining:
            planConfig.dailyLimit === -1
              ? "Unlimited"
              : Math.max(0, planConfig.dailyLimit - (usage ? usage.questionsAsked : 0)),
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching subscription" });
  }
};

// Create Razorpay Order
export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const userid = req.userid;
    const plan = PLANS[planId];

    if (!plan || plan.price === 0) {
      return res.status(400).json({ success: false, message: "Invalid paid plan selected" });
    }

    const receipt = `rcpt_${userid}_${Date.now()}`;
    const order = await createRazorpayOrder({
      amount: plan.price,
      currency: "INR",
      receipt,
    });

    const paymentRecord = new Payment({
      userid,
      razorpayOrderId: order.id,
      amount: plan.price,
      currency: "INR",
      planId: plan.planId,
      planName: plan.name,
      status: "created",
      receipt,
    });

    await paymentRecord.save();

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID || "rzp_test_mockkeyid123",
        plan,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
};

// Verify Razorpay Payment & Activate Subscription
export const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId } = req.body;
    const userid = req.userid;

    const isValid = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { status: "failed", errorDescription: "Invalid signature" }
      );
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        razorpayPaymentId,
        razorpaySignature,
        status: "captured",
      },
      { new: true }
    );

    const user = await User.findById(userid);
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days subscription

    // Deactivate existing active subscriptions
    await UserSubscription.updateMany(
      { userid, status: "Active" },
      { status: "Expired" }
    );

    // Create new user subscription
    const subscription = new UserSubscription({
      userid,
      planId: plan.planId,
      status: "Active",
      startDate,
      renewalDate: expiryDate,
      expiryDate,
      razorpayOrderId,
      razorpayPaymentId,
    });
    await subscription.save();

    // Update User plan & badge
    user.currentPlan = plan.planId;
    user.planBadge = plan.badge;
    user.subscriptionExpiry = expiryDate;
    await user.save();

    // Create Invoice
    const invoice = await createInvoiceRecord({
      userid: user._id,
      userName: user.name,
      userEmail: user.email,
      paymentId: payment._id,
      razorpayPaymentId,
      planId: plan.planId,
      planName: plan.name,
      amount: plan.price,
    });

    // Trigger confirmation email asynchronously
    sendPaymentConfirmationEmail({
      userEmail: user.email,
      userName: user.name,
      planName: plan.name,
      amountPaid: plan.price,
      invoiceNumber: invoice.invoiceNumber,
      renewalDate: expiryDate,
    });

    res.status(200).json({
      success: true,
      message: `Successfully subscribed to ${plan.name} Plan!`,
      data: {
        subscription,
        invoice,
        user: {
          currentPlan: user.currentPlan,
          planBadge: user.planBadge,
          subscriptionExpiry: user.subscriptionExpiry,
        },
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ success: false, message: "Error activating subscription" });
  }
};

// Cancel active subscription
export const cancelSubscription = async (req, res) => {
  try {
    const userid = req.userid;
    const activeSub = await UserSubscription.findOne({ userid, status: "Active" });

    if (!activeSub) {
      return res.status(404).json({ success: false, message: "No active subscription found" });
    }

    activeSub.status = "Cancelled";
    activeSub.autoRenew = false;
    await activeSub.save();

    res.status(200).json({
      success: true,
      message: "Subscription cancelled. Access remains active until the end of your billing cycle.",
      data: activeSub,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error cancelling subscription" });
  }
};

// Get User Payment History and Invoices
export const getUserInvoices = async (req, res) => {
  try {
    const userid = req.userid;
    const invoices = await Invoice.find({ userid }).sort({ createdAt: -1 });
    const payments = await Payment.find({ userid }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { invoices, payments },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error loading invoices" });
  }
};

// Razorpay Webhook Handler
export const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (webhookSecret && signature) {
      const crypto = await import("crypto");
      const expectedSignature = crypto.default
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ status: "invalid signature" });
      }
    }

    const event = req.body.event;
    console.log(`🔔 Razorpay Webhook event received: ${event}`);

    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ status: "error" });
  }
};

// Admin Controller: All Subscriptions & Revenue analytics
export const getAdminSubscriptions = async (req, res) => {
  try {
    const user = await User.findById(req.userid);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const subscriptions = await UserSubscription.find()
      .populate("userid", "name email role currentPlan planBadge")
      .sort({ createdAt: -1 });

    const payments = await Payment.find().sort({ createdAt: -1 });
    const invoices = await Invoice.find().sort({ createdAt: -1 });

    const totalRevenue = payments
      .filter((p) => p.status === "captured")
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        subscriptions,
        payments,
        invoices,
        stats: {
          totalRevenue,
          totalActive: subscriptions.filter((s) => s.status === "Active").length,
          totalSubscriptions: subscriptions.length,
        },
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch admin metrics" });
  }
};

// Admin Controller: Manually Revoke or Extend Subscriptions
export const adminModifySubscription = async (req, res) => {
  try {
    const adminUser = await User.findById(req.userid);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { targetUserId, action, days, newPlanId } = req.body;
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found" });
    }

    if (action === "revoke") {
      targetUser.currentPlan = "free";
      targetUser.planBadge = "Free";
      targetUser.subscriptionExpiry = null;
      await targetUser.save();

      await UserSubscription.updateMany(
        { userid: targetUserId, status: "Active" },
        { status: "Cancelled" }
      );
    } else if (action === "extend") {
      const plan = PLANS[newPlanId || targetUser.currentPlan || "bronze"];
      const newExpiry = targetUser.subscriptionExpiry
        ? new Date(targetUser.subscriptionExpiry)
        : new Date();
      newExpiry.setDate(newExpiry.getDate() + (days || 30));

      targetUser.currentPlan = plan.planId;
      targetUser.planBadge = plan.badge;
      targetUser.subscriptionExpiry = newExpiry;
      await targetUser.save();

      await UserSubscription.create({
        userid: targetUserId,
        planId: plan.planId,
        status: "Active",
        startDate: new Date(),
        renewalDate: newExpiry,
        expiryDate: newExpiry,
      });
    }

    res.status(200).json({
      success: true,
      message: `Subscription successfully ${action}d for ${targetUser.name}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to modify subscription" });
  }
};
