import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // If the user is unauthenticated, middleware will catch it.
  // But if they are onboarded, they shouldn't be here.
  if (session?.user?.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-6xl">
        {children}
      </div>
    </div>
  );
}
