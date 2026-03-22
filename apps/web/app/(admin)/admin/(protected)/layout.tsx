import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role =
    typeof (session?.user as any)?.role === "string"
      ? String((session?.user as any).role).toLowerCase()
      : "";

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <div className="flex-1 px-6 py-8 lg:px-10">
        {children}
      </div>
    </div>
  );
}
