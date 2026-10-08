// Lot 2 des premiers écrans « couleurs / formes organiques » (retour de Paul du 2026-10-08 : « Franchement j'adore les nouveaux
// styles de hero couleurs / formes organiques, il faut continuer dans cette direction ») : formes et feuilles de style PROPRES à
// chaque variante (servies seulement par la page qui l'utilise, dans le `css` de htmlHeros), balisage posé par heros-photo.ts.
//
// - AVEC photo : photo en papier découpé sur des aplats superposés, duo de taches (couleur + photo masquée), photo dans une
//   arche avec un disque de couleur, photo qui épouse la courbe de la voûte (forme abstraite, aucun pied dessiné).
// - SANS photo (couleurs et formes seules, pour le style illustrations) : aplats en papier découpé, tache qui se déforme
//   (morphing de chemins à même nombre de points), dégradé maillé animé, grande forme qui respire derrière le texte, bandes
//   ondulantes, aplat en courbe de voûte et points de pression.
//
// Couleurs : toujours les variables de la gamme (--hp-*). Le texte reste sur le fond de la page (AA du gabarit) sauf pour le
// dégradé maillé animé et la forme qui respire : leurs couleurs --hp-t1..3 sont la gamme ÉCLAIRCIE juste assez pour que le
// titre, le sur-titre et le texte doux restent ≥ 4,6:1 (teintesSousTexte, calculé comme le voile du lot 1).
// Mouvement : transform et opacity seulement (sauf la tache qui se déforme : propriété d, repeinte d'un petit SVG, figée sur
// Safari qui ne l'anime pas) ; rien si le visiteur réduit les animations ; jamais sur la photo (élément LCP).

import { contraste, melanger } from './couleurs';
import type { CouleursGabarit } from './gabarits';

const svg = (vb: string, corps: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}' preserveAspectRatio='none'>${corps}</svg>`).replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%2C/g, ',')}")`;

/**
 * Teintes de la gamme posées SOUS le texte (dégradé maillé animé, forme qui respire) : chaque couleur est mêlée au fond de la
 * page juste assez pour que tous les `textes` gardent `min` de contraste (la couleur pure si elle passe déjà).
 */
export function teintesSousTexte(c: CouleursGabarit, textes: readonly string[] = [c.encre, c['accent-texte'], c['encre-douce']], min = 4.6): [string, string, string] {
  const teinte = (x: string) => {
    for (let t = 100; t >= 0; t -= 2) {
      const m = melanger(c.page, x, t / 100);
      if (textes.every((k) => contraste(k, m) >= min)) return m;
    }
    return c.page;
  };
  return [teinte(c.aplat), teinte(c.bulle), teinte(c.vif)];
}

// ---------------------------------------------------------------------------------------------------------------
// Chemins partagés
// ---------------------------------------------------------------------------------------------------------------

/**
 * Courbe de la voûte (profil abstrait, de l'avant-pied à droite au talon à gauche : appui, arche plus haute côté talon, appui),
 * repère 100 × 100, bas du cadre de la photo
 */
