"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SiteLanguage = "zh" | "en";

const siteLanguageStorageKey = "promptpet.site-language";

type SiteLanguageContextValue = {
  language: SiteLanguage;
  toggleLanguage: () => void;
  t: (zh: string, en: string) => string;
};

const SiteLanguageContext = createContext<SiteLanguageContextValue | null>(null);

export function SiteLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<SiteLanguage>("zh");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedLanguage = window.localStorage.getItem(siteLanguageStorageKey);

      if (storedLanguage === "zh" || storedLanguage === "en") {
        setLanguage(storedLanguage);
      }
    } catch {
      // Ignore storage failures so the shell still renders.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(siteLanguageStorageKey, language);
    } catch {
      // Ignore storage failures so the shell still renders.
    }

    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo<SiteLanguageContextValue>(
    () => ({
      language,
      toggleLanguage: () => {
        setLanguage((current) => (current === "zh" ? "en" : "zh"));
      },
      t: (zh, en) => (language === "zh" ? zh : en),
    }),
    [language],
  );

  return (
    <SiteLanguageContext.Provider value={value}>
      {children}
    </SiteLanguageContext.Provider>
  );
}

export function useSiteLanguage() {
  const context = useContext(SiteLanguageContext);

  if (!context) {
    throw new Error("useSiteLanguage must be used within SiteLanguageProvider");
  }

  return context;
}
