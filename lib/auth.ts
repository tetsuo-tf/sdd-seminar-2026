import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  plugins: [nextCookies()],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  socialProviders: {},
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  account: {
    accountLinking: {
      enabled: false,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "employee",
        required: true,
        input: false,
      },
    },
  },
});

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "employee" | "it-staff";
};
