import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionsRapides, APPAREILS_APERCU, dimensionsCadre } from './cadre-apercu';

test('cadre : fenêtres simulées de la largeur réelle de l’appareil', () => {
  assert.deepEqual(APPAREILS_APERCU.mobile, { largeur: 390, hauteur: 844 });
  assert.equal(APPAREILS_APERCU.bureau.largeur, 1440);
});

test('cadre : téléphone sur grand écran, entier dans la hauteur disponible', () => {
  const d = dimensionsCadre({ appareil: 'mobile', largeurDispo: 1100, hauteurMax: 700 });
  assert.equal(d.largeur, 390);
  assert.equal(d.hauteurVue, 844);
  assert.ok(d.hauteurAffichee <= 700);
  assert.equal(d.largeurAffichee, Math.round(390 * d.echelle));
  // Assez de place : taille réelle
  assert.equal(dimensionsCadre({ appareil: 'mobile', largeurDispo: 1100, hauteurMax: 1000 }).echelle, 1);
  // Jamais sous la moitié
  assert.equal(dimensionsCadre({ appareil: 'mobile', largeurDispo: 1100, hauteurMax: 200 }).echelle, 0.5);
});

test('cadre : téléphone dans un cadre étroit (rendu double, vrai téléphone), la largeur prime', () => {
  const d = dimensionsCadre({ appareil: 'mobile', largeurDispo: 300, hauteurMax: 600 });
  assert.equal(d.echelle, Math.round((300 / 390) * 1000) / 1000);
  assert.equal(d.largeurAffichee, 300);
  assert.equal(d.hauteurAffichee, 600);
  // La fenêtre simulée est coupée à la hauteur visible : les éléments fixes restent dans le cadre
  assert.equal(d.hauteurVue, Math.round(600 / d.echelle));
});

test('cadre : vignette, la hauteur affichée est imposée et la fenêtre simulée en découle', () => {
  const d = dimensionsCadre({ appareil: 'mobile', largeurDispo: 300, vignette: 560 });
  assert.equal(d.hauteurAffichee, 560);
  assert.equal(d.hauteurVue, Math.round(560 / d.echelle));
  const b = dimensionsCadre({ appareil: 'bureau', largeurDispo: 720, vignette: 520 });
  assert.equal(b.echelle, 0.5);
  assert.equal(b.hauteurVue, 1040);
});

test('cadre : ordinateur, 1440 réduit à la largeur ; plein écran : toute la hauteur disponible', () => {
  const d = dimensionsCadre({ appareil: 'bureau', largeurDispo: 720, hauteurMax: 600 });
  assert.equal(d.echelle, 0.5);
  assert.equal(d.hauteurAffichee, 450);
  assert.equal(d.hauteurVue, 900);
  const p = dimensionsCadre({ appareil: 'bureau', largeurDispo: 720, hauteurMax: 600, remplir: true });
  assert.equal(p.hauteurAffichee, 600);
  assert.equal(p.hauteurVue, 1200);
  // Jamais agrandi
  assert.equal(dimensionsCadre({ appareil: 'bureau', largeurDispo: 3000 }).echelle, 1);
});

const base = { rdvEnLigne: true, aTelephone: true, aAdresse: true, email: 'cabinet@exemple.fr', libelleContact: 'Appeler le cabinet' };

test('actions rapides : barre des gabarits (Coquille.astro), Appeler | Rendez-vous plein', () => {
  for (const contact of ['barre', 'bandeau', 'carte', undefined]) {
    const a = actionsRapides({ ...base, gabarit: 'tableau', contact });
    assert.deepEqual(a, { forme: 'barre', actions: [{ libelle: 'Appeler', icone: 'telephone', plein: false }, { libelle: 'Rendez-vous', icone: 'rendez-vous', plein: true }] });
  }
  // Sans rendez-vous en ligne : Appeler le cabinet (plein) | Itinéraire
  assert.deepEqual(actionsRapides({ ...base, rdvEnLigne: false, gabarit: 'village', contact: 'barre' }), {
    forme: 'barre', actions: [{ libelle: 'Appeler le cabinet', icone: 'telephone', plein: true }, { libelle: 'Itinéraire', icone: 'itineraire', plein: false }],
  });
  // Ni téléphone ni rendez-vous en ligne : l'action de contact seule (pleine largeur)
  assert.deepEqual(actionsRapides({ ...base, rdvEnLigne: false, aTelephone: false, aAdresse: false, libelleContact: 'Écrire au cabinet', gabarit: 'revue' }), {
    forme: 'barre', actions: [{ libelle: 'Écrire au cabinet', icone: 'rendez-vous', plein: true }],
  });
});

test('actions rapides : bouton flottant, action principale (rendez-vous, sinon appeler, sinon écrire)', () => {
  assert.deepEqual(actionsRapides({ ...base, gabarit: 'tableau', contact: 'flottant' }), { forme: 'flottant', action: { libelle: 'Prendre rendez-vous', icone: 'rendez-vous', plein: true } });
  assert.equal((actionsRapides({ ...base, rdvEnLigne: false, gabarit: 'tableau', contact: 'flottant' }) as { action: { icone: string } }).action.icone, 'telephone');
  assert.equal((actionsRapides({ ...base, rdvEnLigne: false, aTelephone: false, gabarit: 'tableau', contact: 'flottant' }) as { action: { icone: string } }).action.icone, 'courriel');
  assert.equal(actionsRapides({ ...base, rdvEnLigne: false, aTelephone: false, email: null, aAdresse: false, gabarit: 'tableau', contact: 'flottant' }), null);
});

test('actions rapides : barre du gabarit classique (Gabarit.astro)', () => {
  assert.deepEqual(actionsRapides({ ...base, gabarit: 'classique', via: 'via Doctolib' }), {
    forme: 'barre-classique', appel: false,
    actions: [{ libelle: 'Appeler', icone: 'telephone', plein: false }, { libelle: 'Rendez-vous', icone: 'rendez-vous', plein: true, via: 'via Doctolib' }, { libelle: 'Itinéraire', icone: 'itineraire', plein: false }],
  });
  assert.deepEqual(actionsRapides({ ...base, rdvEnLigne: false, aAdresse: false, gabarit: 'classique' }), {
    forme: 'barre-classique', appel: true, actions: [{ libelle: 'Appeler le cabinet', icone: 'telephone', plein: true }],
  });
});
