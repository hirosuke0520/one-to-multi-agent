import { auth } from "@/auth";
import { LoginButtonClient } from "./LoginButtonClient";

export async function LoginButton() {
  const session = await auth();

  return <LoginButtonClient user={session?.user} />;
}
