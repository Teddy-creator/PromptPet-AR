"use client";

import { useSiteLanguage } from "@/components/site-language";

import styles from "./language-toggle.module.css";

export function LanguageToggle() {
  const { language, toggleLanguage } = useSiteLanguage();

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleLanguage}
      aria-label={language === "zh" ? "切换到英文" : "Switch to Chinese"}
    >
      <span
        className={`${styles.segment} ${
          language === "zh" ? styles.segmentActive : ""
        }`}
      >
        中
      </span>
      <span className={styles.separator}>/</span>
      <span
        className={`${styles.segment} ${
          language === "en" ? styles.segmentActive : ""
        }`}
      >
        EN
      </span>
    </button>
  );
}
