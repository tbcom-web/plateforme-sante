// AUDIT DE SITE — rendu du rapport (une seule page HTML autonome, captures intégrées), imprimable en PDF A4 par produire.mjs.
// Style « éditorial clair » de la vitrine (direction C, 2026-10-10) : Bricolage Grotesque, blanc, aplats pastel, encre noire.
// Demande de Paul (2026-10-10, v2) : un audit qui « fait plus peur » (verdict, capture annotée, ce que les IA lisent, âge
// technique, risques réels), un site proposé qui « fait envie », et l'offre de migration (mois restants du contrat offerts).
// Tout chiffre affiché est mesuré ou sourcé : aucun montant ni délai inventé.
import { mention } from './noter.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const img = (buf) => `data:image/jpeg;base64,${buf.toString('base64')}`;
const teinte = (n) => (n >= 85 ? '#1f7a6a' : n >= 70 ? '#3f8f4f' : n >= 50 ? '#c47a12' : '#c0392b');
const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const sec = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
const STATUTS = { ok: ['Conforme', 'ok'], attention: ['À corriger', 'moy'], echec: ['Problème', 'ko'], 'non-mesure': ['Non mesuré', 'nm'] };
const REPERES = {
  contraste: 'Texte trop peu contrasté, difficile à lire',
  image: 'Image sans description (invisible pour Google et les lecteurs d’écran)',
  lien: 'Bouton ou lien sans intitulé',
  cible: 'Zone trop petite pour le doigt',
};

/** Verdict de la couverture : ton franc, sans exagération (il découle de la note mesurée) */
function verdict(n) {
  if (n < 55) return ['Votre site vous fait perdre des patients.', 'rouge'];
  if (n < 70) return ['Votre site a décroché.', 'rouge'];
  if (n < 85) return ['Votre site a pris du retard.', 'orange'];
  return ['Un bon site, qui peut encore gagner des patients.', 'vert'];
}

function anneau(note, taille = 168, epais = 14, fond = '#ecece8') {
  const r = (taille - epais) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, note ?? 0));
  return `<svg class="anneau" viewBox="0 0 ${taille} ${taille}" width="${taille}" height="${taille}" role="img" aria-label="${v} sur 100">
<circle cx="${taille / 2}" cy="${taille / 2}" r="${r}" fill="none" stroke="${fond}" stroke-width="${epais}"/>
<circle cx="${taille / 2}" cy="${taille / 2}" r="${r}" fill="none" stroke="${teinte(v)}" stroke-width="${epais}" stroke-linecap="round" stroke-dasharray="${(c * v) / 100} ${c}" transform="rotate(-90 ${taille / 2} ${taille / 2})"/>
<text x="50%" y="50%" dy=".05em" text-anchor="middle" dominant-baseline="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="${taille * 0.3}" fill="currentColor">${v}</text>
<text x="50%" y="${taille / 2 + taille * 0.2}" text-anchor="middle" font-family="Inter" font-size="${taille * 0.085}" fill="currentColor" opacity=".6">/ 100</text></svg>`;
}

/** Téléphone avec les défauts du premier écran entourés et numérotés par type */
function telephoneAnnote(d) {
  const types = [...new Set((d.mobile.reperes || []).map((r) => r.type))];
  const marques = (d.mobile.reperes || []).map((r) => {
    const n = types.indexOf(r.type) + 1;
    return `<span class="rep" style="left:${(r.x / 390) * 100}%;top:${(r.y / 844) * 100}%;width:${Math.max(4, (r.l / 390) * 100)}%;height:${Math.max(2, (r.h / 844) * 100)}%"><i>${n}</i></span>`;
  }).join('');
  return { html: `<div class="tel grand"><div class="ecran-t annote"><img src="${img(d.mobile.capture)}" alt="Premier écran sur téléphone">${marques}</div></div>`, types };
}

function exemplesContraste(d) {
  const v = (d.mobile.axe || []).find((x) => x.id === 'color-contrast');
  const ex = v ? v.exemples.filter((e) => e.data?.fgColor).slice(0, 4) : [];
  if (!ex.length) return '';
  return `<div class="contrastes">${ex.map((e) => {
    const t = e.html.replace(/<[^>]+>/g, '').trim().slice(0, 38) || 'Texte';
    return `<div class="ech"><span class="pastille" style="color:${esc(e.data.fgColor)};background:${esc(e.data.bgColor)}">${esc(t)}</span><small>contraste ${String(e.data.contrastRatio).replace('.', ',')}:1 · minimum ${String(e.data.expectedContrastRatio).replace(':1', '').replace('.', ',')}:1</small></div>`;
  }).join('')}</div>`;
}

