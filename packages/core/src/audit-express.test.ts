// Test immédiat de la page /audit-gratuit (audit-express.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditExpress, robotsBloques } from './audit-express';

const COMPLET = `<html><head><title>Pédicure-podologue à Lyon</title><meta name="viewport" content="width=device-width, initial-scale=1">
<script type="application/ld+json">{"@type":"MedicalBusiness","name":"Cabinet","telephone":"0478000000","address":{"streetAddress":"12 rue des Tilleuls","postalCode":"69006","addressLocality":"Lyon"},"openingHours":"Mo-Fr 09:00-19:00"}</script>
</head><body><p>${'soins '.repeat(300)}</p><a href="https://www.doctolib.fr/x">RDV</a><a href="/mentions-legales">Mentions légales</a></body></html>`;

test('site complet : 7/7 lisible, rien à améliorer', () => {
  const r = auditExpress({ html: COMPLET, url: 'https://cabinet-lyon.fr/', https: true, entetes: {}, robotsTxt: 'User-agent: *\nAllow: /' });
  assert.equal(r.scoreIA, 7);
  assert.equal(r.aAmeliorer, 0);
  assert.equal(r.ville, 'Lyon');
});

test('site minimal : IA bloquée, pas de mentions, PHP périmé', () => {
  const r = auditExpress({
    html: '<title>Accueil</title><p>Bienvenue au cabinet. Tél. 04 67 82 78 09</p>', url: 'http://podologue-nice.fr/', https: false,
    entetes: { 'x-powered-by': 'PHP/7.4.33' }, robotsTxt: 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: OAI-SearchBot\nDisallow: /',
  });
  assert.equal(r.scoreIA, 1);
  assert.ok(r.constats.find((c) => c.titre === 'Accès des IA' && !c.ok)?.detail.includes('ChatGPT'));
  assert.ok(r.constats.some((c) => c.titre === 'Sécurité du serveur' && !c.ok));
  assert.ok(r.aAmeliorer >= 5);
});

test('robots.txt : le refus de l’entraînement seul ne bloque pas les citations', () => {
  assert.deepEqual(robotsBloques('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /'), []);
  assert.deepEqual(robotsBloques('User-agent: *\nDisallow: /'), ['oai-searchbot', 'chatgpt-user', 'perplexitybot', 'claude-searchbot', 'googlebot', 'bingbot']);
});
