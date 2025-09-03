"use client";

import Image from "next/image";
import { signIn, signOut } from "next-auth/react";
import { GoogleIcon } from "@/components/GoogleIcon";

interface LoginButtonClientProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function LoginButtonClient({ user }: LoginButtonClientProps) {
  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {user.image && (
            <Image
              src={user.image}
              alt={user.name || "User"}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <span className="text-sm text-gray-700">{user.name}</span>
        </div>
        <button
          className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors cursor-pointer"
          onClick={() => signOut()}
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <GoogleIcon />
      <span>Googleログイン</span>
    </button>
  );
}
