// Unreachable: next-intl middleware rewrites all requests to /[locale]/
// The actual page lives at app/[locale]/page.tsx
export default function RootPage() {
  return null;
}
