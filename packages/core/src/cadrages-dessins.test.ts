// Cadrage des dessins dans leurs cases (cadrages-dessins.ts) et contrôles « cadrage » / « coherence » du testeur (testeur-modeles.ts).
// Retour de Paul du 2026-10-10 : « Tu as mis vert alors que les images ne sont pas centrées dans leurs cases… ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOITES_DESSINS, cadrageDessin, recadrerSvg } from './cadrages-dessins';
import { svgDessin, svgLigne, DESSINS_LIGNE, cleCadrage } from './dessins';
import { DESSINS_PODOLOGIE } from './univers';
import { illustrationTheme } from './heros-themes';
import { defautCadrage, defautsCartesSoeurs, imageEtiree, CONTROLES_TESTEUR, type MesureCadrage } from './testeur-modeles';

test('chaque dessin de la marque a son cadrage mesuré (relevé, pédagogique, trait continu)', () => {
  for (const n of DESSINS_PODOLOGIE) for (const r of ['releve', 'pedagogique', 'ligne'] as const) assert.ok(cadrageDessin(cleCadrage(n, r)), `${r}:${n}`);
  for (const n of DESSINS_LIGNE) assert.ok(BOITES_DESSINS[`ligne:${n}`], `ligne:${n}`);
  for (const [cle, [x, y, d, b]] of Object.entries(BOITES_DESSINS)) assert.ok(x >= 0 && y >= 0 && d <= 240 && b <= 180 && d > x && b > y, cle);
});

test('cadrage : viewBox centré sur le tracé, marge régulière ; fond perdu calé au bord sans marge', () => {
  // Chaussure (relevé) : posée bas dans son repère (y 71 à 158) → viewBox recentré, marges égales autour du tracé
  const c = cadrageDessin('releve:sport');
  assert.ok(c);
  const [vx, vy, vl, vh] = c.viewBox.split(' ').map(Number);
  const [x, y, d, b] = BOITES_DESSINS['releve:sport'];
  assert.ok(Math.abs((x - vx) - (vx + vl - d)) < 0.2 && Math.abs((y - vy) - (vy + vh - b)) < 0.2, c.viewBox);
  assert.equal(c.preserveAspectRatio, 'xMidYMid meet');
  // Semelle (relevé) : la jambe entre par le haut (fond perdu) → haut du viewBox au haut du tracé, calé en haut de la case
  const s = cadrageDessin('releve:semelle');
  assert.ok(s?.fondPerdu.haut);
  assert.equal(Number(s.viewBox.split(' ')[1]), BOITES_DESSINS['releve:semelle'][1]);
  assert.match(s.preserveAspectRatio, /YMin/);
  assert.equal(cadrageDessin('inconnu:x'), null);
});

test('recadrerSvg et svgDessin({ cadre }) : seul le viewBox racine change', () => {
  const brut = svgDessin('talon', { registre: 'releve' });
  const cadre = svgDessin('talon', { registre: 'releve', cadre: true });
  const c = cadrageDessin('releve:talon');
  assert.ok(c);
  assert.ok(cadre.startsWith('<svg') && cadre.includes(`viewBox="${c.viewBox}" preserveAspectRatio="${c.preserveAspectRatio}"`));
  assert.equal(cadre.replace(/ viewBox="[^"]*" preserveAspectRatio="[^"]*"/, ' viewBox="0 0 240 180"'), brut);
  assert.equal(recadrerSvg(brut, null), brut);
  const l = svgDessin('semelle', { registre: 'ligne', cadre: true });
  assert.match(l, new RegExp(`viewBox="${cadrageDessin('ligne:semelle')?.viewBox}"`));
  assert.ok(svgLigne('ongle').includes('viewBox="0 0 240 180"'));
  // Ongles épais : fenêtre de la pièce ouverte (le pied continue jusqu'au bord de la case) ; vignettes encadrées (ongle) : fermée
  const oe = svgDessin('ongles-epais', { registre: 'releve', cadre: true });
  assert.ok(cadrageDessin('releve:ongles-epais')?.ouvert && /<svg overflow="visible" x=/.test(oe) && !oe.startsWith('<svg overflow'));
  assert.ok(!svgDessin('ongle', { registre: 'releve', cadre: true }).includes('<svg overflow="visible"'));
});

