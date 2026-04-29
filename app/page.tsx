import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role === "employee") {
    redirect("/inquiries");
  }

  if (role === "it-staff") {
    redirect("/admin/inquiries");
  }

  // Fallback
  redirect("/login");
}
