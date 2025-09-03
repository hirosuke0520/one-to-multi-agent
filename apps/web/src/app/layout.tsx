import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { auth } from "../../auth";
import { HistoryProviderWrapper } from "../components/HistoryProviderWrapper";
import { Header } from "../components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "One-to-Multi Agent",
  description: "AIでSNSコンテンツを一括生成",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <HistoryProviderWrapper userId={session?.user?.id}>
          <Header />
          {children}
        </HistoryProviderWrapper>
      </body>
    </html>
  );
}
