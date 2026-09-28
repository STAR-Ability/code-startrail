import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/v2/shell";
import { currentUser } from "@/server/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "码练星轨 · 下一道题，练得更准确",
    template: "%s | 码练星轨",
  },
  description:
    "程序训练 + Agent 辅助。真实做题、按需提示，根据训练过程找到下一道题。",
  icons: { icon: "/icon.svg" },
};

export const dynamic = "force-dynamic";
export const viewport: Viewport = { themeColor: "#ffffff" };
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <Shell user={await currentUser()}>{children}</Shell>
      </body>
    </html>
  );
}
