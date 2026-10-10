// AUDIT DE SITE — rendu du rapport (une seule page HTML autonome, captures intégrées), imprimable en PDF A4 par auditer.mjs.
// Style « éditorial clair » de la vitrine (direction C, 2026-10-10) : Bricolage Grotesque, blanc, aplats pastel, encre noire.
import { mention } from './noter.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const img = (buf) => `data:image/jpeg;base64,${buf.toString('base64')}`;
const teinte = (n) => (n >= 85 ? '#1f7a6a' : n >= 70 ? '#3f8f4f' : n >= 50 ? '#b7791f' : '#c0392b');
const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const STATUTS = { ok: ['Conforme', 'ok'], attention: ['À améliorer', 'moy'], echec: ['Problème', 'ko'], 'non-mesure': ['Non mesuré', 'nm'] };

function anneau(note, taille = 168, epais = 14) {
  const r = (taille - epais) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, note ?? 0));
  return `<svg class="anneau" viewBox="0 0 ${taille} ${taille}" width="${taille}" height="${taille}" role="img" aria-label="${v} sur 100">
<circle cx="${taille / 2}" cy="${taille / 2}" r="${r}" fill="none" stroke="#ecece8" stroke-width="${epais}"/>
<circle cx="${taille / 2}" cy="${taille / 2}" r="${r}" fill="none" stroke="${teinte(v)}" stroke-width="${epais}" stroke-linecap="round" stroke-dasharray="${(c * v) / 100} ${c}" transform="rotate(-90 ${taille / 2} ${taille / 2})"/>
<text x="50%" y="50%" dy=".05em" text-anchor="middle" dominant-baseline="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="${taille * 0.3}" fill="#111614">${v}</text>
<text x="50%" y="${taille / 2 + taille * 0.2}" text-anchor="middle" font-family="Inter" font-size="${taille * 0.085}" fill="#5c6461">/ 100</text></svg>`;
}

const appareils = (d, legende) => `<figure class="appareils">
  <div class="portable"><div class="ecran-p"><img src="${img(d.bureau.capture)}" alt="Page d’accueil sur ordinateur"></div><div class="socle"></div></div>
  <div class="tel"><div class="ecran-t"><img src="${img(d.mobile.capture)}" alt="Page d’accueil sur téléphone"></div></div>
  ${legende ? `<figcaption>${legende}</figcaption>` : ''}</figure>`;

function exemplesContraste(d) {
  const v = (d.mobile.axe || []).find((x) => x.id === 'color-contrast');
  if (!v) return '';
  const ex = v.exemples.filter((e) => e.data?.fgColor).slice(0, 4);
  if (!ex.length) return '';
  return `<div class="contrastes">${ex.map((e) => {
    const t = e.html.replace(/<[^>]+>/g, '').trim().slice(0, 38) || 'Texte';
    return `<div class="ech"><span class="pastille" style="color:${esc(e.data.fgColor)};background:${esc(e.data.bgColor)}">${esc(t)}</span><small>contraste ${String(e.data.contrastRatio).replace('.', ',')}:1 · minimum ${String(e.data.expectedContrastRatio).replace(':1', '').replace('.', ',')}:1</small></div>`;
  }).join('')}</div>`;
}

function blocTheme(t, i, d, p) {
  const comp = p ? p.note.themes.find((x) => x.id === t.id) : null;
  return `<section class="theme">
  <header><span class="num">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(t.nom)}</h3><p>${esc(t.id === 'vitesse' && d.pagespeed.mobile?.erreur ? 'Le temps que met la page à s’afficher sur un téléphone en 4G (conditions de test de Google PageSpeed).' : t.intro)}</p></div>
  <div class="note-theme"><b style="color:${teinte(t.note)}">${t.note ?? '–'}</b><small>/100</small>${comp ? `<span class="vs">site proposé : <b style="color:${teinte(comp.note)}">${comp.note}</b></span>` : ''}</div></header>
  <ul class="constats">${t.constats.map((c) => `<li class="${STATUTS[c.statut][1]}"><span class="statut">${STATUTS[c.statut][0]}</span><div><b>${esc(c.titre)}</b><p>${esc(c.detail)}</p></div></li>`).join('')}</ul>
  ${t.id === 'accessibilite' ? exemplesContraste(d) : ''}
</section>`;
}

