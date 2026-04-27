"use client";

import { MultiLegPayoffChart } from "@/domains/trading/components/form/MultiLegPayoffChart";
import { MultiLegPayoffLeg } from "@/domains/trading/lib/options/multi-leg-payoff";
import { OptionSide } from "@/domains/trading/components/options/types";

type OptionPayoffChartProps = {
  side: "BUY" | "SELL";
  optionType: OptionSide;
  strike: number;
  quantity: number;
  premium: number;
  spotPrice: number;
};

export function OptionPayoffChart({
  side,
  optionType,
  strike,
  quantity,
  premium,
  spotPrice,
}: OptionPayoffChartProps) {
  const legs: MultiLegPayoffLeg[] = [
    {
      id: "SINGLE_LEG",
      side,
      optionType,
      strike,
      quantity,
      premium,
    },
  ];

  return (
    <MultiLegPayoffChart
      legs={legs}
      spotPrice={spotPrice}
      title="Payoff At Expiry"
      pointCount={160}
      height={220}
    />
  );
}
