import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ProcessSection from '@/components/landing/ProcessSection';
import ResultsGallery from '@/components/landing/ResultsGallery';
import CtaSection from '@/components/landing/CtaSection';
import PublicPageShell from '@/components/landing/PublicPageShell';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicPageShell>
        {/* Blob + floating circles zone — covers Hero + Features */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="animate-blob blob-navy-12 absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl" />
            <div className="animate-blob blob-delay-1 blob-navy-8 absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full blur-3xl" />
            <div className="animate-blob blob-delay-2 blob-light absolute -bottom-20 right-1/4 w-[350px] h-[350px] rounded-full blur-3xl" />
          </div>
          <div className="fc-contained absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="fc fc-1" />
            <div className="fc fc-2" />
            <div className="fc fc-3" />
            <div className="fc fc-4" />
            <div className="fc fc-5" />
            <div className="fc fc-6" />
          </div>
          <div className="relative">
            <HeroSection />
            <FeaturesSection />
          </div>
        </div>

        <ProcessSection />
        <ResultsGallery />
        <CtaSection />
      </PublicPageShell>
    </div>
  );
}
