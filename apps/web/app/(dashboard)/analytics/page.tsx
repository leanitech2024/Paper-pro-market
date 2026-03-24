import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AnalyticsPageClient from './_AnalyticsPageClient';

export default async function AnalyticsPage() {
  const session = await auth();
  const subscriptionStatus = session?.user?.subscriptionStatus;
  const role = session?.user?.role;

  // Protect backend access: redirect to subscription if expired and not admin
  if (subscriptionStatus === 'expired' && role !== 'admin') {
    redirect('/subscription');
  }

  return <AnalyticsPageClient />;
}