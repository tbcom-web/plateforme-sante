import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cheminImageGeneree, construireTracabiliteIa, contientGpsExif, controlerFichierIa, mentionCreditPhotos, typeImageDepuisOctets, validerDeclarationIa,
  type DeclarationIa,
} from './images-generees';
import { estImageGeneree } from './photos-libres';
import { construirePrompt, type PromptConstruit } from './prompts-images';
import { composerKit, kitCompact } from './kits-images';
import { nettoyerPhotosJeu } from './jeux-photos';
import { recapSourcesImages, typeSourceImage } from './sources-photos';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

/** JPEG minimal avec un bloc EXIF (Little Endian) dont l'IFD0 pointe (ou non) vers un IFD GPS avec latitude */
function jpegExif(gps: boolean): Uint8Array {
  const tiff: number[] = [0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0];
  // IFD0 : 1 entrée
  tiff.push(1, 0);
  if (gps) tiff.push(0x25, 0x88, 4, 0, 1, 0, 0, 0, 26, 0, 0, 0); // GPSInfo → décalage 26
  else tiff.push(0x0f, 0x01, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0); // Make
  tiff.push(0, 0, 0, 0);
  if (gps) { tiff.push(2, 0); tiff.push(0, 0, 1, 0, 4, 0, 0, 0, 2, 3, 0, 0); tiff.push(2, 0, 5, 0, 3, 0, 0, 0, 0, 0, 0, 0); tiff.push(0, 0, 0, 0); }
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, (app1.length + 2) >> 8, (app1.length + 2) & 255, ...app1, 0xff, 0xd9]);
}

test('type réel lu dans les premiers octets', () => {
  assert.equal(typeImageDepuisOctets(PNG), 'image/png');
  assert.equal(typeImageDepuisOctets(JPEG), 'image/jpeg');
  assert.equal(typeImageDepuisOctets(WEBP), 'image/webp');
  assert.equal(typeImageDepuisOctets(Uint8Array.from([0x47, 0x49, 0x46, 0x38])), null);
});

test('EXIF de localisation détecté (JPEG), absent sinon', () => {
  assert.equal(contientGpsExif(jpegExif(true)), true);
  assert.equal(contientGpsExif(jpegExif(false)), false);
  assert.equal(contientGpsExif(PNG), false);
});

test('contrôles serveur du fichier : type, taille, dimensions, localisation', () => {
  assert.deepEqual(controlerFichierIa({ octets: PNG, typeAnnonce: 'image/png', largeur: 1536, hauteur: 1024 }), { ok: true, type: 'image/png' });
  const err = (r: ReturnType<typeof controlerFichierIa>) => (r.ok ? [] : r.erreurs).join(' ');
  assert.match(err(controlerFichierIa({ octets: Uint8Array.from([1, 2, 3, 4]), largeur: 2000, hauteur: 2000 })), /PNG, JPEG ou WebP/);
  assert.match(err(controlerFichierIa({ octets: PNG, typeAnnonce: 'image/gif', largeur: 2000, hauteur: 2000 })), /inattendu/);
  assert.match(err(controlerFichierIa({ octets: PNG, largeur: 800, hauteur: 600 })), /trop petite/);
  const lourd = new Uint8Array(4 * 1024 * 1024 + 1); lourd.set(PNG);
  assert.match(err(controlerFichierIa({ octets: lourd, largeur: 2000, hauteur: 2000 })), /trop lourd/);
  assert.match(err(controlerFichierIa({ octets: jpegExif(true), largeur: 2000, hauteur: 1500 })), /GPS/);
  assert.match(err(controlerFichierIa({ octets: JPEG, largeur: 2000, hauteur: 1500, gps: true })), /GPS/);
});

const prompt = (construirePrompt({ sujet: 'senior', emplacement: 'accueil', format: 'premier-ecran', gamme: 'sauge', langue: 'en', style: 'phrases' }) as PromptConstruit).texte;
const declaration: Partial<DeclarationIa> = {
  sujet: 'senior', outil: 'chatgpt', genereLe: '2026-10-08', prompt, conditions: 'Images générées utilisables à des fins commerciales selon les conditions OpenAI en vigueur (vérifié le 8/10).',
  conditionsUrl: 'https://openai.com/policies/', conditionsVerifiees: true, imageVerifiee: true, hashtags: ['accueil', 'image-generee'], trou: 'senior|accueil',
};
const maintenant = new Date('2026-10-08T15:00:00Z');

test('déclaration : champs obligatoires, prompt contrôlé (sa section « à éviter » ignorée), date, cases cochées', () => {
  const ok = validerDeclarationIa(declaration, maintenant);
  assert.deepEqual(ok.erreurs, []);
  assert.equal(ok.declaration!.trou, 'senior|accueil');
  const e = (d: Partial<DeclarationIa>) => validerDeclarationIa({ ...declaration, ...d }, maintenant).erreurs.join(' ');
  assert.match(e({ sujet: 'posture' }), /sujet|posturologie/i);
  assert.match(e({ outil: '' }), /outil/);
  assert.match(e({ outil: 'autre', outilAutre: '' }), /nom de l’outil/);
  assert.match(e({ genereLe: '2026-10-09' }), /futur/);
  assert.match(e({ prompt: 'pieds' }), /prompt utilisé/);
  assert.match(e({ prompt: 'before and after photo of a healed toenail, real patient' }), /Prompt refusé/);
  assert.match(e({ conditions: '' }), /conditions/);
  assert.match(e({ conditionsUrl: 'http://exemple.fr' }), /https/);
  assert.match(e({ conditionsVerifiees: false }), /usage commercial/);
  assert.match(e({ imageVerifiee: false }), /cinq orteils/);
});

