import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import FuturesPageClient from './_FuturesPageClient';

export default async function FuturesPage() {
  const session = await auth();
  const subscriptionStatus = session?.user?.subscriptionStatus;
  const role = session?.user?.role;

  if (subscriptionStatus === 'expired' && role !== 'admin') {
    redirect('/subscription');
  }

  return <FuturesPageClient />;
}
