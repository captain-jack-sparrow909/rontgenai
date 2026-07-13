import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ProductGrid } from "@/components/marketing/product-grid";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Waitlist } from "@/components/marketing/waitlist";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ProductGrid />
        <HowItWorks />
        <PricingSection />
        <Waitlist />
      </main>
      <SiteFooter />
    </>
  );
}
