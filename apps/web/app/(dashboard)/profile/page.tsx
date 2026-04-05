import { auth } from "@/lib/auth";
import ProfilePageClient from "./ProfilePageClient";

export default async function ProfilePage() {
  const session = await auth();
  return <ProfilePageClient session={session} />;
}
