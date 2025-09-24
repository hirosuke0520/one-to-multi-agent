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
        const apiUrl =
          process.env.INTERNAL_API_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          "http://localhost:8080";

        try {
          const response = await fetch(`${apiUrl}/auth/signin`, {
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
          });

          let dbUserId: string | undefined;

          if (response.ok) {
            try {
              const data = await response.json();
              dbUserId = data.userId;
            } catch (parseError) {
              console.error(
                "Failed to parse auth/signin response:",
                parseError
              );
            }
          } else {
            console.error("Failed to sync user with API:", response.status);
          }

          const accountWithDb = account as typeof account & {
            dbUserId?: string;
            googleId?: string;
          };

          accountWithDb.dbUserId = dbUserId || (profile?.sub ?? undefined);
          accountWithDb.googleId = profile?.sub ?? undefined;
        } catch (error) {
          console.error("Error saving user to database:", error);
          const accountWithDb = account as typeof account & {
            dbUserId?: string;
            googleId?: string;
          };
          accountWithDb.dbUserId = profile?.sub ?? undefined;
          accountWithDb.googleId = profile?.sub ?? undefined;
        }

        return true; // Always allow sign in
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const accountWithDb = account as typeof account & {
          dbUserId?: string;
          googleId?: string;
        };

        const dbUserId = accountWithDb.dbUserId || token.id || profile.sub;
        const googleId = accountWithDb.googleId || profile.sub;

        token.id = dbUserId;
        token.googleId = googleId;
        token.email = profile.email;
        token.name = profile.name;
        token.picture = profile.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        if (token.googleId) {
          session.user.googleId = token.googleId as string;
        }
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
