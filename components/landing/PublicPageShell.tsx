import LandingFooter from '@/components/landing/LandingFooter';
import LandingNav from '@/components/landing/LandingNav';

export default function PublicPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      <LandingNav />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
}
