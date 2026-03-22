"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

export function StepComplete() {
  const router = useRouter();
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/onboarding/complete", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to complete onboarding");
      }

      toast.success("Ready to trade!");
      await update({ user: { onboardingCompleted: true } });
      router.replace("/trade/equity");
      router.refresh();
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center justify-center space-y-6 text-center mx-auto">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">You're all set!</h2>
        <p className="text-zinc-400">
          Your account has been created successfully. Let's head to your dashboard.
        </p>
      </div>
      <Button 
        size="lg" 
        onClick={handleComplete} 
        disabled={isSubmitting}
        className="w-full h-12 text-lg"
      >
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Go to Dashboard
      </Button>
    </div>
  );
}