test('héros d’un thème au trait continu : pièce cadrée, fond perdu prolongé jusqu’au bord du héros', () => {
  // Ongles (ligne:ongle) : orteils coupés net en bas → la pièce descend jusqu'au bas du héros (360)
  const h = illustrationTheme('ongles', { format: 'paysage', registre: 'ligne' });
  const m = h.match(/<svg x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" viewBox="([^"]+)" preserveAspectRatio="([^"]+)"/);
  assert.ok(m, 'pièce posée');
  assert.equal(Number(m[2]) + Number(m[4]), 360);
  assert.equal(m[5], cadrageDessin('ligne:ongle')?.viewBox);
});

// ———— Contrôle « cadrage » du testeur ————
const B = (x: number, y: number, d: number, b: number) => ({ x, y, d, b });

test('defautCadrage : cas de Paul (svg à 88 % de la case, jambe coupée à 6 % sous le haut, chaussure collée en bas)', () => {
  // Case 300 × 187 ; svg 240 × 165 centré (80 % × 88 %) ; jambe qui continue au-dessus de la fenêtre du svg
  const cadre = B(0, 0, 300, 187), svg = B(30, 11, 270, 176);
  const coupee: MesureCadrage = { cadre, svg, tout: B(45, -150, 262, 165), visible: B(45, 11, 262, 165) };
  const d = defautCadrage(coupee);
  assert.ok(d);
  assert.equal(d.gravite, 'bloquant');
  assert.ok((d.coupes.haut ?? 0) > 0.15);
  assert.deepEqual(d.fondPerdu, []);
  // Chaussure : tracé entier mais posé bas (marges 76 / 31 px sur 187) → décentré, majeur
  const basse: MesureCadrage = { cadre, svg, tout: B(39, 76, 261, 156), visible: B(39, 76, 261, 156) };
  const e = defautCadrage(basse);
  assert.ok(e);
  assert.equal(e.gravite, 'majeur');
  assert.ok((e.ecartV ?? 0) > 0.18 && (e.ecartV ?? 0) < 0.3);
  assert.match(e.texte, /décentré en hauteur/);
});

test('defautCadrage : bien cadré, fond perdu au bord de la case, petite coupe tolérée', () => {
  const cadre = B(0, 0, 300, 187), svg = B(0, 0, 300, 187);
  assert.equal(defautCadrage({ cadre, svg, tout: B(60, 20, 240, 167), visible: B(60, 20, 240, 167) }), null);
  // Jambe qui sort par le haut de la case (svg calé au bord) : fond perdu, axe vertical non jugé
  const j = defautCadrage({ cadre, svg, tout: B(70, -200, 230, 170), visible: B(70, 0, 230, 170) });
  assert.equal(j, null);
  // Tracé qui s'arrête net contre le bord du svg calé sur la case (jambe tracée depuis le bord) : fond perdu aussi
  assert.equal(defautCadrage({ cadre, svg, tout: B(70, 0, 230, 120), visible: B(70, 0, 230, 120) }), null);
  // svg plus grand que la case : la case coupe le dessin → jamais un fond perdu
  const grand = defautCadrage({ cadre, svg: B(-40, -40, 340, 227), tout: B(-30, -30, 330, 217), visible: B(0, 0, 300, 187) });
  assert.ok(grand && grand.gravite === 'bloquant');
  // Coupe de 3 % : tolérée
  assert.equal(defautCadrage({ cadre, svg: B(0, 6, 300, 187), tout: B(60, 1, 240, 170), visible: B(60, 6, 240, 170) }), null);
  // Coupe de 8 % : majeur
  assert.equal(defautCadrage({ cadre, svg: B(0, 20, 300, 187), tout: B(60, 5, 240, 170), visible: B(60, 20, 240, 170) })?.gravite, 'majeur');
});

test('cartes sœurs : visuels de tailles différentes, décalés, alignements différents ; hauteurs inégales en mineur', () => {
  const carte = (h: number, l: number, v: { l: number; h: number; dy: number; dx: number } | null, aligne = 'left') => ({ h, l, aligne, visuel: v ? { ...v, balise: 'svg' } : null });
  assert.deepEqual(defautsCartesSoeurs([carte(300, 280, { l: 280, h: 175, dy: 0, dx: 0 }), carte(300, 280, { l: 280, h: 175, dy: 0, dx: 0 })]), []);
  const t = defautsCartesSoeurs([carte(300, 280, { l: 280, h: 175, dy: 0, dx: 0 }), carte(300, 280, { l: 200, h: 125, dy: 0, dx: 0 })]);
  assert.deepEqual(t.map((x) => [x.type, x.gravite]), [['visuel-taille', 'majeur']]);
  assert.deepEqual(defautsCartesSoeurs([carte(300, 280, { l: 280, h: 175, dy: 0, dx: 0 }), carte(300, 280, { l: 280, h: 175, dy: 12, dx: 0 })]).map((x) => x.type), ['visuel-position']);
  assert.deepEqual(defautsCartesSoeurs([carte(300, 280, null, 'left'), carte(300, 280, null, 'center')]).map((x) => x.type), ['alignement']);
  assert.deepEqual(defautsCartesSoeurs([carte(300, 280, null), carte(400, 280, null)]).map((x) => [x.type, x.gravite]), [['hauteur', 'mineur']]);
  assert.deepEqual(defautsCartesSoeurs([carte(300, 280, null)]), []);
  assert.ok(imageEtiree(0.05) && !imageEtiree(0.02));
  assert.ok(CONTROLES_TESTEUR.some((c) => c.id === 'cadrage') && CONTROLES_TESTEUR.some((c) => c.id === 'coherence'));
});
