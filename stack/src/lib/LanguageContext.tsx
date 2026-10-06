import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

import en from "../locales/en.json";
import es from "../locales/es.json";
import hi from "../locales/hi.json";
import pt from "../locales/pt.json";
import zh from "../locales/zh.json";
import fr from "../locales/fr.json";

export type SupportedLanguage = "en" | "es" | "hi" | "pt" | "zh" | "fr";

const dictionaries: Record<SupportedLanguage, any> = {
  en,
  es,
  hi,
  pt,
  zh,
  fr,
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (path) => path,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("preferred_lang");
      if (stored && ["en", "es", "hi", "pt", "zh", "fr"].includes(stored)) {
        return stored as SupportedLanguage;
      }
    }
    return "en";
  });

  useEffect(() => {
    if (user && user.language && ["en", "es", "hi", "pt", "zh", "fr"].includes(user.language)) {
      setLanguageState(user.language as SupportedLanguage);
      if (typeof window !== "undefined") {
        localStorage.setItem("preferred_lang", user.language);
      }
    }
  }, [user]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred_lang", lang);
    }
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split(".");
    let current = dictionaries[language] || dictionaries["en"];

    for (const k of keys) {
      if (current && current[k] !== undefined) {
        current = current[k];
      } else {
        // Fallback to English
        let fallback = dictionaries["en"];
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) {
            fallback = fallback[fk];
          } else {
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== "string") return path;

    let result = current;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value));
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
