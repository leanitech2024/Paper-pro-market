import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EquityPageClient from './_EquityPageClient';

export default async function EquityPage() {
  const session = await auth();
  const subscriptionStatus = session?.user?.subscriptionStatus;
  const role = session?.user?.role;

  if (subscriptionStatus === 'expired' && role !== 'admin') {
    redirect('/subscription');
  }

  return <EquityPageClient />;
}
