import DashboardLayoutClient from '@/components/layout/DashboardLayoutClient';
import { auth } from '@/lib/auth';
import { SubscriptionService } from '@/services/subscription/subscription.service';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  
  let status = 'active';

  if (userId) {
    const effectivePlan = await SubscriptionService.getEffectivePlan(userId);
    status = effectivePlan.status;
  }

  const isExpired = status === 'expired' && role !== 'admin';

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';

  const EXPIRY_BLOCKED_IN_LAYOUT = [
    '/trade/equity',
    '/trade/futures',
    '/trade/options',
    '/analytics',
    '/journal',
  ];

  const isBlockedRoute = EXPIRY_BLOCKED_IN_LAYOUT.some(r => pathname.startsWith(r));

  if (isExpired && isBlockedRoute) {
    redirect('/subscription');
  }

  return (
    <div data-theme="terminal" className="bg-background min-h-screen text-foreground font-sans ">
      <DashboardLayoutClient session={session}>
        {children}
      </DashboardLayoutClient>
    </div>
  );
}
