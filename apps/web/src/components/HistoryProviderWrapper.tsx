"use client";

import { HistoryProvider } from "../contexts/HistoryContext";

interface HistoryProviderWrapperProps {
  children: React.ReactNode;
  userId?: string;
  isAuthenticated?: boolean;
}

export function HistoryProviderWrapper({ children, userId, isAuthenticated }: HistoryProviderWrapperProps) {
  return <HistoryProvider userId={userId} isAuthenticated={isAuthenticated}>{children}</HistoryProvider>;
}