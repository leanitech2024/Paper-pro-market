import { Button } from "@/components/ui/button";

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
          Welcome to Paper Pro Market
        </h1>
        <p className="mx-auto max-w-[600px] text-zinc-400 md:text-xl">
          We're excited to have you on board! Let's get your account set up so you can start paper trading in the Indian equity and F&O markets.
        </p>
      </div>
      <Button size="lg" onClick={onNext} className="w-full sm:w-auto h-12 text-lg">
        Get Started
      </Button>
    </div>
  );
}
