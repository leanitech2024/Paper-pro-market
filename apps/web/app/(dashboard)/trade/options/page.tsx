import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OptionsPageClient from './_OptionsPageClient';

export default async function OptionsPage() {
  const session = await auth();
  const subscriptionStatus = session?.user?.subscriptionStatus;
  const role = session?.user?.role;

  if (subscriptionStatus === 'expired' && role !== 'admin') {
    redirect('/subscription');
  }

  return <OptionsPageClient />;
}
