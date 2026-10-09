import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alertesLicences, cheminPhotoSousLicence, construireLigneLicence, controlerPhotosPremium, creditsPhotosPremium, etatLicencePourSite, finApercu, idPhotoSousLicence,
  lignesCsvPhotosSousLicence, MENTION_MODELE, photosPremiumDans, photosPremiumDuDraft, photosPremiumNonAutorisees, sansPhotosPremium, validerAchatSite,
  validerDeclarationLicence, type DeclarationLicence, type PhotoSousLicence,
} from './photos-sous-licence';
import { controlerImagesDemo, MESSAGE_APERCU_SOUS_LICENCE, sansImagesDemo } from './kit-demo';
import { estApercuSousLicence, estImageDemo, estImageNonPubliable, estPhotoSousLicence, csvLicences } from './photos-libres';
import { draftVide, normaliserDraft } from './draft';
import { nettoyerPhotosJeu } from './jeux-photos';
import { appliquerPersonnalisations } from './personnalisations-site';
import { mentionCreditPhotos } from './images-generees';
import { controlerPublication } from './controles';

const S = 'https://x.supabase.co/storage/v1/object/public/photos/';
const ID_A = 'a'.repeat(16), ID_B = 'b'.repeat(16), ID_C = 'c'.repeat(16);
const apercu = (id = ID_A) => `${S}${cheminPhotoSousLicence('apercu', id, 1280)}`;
const achetee = (id = ID_B) => `${S}${cheminPhotoSousLicence('achetee', id, 1920)}`;
const SITE = '11111111-1111-4111-8111-111111111111';
const AUTRE = '22222222-2222-4222-8222-222222222222';
const JOUR = '2026-10-09';

const photo = (o: Partial<PhotoSousLicence> = {}): PhotoSousLicence => ({
  idFichier: ID_B, url: achetee(), banque: 'adobe-stock', idImage: '123456789', pageUrl: 'https://stock.adobe.com/images/123456789', sujet: 'sport', type: 'standard',
  statutLicence: 'achetee', etat: 'validee', telechargeLe: '2026-10-01', titulaire: 'TBCOM', dateAchat: '2026-10-01', reference: 'INV-1', sitesParLicence: 1,
  creditRequis: false, personneReconnaissable: false, rattachements: [], ...o,
});

const declaration = (o: Partial<DeclarationLicence> = {}): Partial<DeclarationLicence> => ({
  banque: 'adobe-stock', idImage: '123456789', pageUrl: 'https://stock.adobe.com/images/123456789', contributeur: 'Jane Doe', sujet: 'sport', type: 'standard',
  telechargeLe: '2026-10-01', titulaire: 'TBCOM', dateAchat: '2026-10-01', reference: 'INV-2026-001', creditRequis: false, personneReconnaissable: false, conditionsVerifiees: true, ...o,
});

test('chemins : aperçu et achetée reconnus ; seul l’aperçu est non publiable', () => {
  assert.equal(estPhotoSousLicence(apercu()), true);
  assert.equal(estPhotoSousLicence(achetee()), true);
  assert.equal(estApercuSousLicence(apercu()), true);
  assert.equal(estApercuSousLicence(achetee()), false);
  assert.equal(estImageNonPubliable(apercu()), true);
  assert.equal(estImageNonPubliable(achetee()), false);
  assert.equal(estImageDemo(apercu()), false, 'un aperçu n’est pas une image générée de démo (étiquettes distinctes)');
  assert.equal(idPhotoSousLicence(achetee()), ID_B);
  assert.equal(idPhotoSousLicence(`${S}banque/libres/sport/pexels-1-1920.webp`), null);
});

test('aperçu jamais publié : retiré à l’enregistrement, contrôle bloquant avec message', () => {
  const d = draftVide();
  d.photos.accueil = apercu();
  d.photos.cabinet = [apercu(), `${S}banque/libres/sport/pexels-1-1920.webp`];
  d.theme.photosRecette = [apercu(), achetee()];
  const c = controlerImagesDemo(d);
  assert.equal(c.ok, false);
  assert.equal(!c.ok && c.message, MESSAGE_APERCU_SOUS_LICENCE);
  const n = normaliserDraft(d);
  assert.equal(n.photos.accueil, '');
  assert.deepEqual(n.photos.cabinet, [`${S}banque/libres/sport/pexels-1-1920.webp`]);
  assert.deepEqual(n.theme.photosRecette, [achetee()], 'la photo achetée reste dans le brouillon (contrôlée à la publication)');
  assert.equal(sansImagesDemo(d).photos.accueil, '');
  assert.ok(controlerPublication(d).bloquants.length >= 1);
  // Couche de personnalisations à la construction : l'aperçu n'est jamais posé
  assert.equal(appliquerPersonnalisations({ ...draftVide(), photos: { ...draftVide().photos, accueil: apercu() } }, { publication: true }).photos.accueil, '');
});

