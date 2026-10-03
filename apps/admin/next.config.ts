import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Le noyau partagé est livré en TypeScript source.
  transpilePackages: ['@plateforme/core'],
};

export default nextConfig;