const VOUTE = 'H84C70 96 58 74 42 74C28 74 24 92 14 96H0';
/** Même courbe décalée de `dy` unités (trait et pointillés qui la suivent ; un décalage CSS serait étiré par le repère) */
const voute = (dy: number) => `M100 ${96 + dy}H84C70 ${96 + dy} 58 ${74 + dy} 42 ${74 + dy}C28 ${74 + dy} 24 ${92 + dy} 14 ${96 + dy}H0`;
/** Courbe de l'aplat (bord haut, talon à gauche), décalée de `dy` */
const vouteAplat = (dy: number) => `M0 ${70 + dy}H14C24 ${70 + dy} 28 ${30 + dy} 40 ${30 + dy}C58 ${30 + dy} 72 ${70 + dy} 86 ${70 + dy}H100`;
/** Taches à 8 points, même structure de commandes (morphing) : grande (0-2) et petite (3-5) */
const TACHES = [
  'M100 18C116 17.5 134.8 36.8 149.5 50.5C164.2 64.2 188.7 84.2 188 100C187.3 115.8 159.9 131.3 145.3 145.3C130.6 159.3 116.3 182.8 100 184C83.7 185.2 62.7 166.3 47.7 152.3C32.7 138.3 9.1 116.5 10 100C10.9 83.5 38.3 67 53.3 53.3C68.3 39.7 84 18.5 100 18Z',
  'M100 30C120.3 29.5 151.2 26.1 162.2 37.8C173.2 49.4 165.8 79 166 100C166.2 121 174.6 152 163.6 163.6C152.6 175.3 120.7 170.5 100 170C79.3 169.5 50.5 172.5 39.2 160.8C27.9 149.1 31.8 120 32 100C32.2 80 29.3 52.3 40.6 40.6C51.9 28.9 79.7 30.5 100 30Z',
  'M100 10C117.2 11.6 133.3 38.3 146.7 53.3C160 68.3 178.6 83 180 100C181.4 117 168.5 139.8 155.2 155.2C141.8 170.5 116.5 193.9 100 192C83.5 190.1 69.5 159.2 56.2 143.8C42.8 128.5 22.1 116.7 20 100C17.9 83.3 30.1 58.4 43.4 43.4C56.8 28.4 82.8 8.4 100 10Z',
  'M150 116C157.1 116.9 162.4 125.9 168.4 131.6C174.4 137.3 185.8 143.6 186 150C186.2 156.4 175.8 164.5 169.8 169.8C163.8 175.1 157.8 180.8 150 182C142.2 183.2 127.5 182.2 123.1 176.9C118.8 171.5 123.5 158.5 124 150C124.5 141.5 121.6 131.6 126 126C130.3 120.3 142.9 115.1 150 116Z',
  'M150 124C157.8 123.3 170.8 120.2 175.5 124.5C180.1 128.9 178.2 141.8 178 150C177.8 158.2 178.7 167.7 174 174C169.4 180.4 157.1 188.9 150 188C142.9 187.1 137.3 174.7 131.6 168.4C125.9 162.1 116.5 156.6 116 150C115.5 143.4 123.1 133.1 128.8 128.8C134.5 124.5 142.2 124.7 150 124Z',
  'M150 114C156.6 113.5 166.9 122.8 171.2 128.8C175.5 134.8 175.1 142 176 150C176.9 158 181.2 172.2 176.9 176.9C172.5 181.5 158.5 178.5 150 178C141.5 177.5 132 178.7 126 174C120 169.4 113.1 157.1 114 150C114.9 142.9 125.6 137.6 131.6 131.6C137.6 125.6 143.4 114.5 150 114Z',
];
const MASQUE_VOUTE = svg('0 0 100 100', `<path d='M0 0H100V96${VOUTE}Z'/>`);
const VAGUE = svg('0 0 100 100', "<path d='M0 22C25 0 25 0 50 22S75 44 100 22V100H0Z'/>");
const BLOB = '58% 42% 51% 49% / 44% 56% 44% 56%';
const BLOB2 = '46% 54% 38% 62% / 52% 40% 60% 48%';
const PAPIER = 'polygon(4% 6%,36% 0,70% 5%,100% 1%,97% 48%,100% 94%,62% 100%,28% 96%,0 100%,2% 50%)';
/** Trame de points de pression (signature ÉcranZen), couleur courante */
const TRAME = 'background:radial-gradient(circle,currentColor 1.7px,transparent 2.3px) 0 0/13px 13px';

const s = (c: string) => `<span class="hp__s hp__s--${c}"></span>`;

/** Formes de chaque variante, posées dans le cadre de la photo (ou dans la composition sans photo) */
export const FORMES_LOT2: Record<string, string> = {
  'decoupe-photo': s('om') + s('p1') + s('p2') + s('p3'),
  'duo-taches': s('t1') + s('t2') + s('tr'),
  'arche-photo': s('disque') + s('demi') + s('arc'),
  'voute-photo': `<svg class="hp__s hp__s--courbe" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${voute(3)}"/><path class="hp__pts" d="${voute(8)}"/></svg>`,
  'papier-decoupe': s('om') + s('a1') + s('a2') + s('a3') + s('a4') + s('tr'),
  'tache-morph': `<svg class="hp__s hp__s--morph" viewBox="0 0 200 200" aria-hidden="true"><path class="hp__m1" d="${TACHES[0]}"/><path class="hp__m2" d="${TACHES[3]}"/></svg>${s('tr')}`,
  'maille-anime': s('anneau'),
  'forme-respire': s('t2') + s('tr') + s('p3'),
};
/** Formes posées sur toute la section (fond) */
export const FONDS_LOT2: Record<string, string> = {
  'maille-anime': `<span class="hp__deco" aria-hidden="true">${s('g1')}${s('g2')}${s('g3')}${s('g4')}</span>`,
  'forme-respire': `<span class="hp__deco" aria-hidden="true">${s('geante')}</span>`,
  'bandes-ondulantes': `<span class="hp__deco" aria-hidden="true"><span class="hp__bandes2">${s('b1')}${s('b2')}${s('b3')}</span></span>`,
  'voute-aplat': `<span class="hp__deco" aria-hidden="true"><svg class="hp__s hp__s--voute" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="hp__aplat" d="${vouteAplat(0)}V100H0Z"/><path class="hp__trait" d="${vouteAplat(-7)}"/><path class="hp__pts" d="${vouteAplat(-16)}"/></svg></span>`,
};
/** Variantes sans photo qui ont une composition à la place de la photo (les autres : fond seul) */
export const AVEC_COMPOSITION = ['papier-decoupe', 'tache-morph', 'maille-anime', 'forme-respire'];

