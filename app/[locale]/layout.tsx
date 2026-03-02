import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import BrandHeader from '@/components/BrandHeader';
import DisclaimerBanner from '@/components/DisclaimerBanner';

export function generateStaticParams() {
  return [{ locale: 'es' }, { locale: 'en' }];
}

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="animate-blob blob-navy-12 absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl" />
        <div className="animate-blob blob-delay-1 blob-navy-8 absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full blur-3xl" />
        <div className="animate-blob blob-delay-2 blob-light absolute -bottom-20 right-1/4 w-[350px] h-[350px] rounded-full blur-3xl" />
      </div>

      {/* Floating circles */}
      <div aria-hidden="true">
        <div className="fc fc-1" />
        <div className="fc fc-2" />
        <div className="fc fc-3" />
        <div className="fc fc-4" />
        <div className="fc fc-5" />
        <div className="fc fc-6" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <BrandHeader />
        <div className="flex-1">{children}</div>
        <DisclaimerBanner />
      </div>
    </NextIntlClientProvider>
  );
}
