import LandingFooter from '@/components/landing/LandingFooter';
import LandingNav from '@/components/landing/LandingNav';

export default function PublicPageShell({
  children,
  mainClassName = 'flex-1',
}: {
  children: React.ReactNode;
  mainClassName?: string;
}) {
  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      <LandingNav />
      <main className={mainClassName}>{children}</main>
      <LandingFooter />
    </div>
  );
}
