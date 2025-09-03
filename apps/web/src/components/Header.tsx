import { auth } from "../../auth";
import Image from "next/image";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";
import { HeaderMenuButton } from "./HeaderMenuButton";

export async function Header() {
  const session = await auth();

  return (
    <div className="bg-white border-b border-gray-200 p-4 h-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <HeaderMenuButton />
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
