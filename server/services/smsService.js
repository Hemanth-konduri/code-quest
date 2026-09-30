export const sendSmsOtp = async ({ phone, otp, userName }) => {
  try {
    const smsMessage = `Hi ${userName || "User"}, your CodeQuest Password Reset OTP is ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
    
    // Fallback console log for SMS delivery in development/testing
    console.log(`📱 [SMS SERVICE] Sending OTP to ${phone}:`);
    console.log(`Message: ${smsMessage}`);

    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send SMS OTP:", error);
    return { success: false, error: error.message };
  }
};
