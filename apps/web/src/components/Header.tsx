import { auth } from "@/auth";
import Image from "next/image";
import Link from "next/link";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";
import { HeaderMenuButton } from "./HeaderMenuButton";

export async function Header() {
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    console.warn('Authentication error in header, rendering without session:', error);
    session = null;
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4 h-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <HeaderMenuButton />
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">
            One to Multi Agent
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/settings/prompts"
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="hidden md:inline">設定</span>
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-3">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-gray-700 hidden md:inline">
                {session.user.name}
              </span>
              <SignOutButton />
            </div>
          ) : (
            <SignInButton />
          )}
        </div>
      </div>
    </div>
  );
}
