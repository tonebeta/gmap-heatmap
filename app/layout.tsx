import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "地址熱點圖 POC",
  description: "輸入暱稱與地址，顯示在地圖上的熱點圖與統計",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="h-full">{children}</body>
    </html>
  );
}
