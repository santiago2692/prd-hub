import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { db } from "./db";

const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN ?? "").trim().toLowerCase();
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const devLoginEnabled =
  process.env.DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";
export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function emailAllowed(email: string | null | undefined) {
  if (!email) return false;
  if (!allowedDomain) return true;
  return email.toLowerCase().endsWith(`@${allowedDomain}`);
}

const providers: NextAuthOptions["providers"] = [];
if (googleEnabled) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Restricts the Google account chooser to the company domain (still enforced server-side below).
      authorization: allowedDomain ? { params: { hd: allowedDomain } } : undefined,
    }),
  );
}
if (devLoginEnabled) {
  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Dev login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email || !emailAllowed(email)) return null;
        const user = await db.user.upsert({
          where: { email },
          update: {},
          create: { email, name: email.split("@")[0] },
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!emailAllowed(user.email)) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // Bootstrap admins from env so the first people can promote the rest.
      if (user.email && adminEmails.includes(user.email.toLowerCase())) {
        await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
    },
  },
};

/** The signed-in user, loaded fresh from the database so role changes apply immediately. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  return db.user.findUnique({ where: { id } });
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };

export function hasRole(user: Pick<User, "role"> | null, role: Role) {
  return !!user && RANK[user.role] >= RANK[role];
}

/** For server actions: throws instead of redirecting. */
export async function requireRole(role: Role): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  if (!hasRole(user, role)) throw new Error("You don't have permission to do that");
  return user;
}
