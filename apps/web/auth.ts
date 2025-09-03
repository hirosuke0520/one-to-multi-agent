import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const apiUrl = process.env.INTERNAL_API_URL || "http://api:8787";

        fetch(`${apiUrl}/auth/signin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            googleId: profile?.sub,
            email: profile?.email,
            name: profile?.name,
            picture: profile?.picture,
          }),
        }).catch((error) => {
          console.error("Error saving user to database:", error);
        });

        return true; // Always allow sign in
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.id = profile.sub;
        token.email = profile.email;
        token.name = profile.name;
        token.picture = profile.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
    error: "/",
  },
});
