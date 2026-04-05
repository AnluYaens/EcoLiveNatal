import FaqSection from '@/components/landing/FaqSection';
import PublicPageShell from '@/components/landing/PublicPageShell';

export default function FaqPage() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="animate-blob blob-navy-12 absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl" />
        <div className="animate-blob blob-delay-1 blob-navy-8 absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full blur-3xl" />
        <div className="animate-blob blob-delay-2 blob-light absolute -bottom-20 right-1/4 w-[350px] h-[350px] rounded-full blur-3xl" />
      </div>

      {/* Floating circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="fc fc-1" />
        <div className="fc fc-2" />
        <div className="fc fc-3" />
        <div className="fc fc-4" />
        <div className="fc fc-5" />
        <div className="fc fc-6" />
      </div>

      <PublicPageShell>
        <FaqSection />
      </PublicPageShell>
    </div>
  );
}