function blocTheme(t, i, d, p) {
  const comp = p ? p.note.themes.find((x) => x.id === t.id) : null;
  const aCorriger = t.constats.filter((c) => c.statut === 'echec' || c.statut === 'attention').sort((a, b) => (a.statut === 'echec' ? -1 : 1) - (b.statut === 'echec' ? -1 : 1));
  const conformes = t.constats.filter((c) => c.statut === 'ok');
  return `<section class="theme">
  <header><span class="num">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(t.nom)}</h3><p>${esc(t.id === 'vitesse' && d.pagespeed.mobile?.erreur ? 'Le temps que met la page à s’afficher sur un téléphone en 4G (conditions de test de Google PageSpeed).' : t.intro)}</p></div>
  <div class="note-theme"><b style="color:${teinte(t.note)}">${t.note ?? '–'}</b><small>/100</small>${comp ? `<span class="vs">site proposé : <b style="color:${teinte(comp.note)}">${comp.note}</b></span>` : ''}</div></header>
  ${aCorriger.length ? `<ul class="constats">${aCorriger.map((c) => `<li class="${STATUTS[c.statut][1]}"><span class="statut">${STATUTS[c.statut][0]}</span><div><b>${esc(c.titre)}</b><p>${esc(c.detail)}</p></div></li>`).join('')}</ul>` : ''}
  ${conformes.length ? `<p class="conformes"><b>✓ Conforme :</b> ${conformes.map((c) => esc(c.titre)).join(' · ')}</p>` : ''}
  ${t.id === 'accessibilite' ? exemplesContraste(d) : ''}
</section>`;
}

/** Ce que les IA peuvent lire : actuel / proposé */
function blocIA(d, note, p, ville) {
  const n = note.lisibleIA.filter((x) => x.ok).length, total = note.lisibleIA.length;
  const np = p ? p.note.lisibleIA.filter((x) => x.ok).length : null;
  return `<section class="ia saut">
  <span class="sur sombre">ChatGPT · Gemini · Perplexity</span>
  <h2 class="titre-s">Vos patients demandent à ChatGPT.<br><em>Que peut-il lire de votre cabinet ?</em></h2>
  <p class="lead">Quand un patient tape « un podologue${ville ? ` à ${esc(ville)}` : ' près de chez moi'} » dans ChatGPT, l’IA ne peut recommander que les cabinets dont elle comprend le site. Voici ce qu’un robot d’IA lit sur le vôtre, sans exécuter de JavaScript, comme la plupart d’entre eux.</p>
  <div class="ia-grille${p ? ' deux' : ''}">
    <div class="ia-carte"><div class="ia-tete"><b>Votre site actuel</b><span class="ia-score ${n >= 6 ? 'bon' : 'mauvais'}">${n}/${total}</span></div>
      <ul>${note.lisibleIA.map((x) => `<li class="${x.ok ? 'oui' : 'non'}"><span>${x.ok ? '✓' : '✕'}</span>${esc(x.libelle)}<small>${x.ok ? 'lisible' : 'introuvable'}</small></li>`).join('')}</ul></div>
    ${p ? `<div class="ia-carte prop"><div class="ia-tete"><b>Votre futur site</b><span class="ia-score bon">${np}/${total}</span></div>
      <ul>${p.note.lisibleIA.map((x) => `<li class="${x.ok ? 'oui' : 'non'}"><span>${x.ok ? '✓' : '✕'}</span>${esc(x.libelle)}<small>${x.ok ? 'lisible' : 'introuvable'}</small></li>`).join('')}</ul></div>` : ''}
  </div>
</section>`;
}

/** Âge technique : les briques problématiques, en grand */
function blocTechnique(note, d) {
  const t = note.themes.find((x) => x.id === 'technique');
  const pb = (t?.constats || []).filter((c) => c.statut !== 'ok');
  if (!pb.length) return '';
  const outil = d.technologie?.outil;
  return `<section class="tech">
  <h2 class="titre-s">Sous le capot, un site qui vieillit.</h2>
  <p class="lead">${outil ? `Votre site est construit avec <b>${esc(outil)}</b>. ` : ''}Ce que le serveur annonce lui-même sur ses composants :</p>
  <div class="puces-tech">${pb.map((c) => `<div class="puce ${c.statut === 'echec' ? 'ko' : 'moy'}"><b>${esc(c.titre)}</b><p>${esc(c.detail)}</p></div>`).join('')}</div>
</section>`;
}