/**
 * @param d mesures du site audité   @param note notation de d
 * @param opts { proposition?: { d, note, libelle }, praticien?, commercial?: { nom, tel, email } }
 */
export function rendreRapport(d, note, opts = {}) {
  const p = opts.proposition;
  const titreDoc = `Audit du site ${d.hote}`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titreDoc)}</title><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--encre:#111614;--gris:#5c6461;--trait:#e2e3df;--fond:#f4f4f1;--menthe:#cfeee3;--peche:#ffd9c2;--jaune:#fbe7a6;--lilas:#e3dcfa;--ciel:#d6e8f7;--vert:#1f7a6a}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#fff;color:var(--encre);font:16px/1.55 Inter,system-ui,sans-serif}
h1,h2,h3{font-family:'Bricolage Grotesque',Inter,sans-serif;letter-spacing:-.03em;line-height:1;margin:0}
.page{max-width:1080px;margin:0 auto;padding:0 16px}@media(min-width:760px){.page{padding:0 40px}}
.haut{display:flex;justify-content:space-between;align-items:center;padding:22px 0;border-bottom:1px solid var(--trait)}
.logo{font:800 22px 'Bricolage Grotesque',sans-serif;letter-spacing:-.03em}.logo span{color:var(--vert)}
.haut small{color:var(--gris);font-size:13px;text-align:right}
.couv{padding:44px 0 36px}
.sur{display:inline-block;background:var(--menthe);border-radius:99px;padding:5px 12px;font-size:13.5px;font-weight:600}
.couv h1{font-weight:800;font-size:clamp(36px,6vw,68px);margin:16px 0 8px;overflow-wrap:anywhere}
.couv h1 em{font-style:normal;color:var(--vert)}
.couv .lead{color:var(--gris);font-size:18px;max-width:640px;margin:0}
.scores{display:grid;gap:16px;margin-top:32px;grid-template-columns:1fr}
@media(min-width:760px){.scores.deux{grid-template-columns:1fr 1fr}}
.carte-score{background:var(--fond);border-radius:24px;padding:24px;display:flex;gap:22px;align-items:center}
.carte-score.prop{background:var(--menthe)}
.carte-score h2{font-size:15px;font-family:Inter;letter-spacing:0;font-weight:600;color:var(--gris);margin-bottom:6px}
.carte-score .mention{font:800 30px 'Bricolage Grotesque',sans-serif;letter-spacing:-.03em}
.carte-score p{margin:6px 0 0;color:var(--gris);font-size:14px}
.anneau{flex:none;width:136px;height:136px}@media(min-width:760px){.anneau{width:168px;height:168px}}
.barres{margin-top:16px;background:#fff;border:1px solid var(--trait);border-radius:24px;padding:20px 24px}
.barre{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:4px 14px;align-items:center;padding:9px 0;border-bottom:1px solid var(--fond)}
.barre:last-child{border:0}.barre span{font-weight:600;font-size:14.5px}.barre b{font:800 18px 'Bricolage Grotesque';text-align:right}
.piste{grid-column:1/-1;height:8px;background:#ecece8;border-radius:9px;position:relative}
.piste i{position:absolute;left:0;top:0;bottom:0;border-radius:9px}
.piste i.pr{top:auto;bottom:-6px;height:3px;background:var(--encre)!important;opacity:.8}
.legende-barres{display:flex;gap:18px;font-size:13px;color:var(--gris);margin-top:10px}.legende-barres i{display:inline-block;width:14px;height:6px;border-radius:4px;margin-right:6px;vertical-align:middle}
section{padding:40px 0;border-top:1px solid var(--trait)}
.titre-s{font-size:clamp(28px,4vw,42px);font-weight:800;margin-bottom:18px}
.marquants{list-style:none;padding:0;margin:0;display:grid;gap:12px;counter-reset:m}
.marquants li{counter-increment:m;background:var(--fond);border-radius:18px;padding:18px 20px 18px 64px;position:relative;font-size:17px;font-weight:500}
.marquants li:before{content:counter(m);position:absolute;left:18px;top:14px;width:32px;height:32px;border-radius:50%;background:var(--peche);font:800 17px/32px 'Bricolage Grotesque';text-align:center}
.forts{margin-top:18px;color:var(--gris);font-size:14.5px}.forts b{color:var(--encre)}
.appareils{margin:0;display:flex;align-items:flex-end;justify-content:center;gap:0;padding:28px 12px 18px;background:linear-gradient(180deg,var(--ciel),#eef5fb);border-radius:28px;position:relative;flex-wrap:wrap}
.appareils figcaption{width:100%;text-align:center;font-weight:600;margin-top:14px}
.portable{width:min(100%,600px)}.ecran-p{background:#1b1f1d;border-radius:14px 14px 4px 4px;padding:10px;box-shadow:0 30px 50px -25px rgba(17,22,20,.45)}
.ecran-p img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;border-radius:4px}
.socle{height:14px;background:linear-gradient(#d9dbd8,#b9bcb8);border-radius:0 0 18px 18px;margin:0 -5%}
.tel{width:150px;margin-left:-60px;z-index:1;background:#1b1f1d;border-radius:28px;padding:7px;box-shadow:0 30px 50px -20px rgba(17,22,20,.5)}
.ecran-t img{display:block;width:100%;aspect-ratio:390/844;object-fit:cover;object-position:top;border-radius:22px}
@media(max-width:600px){.tel{width:110px;margin-left:-40px}}
.duo{display:grid;gap:18px}@media(min-width:900px){.duo{grid-template-columns:1fr 1fr}.duo .tel{width:118px;margin-left:-46px}}
.prop-fig .appareils{background:linear-gradient(180deg,var(--menthe),#eef9f4)}
.theme{padding:30px 0}
.theme header{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 16px;align-items:start;margin-bottom:16px}
.theme .num{font:800 15px 'Bricolage Grotesque';background:var(--encre);color:#fff;border-radius:10px;padding:6px 9px}
.theme h3{font-size:clamp(24px,3vw,32px);font-weight:800}
.theme header p{margin:6px 0 0;color:var(--gris)}
.note-theme{grid-column:2;display:flex;align-items:baseline;gap:4px;flex-wrap:wrap}
@media(min-width:760px){.theme header{grid-template-columns:auto minmax(0,1fr) auto}.note-theme{grid-column:3;grid-row:1;flex-direction:column;align-items:flex-end;gap:0}}
.note-theme>b{font:800 44px/1 'Bricolage Grotesque';letter-spacing:-.04em}.note-theme small{color:var(--gris)}
.vs{font-size:13px;color:var(--gris);margin-left:10px}@media(min-width:760px){.vs{margin:4px 0 0}}
.constats{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.constats li{display:grid;grid-template-columns:118px minmax(0,1fr);gap:14px;align-items:start;padding:14px 16px;border-radius:16px;background:var(--fond);break-inside:avoid}
.constats li p{margin:2px 0 0;color:var(--gris);font-size:14.5px;overflow-wrap:anywhere}
.statut{font-size:12.5px;font-weight:600;border-radius:99px;padding:4px 10px;text-align:center}
.ok .statut{background:var(--menthe);color:#14594d}.moy .statut{background:var(--jaune);color:#6b4a00}.ko .statut{background:#fde0dc;color:#9c2a1f}.nm .statut{background:#e9e9e6;color:var(--gris)}
@media(max-width:560px){.constats li{grid-template-columns:1fr;gap:6px}.statut{justify-self:start}}
.contrastes{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.ech{display:flex;flex-direction:column;gap:4px;border:1px solid var(--trait);border-radius:14px;padding:10px}
.pastille{border-radius:8px;padding:8px 12px;font-size:14px;max-width:260px}.ech small{color:var(--gris);font-size:12px}
.offre{background:var(--encre);color:#fff;border-radius:32px;padding:32px 24px;margin:8px 0 40px}
@media(min-width:760px){.offre{padding:44px}}
.offre h2{font-size:clamp(28px,4vw,44px);font-weight:800}.offre h2 em{font-style:normal;color:#8fe0c9}
.offre p{color:#c9d1cd;max-width:640px}
.comp{width:100%;border-collapse:collapse;margin-top:18px;font-size:15px}
.comp th,.comp td{padding:11px 8px;border-bottom:1px solid #2a3330;text-align:left}.comp td:not(:first-child),.comp th:not(:first-child){text-align:right;width:120px}
.comp th{color:#8fa39c;font-weight:500;font-size:13px}.comp b{font:800 20px 'Bricolage Grotesque'}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.contact.clair{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px #8fe0c9}.apercu-note{font-size:13.5px;margin:14px 0 0}
.contact{display:inline-block;background:#8fe0c9;color:var(--encre);border-radius:12px;padding:14px 20px;font-weight:600;text-decoration:none}
.methode{color:var(--gris);font-size:13.5px}.methode h2{font-size:22px;color:var(--encre);margin-bottom:8px}
.methode ul{padding-left:18px}
@page{size:A4;margin:12mm 0}
@media print{body{font-size:13px}.page{padding:0 14mm;max-width:none}.saut{break-before:page}section{padding:22px 0}.theme{break-inside:auto}.theme header{break-after:avoid}
.couv{padding:28px 0 18px}.scores.deux{grid-template-columns:1fr 1fr}.anneau{width:130px;height:130px}.marquants li{font-size:14.5px}.offre{break-inside:avoid}.constats li{padding:10px 14px}
.duo{grid-template-columns:1fr 1fr}.duo .portable{width:100%}.duo .tel{width:96px;margin-left:-38px}.portable{width:520px}.tel{width:130px}}
</style></head><body><div class="page">

<div class="haut"><div class="logo">web<span>podologue</span></div><small>Audit réalisé le ${dateFr(d.date)}${opts.commercial?.nom ? `<br>par ${esc(opts.commercial.nom)}` : ''}</small></div>

<div class="couv">
  <span class="sur">Audit de site internet${opts.praticien ? ` · ${esc(opts.praticien)}` : ''}</span>
  <h1>Votre site <em>${esc(d.hote.replace(/^www\./, ''))}</em>, passé au crible.</h1>
  <p class="lead">${note.compte.ok + note.compte.attention + note.compte.echec} points contrôlés automatiquement : vitesse, affichage sur téléphone, lisibilité, Google, ChatGPT et les IA, conformité, prise de rendez-vous.</p>
  <div class="scores${p ? ' deux' : ''}">
    <div class="carte-score">${anneau(note.globale)}<div><h2>Votre site actuel</h2><div class="mention" style="color:${teinte(note.globale)}">${mention(note.globale)}</div>
      <p>${note.compte.ok} conformes · ${note.compte.attention} à améliorer · ${note.compte.echec} problèmes</p></div></div>
    ${p ? `<div class="carte-score prop">${anneau(p.note.globale)}<div><h2>${esc(p.libelle || 'Le site que nous vous proposons')}</h2><div class="mention" style="color:${teinte(p.note.globale)}">${mention(p.note.globale)}</div>
      <p>Mêmes tests, mêmes outils, le ${dateFr(p.d.date)}.</p></div></div>` : ''}
  </div>
  <div class="barres">${note.themes.map((t) => { const pt = p?.note.themes.find((x) => x.id === t.id); return `<div class="barre"><span>${esc(t.nom)}</span><b style="color:${teinte(t.note)}">${t.note ?? '–'}</b><div class="piste"><i style="width:${t.note ?? 0}%;background:${teinte(t.note)}"></i>${pt ? `<i class="pr" style="width:${pt.note}%"></i>` : ''}</div></div>`; }).join('')}
  ${p ? `<div class="legende-barres"><span><i style="background:#b7791f"></i>Site actuel</span><span><i style="background:#111614"></i>Site proposé</span></div>` : ''}</div>
</div>

<section class="saut">
  <h2 class="titre-s">Ce qu’il faut retenir</h2>
  ${note.marquants.length ? `<ol class="marquants">${note.marquants.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>` : '<p>Aucun problème majeur relevé : le site est en bonne santé.</p>'}
  ${note.forts.length ? `<p class="forts"><b>Points forts :</b> ${note.forts.map(esc).join(' · ')}.</p>` : ''}
</section>

<section>
  <h2 class="titre-s">Ce que voient vos patients</h2>
  ${p ? `<div class="duo"><div>${appareils(d, 'Votre site actuel')}</div><div class="prop-fig">${appareils(p.d, esc(p.libelle || 'Le site proposé'))}</div></div>` : appareils(d, 'Page d’accueil, sur ordinateur et sur téléphone')}
</section>

<div class="saut"></div>
${note.themes.map((t, i) => blocTheme(t, i, d, p)).join('')}

${p ? `<div class="offre saut"><h2>Le même audit, <em>sur le site que nous avons préparé pour vous.</em></h2>
<p>Nous avons préparé un site à votre nom, non publié, et l’avons soumis aux mêmes tests, avec les mêmes outils. Ces notes sont mesurées, pas promises.</p>
<table class="comp"><thead><tr><th>Thème</th><th>Site actuel</th><th>Site proposé</th></tr></thead><tbody>
${note.themes.map((t) => { const pt = p.note.themes.find((x) => x.id === t.id); return `<tr><td>${esc(t.nom)}</td><td><b style="color:#ffd9c2">${t.note ?? '–'}</b></td><td><b style="color:#8fe0c9">${pt?.note ?? '–'}</b></td></tr>`; }).join('')}
<tr><td><b>Note globale</b></td><td><b style="color:#ffd9c2">${note.globale}</b></td><td><b style="color:#8fe0c9">${p.note.globale}</b></td></tr></tbody></table>
<div class="actions">${opts.lienSite ? `<a class="contact" href="${esc(opts.lienSite)}">Voir votre futur site →</a>` : ''}${opts.commercial?.tel || opts.commercial?.email ? `<a class="contact clair" href="${opts.commercial.tel ? `tel:${esc(opts.commercial.tel.replace(/\s/g, ''))}` : `mailto:${esc(opts.commercial.email)}`}">${opts.commercial.nom ? `${esc(opts.commercial.nom)} · ` : ''}${esc(opts.commercial.tel || opts.commercial.email)}</a>` : ''}</div>
${opts.lienSite ? '<p class="apercu-note">Site non publié, préparé à partir des informations publiques de votre cabinet : textes, couleurs et style se changent en quelques clics.</p>' : ''}
</div>` : ''}

<section class="methode">
  <h2>Méthode</h2>
  <ul>
    <li>Page d’accueil de ${esc(d.base)} analysée le ${dateFr(d.date)}, sur un téléphone simulé (390 × 844 px) et un ordinateur (1440 × 900 px).</li>
    <li>Vitesse : ${d.pagespeed.mobile?.erreur ? 'mesurée par nos soins sur un téléphone simulé en 4G lente (latence 150 ms, 1,6 Mb/s, processeur ralenti ×4), les conditions de Google PageSpeed' : 'Google PageSpeed Insights (Lighthouse), téléphone moyen en 4G simulée'}. Les notes peuvent varier de quelques points d’un test à l’autre.</li>
    <li>Accessibilité : moteur axe-core, critères WCAG 2.1 niveaux A et AA. Le test automatique ne remplace pas un audit manuel complet.</li>
    <li>IA : robots.txt, réponse au robot GPTBot, données structurées schema.org, texte présent sans JavaScript.</li>
    <li>Conformité : LCEN (art. 6), RGPD et recommandations de la CNIL sur les cookies, recommandations de communication de l’Ordre des pédicures-podologues.</li>
  </ul>
  <p>Audit indépendant de tout prestataire : il décrit l’état du site à la date indiquée, sans jugement sur son créateur.</p>
</section>
</div></body></html>`;
}
