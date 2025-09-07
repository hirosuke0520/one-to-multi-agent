"use client";

import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

// NextAuth v5ではSessionProviderは不要になりました
// セッション情報はサーバーコンポーネントで取得します
export function SessionProvider({ children }: Props) {
  return <>{children}</>;
}