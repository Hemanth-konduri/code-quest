import React, { useState, useRef, useEffect } from "react";
import { useLanguage, SupportedLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "react-toastify";
import { Globe, Check, ChevronDown } from "lucide-react";
import LanguageVerificationModal from "./LanguageVerificationModal";

interface LanguageOption {
  code: SupportedLanguage;
  nameKey: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", nameKey: "language.en", nativeName: "English", flag: "🇬🇧" },
  { code: "es", nameKey: "language.es", nativeName: "Español", flag: "🇪🇸" },
  { code: "hi", nameKey: "language.hi", nativeName: "हिंदी", flag: "🇮🇳" },
  { code: "pt", nameKey: "language.pt", nativeName: "Português", flag: "🇧🇷" },
  { code: "zh", nameKey: "language.zh", nativeName: "中文", flag: "🇨🇳" },
  { code: "fr", nameKey: "language.fr", nativeName: "Français", flag: "🇫🇷" },
];

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [targetLang, setTargetLang] = useState<SupportedLanguage>("en");
  const [verifyMethod, setVerifyMethod] = useState<"email" | "mobile">("mobile");
  const [maskedContact, setMaskedContact] = useState("");
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const handleSelectLanguage = async (target: SupportedLanguage) => {
    setIsOpen(false);
    if (target === language) return;

    if (!user) {
      // Unauthenticated visitor -> Switch directly
      setLanguage(target);
      toast.success(t("language.success", { lang: target.toUpperCase() }));
      return;
    }

    // Authenticated user -> Trigger OTP verification flow
    setLoading(true);
    try {
      const res = await axiosInstance.post("/user/request-language-otp", {
        targetLanguage: target,
      });

      setTargetLang(target);
      setVerifyMethod(res.data.method);
      setMaskedContact(res.data.maskedContact);
      setShowModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to initiate language switch verification.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setShowModal(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md text-xs font-semibold text-gray-700 transition shadow-sm"
      >
        <Globe className="w-3.5 h-3.5 text-orange-600" />
        <span>{currentOption.flag}</span>
        <span className="hidden sm:inline">{currentOption.nativeName}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-xl z-50 py-1 text-xs">
          <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
            {t("language.title")}
          </div>

          <div className="py-1">
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition ${
                    isActive
                      ? "bg-orange-50 text-orange-700 font-bold"
                      : "text-gray-700 hover:bg-gray-50 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-orange-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Language Switch Verification Modal */}
      <LanguageVerificationModal
        isOpen={showModal}
        targetLanguage={targetLang}
        method={verifyMethod}
        maskedContact={maskedContact}
        onClose={() => setShowModal(false)}
        onSuccess={handleVerificationSuccess}
      />
    </div>
  );
}
