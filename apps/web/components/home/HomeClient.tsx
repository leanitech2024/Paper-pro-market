"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/home/Navbar";
import HeroSection from "@/components/home/HeroSection";
import PartnersSection from "@/components/home/PartnersSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import StepsSection from "@/components/home/StepsSection";
import PricingSection from "@/components/home/PricingSection";
import Footer from "@/components/home/Footer";
import FixedCTA from "@/components/home/FixedCTA";
import type { Session } from "next-auth";

const MarketSection = dynamic(() => import("@/components/home/MarketSection"), { ssr: false });
const TestimonialsSection = dynamic(() => import("@/components/home/TestimonialsSection"), { ssr: false });
const FAQSection = dynamic(() => import("@/components/home/FAQSection"), { ssr: false });

export default function HomeClient({ session }: { session: Session | null }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar session={session} />
      <HeroSection />
      <PartnersSection />
      <FeaturesSection />
      <StepsSection />
      <MarketSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <FixedCTA />
      <Footer />
    </div>
  );
}