function blocRisques(note) {
  if (!note.risques?.length) return '';
  return `<section class="risques">
  <h2 class="titre-s">Les risques que vous portez aujourd’hui.</h2>
  <div class="grille-risques">${note.risques.map((r) => `<div class="risque"><b>⚠ ${esc(r.titre)}</b><p>${esc(r.detail)}</p></div>`).join('')}</div>
</section>`;
}

/** Bénéfices mesurés du site proposé (uniquement des comparaisons calculées) */
function benefices(d, note, p) {
  const out = [];
  const lcp = (x) => (x.pagespeed.mobile && !x.pagespeed.mobile.erreur ? x.pagespeed.mobile.lcp : x.mobile.mesures.lcp);
  const a = lcp(d), b = lcp(p.d);
  if (a && b && b < a) out.push([`${sec(b)}`, `pour afficher votre page sur un téléphone en 4G, contre ${sec(a)} aujourd’hui`]);
  const ia = note.lisibleIA.filter((x) => x.ok).length, iap = p.note.lisibleIA.filter((x) => x.ok).length;
  if (iap > ia) out.push([`${iap}/${note.lisibleIA.length}`, `informations lisibles par ChatGPT et les IA, contre ${ia} aujourd’hui`]);
  for (const [id, libelle] of [['accessibilite', 'lisibilité et accessibilité'], ['google', 'référencement Google'], ['confiance', 'conformité (LCEN, RGPD, Ordre)'], ['technique', 'sécurité et technologie']]) {
    const x = note.themes.find((t) => t.id === id)?.note, y = p.note.themes.find((t) => t.id === id)?.note;
    if (x != null && y != null && y - x >= 10) out.push([`${y}/100`, `en ${libelle}, contre ${x} aujourd’hui`]);
  }
  return out.slice(0, 6);
}

function blocProposition(d, note, p, opts) {
  const bens = benefices(d, note, p);
  const defil = p.d.mobile.defilement || p.d.mobile.capture;
  return `<section class="futur saut">
  <span class="sur">Préparé pour vous</span>
  <h2 class="titre-s">Voici votre cabinet,<br><em>prêt à être mis en ligne.</em></h2>
  <p class="lead">Nous avons préparé ce site à votre nom à partir des informations publiques de votre cabinet. Il n’est pas publié : vous seul le voyez. Textes, photos, couleurs et style se changent en quelques clics.</p>
  <figure class="vitrine">
    <div class="portable"><div class="ecran-p"><img src="${img(p.d.bureau.capture)}" alt="Votre futur site sur ordinateur"></div><div class="socle"></div></div>
    <div class="tel"><div class="ecran-t defile"><img src="${img(defil)}" alt="Votre futur site sur téléphone"></div></div>
  </figure>
  ${opts.lienSite ? `<p class="centre"><a class="bouton" href="${esc(opts.lienSite)}">Voir votre futur site en vrai →</a></p>` : ''}
  ${bens.length ? `<div class="benefices">${bens.map(([v, t]) => `<div><b>${esc(v)}</b><p>${esc(t)}</p></div>`).join('')}</div>` : ''}
  <table class="comp"><thead><tr><th>Thème</th><th>Aujourd’hui</th><th>Votre futur site</th></tr></thead><tbody>
  ${note.themes.map((t) => { const pt = p.note.themes.find((x) => x.id === t.id); return `<tr><td>${esc(t.nom)}</td><td><b style="color:${teinte(t.note)}">${t.note ?? '–'}</b></td><td><b style="color:${teinte(pt?.note)}">${pt?.note ?? '–'}</b></td></tr>`; }).join('')}
  <tr class="total"><td>Note globale</td><td><b style="color:${teinte(note.globale)}">${note.globale}</b></td><td><b style="color:${teinte(p.note.globale)}">${p.note.globale}</b></td></tr></tbody></table>
  <p class="mini">Mêmes tests, mêmes outils, le ${dateFr(p.d.date)} : ces notes sont mesurées, pas promises.</p>
</section>`;
}

