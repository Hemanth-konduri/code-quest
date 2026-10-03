import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import axiosInstance from "@/lib/axiosinstance";
import { generateSecureLettersPassword } from "@/lib/passwordGenerator";
import { toast } from "react-toastify";
import {
  KeyRound,
  Mail,
  Phone,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Lock,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Multi-step state: 1 = request, 2 = verify OTP, 3 = reset password, 4 = success
  const [step, setStep] = useState<number>(1);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // 1. Submit Identifier (Email / Phone)
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage("Please enter your registered email address or phone number.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const res = await axiosInstance.post("/user/forgot-password", {
        identifier: identifier.trim(),
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setToken(res.data.token || "");
        setStep(2);
      } else {
        setErrorMessage(res.data.message || "Failed to initiate password reset.");
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        "Failed to initiate password reset. Please try again.";
      setErrorMessage(msg);
      if (error.response?.status === 429) {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const res = await axiosInstance.post("/user/verify-otp", {
        token,
        otp: otp.trim(),
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setStep(3);
      } else {
        setErrorMessage(res.data.message || "Invalid OTP code.");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Invalid or expired OTP code.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Generate Letters-Only Password
  const handleGeneratePassword = () => {
    const generated = generateSecureLettersPassword(14);
    setNewPassword(generated);
    setConfirmPassword(generated);
    toast.info("Generated cryptographically secure letters-only password!");
  };

  // Copy password to clipboard
  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // 4. Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setErrorMessage("Please enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);

    if (!hasUpper || !hasLower) {
      setErrorMessage(
        "Password must contain at least one uppercase letter (A-Z) and one lowercase letter (a-z)."
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const res = await axiosInstance.post("/user/reset-password", {
        token,
        newPassword,
        confirmPassword,
      });

      if (res.data.success) {
        setStep(4);
        toast.success("Your password has been reset successfully!");
        setTimeout(() => {
          router.push("/auth");
        }, 3000);
      } else {
        setErrorMessage(res.data.message || "Failed to reset password.");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to reset password.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-block mb-3">
          <img src="/logo.png" alt="CodeQuest" className="h-8 w-auto mx-auto" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Account Password Recovery
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Securely recover access to your CodeQuest account
        </p>
      </div>

      {/* Main Form Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full relative">
        {/* Step Indicator Bar */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 text-xs font-semibold ${
                step === i
                  ? "text-orange-600 dark:text-orange-400 font-bold"
                  : step > i
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  step === i
                    ? "bg-orange-500 text-white"
                    : step > i
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {step > i ? <Check className="w-3.5 h-3.5" /> : i}
              </span>
              <span className="hidden sm:inline">
                {i === 1 ? "Identify" : i === 2 ? "Verify" : i === 3 ? "Reset" : "Done"}
              </span>
            </div>
          ))}
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Request Password Reset */}
        {step === 1 && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Registered Email Address or Phone Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. user@example.com or +919876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Note: Password resets are limited to <strong>1 request per day</strong> per user.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Send Verification Code
                </>
              )}
            </button>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <Link
                href="/auth"
                className="inline-flex items-center text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-500 gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                A 6-digit OTP code has been sent to:
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {identifier}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full text-center tracking-widest text-2xl font-mono py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                Code expires in 10 minutes. Maximum 3 attempts.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Verify OTP & Continue
                </>
              )}
            </button>

            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Change email / phone
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Generate or Set New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Password Generator Feature */}
            <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-orange-900 dark:text-orange-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Secure Password Generator
                </span>
                <span className="text-[10px] bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded-full font-semibold">
                  Letters Only
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3">
                Generates a cryptographically secure 14-character letters-only password (e.g. <code>aKpLmNzQwErTyU</code>).
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Generate Password
                </button>
                {newPassword && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="py-1.5 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <p className="text-[11px] text-slate-400 mb-1.5">
                Must contain at least 1 uppercase (A-Z) & 1 lowercase (a-z) letter, min 8 chars.
              </p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter or generate new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Save New Password
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: Success & Redirect */}
        {step === 4 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Password Reset Successful!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Your password has been reset successfully. You can now log in with your new password.
            </p>

            <div className="pt-4">
              <Link
                href="/auth"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-all shadow-md gap-2"
              >
                Go to Login Page
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
