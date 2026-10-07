import type { NextConfig } from 'next';

// Photos des jeux (stockage Supabase « photos ») : vignettes optimisées par next/image (/admin/retours, /admin/illustrations)
const supabase = (() => { try { return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null; } catch { return null; } })();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabase && supabase.protocol === 'https:'
      ? [{ protocol: 'https', hostname: supabase.hostname, pathname: '/storage/v1/object/public/photos/**' }]
      : [],
  },
  // Le noyau partagé est livré en TypeScript source.
  transpilePackages: ['@plateforme/core'],
  // Conversion WebP des photos libres (lib/photos-libres.ts) : module natif, chargé tel quel côté serveur.
  serverExternalPackages: ['sharp'],
  // Domaine dédié de l'essai gratuit (docs/onboarding-lead.md) : essai.webpodologue.fr/ sert la page /essai.
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', has: [{ type: 'host', value: 'essai.webpodologue.fr' }], destination: '/essai' }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