test('traçabilité complète d’une image importée', () => {
  const d = validerDeclarationIa(declaration, maintenant).declaration!;
  const { ligne, erreurs } = construireTracabiliteIa({
    declaration: d, id: '0123456789abcdef', auteurNom: 'Paul Tremblot', importeLe: maintenant, largeurs: [1280, 640, 1536],
    urlPrincipale: 'https://x.supabase.co/storage/v1/object/public/photos/banque/ia/senior/ia-0123456789abcdef-1536.webp', largeur: 1536, hauteur: 1024,
  });
  assert.deepEqual(erreurs, []);
  assert.equal(ligne!.source, 'ia');
  assert.equal(ligne!.chemin, 'banque/ia/senior/ia-0123456789abcdef-1536.webp');
  assert.deepEqual(ligne!.largeurs, [640, 1280, 1536]);
  assert.equal(ligne!.statut, 'a_valider');
  assert.equal(ligne!.auteur_nom, 'Paul Tremblot');
  assert.equal(ligne!.ia_outil, 'ChatGPT (OpenAI)');
  assert.equal(ligne!.ia_genere_le, '2026-10-08');
  assert.equal(ligne!.ia_prompt, prompt);
  assert.ok(ligne!.ia_conditions.length > 10 && ligne!.ia_conditions_verifiees);
  assert.equal(ligne!.licence, 'Conditions de ChatGPT (OpenAI)');
  assert.equal(ligne!.licence_version, 'conditions déclarées au 2026-10-08');
  assert.equal(ligne!.licence_url, 'https://openai.com/policies/');
  assert.equal(ligne!.importe_le, maintenant.toISOString());
  assert.equal(ligne!.page_url, null);
  assert.match(construireTracabiliteIa({ declaration: d, id: 'zz', auteurNom: '', importeLe: maintenant, largeurs: [], urlPrincipale: 'x', largeur: 0, hauteur: 0 }).erreurs.join(' '), /Identifiant.*Auteur.*fichier.*Adresse.*Dimensions/);
});

test('chemins, étiquette et sources : image générée reconnue partout', () => {
  const url = `https://x.supabase.co/storage/v1/object/public/photos/${cheminImageGeneree('enfant', 'abcdefabcdefabcd', 1280)}`;
  assert.ok(estImageGeneree(url) && estImageGeneree('photo:banque/ia/enfant/ia-abcdefabcdefabcd-1280.webp') && estImageGeneree('banque/ia/x/y.webp'));
  assert.ok(!estImageGeneree('https://x.supabase.co/storage/v1/object/public/photos/banque/libres/enfant/pexels-1-1280.webp'));
  assert.equal(typeSourceImage(url), 'ia');
  const [l] = recapSourcesImages({ libres: [{ url, apercuUrl: null, source: 'ia', idSource: 'abcdefabcdefabcd', auteur: 'Paul Tremblot', pageUrl: null, licence: 'Conditions de Midjourney', licenceVersion: 'conditions déclarées au 2026-10-08', licenceUrl: null, telechargeLe: '2026-10-08', importeLe: '2026-10-08', statut: 'a_valider', sujet: 'enfant', iaOutil: 'Midjourney' }] }).filter((x) => x.url === url);
  assert.equal(l.type, 'ia');
  assert.match(l.fournisseur, /Image générée par IA \(Midjourney\)/);
});

test('jamais dans la galerie du cabinet (kits, jeux) ; mention dans les crédits du site', () => {
  const pref = 'https://x.supabase.co/storage/v1/object/public/photos/';
  const ia = `${pref}banque/ia/enfant/ia-abcdefabcdefabcd-1280.webp`;
  const jeu = nettoyerPhotosJeu({ accueil: ia, galerie: [ia, `${pref}banque/jeux/enfant/a.webp`] }, pref, null);
  assert.equal(jeu.accueil, ia);
  assert.deepEqual(jeu.galerie, [`${pref}banque/jeux/enfant/a.webp`]);
  // Six images générées curées pour « enfant », étiquetées #cabinet : premier écran et page sujet oui, galerie du cabinet jamais
  const urls = [...'abcdef'].map((c) => `${pref}banque/ia/enfant/ia-${c.repeat(16)}-1280.webp`);
  const cles = urls.map((u) => `photo:${u.slice(pref.length)}`);
  const kit = composerKit('enfant', {
    banque: urls.map((url, i) => ({ url, sujets: ['enfant'], origine: 'libre' as const, cle: cles[i] })),
    surcharges: Object.fromEntries(cles.map((c) => [c, { ajouts: ['enfant'], retraits: [] }])), hashtags: Object.fromEntries(cles.map((c) => [c, ['cabinet']])),
    notes: Object.fromEntries(cles.map((c) => [c, { m: 5, n: 1 }])) as never,
  });
  assert.ok(kit.photos.some((p) => p.emplacement === 'accueil'));
  assert.ok(!kit.photos.some((p) => p.emplacement === 'cabinet'));
  assert.ok(!(kitCompact(kit).galerie ?? []).some((u) => urls.includes(u)));
  assert.equal(mentionCreditPhotos({ urls: [ia] })?.startsWith('Certaines photos d’illustration sont des images générées'), true);
  assert.equal(mentionCreditPhotos({ adobe: true, urls: [`${pref}banque/jeux/a.webp`] }), 'Photos : Adobe Stock');
  assert.equal(mentionCreditPhotos({ urls: [] }), null);
});
