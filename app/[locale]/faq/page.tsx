import LandingNav from '@/components/landing/LandingNav';
import FaqSection from '@/components/landing/FaqSection';
import LandingFooter from '@/components/landing/LandingFooter';

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
