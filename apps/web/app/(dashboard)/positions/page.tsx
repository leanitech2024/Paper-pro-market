
"use client";

import { PositionsTable } from '@/domains/trading/components/positions/PositionsTable';

export default function PositionsPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Positions</h1>
          <p className="text-muted-foreground">Monitor and manage your open trades</p>
        </div>
      </div>

      {/* Positions Table */}
      <PositionsTable />
    </div>
  );
};


