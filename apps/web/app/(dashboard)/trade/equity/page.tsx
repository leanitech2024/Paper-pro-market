import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EquityPageClient from './_EquityPageClient';

export default async function EquityPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await auth();
  const subscriptionStatus = session?.user?.subscriptionStatus;
  const role = session?.user?.role;

  if (subscriptionStatus === 'expired' && role !== 'admin') {
    redirect('/subscription');
  }

  const sp = await searchParams;
  const initialSymbol = typeof sp.symbol === 'string' ? sp.symbol : undefined;

  return <EquityPageClient initialSymbol={initialSymbol} />;
}
