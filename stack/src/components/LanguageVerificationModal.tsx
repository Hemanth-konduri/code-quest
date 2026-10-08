import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Mail, Phone, RefreshCw } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "react-toastify";
import { useLanguage, SupportedLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";

interface LanguageVerificationModalProps {
  isOpen: boolean;
  targetLanguage: SupportedLanguage;
  method: "email" | "mobile";
  maskedContact: string;
  onClose: () => void;
  onSuccess: (newLang: SupportedLanguage) => void;
}

const LANGUAGE_NAMES: Record<SupportedLanguage, { name: string; flag: string }> = {
  en: { name: "English", flag: "🇬🇧" },
  es: { name: "Spanish", flag: "🇪🇸" },
  hi: { name: "Hindi", flag: "🇮🇳" },
  pt: { name: "Portuguese", flag: "🇧🇷" },
  zh: { name: "Chinese", flag: "🇨🇳" },
  fr: { name: "French", flag: "🇫🇷" },
};

export default function LanguageVerificationModal({
  isOpen,
  targetLanguage,
  method,
  maskedContact,
  onClose,
  onSuccess,
}: LanguageVerificationModalProps) {
  const { t } = useLanguage();
  const { updateUser } = useAuth();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

  if (!isOpen) return null;

  const targetInfo = LANGUAGE_NAMES[targetLanguage] || { name: targetLanguage, flag: "🌐" };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMsg("Please enter a valid 6-digit verification code.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await axiosInstance.post("/user/verify-language-otp", {
        targetLanguage,
        otp: otp.trim(),
      });

      if (res.data.user) {
        updateUser(res.data.user);
      }

      toast.success(res.data.message || `Language changed to ${targetInfo.name}`);
      onSuccess(targetLanguage);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Invalid or expired OTP verification code.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await axiosInstance.post("/user/request-language-otp", {
        targetLanguage,
      });
      toast.info(res.data.message || "New verification code sent!");
      setResendCooldown(30);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to resend verification code.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {t("language.verifyTitle")}
            </h3>
            <p className="text-xs text-gray-500">
              Switching to {targetInfo.flag} <strong>{targetInfo.name}</strong>
            </p>
          </div>
        </div>

        {/* Masked Contact Info Card */}
        <div className="bg-orange-50/70 border border-orange-200 rounded-md p-3 mb-4 text-xs text-gray-800 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-orange-800">
            {method === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            <span>Verification Method: {method === "email" ? "Email Address" : "Mobile Number"}</span>
          </div>
          <p className="text-gray-600">
            {method === "email"
              ? t("language.verifyMessageEmail")
              : t("language.verifyMessageMobile")}
          </p>
          <div className="font-mono text-sm font-bold text-orange-900 pt-1">
            {maskedContact}
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t("language.enterOtp")}
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full text-center tracking-[0.5em] font-mono text-xl font-bold py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="text-orange-600 hover:underline font-semibold disabled:text-gray-400 disabled:no-underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? "animate-spin" : ""}`} />
              {resendCooldown > 0
                ? t("language.resendCooldown", { seconds: resendCooldown })
                : t("language.resendOtp")}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded"
              >
                {t("language.cancel")}
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded shadow-sm disabled:opacity-50 transition"
              >
                {loading ? t("common.loading") : t("language.verifyBtn")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