function blocMigration(opts) {
  const c = opts.commercial;
  return `<section class="migration saut">
  <h2 class="titre-s">Changer sans risque,<br><em>et sans payer deux fois.</em></h2>
  <div class="offre-mois">
    <span class="sur jaune">Notre offre de migration</span>
    <p class="gros">Les mois restants de votre contrat actuel vous sont offerts.</p>
    <p>Vous ne payez rien chez webpodologue tant que votre contrat actuel court. Vous n’avez rien à résilier dans l’urgence : votre nouveau site est prêt avant la fin de l’ancien.</p>
  </div>
  <ol class="etapes">
    <li><b>Vous validez votre site</b><p>Il est déjà prêt. Nous l’ajustons avec vous : textes, photos, couleurs, soins mis en avant.</p></li>
    <li><b>Nous préparons la bascule</b><p>Nous reprenons vos contenus et vos coordonnées. Vous n’avez rien de technique à faire.</p></li>
    <li><b>Mise en ligne, sans coupure</b><p>Votre nom de domaine est conservé et dirigé vers le nouveau site le jour qui vous convient. Vos e-mails ne sont pas touchés.</p></li>
    <li><b>L’ancien contrat s’arrête à son terme</b><p>Nous vous indiquons la démarche de résiliation. D’ici là, vous ne payez qu’un seul abonnement : l’ancien.</p></li>
  </ol>
  <ul class="garanties"><li>Nom de domaine conservé</li><li>E-mails intacts</li><li>Aucune coupure</li><li>Rien de technique à faire</li></ul>
  <div class="actions">
    ${opts.lienSite ? `<a class="bouton" href="${esc(opts.lienSite)}">Voir votre futur site →</a>` : ''}
    ${c?.tel || c?.email ? `<a class="bouton clair" href="${c.tel ? `tel:${esc(c.tel.replace(/\s/g, ''))}` : `mailto:${esc(c.email)}`}">${c.nom ? `${esc(c.nom)} · ` : ''}${esc(c.tel || c.email)}</a>` : ''}
  </div>
</section>`;
}

/**
 * @param d mesures du site audité   @param note notation de d
 * @param opts { proposition?: { d, note, libelle }, praticien?, commercial?: { nom, tel, email }, lienSite?, ville? }
 */
