"use client";

import { signOut } from "next-auth/react";
import { useHistory } from "@/contexts/HistoryContext";

export function SignOutButton() {
  const { refreshHistory } = useHistory();

  return (
    <button
      type="submit"
      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
      onClick={() => {
        signOut({
          redirectTo: "/",
        });
        refreshHistory();
      }}
    >
      ログアウト
    </button>
  );
}
