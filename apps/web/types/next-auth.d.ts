import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      googleId?: string;
      email: string;
      name: string;
      image?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    googleId?: string;
    email: string;
    name: string;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    googleId?: string;
    email?: string;
    name?: string;
    picture?: string;
  }
}
