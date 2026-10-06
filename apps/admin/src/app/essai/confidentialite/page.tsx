import type { Metadata } from 'next';
import DocumentJuridique from '../Document';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Politique de confidentialité', robots: { index: false, follow: true } };

export default function Confidentialite() {
  return <DocumentJuridique id="confidentialite" />;
}
