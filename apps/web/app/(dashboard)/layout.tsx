import DashboardLayoutClient from '@/components/layout/DashboardLayoutClient';
import { Providers } from '@/components/layout/Providers';
import { auth } from '@/lib/auth';
import { SubscriptionService } from '@/services/subscription/subscription.service';
import { PlanExpiredModal } from '@/components/subscription/PlanExpiredModal';

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

  return (
    <div data-theme="terminal" className="bg-background min-h-screen text-foreground font-sans ">
      <Providers>
        <DashboardLayoutClient>
          {isExpired && <PlanExpiredModal />}
          {children}
        </DashboardLayoutClient>
      </Providers>
    </div>
  );
}
