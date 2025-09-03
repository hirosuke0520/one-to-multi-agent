import { auth } from "../../auth";
import Image from "next/image";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";

export async function Header() {
  const session = await auth();

  return (
    <div className="bg-white border-b border-gray-200 p-4 h-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3 md:hidden" aria-label="メニューを開く">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900">One to Multi Agent</h1>
        </div>
        
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
  );
}
