import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { requireRole } from "@/lib/authz";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole("employee");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/login");
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">IT 問合せ管理</h1>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
