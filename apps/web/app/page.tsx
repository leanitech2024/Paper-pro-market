import HomeClient from "@/components/home/HomeClient";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  return <HomeClient session={session} />;
}
