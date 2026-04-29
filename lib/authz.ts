import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

export type Role = "employee" | "it-staff";

export async function requireUser(): Promise<SessionUser> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as Role,
  };
}

export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();

  if (user.role !== role) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export function assertOwner(
  resource: { ownerId: string },
  user: SessionUser,
): void {
  if (resource.ownerId !== user.id) {
    throw new Error("FORBIDDEN");
  }
}