// Cadre de la photo (ou de la composition) sur ordinateur : moitié droite, alignée sur la coquille
const DROITE = 'max(20px,(100% - var(--hp-cadre,1180px)) / 2)';
const MOUV = '@media (prefers-reduced-motion:no-preference){';

/** Feuille de style d'une variante du lot 2 ('' sinon) */
export function cssLot2(v: string): string {
  const commun = '.hp__s{position:absolute;display:block;pointer-events:none}.hp__media .hp__s{z-index:-1}';
  const c = CSS_LOT2[v];
  return c ? commun + c : '';
}

const CSS_LOT2: Record<string, string> = {
  'decoupe-photo': `
.hp--decoupe-photo .hp__media{margin:22px 26px 0;height:min(46svh,360px)}
.hp--decoupe-photo .hp__fond{-webkit-clip-path:${PAPIER};clip-path:${PAPIER}}
.hp--decoupe-photo :is(.hp__s--om,.hp__s--p1){-webkit-clip-path:${PAPIER};clip-path:${PAPIER}}
.hp--decoupe-photo .hp__s--om{inset:3% -2% -3% 2%;background:var(--hp-sombre);opacity:.16}
.hp--decoupe-photo .hp__s--p1{inset:8% -5% -6% 6%;background:var(--hp-aplat);transform:rotate(-3deg)}
.hp--decoupe-photo .hp__s--p2{left:-7%;bottom:-9%;width:44%;height:36%;background:var(--hp-vif);-webkit-clip-path:polygon(0 18%,30% 0,100% 12%,88% 100%,8% 86%);clip-path:polygon(0 18%,30% 0,100% 12%,88% 100%,8% 86%)}
.hp--decoupe-photo .hp__s--p3{right:-4%;top:-7%;width:19%;aspect-ratio:1;border-radius:50%;background:var(--hp-bulle)}
@media (min-width:900px){.hp.hp--decoupe-photo .hp__media{inset:13% calc(${DROITE} + 28px) 14% 50%;margin:0;height:auto}}
${MOUV}.hp--decoupe-photo .hp__s{animation:hp-papier var(--duree-long,.9s) var(--courbe-sortie,ease-out) both}.hp--decoupe-photo .hp__s--p1{animation-delay:120ms}.hp--decoupe-photo .hp__s--p2{animation-delay:240ms}.hp--decoupe-photo .hp__s--p3{animation-delay:360ms}}
@keyframes hp-papier{from{opacity:0;transform:translate3d(-28px,18px,0) rotate(-6deg)}}`,

  'duo-taches': `
.hp--duo-taches .hp__media{margin:26px auto 8px;width:min(76%,340px);height:auto;aspect-ratio:1}
.hp--duo-taches .hp__fond{border-radius:${BLOB}}
.hp--duo-taches .hp__s--t1{left:-26%;top:20%;width:80%;aspect-ratio:1;border-radius:${BLOB2};background:var(--hp-aplat)}
.hp--duo-taches .hp__s--t2{right:-9%;top:-7%;width:30%;aspect-ratio:1;border-radius:62% 38% 46% 54% / 48% 58% 42% 52%;background:var(--hp-vif)}
.hp--duo-taches .hp__s--tr{right:-16%;bottom:-6%;width:40%;aspect-ratio:1;border-radius:50%;color:var(--hp-accent-texte);opacity:.55;${TRAME}}
@media (min-width:900px){.hp.hp--duo-taches .hp__media{inset:10% auto 11% 55%;margin:0;width:auto;height:auto}}
${MOUV}.hp--duo-taches .hp__s--t1{animation:hp-respire 16s ease-in-out infinite alternate}.hp--duo-taches .hp__s--t2{animation:hp-respire 12s ease-in-out -4s infinite alternate}}`,

  'arche-photo': `
.hp--arche-photo .hp__media{margin:28px auto 0;width:min(66%,290px);height:auto;aspect-ratio:4/5}
.hp--arche-photo .hp__fond{border-radius:999px 999px 18px 18px}
.hp--arche-photo .hp__s--disque{right:-34%;top:-10%;width:74%;aspect-ratio:1;border-radius:50%;background:var(--hp-vif)}
.hp--arche-photo .hp__s--demi{left:-30%;bottom:0;width:56%;aspect-ratio:2/1;border-radius:999px 999px 0 0;background:var(--hp-aplat)}
.hp--arche-photo .hp__s--arc{left:-11%;top:9%;width:100%;height:91%;border:2px solid var(--hp-accent-texte);border-bottom:0;border-radius:999px 999px 0 0;opacity:.5}
@media (min-width:900px){.hp.hp--arche-photo .hp__media{inset:11% auto 0 58%;margin:0;width:auto;height:auto}}
${MOUV}.hp--arche-photo .hp__s--disque{animation:hp-orbite 14s ease-in-out infinite alternate}}
@keyframes hp-orbite{to{transform:translate3d(-18px,14px,0)}}`,

  'voute-photo': `
.hp--voute-photo .hp__media{height:min(52svh,410px)}.hp--voute-photo .hp__cadre{padding-top:44px}
.hp--voute-photo .hp__fond{-webkit-mask:${MASQUE_VOUTE} 0 0/100% 100% no-repeat;mask:${MASQUE_VOUTE} 0 0/100% 100% no-repeat}
.hp--voute-photo .hp__s--courbe{z-index:1;inset:0;width:100%;height:100%;overflow:visible;fill:none}
.hp--voute-photo .hp__s--courbe path{vector-effect:non-scaling-stroke;stroke:var(--hp-vif);stroke-width:9;stroke-linecap:round}
.hp--voute-photo .hp__s--courbe .hp__pts{stroke:var(--hp-accent-texte);stroke-width:4;stroke-dasharray:0 13;opacity:.7}
@media (min-width:900px){.hp.hp--voute-photo .hp__media{inset:0 0 11% 46%;height:auto}}
${MOUV}.hp--voute-photo .hp__s--courbe{animation:hp-file var(--duree-long,.9s) var(--courbe-sortie,ease-out) 150ms both}}`,

  'papier-decoupe': `
.hp--papier-decoupe .hp__media{margin:18px 26px 0;height:240px}
.hp--papier-decoupe :is(.hp__s--om,.hp__s--a1){inset:6% 10% 12% 4%;-webkit-clip-path:polygon(8% 12%,48% 2%,92% 10%,100% 58%,84% 96%,40% 100%,4% 84%,0 40%);clip-path:polygon(8% 12%,48% 2%,92% 10%,100% 58%,84% 96%,40% 100%,4% 84%,0 40%)}
.hp--papier-decoupe .hp__s--om{background:var(--hp-sombre);opacity:.14;transform:translate3d(10px,12px,0)}
.hp--papier-decoupe .hp__s--a1{background:var(--hp-aplat)}
.hp--papier-decoupe .hp__s--a2{right:0;top:0;width:46%;height:54%;border-radius:${BLOB};background:var(--hp-bulle)}
.hp--papier-decoupe .hp__s--a3{left:8%;bottom:2%;width:34%;aspect-ratio:1;border-radius:50%;background:var(--hp-vif)}
.hp--papier-decoupe .hp__s--a4{left:46%;top:30%;width:24%;aspect-ratio:1;border-radius:0 100% 0 100%;background:var(--hp-accent-texte);transform:rotate(-18deg)}
.hp--papier-decoupe .hp__s--tr{right:4%;bottom:8%;width:28%;height:32%;color:var(--hp-accent-texte);opacity:.5;${TRAME}}
@media (min-width:900px){.hp.hp--papier-decoupe .hp__media{inset:12% ${DROITE} 12% 50%;margin:0;height:auto}}
${MOUV}.hp--papier-decoupe .hp__s{animation:hp-papier var(--duree-long,.9s) var(--courbe-sortie,ease-out) both}.hp--papier-decoupe .hp__s--a2{animation:hp-papier .9s ease-out 120ms both,hp-orbite 15s ease-in-out 1s infinite alternate}.hp--papier-decoupe .hp__s--a3{animation:hp-papier .9s ease-out 240ms both,hp-orbite 11s ease-in-out 1s infinite alternate-reverse}.hp--papier-decoupe .hp__s--a4{animation-delay:360ms}}
@keyframes hp-papier{from{opacity:0;transform:translate3d(-28px,18px,0) rotate(-6deg)}}
@keyframes hp-orbite{to{transform:translate3d(-18px,14px,0)}}`,

  'tache-morph': `
.hp--tache-morph .hp__media{margin:14px auto 0;width:min(84%,300px);height:auto;aspect-ratio:1}
.hp--tache-morph .hp__s--morph{inset:0;width:100%;height:100%;overflow:visible;z-index:0}
.hp--tache-morph .hp__m1{fill:var(--hp-aplat)}
.hp--tache-morph .hp__m2{fill:var(--hp-vif)}
.hp--tache-morph .hp__s--tr{left:2%;top:4%;width:38%;aspect-ratio:1;border-radius:50%;color:var(--hp-accent-texte);opacity:.5;${TRAME}}
@media (min-width:900px){.hp.hp--tache-morph .hp__media{inset:9% ${DROITE} 9% 53%;margin:0;width:auto;height:auto}}
${MOUV}.hp--tache-morph .hp__m1{animation:hp-morph1 18s ease-in-out infinite alternate}.hp--tache-morph .hp__m2{animation:hp-morph2 11s ease-in-out infinite alternate}}
@keyframes hp-morph1{0%{d:path("${TACHES[0]}")}50%{d:path("${TACHES[1]}")}100%{d:path("${TACHES[2]}")}}
@keyframes hp-morph2{0%{d:path("${TACHES[3]}")}50%{d:path("${TACHES[4]}")}100%{d:path("${TACHES[5]}")}}`,

  'maille-anime': `
.hp--maille-anime .hp__deco{z-index:-1}
.hp--maille-anime :is(.hp__s--g1,.hp__s--g2,.hp__s--g3,.hp__s--g4){aspect-ratio:1;border-radius:50%}
.hp--maille-anime .hp__s--g1{left:-30%;top:-26%;width:110%;background:radial-gradient(closest-side,var(--hp-t1),transparent)}
.hp--maille-anime .hp__s--g2{right:-36%;top:-10%;width:100%;background:radial-gradient(closest-side,var(--hp-t2),transparent)}
.hp--maille-anime .hp__s--g3{left:4%;bottom:-50%;width:96%;background:radial-gradient(closest-side,var(--hp-t3),transparent)}
.hp--maille-anime .hp__media{height:120px}
.hp--maille-anime .hp__s--anneau{right:12%;top:18px;width:96px;aspect-ratio:1;border-radius:50%;box-shadow:inset 0 0 0 2px var(--hp-accent-texte);opacity:.6}
.hp--maille-anime .hp__s--anneau::after{content:'';position:absolute;left:8%;top:72%;width:18%;aspect-ratio:1;border-radius:50%;background:var(--hp-vif)}
.hp--maille-anime .hp__s--g4{display:none;right:-8%;bottom:-34%;width:52%;background:radial-gradient(closest-side,var(--hp-vif),transparent);opacity:.6}
@media (min-width:900px){.hp--maille-anime .hp__s--g1{width:70%;left:-14%;top:-30%}.hp--maille-anime .hp__s--g2{width:64%;right:-12%}.hp--maille-anime .hp__s--g3{width:60%;left:30%;bottom:-40%}.hp.hp--maille-anime .hp__media{inset:14% ${DROITE} 14% 56%;height:auto}.hp--maille-anime .hp__s--anneau{right:6%;top:8%;width:46%}.hp--maille-anime .hp__s--g4{display:block}}
${MOUV}.hp--maille-anime .hp__s--g1{animation:hp-derive 22s ease-in-out infinite alternate}.hp--maille-anime .hp__s--anneau{animation:hp-tour 40s linear infinite}.hp--maille-anime .hp__s--g4{animation:hp-derive 15s ease-in-out infinite alternate-reverse}.hp--maille-anime .hp__s--g2{animation:hp-derive 17s ease-in-out -6s infinite alternate-reverse}.hp--maille-anime .hp__s--g3{animation:hp-derive 26s ease-in-out -3s infinite alternate}}
@keyframes hp-derive{to{transform:translate3d(9%,7%,0) scale(1.12)}}
@keyframes hp-tour{to{transform:rotate(1turn)}}`,

  'forme-respire': `
.hp--forme-respire .hp__deco{z-index:-1}
.hp--forme-respire .hp__s--geante{left:-34%;top:150px;width:150%;aspect-ratio:1;border-radius:${BLOB};background:var(--hp-t1)}
.hp--forme-respire .hp__media{height:130px}
.hp--forme-respire .hp__s--t2{right:14%;top:18px;width:84px;aspect-ratio:1;border-radius:${BLOB2};background:var(--hp-vif)}
.hp--forme-respire .hp__s--tr{right:calc(14% + 60px);top:58px;width:84px;height:64px;color:var(--hp-accent-texte);opacity:.5;${TRAME}}
.hp--forme-respire .hp__s--p3{left:12%;top:40px;width:26px;aspect-ratio:1;border-radius:50%;background:var(--hp-bulle)}
@media (min-width:900px){.hp--forme-respire .hp__s--geante{left:max(-80px,(100% - var(--hp-cadre,1180px)) / 2 - 140px);top:4%;width:min(64%,860px)}.hp.hp--forme-respire .hp__media{inset:16% ${DROITE} 16% 66%;height:auto}.hp--forme-respire .hp__s--t2{right:6%;top:10%;width:56%}.hp--forme-respire .hp__s--tr{right:auto;left:0;top:56%;width:48%;height:36%}.hp--forme-respire .hp__s--p3{left:auto;right:4%;top:auto;bottom:6%;width:14%}}
${MOUV}.hp--forme-respire .hp__s--geante{animation:hp-souffle 10s ease-in-out infinite alternate}.hp--forme-respire .hp__s--t2{animation:hp-respire 12s ease-in-out infinite alternate}}
@keyframes hp-souffle{to{transform:scale(1.06) rotate(6deg)}}`,

  'bandes-ondulantes': `
.hp--bandes-ondulantes .hp__cadre{padding-bottom:178px}
.hp__bandes2{position:absolute;left:0;right:0;bottom:0;height:160px}
.hp__bandes2 .hp__s{left:0;bottom:0;width:200%;-webkit-mask:${VAGUE} 0 0/25% 100% repeat-x;mask:${VAGUE} 0 0/25% 100% repeat-x}
.hp__bandes2 .hp__s--b1{height:100%;background:var(--hp-bulle)}
.hp__bandes2 .hp__s--b2{height:70%;background:var(--hp-aplat);transform:translate3d(-6%,0,0)}
.hp__bandes2 .hp__s--b3{height:40%;background:var(--hp-vif);transform:translate3d(-12%,0,0)}
@media (min-width:900px){.hp--bandes-ondulantes .hp__bandes2{height:max(190px,26svh)}.hp.hp--bandes-ondulantes .hp__cadre{padding-bottom:max(230px,30svh)}.hp.hp--bandes-ondulantes .hp__texte{max-width:62%}}
${MOUV}.hp__bandes2 .hp__s--b1{animation:hp-onde 26s linear infinite}.hp__bandes2 .hp__s--b2{animation:hp-onde 19s linear infinite reverse}.hp__bandes2 .hp__s--b3{animation:hp-onde 14s linear infinite}}
@keyframes hp-onde{to{transform:translate3d(-50%,0,0)}}`,

  'voute-aplat': `
.hp--voute-aplat .hp__cadre{padding-bottom:168px}
.hp--voute-aplat .hp__s--voute{left:0;bottom:0;width:100%;height:150px;overflow:visible;fill:none}
.hp--voute-aplat .hp__aplat{fill:var(--hp-aplat)}
.hp--voute-aplat :is(.hp__trait,.hp__pts){vector-effect:non-scaling-stroke;stroke-linecap:round}
.hp--voute-aplat .hp__trait{stroke:var(--hp-vif);stroke-width:7}
.hp--voute-aplat .hp__pts{stroke:var(--hp-accent-texte);stroke-width:5;stroke-dasharray:0 15;opacity:.75}
@media (min-width:900px){.hp--voute-aplat .hp__s--voute{height:max(220px,32svh)}.hp.hp--voute-aplat .hp__cadre{padding-bottom:max(290px,36svh)}.hp.hp--voute-aplat .hp__texte{max-width:56%}}
${MOUV}.hp--voute-aplat .hp__s--voute{animation:hp-leve var(--duree-long,.9s) var(--courbe-sortie,ease-out) both}}
@keyframes hp-leve{from{opacity:0;transform:translate3d(0,40px,0)}}`,
};
