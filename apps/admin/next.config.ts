import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Le noyau partagé est livré en TypeScript source.
  transpilePackages: ['@plateforme/core'],
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
