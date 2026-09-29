import User from "../models/auth.js";
import DailyUsage from "../models/dailyUsage.js";
import { PLANS } from "../config/plans.js";

export const checkDailyQuestionLimit = async (req, res, next) => {
  try {
    const userid = req.userid;
    if (!userid) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(userid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let planId = user.currentPlan || "free";

    // Check if user's paid subscription has expired
    if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date()) {
      planId = "free";
      user.currentPlan = "free";
      user.planBadge = "Free";
      await user.save();
    }

    const planConfig = PLANS[planId] || PLANS.free;
    const dailyLimit = planConfig.dailyLimit;

    // Unlimited questions for Gold plan (-1)
    if (dailyLimit === -1) {
      req.userPlan = planConfig;
      return next();
    }

    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);

    let usage = await DailyUsage.findOne({ userid, date: today });
    if (!usage) {
      usage = new DailyUsage({ userid, date: today, questionsAsked: 0 });
      await usage.save();
    }

    if (usage.questionsAsked >= dailyLimit) {
      return res.status(403).json({
        message: `Daily question limit reached! Your ${planConfig.name} plan allows ${dailyLimit} question(s) per day. Upgrade your plan for higher or unlimited questions.`,
        currentLimit: dailyLimit,
        questionsAskedToday: usage.questionsAsked,
        planId,
      });
    }

    req.dailyUsage = usage;
    req.userPlan = planConfig;
    next();
  } catch (error) {
    console.error("Daily Limit Check Error:", error);
    res.status(500).json({ message: "Error verifying daily limit" });
  }
};

export const incrementDailyQuestionCount = async (userid) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    await DailyUsage.findOneAndUpdate(
      { userid, date: today },
      { $inc: { questionsAsked: 1 }, $set: { lastQuestionAt: new Date() } },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("Failed to increment daily question count:", error);
  }
};