test('jeux de photos : aperçu refusé partout ; photo achetée seulement dans un jeu EXCLUSIF', () => {
  const partage = nettoyerPhotosJeu({ accueil: achetee(), panorama: apercu() }, S, null);
  assert.equal(partage.accueil, '');
  assert.equal(partage.panorama, '');
  const exclusif = nettoyerPhotosJeu({ accueil: achetee(), panorama: apercu() }, S, SITE);
  assert.equal(exclusif.panorama, '');
});

test('achetée : publiable seulement sur les sites rattachés, licence non expirée, limite par licence', () => {
  const d = draftVide();
  d.photos.accueil = achetee();
  // Aucune licence pour ce site : bloqué
  const sans = controlerPhotosPremium(d, { siteId: SITE, photos: [photo()], jour: JOUR });
  assert.equal(sans.ok, false);
  assert.match(!sans.ok ? sans.message : '', /option Photos premium/);
  // Demandée (pas encore achetée) : bloqué
  assert.equal(etatLicencePourSite(photo({ rattachements: [{ siteId: SITE, statut: 'demandee' }] }), SITE, JOUR).ok, false);
  // Achetée pour ce site : autorisé
  const ok = photo({ rattachements: [{ siteId: SITE, statut: 'achetee', reference: 'L-1', dateAchat: '2026-10-02' }] });
  assert.deepEqual(controlerPhotosPremium(d, { siteId: SITE, photos: [ok], jour: JOUR }), { ok: true });
  // … mais pas pour un autre site
  assert.equal(controlerPhotosPremium(d, { siteId: AUTRE, photos: [ok], jour: JOUR }).ok, false);
  // Expirée
  const exp = photo({ rattachements: [{ siteId: SITE, statut: 'achetee', reference: 'L-1', dateAchat: '2026-01-01', expireLe: '2026-06-30' }] });
  assert.deepEqual(etatLicencePourSite(exp, SITE, JOUR), { ok: false, raison: 'expiree' });
  // Même référence sur deux sites, 1 site par licence : le second est bloqué
  const deux = photo({ rattachements: [
    { siteId: SITE, statut: 'achetee', reference: 'L-1', dateAchat: '2026-10-02' },
    { siteId: AUTRE, statut: 'achetee', reference: 'L-1', dateAchat: '2026-10-03' },
  ] });
  assert.equal(etatLicencePourSite(deux, SITE, JOUR).ok, true);
  assert.deepEqual(etatLicencePourSite(deux, AUTRE, JOUR), { ok: false, raison: 'limite' });
  assert.equal(etatLicencePourSite({ ...deux, sitesParLicence: 2 }, AUTRE, JOUR).ok, true);
  // Photo sans traçabilité et aperçu : bloqués ; défense de la construction
  assert.deepEqual(photosPremiumNonAutorisees({ a: achetee(ID_C), b: apercu() }, { siteId: SITE, photos: [ok], jour: JOUR }).sort(), [achetee(ID_C), apercu()].sort());
});

test('demande d’option : état « à demander » puis « demandée », remplacement retire la photo', () => {
  const d = draftVide();
  d.photos.accueil = achetee();
  d.theme.photosRecette = [achetee(), `${S}banque/libres/sport/pexels-1-1920.webp`];
  assert.deepEqual(photosPremiumDuDraft(d, { siteId: SITE, photos: [photo()], jour: JOUR }), [{ url: achetee(), etat: 'a-demander' }]);
  assert.deepEqual(photosPremiumDuDraft(d, { siteId: SITE, photos: [photo({ rattachements: [{ siteId: SITE, statut: 'demandee' }] })], jour: JOUR })[0].etat, 'demandee');
  const r = sansPhotosPremium(d);
  assert.equal(r.photos.accueil, '');
  assert.deepEqual(r.theme.photosRecette, [`${S}banque/libres/sport/pexels-1-1920.webp`]);
  assert.deepEqual(photosPremiumDans(r), []);
});

test('crédit : affiché si la licence l’exige, mention de modèle pour une personne reconnaissable', () => {
  const d = { photos: { accueil: achetee() } };
  const p = photo({ creditRequis: true, creditTexte: 'Jane Doe / stock.adobe.com', personneReconnaissable: true, rattachements: [{ siteId: SITE, statut: 'achetee', reference: 'L-1' }] });
  const c = creditsPhotosPremium(d, { siteId: SITE, photos: [p], jour: JOUR });
  assert.deepEqual(c, ['Photo : Jane Doe / stock.adobe.com', MENTION_MODELE]);
  assert.match(mentionCreditPhotos({ premium: c }) ?? '', /stock\.adobe\.com/);
  // Sans licence pour ce site : aucun crédit (la photo n'est pas posée)
  assert.deepEqual(creditsPhotosPremium(d, { siteId: AUTRE, photos: [p], jour: JOUR }), []);
});

