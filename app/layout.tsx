import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'], display: 'swap' });
export const metadata: Metadata = {
  title: 'Capivárias',
  description: 'Colha frutas, acolha capivaras e faça sua pequena ilha florescer. Um jogo idle para ir no seu ritmo.',
  applicationName: 'Capivárias',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Capivárias' },
  icons: { icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f5f7ef' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" /></head><body className={nunito.variable}>{children}</body></html>;
}
