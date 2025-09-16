"use client";

import { HistoryProvider } from "../contexts/HistoryContext";

interface HistoryProviderWrapperProps {
  children: React.ReactNode;
  userId?: string;
}

export function HistoryProviderWrapper({ children, userId }: HistoryProviderWrapperProps) {
  return <HistoryProvider userId={userId}>{children}</HistoryProvider>;
}
