import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@paper-market/core/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { OnboardingDoneRedirect } from "@/components/onboarding/OnboardingDoneRedirect";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Always read from DB — JWT may be stale (e.g. after Razorpay server-side redirect)
  const [dbUser] = await db
    .select({ onboardingCompleted: users.onboardingCompleted })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // DB says complete but JWT is stale → render a client component that patches the
  // JWT via session.update() THEN navigates. A server redirect here would loop
  // because middleware still reads the old JWT cookie.
  if (dbUser?.onboardingCompleted === true) {
    return <OnboardingDoneRedirect />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-6xl">{children}</div>
    </div>
  );
}
