import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { SiteLanguageProvider } from "@/components/site-language";
import { foxBaseDemoPosterUrl } from "@/lib/fox-base-contract";

import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "PromptPet-AR",
    template: "%s | PromptPet-AR",
  },
  description: "输入一句话，定制已支持物种的风格与细节。当前支持 fox，并优先演示 Android AR。",
  openGraph: {
    title: "PromptPet-AR",
    description: "输入一句话，定制已支持物种的风格与细节。当前支持 fox，并优先演示 Android AR。",
    images: [foxBaseDemoPosterUrl],
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptPet-AR",
    description: "输入一句话，定制已支持物种的风格与细节。当前支持 fox，并优先演示 Android AR。",
    images: [foxBaseDemoPosterUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <SiteLanguageProvider>{children}</SiteLanguageProvider>
      </body>
    </html>
  );
}
