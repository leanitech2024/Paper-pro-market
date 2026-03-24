import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import JournalPageClient from './_JournalPageClient';

export default async function JournalPage() {
  const session = await auth();
  const subscriptionStatus = session?.user?.subscriptionStatus;
  const role = session?.user?.role;

  // Protect backend access: redirect to subscription if expired and not admin
  if (subscriptionStatus === 'expired' && role !== 'admin') {
    redirect('/subscription');
  }

  return <JournalPageClient />;
}