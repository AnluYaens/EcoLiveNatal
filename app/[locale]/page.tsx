import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ProcessSection from '@/components/landing/ProcessSection';
import ResultsGallery from '@/components/landing/ResultsGallery';
import CtaSection from '@/components/landing/CtaSection';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ProcessSection />
        <ResultsGallery />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
