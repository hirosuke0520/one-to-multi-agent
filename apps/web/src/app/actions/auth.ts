"use server";

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "../../../auth";

export async function signInWithGoogle() {
  await nextAuthSignIn("google", { redirectTo: "/" });
}

export async function signOutAction() {
  await nextAuthSignOut({ redirectTo: "/" });
}