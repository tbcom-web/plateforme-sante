import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

// Codes de rattachement d'un site à un compte praticien (table rattachements, migration 0017).
// Le code n'est montré qu'une fois à l'admin ; seule son empreinte SHA-256 est enregistrée.

/** Durée de validité d'un lien de rattachement */
export const VALIDITE_JOURS = 14;

/** Code aléatoire (128 bits), lisible dans une URL */
export const genererCode = () => randomBytes(16).toString('base64url');

/** Empreinte enregistrée en base (identique à celle calculée par la fonction rattacher_site) */
export const hacherCode = (code: string) => createHash('sha256').update(code, 'utf8').digest('hex');

export const CODE_VALIDE = /^[A-Za-z0-9_-]{16,64}$/;
