"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "./ar-launch-button.module.css";

type ArLaunchButtonProps = {
  androidUrl: string;
  iosUrl: string;
  fallbackHref: string;
  fallbackLabel: string;
  buttonClassName: string;
  hintClassName: string;
  children: string;
};

function detectClientPlatform() {
  if (typeof navigator === "undefined") {
    return "desktop" as const;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = userAgent.includes("android");
  const isIpad =
    userAgent.includes("ipad") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIos =
    isIpad || userAgent.includes("iphone") || userAgent.includes("ipod");
  const isMobile = /mobile|phone|tablet/.test(userAgent) || navigator.maxTouchPoints > 1;

  if (isAndroid) {
    return "android" as const;
  }

  if (isIos) {
    return "ios" as const;
  }

  return isMobile ? ("other-mobile" as const) : ("desktop" as const);
}
export function ArLaunchButton({
  androidUrl,
  iosUrl,
  fallbackHref,
  fallbackLabel,
  buttonClassName,
  hintClassName,
  children,
}: ArLaunchButtonProps) {
  const [hint, setHint] = useState<string | null>(null);

  const handleClick = () => {
    const platform = detectClientPlatform();

    if (platform === "android") {
      setHint(null);
      window.location.assign(androidUrl);
      return;
    }

    if (platform === "ios") {
      setHint(null);
      window.location.assign(iosUrl);
      return;
    }

    if (platform === "other-mobile") {
      setHint(
        `当前这台手机还不能直接进入默认 AR 查看器。你可以先打开${fallbackLabel}，或者换一台支持 Scene Viewer / Quick Look 的手机继续演示。`,
      );
      return;
    }

    setHint(
      `当前桌面浏览器不直接进入 AR。把${fallbackLabel}发到手机再打开，Android 会走 Scene Viewer，iPhone 会走 Quick Look。`,
    );
  };

  return (
    <div className={styles.wrap}>
      <button className={buttonClassName} type="button" onClick={handleClick}>
        {children}
      </button>
      {hint ? (
        <p className={`${styles.hint} ${hintClassName}`}>
          {hint}{" "}
          <Link className={styles.link} href={fallbackHref}>
            打开{fallbackLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
