"use client";

import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

export function StepComplete() {
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Guard against duplicate calls (React Strict Mode, rapid clicks)
  const hasCalledRef = useRef(false);


  const handleComplete = async () => {
    if (hasCalledRef.current) return;
    hasCalledRef.current = true;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/onboarding/complete", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to complete onboarding");
      }

      // Patch JWT: flat object — JWT callback reads session.user ?? session
      await update({ onboardingCompleted: true });
      // Full navigation so middleware reads the fresh cookie
      window.location.href = "/trade/equity";
    } catch {
      toast.error("An error occurred. Please try again.");
      hasCalledRef.current = false; // Allow retry on failure
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
