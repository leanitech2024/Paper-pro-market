"use client";

import { useState } from "react";
import { StepWelcome } from "@/components/onboarding/StepWelcome";
import { StepSelectPlan } from "@/components/onboarding/StepSelectPlan";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);

  const goNext = () => setStep((s) => s + 1);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      {step === 1 && <StepWelcome onNext={goNext} />}
      {step === 2 && <StepSelectPlan onNext={goNext} />}
    </div>
  );
}
