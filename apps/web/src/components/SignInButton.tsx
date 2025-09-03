import { signIn } from "@/auth";
import { GoogleIcon } from "./GoogleIcon";

export function SignInButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <GoogleIcon />
        <span>ログイン</span>
      </button>
    </form>
  );
}