test('déclaration : traçabilité obligatoire, aperçu ≠ achat, usage sensible santé', () => {
  assert.ok(validerDeclarationLicence(declaration()).declaration);
  const vide = validerDeclarationLicence({});
  assert.equal(vide.declaration, null);
  assert.ok(vide.erreurs.length >= 4);
  // Aperçu : pas de référence exigée ; Unsplash+ n'a pas d'aperçu
  const ap = validerDeclarationLicence(declaration({ type: 'apercu', titulaire: null, reference: null, dateAchat: null }));
  assert.equal(ap.declaration?.statut, 'apercu');
  assert.equal(validerDeclarationLicence(declaration({ type: 'apercu', banque: 'unsplash-plus' })).declaration, null);
  // Achetée sans référence : refusé
  assert.equal(validerDeclarationLicence(declaration({ reference: '' })).declaration, null);
  // Crédit exigé sans texte : refusé
  assert.equal(validerDeclarationLicence(declaration({ creditRequis: true, creditTexte: '' })).declaration, null);
  // Personne reconnaissable : case « aucune pathologie » exigée ; Adobe Stock + sujet de santé : refusé
  assert.equal(validerDeclarationLicence(declaration({ personneReconnaissable: true })).declaration, null);
  assert.ok(validerDeclarationLicence(declaration({ personneReconnaissable: true, aucunePathologie: true })).declaration);
  assert.equal(validerDeclarationLicence(declaration({ personneReconnaissable: true, aucunePathologie: true, sujet: 'diabete' })).declaration, null);
  assert.ok(validerDeclarationLicence(declaration({ banque: 'istock', personneReconnaissable: true, aucunePathologie: true, sujet: 'diabete' })).declaration);
  // Page non https, posturologie, futur
  assert.equal(validerDeclarationLicence(declaration({ pageUrl: 'http://stock.adobe.com/x' })).declaration, null);
  assert.equal(validerDeclarationLicence(declaration({ dateAchat: '2099-01-01' })).declaration, null);
  const l = construireLigneLicence({ declaration: validerDeclarationLicence(declaration())!.declaration!, id: ID_B, importeLe: new Date('2026-10-09T10:00:00Z'), largeurs: [1920, 640, 1280], urlPrincipale: achetee(), largeur: 4000, hauteur: 2600 });
  assert.equal(l.ligne?.chemin, 'banque/licence/achetee/lic-bbbbbbbbbbbbbbbb-1920.webp');
  assert.deepEqual(l.ligne?.largeurs, [640, 1280, 1920]);
  assert.equal(l.ligne?.reference_licence, 'INV-2026-001');
});

test('achat pour un site : référence, titulaire et date obligatoires', () => {
  assert.ok(validerAchatSite({ reference: 'INV-9', titulaire: 'Cabinet Dupont', dateAchat: '2026-10-09' }, new Date('2026-10-09T12:00:00Z')).achat);
  assert.equal(validerAchatSite({ reference: '', titulaire: 'X', dateAchat: '2026-10-09' }).achat, null);
  assert.equal(validerAchatSite({ reference: 'INV-9', titulaire: 'Cabinet', dateAchat: '2026-10-09', expireLe: '2026-01-01' }).achat, null);
});

test('alertes : sites en attente, licence expirée, aperçu expiré ; CSV de conformité', () => {
  const p1 = photo({ rattachements: [{ siteId: SITE, statut: 'demandee' }, { siteId: AUTRE, statut: 'demandee' }] });
  const p2 = photo({ idFichier: ID_C, rattachements: [{ siteId: '33333333-3333-4333-8333-333333333333', statut: 'demandee' }, { siteId: SITE, statut: 'achetee', reference: 'L-2', expireLe: '2026-01-01' }] });
  const p3 = photo({ idFichier: ID_A, url: apercu(), type: 'apercu', statutLicence: 'apercu', telechargeLe: '2026-06-01', reference: null, titulaire: null, dateAchat: null });
  assert.equal(finApercu(p3), '2026-08-30');
  const a = alertesLicences([p1, p2, p3], JOUR);
  assert.ok(a.some((x) => x.message.startsWith('3 sites attendent l’achat d’une licence')));
  assert.ok(a.some((x) => /Licence expirée le 2026-01-01/.test(x.message)));
  assert.ok(a.some((x) => /Aperçu expiré le 2026-08-30/.test(x.message)));
  const csv = csvLicences(lignesCsvPhotosSousLicence([p1, p3], { [SITE]: 'Cabinet Dupont' }));
  assert.match(csv, /Adobe Stock;123456789/);
  assert.match(csv, /site Cabinet Dupont/);
  assert.match(csv, /APERÇU SEULEMENT/);
  assert.match(csv, /ACHETÉE/);
});
