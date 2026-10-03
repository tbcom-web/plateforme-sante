/** « 0494959898 » ou « +33494959898 » → « 04 94 95 98 98 ». Laisse les autres formats intacts. */
export function formaterTelephone(brut: string): string {
  const chiffres = brut.replace(/[^\d+]/g, '').replace(/^\+33/, '0').replace(/^0033/, '0');
  return /^0\d{9}$/.test(chiffres) ? chiffres.replace(/(\d{2})(?=\d)/g, '$1 ') : brut.trim();
}
