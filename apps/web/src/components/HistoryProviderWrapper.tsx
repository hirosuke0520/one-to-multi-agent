"use client";

import { HistoryProvider } from "../contexts/HistoryContext";

interface HistoryProviderWrapperProps {
  children: React.ReactNode;
  token?: string;
  isAuthenticated?: boolean;
}

export function HistoryProviderWrapper({ children, token, isAuthenticated }: HistoryProviderWrapperProps) {
  return <HistoryProvider token={token} isAuthenticated={isAuthenticated}>{children}</HistoryProvider>;
}