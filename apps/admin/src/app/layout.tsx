import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { MARQUE } from '@/lib/marque';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: MARQUE.nom, template: `%s · ${MARQUE.nom}` },
  description: MARQUE.slogan,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
