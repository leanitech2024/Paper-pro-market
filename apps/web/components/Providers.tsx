'use client';
import { ReactNode, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

export default function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session?: Session | null;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class">
          {children}
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
