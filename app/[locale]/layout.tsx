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
      <BrandHeader />
      <div className="flex-1">{children}</div>
      <DisclaimerBanner />
    </NextIntlClientProvider>
  );
}
