import { auth } from "@/lib/auth";
import SubscriptionPageClient from "./SubscriptionPageClient";

export default async function SubscriptionPage() {
  const session = await auth();
  return <SubscriptionPageClient session={session} />;
}
