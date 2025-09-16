import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { auth } from "@/auth";
import { HistoryProviderWrapper } from "../components/HistoryProviderWrapper";
import { SidebarProvider } from "../contexts/SidebarContext";
import { Header } from "../components/Header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    // Handle auth errors gracefully (e.g., invalid session tokens)
    console.warn('Authentication error, continuing with no session:', error);
    session = null;
  }

  return (
    <html lang="ja">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased h-screen bg-black`}
      >
        <Script src="/runtime-config.js" strategy="beforeInteractive" />
        <SidebarProvider>
          <HistoryProviderWrapper
            userId={session?.user?.id}
          >
            <Header />
            {children}
          </HistoryProviderWrapper>
        </SidebarProvider>
      </body>
    </html>
  );
}
