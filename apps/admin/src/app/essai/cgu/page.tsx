import type { Metadata } from 'next';
import DocumentJuridique from '../Document';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Conditions de l’essai gratuit', robots: { index: false, follow: true } };

export default function Cgu() {
  return <DocumentJuridique id="cgu" />;
}
