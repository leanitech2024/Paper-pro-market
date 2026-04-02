import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      onboardingCompleted?: boolean;
      subscriptionStatus?: string;
      subscriptionCheckedAt?: number;
      plan?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: string;
    onboardingCompleted?: boolean;
    subscriptionStatus?: string;
    subscriptionCheckedAt?: number;
    plan?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    onboardingCompleted?: boolean;
    subscriptionStatus?: string;
    subscriptionCheckedAt?: number;
    plan?: string;
  }
}