export function rendreRapport(d, note, opts = {}) {
  const p = opts.proposition;
  const domaine = d.hote.replace(/^www\./, '');
  const [titreVerdict, ton] = verdict(note.globale);
  const annote = telephoneAnnote(d);
  const comptes = (d.mobile.reperes || []).reduce((m, r) => ({ ...m, [r.type]: (m[r.type] ?? 0) + 1 }), {});
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(`Audit du site ${domaine}`)}</title><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--encre:#111614;--gris:#5c6461;--trait:#e2e3df;--fond:#f4f4f1;--menthe:#cfeee3;--peche:#ffd9c2;--jaune:#fbe7a6;--lilas:#e3dcfa;--ciel:#d6e8f7;--vert:#1f7a6a;--rouge:#c0392b;--rose:#fde0dc}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#fff;color:var(--encre);font:16px/1.55 Inter,system-ui,sans-serif}
h1,h2,h3{font-family:'Bricolage Grotesque',Inter,sans-serif;letter-spacing:-.03em;line-height:1;margin:0}
em{font-style:normal}
.page{max-width:1080px;margin:0 auto;padding:0 16px}@media(min-width:760px){.page{padding:0 40px}}
.haut{display:flex;justify-content:space-between;align-items:center;padding:22px 0;border-bottom:1px solid var(--trait)}
.logo{font:800 22px 'Bricolage Grotesque',sans-serif;letter-spacing:-.03em}.logo span{color:var(--vert)}
.haut small{color:var(--gris);font-size:13px;text-align:right}
.sur{display:inline-block;background:var(--menthe);border-radius:99px;padding:5px 12px;font-size:13.5px;font-weight:600}
.sur.rouge{background:var(--rose);color:#8f2216}.sur.sombre{background:#2a3330;color:#8fe0c9}.sur.jaune{background:var(--jaune);color:var(--encre)}
.couv{padding:40px 0 32px}
.couv h1{font-weight:800;font-size:clamp(38px,6.4vw,74px);margin:16px 0 12px;overflow-wrap:anywhere}
.couv h1.rouge{color:var(--rouge)}.couv h1.orange{color:#b4610a}.couv h1.vert{color:var(--vert)}
.couv .lead{font-size:18px}
.lead{color:var(--gris);max-width:680px;margin:0}
.chiffres{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
.chiffres span{border-radius:12px;padding:10px 14px;font-weight:600;font-size:15px}
.chiffres .k{background:var(--rose);color:#8f2216}.chiffres .m{background:var(--jaune);color:#6b4a00}.chiffres .o{background:var(--fond)}
.chiffres b{font:800 22px 'Bricolage Grotesque';margin-right:6px}
.scores{display:grid;gap:16px;margin-top:28px;grid-template-columns:1fr}
@media(min-width:760px){.scores.deux{grid-template-columns:1fr 1fr}}
.carte-score{background:var(--fond);border-radius:24px;padding:24px;display:flex;gap:22px;align-items:center;color:var(--encre)}
.carte-score.actuel{background:var(--rose)}.carte-score.prop{background:var(--menthe)}
.carte-score h2{font-size:15px;font-family:Inter;letter-spacing:0;font-weight:600;color:var(--gris);margin-bottom:6px}
.carte-score .mention{font:800 30px 'Bricolage Grotesque',sans-serif;letter-spacing:-.03em}
.carte-score p{margin:6px 0 0;color:var(--gris);font-size:14px}
.anneau{flex:none;width:136px;height:136px}@media(min-width:760px){.anneau{width:160px;height:160px}}
.barres{margin-top:16px;background:#fff;border:1px solid var(--trait);border-radius:24px;padding:20px 24px}
.barre{display:grid;grid-template-columns:minmax(0,1fr) 44px;gap:4px 14px;align-items:center;padding:9px 0;border-bottom:1px solid var(--fond)}
.barre:last-of-type{border:0}.barre span{font-weight:600;font-size:14.5px}.barre b{font:800 18px 'Bricolage Grotesque';text-align:right}
.piste{grid-column:1/-1;height:8px;background:#ecece8;border-radius:9px;position:relative}
.piste i{position:absolute;left:0;top:0;bottom:0;border-radius:9px}
.piste i.pr{top:auto;bottom:-6px;height:3px;background:var(--encre)!important;opacity:.8}
.legende-barres{display:flex;gap:18px;font-size:13px;color:var(--gris);margin-top:10px}.legende-barres i{display:inline-block;width:14px;height:6px;border-radius:4px;margin-right:6px;vertical-align:middle}
section{padding:44px 0;border-top:1px solid var(--trait)}
.titre-s{font-size:clamp(30px,4.4vw,48px);font-weight:800;margin:12px 0 16px}
.titre-s em{color:var(--vert)}
.alertes{list-style:none;padding:0;margin:20px 0 0;display:grid;gap:12px}
.alertes li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:start;border-radius:18px;padding:18px 20px;font-size:17px;font-weight:500;background:var(--fond);border-left:6px solid var(--rouge)}
.alertes li.important{border-left-color:#e0a024}
.alertes .g{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-radius:99px;padding:4px 10px;background:var(--rose);color:#8f2216;white-space:nowrap}
.alertes li.important .g{background:var(--jaune);color:#6b4a00}
.forts{margin-top:18px;color:var(--gris);font-size:14.5px}.forts b{color:var(--encre)}
.annotee{display:grid;gap:28px;align-items:center}@media(min-width:820px){.annotee{grid-template-columns:auto minmax(0,1fr)}}
.tel{width:150px;background:#1b1f1d;border-radius:28px;padding:7px;box-shadow:0 30px 50px -20px rgba(17,22,20,.5)}
.tel.grand{width:280px;margin:0 auto;border-radius:40px;padding:10px}
.ecran-t{position:relative;border-radius:22px;overflow:hidden;aspect-ratio:390/844}
.tel.grand .ecran-t{border-radius:32px}
.ecran-t img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.rep{position:absolute;border:2.5px solid #e5322d;border-radius:6px;box-shadow:0 0 0 3px rgba(229,50,45,.25)}
.rep i{position:absolute;top:-11px;left:-11px;width:22px;height:22px;border-radius:50%;background:#e5322d;color:#fff;font:700 12px/22px Inter;text-align:center;font-style:normal}
.legende-rep{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.legende-rep li{display:flex;gap:12px;align-items:center;background:var(--fond);border-radius:14px;padding:12px 14px;font-weight:500}
.legende-rep i{flex:none;width:26px;height:26px;border-radius:50%;background:#e5322d;color:#fff;font:700 13px/26px Inter;text-align:center;font-style:normal}
.legende-rep small{margin-left:auto;color:var(--gris);white-space:nowrap}
.ia{background:var(--encre);color:#fff;border:0;border-radius:32px;padding:36px 24px;margin:8px 0}
@media(min-width:760px){.ia{padding:48px}}
.ia .titre-s em{color:#8fe0c9}.ia .lead{color:#c9d1cd}
.ia-grille{display:grid;gap:16px;margin-top:24px}@media(min-width:760px){.ia-grille.deux{grid-template-columns:1fr 1fr}}
.ia-carte{background:#1d2422;border-radius:22px;padding:20px}.ia-carte.prop{background:#173a32}
.ia-tete{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.ia-score{font:800 28px 'Bricolage Grotesque'}.ia-score.mauvais{color:#ff8f80}.ia-score.bon{color:#8fe0c9}
.ia-carte ul{list-style:none;margin:0;padding:0}
.ia-carte li{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #2a3330;font-size:15px}
.ia-carte li span{flex:none;width:22px;height:22px;border-radius:50%;font:700 12px/22px Inter;text-align:center}
.ia-carte li.oui span{background:#8fe0c9;color:var(--encre)}.ia-carte li.non span{background:#ff8f80;color:var(--encre)}
.ia-carte li small{margin-left:auto;color:#8fa39c}.ia-carte li.non small{color:#ff8f80}
.puces-tech{display:grid;gap:12px;margin-top:18px}@media(min-width:760px){.puces-tech{grid-template-columns:1fr 1fr}}
.puce{border-radius:18px;padding:18px 20px;background:var(--rose)}.puce.moy{background:#fff4d6}
.puce b{font:800 22px 'Bricolage Grotesque';letter-spacing:-.02em}.puce p{margin:6px 0 0;color:#3d4542;font-size:14.5px}
.grille-risques{display:grid;gap:12px}@media(min-width:760px){.grille-risques{grid-template-columns:1fr 1fr}}
.risque{border:2px solid var(--rouge);border-radius:18px;padding:18px 20px}.risque b{color:#8f2216;font-size:17px}.risque p{margin:6px 0 0;color:#3d4542}
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
.constats li{display:grid;grid-template-columns:110px minmax(0,1fr);gap:14px;align-items:start;padding:14px 16px;border-radius:16px;background:var(--fond);break-inside:avoid}
.constats li.ko{background:#fff1ef}
.constats li p{margin:2px 0 0;color:var(--gris);font-size:14.5px;overflow-wrap:anywhere}
.statut{font-size:12.5px;font-weight:600;border-radius:99px;padding:4px 10px;text-align:center}
.ok .statut{background:var(--menthe);color:#14594d}.moy .statut{background:var(--jaune);color:#6b4a00}.ko .statut{background:#fbcfc8;color:#8f2216}.nm .statut{background:#e9e9e6;color:var(--gris)}
@media(max-width:560px){.constats li{grid-template-columns:1fr;gap:6px}.statut{justify-self:start}}
.conformes{margin:10px 0 0;font-size:13.5px;color:var(--gris)}.conformes b{color:#14594d}
.contrastes{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.ech{display:flex;flex-direction:column;gap:4px;border:1px solid var(--trait);border-radius:14px;padding:10px}
.pastille{border-radius:8px;padding:8px 12px;font-size:14px;max-width:260px}.ech small{color:var(--gris);font-size:12px}
.futur{background:linear-gradient(180deg,var(--menthe),#f3fbf7 70%);border:0;border-radius:32px;padding:36px 20px;margin:8px 0}
@media(min-width:760px){.futur{padding:48px}}
.vitrine{margin:28px 0 8px;display:flex;align-items:flex-end;justify-content:center}
.portable{width:min(100%,640px)}.ecran-p{background:#1b1f1d;border-radius:14px 14px 4px 4px;padding:10px;box-shadow:0 40px 60px -30px rgba(17,22,20,.5)}
.ecran-p img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;object-position:top;border-radius:4px}
.socle{height:14px;background:linear-gradient(#d9dbd8,#b9bcb8);border-radius:0 0 18px 18px;margin:0 -5%}
.vitrine .tel{width:170px;margin-left:-70px;z-index:1}
@media(max-width:600px){.vitrine .tel{width:110px;margin-left:-44px}}
.defile img{animation:defiler 16s ease-in-out 1s infinite alternate}
@keyframes defiler{0%,8%{object-position:50% 0}92%,100%{object-position:50% 100%}}
@media(prefers-reduced-motion:reduce){.defile img{animation:none}}
.centre{text-align:center}
.bouton{display:inline-block;background:var(--encre);color:#fff;border-radius:12px;padding:14px 22px;font-weight:600;text-decoration:none}
.bouton.clair{background:transparent;color:var(--encre);box-shadow:inset 0 0 0 1.5px var(--encre)}
.benefices{display:grid;gap:12px;margin:26px 0}@media(min-width:760px){.benefices{grid-template-columns:repeat(3,1fr)}}
.benefices div{background:#fff;border-radius:18px;padding:18px}.benefices b{font:800 32px 'Bricolage Grotesque';letter-spacing:-.03em;color:var(--vert)}
.benefices p{margin:4px 0 0;color:var(--gris);font-size:14px}
.comp{width:100%;border-collapse:collapse;margin-top:6px;font-size:15px;background:#fff;border-radius:18px;overflow:hidden}
.comp th,.comp td{padding:11px 14px;border-bottom:1px solid var(--fond);text-align:left}.comp td:not(:first-child),.comp th:not(:first-child){text-align:right;width:130px}
.comp th{color:var(--gris);font-weight:500;font-size:13px}.comp b{font:800 20px 'Bricolage Grotesque'}.comp .total td{font-weight:700}
.mini{font-size:13px;color:var(--gris);margin-top:10px}
.offre-mois{background:var(--encre);color:#fff;border-radius:28px;padding:28px 24px;margin:8px 0 24px}
@media(min-width:760px){.offre-mois{padding:40px}}
.offre-mois .gros{font:800 clamp(28px,4.4vw,46px)/1.02 'Bricolage Grotesque';letter-spacing:-.03em;margin:14px 0 10px;color:#8fe0c9}
.offre-mois p{color:#c9d1cd;max-width:640px}
.etapes{list-style:none;padding:0;margin:0;display:grid;gap:12px;counter-reset:e}@media(min-width:760px){.etapes{grid-template-columns:repeat(4,1fr)}}
.etapes li{counter-increment:e;background:var(--fond);border-radius:18px;padding:18px}
.etapes li:before{content:counter(e);display:block;width:34px;height:34px;border-radius:50%;background:var(--jaune);font:800 17px/34px 'Bricolage Grotesque';text-align:center;margin-bottom:10px}
.etapes b{font-size:16.5px}.etapes p{margin:6px 0 0;color:var(--gris);font-size:14px}
.garanties{list-style:none;padding:0;margin:18px 0 0;display:flex;flex-wrap:wrap;gap:8px}
.garanties li{background:var(--menthe);border-radius:99px;padding:7px 14px;font-weight:600;font-size:14px}.garanties li:before{content:"✓ ";color:var(--vert)}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.methode{color:var(--gris);font-size:13.5px}.methode h2{font-size:22px;color:var(--encre);margin-bottom:8px}
.methode ul{padding-left:18px}
@page{size:A4;margin:12mm 0}
@media print{body{font-size:13px}.page{padding:0 14mm;max-width:none}.saut{break-before:page}section{padding:22px 0}.theme{break-inside:auto}.theme header{break-after:avoid}
.couv{padding:24px 0 14px}.scores.deux{grid-template-columns:1fr 1fr}.anneau{width:120px;height:120px}.alertes li{font-size:14.5px}
.annotee{grid-template-columns:auto minmax(0,1fr)}.tel.grand{width:230px}.ia,.futur,.offre-mois,.risque,.puce,.etapes li{break-inside:avoid}
.ia-grille.deux,.puces-tech,.grille-risques{grid-template-columns:1fr 1fr}.benefices{grid-template-columns:repeat(3,1fr)}.etapes{grid-template-columns:repeat(4,1fr)}
.portable{width:500px}.vitrine .tel{width:130px;margin-left:-56px}.defile img{animation:none}}
</style></head><body><div class="page">

<div class="haut"><div class="logo">web<span>podologue</span></div><small>Audit réalisé le ${dateFr(d.date)}${opts.commercial?.nom ? `<br>par ${esc(opts.commercial.nom)}` : ''}</small></div>

<div class="couv">
  <span class="sur ${ton === 'vert' ? '' : 'rouge'}">Audit de ${esc(domaine)}${opts.praticien ? ` · ${esc(opts.praticien)}` : ''}</span>
  <h1 class="${ton}">${esc(titreVerdict)}</h1>
  <p class="lead">Nous avons passé votre site au crible, comme le font Google, ChatGPT et vos patients : ${note.compte.ok + note.compte.attention + note.compte.echec} contrôles, mesurés le ${dateFr(d.date)}.</p>
  <div class="chiffres"><span class="k"><b>${note.compte.echec}</b>problème${note.compte.echec > 1 ? 's' : ''}</span><span class="m"><b>${note.compte.attention}</b>point${note.compte.attention > 1 ? 's' : ''} à corriger</span><span class="o"><b>${note.compte.ok}</b>conforme${note.compte.ok > 1 ? 's' : ''}</span></div>
  <div class="scores${p ? ' deux' : ''}">
    <div class="carte-score ${note.globale < 85 ? 'actuel' : ''}">${anneau(note.globale, 168, 14, '#fff')}<div><h2>Votre site aujourd’hui</h2><div class="mention" style="color:${teinte(note.globale)}">${mention(note.globale)}</div></div></div>
    ${p ? `<div class="carte-score prop">${anneau(p.note.globale, 168, 14, '#fff')}<div><h2>${esc(p.libelle || 'Votre futur site')}</h2><div class="mention" style="color:${teinte(p.note.globale)}">${mention(p.note.globale)}</div><p>Déjà prêt, mesuré avec les mêmes outils.</p></div></div>` : ''}
  </div>
  <div class="barres">${note.themes.map((t) => { const pt = p?.note.themes.find((x) => x.id === t.id); return `<div class="barre"><span>${esc(t.nom)}</span><b style="color:${teinte(t.note)}">${t.note ?? '–'}</b><div class="piste"><i style="width:${t.note ?? 0}%;background:${teinte(t.note)}"></i>${pt ? `<i class="pr" style="width:${pt.note}%"></i>` : ''}</div></div>`; }).join('')}
  ${p ? `<div class="legende-barres"><span><i style="background:#c47a12"></i>Aujourd’hui</span><span><i style="background:#111614"></i>Votre futur site</span></div>` : ''}</div>
</div>

<section class="saut">
  <h2 class="titre-s">Ce qui vous coûte des patients.</h2>
  ${note.marquants.length ? `<ol class="alertes">${note.marquants.map((m) => `<li class="${m.gravite}"><span class="g">${m.gravite === 'bloquant' ? 'Bloquant' : 'Important'}</span><span>${esc(m.phrase)}</span></li>`).join('')}</ol>` : '<p>Aucun problème majeur relevé : le site est en bonne santé.</p>'}
  ${note.forts.length ? `<p class="forts"><b>Ce qui fonctionne :</b> ${note.forts.map(esc).join(' · ')}.</p>` : ''}
</section>

<section>
  <h2 class="titre-s">Votre site, sur le téléphone d’un patient.</h2>
  <div class="annotee">
    ${annote.html}
    <div>${annote.types.length ? `<p class="lead" style="margin-bottom:14px">Premier écran, tel qu’il s’affiche sur un téléphone. Nous avons entouré ce qui gêne la lecture ou la navigation :</p>
      <ul class="legende-rep">${annote.types.map((t, i) => `<li><i>${i + 1}</i>${esc(REPERES[t])}<small>${comptes[t]} repéré${comptes[t] > 1 ? 's' : ''}</small></li>`).join('')}</ul>`
      : '<p class="lead">Aucun défaut visible dans le premier écran du téléphone.</p>'}</div>
  </div>
</section>

${blocIA(d, note, p, opts.ville || note.ville)}
${blocTechnique(note, d)}
${blocRisques(note)}

<section class="saut"><h2 class="titre-s">Le détail, point par point.</h2></section>
${note.themes.map((t, i) => blocTheme(t, i, d, p)).join('')}

${p ? blocProposition(d, note, p, opts) : ''}
${p ? blocMigration(opts) : ''}

<section class="methode">
  <h2>Méthode</h2>
  <ul>
    <li>Page d’accueil de ${esc(d.base)} analysée le ${dateFr(d.date)}, sur un téléphone simulé (390 × 844 px) et un ordinateur (1440 × 900 px).</li>
    <li>Vitesse : ${d.pagespeed.mobile?.erreur ? 'mesurée par nos soins sur un téléphone simulé en 4G lente (latence 150 ms, 1,6 Mb/s, processeur ralenti ×4), les conditions de Google PageSpeed' : 'Google PageSpeed Insights (Lighthouse), téléphone moyen en 4G simulée'}. Les notes peuvent varier de quelques points d’un test à l’autre.</li>
    <li>Accessibilité : moteur axe-core, critères WCAG 2.1 niveaux A et AA. Le test automatique ne remplace pas un audit manuel complet.</li>
    <li>IA : robots.txt, réponse au robot de recherche de ChatGPT, données structurées schema.org, texte présent sans JavaScript.</li>
    <li>Technologie : versions annoncées par le site lui-même (en-têtes du serveur, balise generator, fichiers chargés) ; fins de maintenance publiées par php.net, versions publiées par WordPress.org et jQuery.</li>
    <li>Conformité : LCEN, RGPD et recommandations de la CNIL sur les cookies, recommandations de communication de l’Ordre des pédicures-podologues.</li>
  </ul>
  <p>Audit indépendant de tout prestataire : il décrit l’état du site à la date indiquée, sans jugement sur son créateur.</p>
</section>
</div></body></html>`;
}
