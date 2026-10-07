// Rendu au canvas des animations « podoscope » et « coureur » dans l'admin (lecteur LectureAnimation.tsx) : portage fidèle des
// scripts des composants du site (apps/sites/src/components/animations/Podoscope.astro, habillage « relevé » de l'accueil, et
// Coureur.astro), mêmes modules du core (pas.ts, foulee.ts, trame.ts, charte.ts). Le temps est piloté par le lecteur (Lecture,
// Pause, Rejouer) : `dessiner(ms, anime)` ; ms = 0 et anime = false donnent l'image fixe du site (mouvements réduits).
// Si un script du site change, reporter ici le changement.
import { PRESSION, ARRETS_PRESSION, interpoler, TRAME, TRAIT, CYCLES, NEUTRES, POINTILLE, transparence } from '@plateforme/core/charte';
import { pressionPas, centrePas, PHASE_FIXE } from '@plateforme/core/pas';
import { poseCoureur, reculParCycle, type Pt } from '@plateforme/core/foulee';
import { pointsTrame } from '@plateforme/core/trame';
import { TRAJET_POINTS } from '@plateforme/core/pied';

export interface RenduCanvas {
  /** Recalcule les dimensions (taille du canvas) ; à appeler au montage et au redimensionnement */
  dimensionner(): void;
  /** Dessine l'instant `ms` (depuis le début de la lecture) ; `anime` : traces et tracés du mouvement */
  dessiner(ms: number, anime: boolean): void;
  /** Efface les traces (Rejouer) */
  reinitialiser(): void;
}

// ———————————————————————————————————————————————— Podoscope (Podoscope.astro, releve = true)

type PointPodo = { x: number; y: number; px: number; py: number; b: number; gauche: boolean };
const L_PIED = 92, H_PIED = 222; // repère du pied (pied.ts)
const NIVEAUX_POINTS = 48;

function podoscope(cv: HTMLCanvasElement): RenduCanvas {
  const ctx = cv.getContext('2d')!;
  const modele = pointsTrame('normal').map((p) => ({ x: p.x, y: p.y, b: +p.v.toFixed(2) }));
  const trajet = TRAJET_POINTS.map((p) => ({ x: +p.x.toFixed(1), y: +p.y.toFixed(1) }));
  const ratio = Math.min(2, devicePixelRatio || 1);
  const { min, max } = TRAME.diametre;
  let pts: PointPodo[] = [], pasPx = 6, l = 0, h = 0, signal = 'white';
  let palette: string[] = [...PRESSION];
  let points: { image: HTMLCanvasElement; demi: number }[] = [];
  const traces: { x: number; y: number }[][] = [[], []];
  const phase = (t: number, gauche: boolean) => PHASE_FIXE + t / CYCLES.pouls + (gauche ? 0 : 0.5);

  function preparerPoints() {
    points = [];
    for (let n = 0; n <= NIVEAUX_POINTS; n++) {
      const v = n / NIVEAUX_POINTS;
      const rayon = ((pasPx * (min + (max - min) * v)) / 2) * ratio;
      const flou = v > 0.7 ? (rayon / ratio) * 2.5 : 0;
      const demi = Math.ceil(rayon + flou * 1.5 + 1);
      const image = document.createElement('canvas');
      image.width = image.height = demi * 2;
      const c = image.getContext('2d')!;
      c.fillStyle = interpoler(palette, ARRETS_PRESSION, v);
      c.shadowColor = c.fillStyle;
      c.shadowBlur = flou;
      c.beginPath(); c.arc(demi, demi, rayon, 0, Math.PI * 2); c.fill();
      points.push({ image, demi: demi / ratio });
    }
  }

  return {
    dimensionner() {
      l = cv.clientWidth; h = cv.clientHeight;
      cv.width = l * ratio; cv.height = h * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const hauteur = Math.min(h * 0.74, l * 0.62);
      const k = hauteur / H_PIED;
      const largeur = L_PIED * k;
      pts = [];
      for (const gauche of [true, false]) {
        const ox = l / 2 + (gauche ? -largeur * 1.2 : largeur * 0.2);
        const oy = (h - hauteur) / 2 + (gauche ? hauteur * 0.04 : -hauteur * 0.04);
        for (const p of modele) pts.push({ x: ox + (gauche ? L_PIED - p.x : p.x) * k, y: oy + p.y * k, px: p.x, py: p.y, b: p.b, gauche });
      }
      pasPx = TRAME.pas * k;
      traces[0] = []; traces[1] = [];
      const style = getComputedStyle(cv);
      signal = style.getPropertyValue('--signal').trim() || 'white';
      const lue = PRESSION.map((_, n) => style.getPropertyValue(`--pression-${n + 1}`).trim());
      palette = lue.every((c) => /^#[0-9a-f]{6}$/i.test(c)) ? lue : [...PRESSION];
      preparerPoints();
    },
    reinitialiser() { traces[0] = []; traces[1] = []; },
    dessiner(t, anime) {
      if (!points.length) return;
      ctx.clearRect(0, 0, l, h);
      const somme = [[0, 0, 0], [0, 0, 0]];
      for (const p of pts) {
        const v = pressionPas(p.px, p.py, p.b, phase(t, p.gauche), trajet);
        if (v <= 0.02) continue; // pied en phase oscillante : aucune pression, aucun point
        const k = p.gauche ? 0 : 1, w = v ** 3;
        somme[k][0] += p.x * w; somme[k][1] += p.y * w; somme[k][2] += w;
        const point = points[Math.round(v * NIVEAUX_POINTS)];
        ctx.globalAlpha = 0.35 + 0.65 * v;
        ctx.drawImage(point.image, p.x - point.demi, p.y - point.demi, point.demi * 2, point.demi * 2);
      }
      ctx.globalAlpha = 1;
      if (!anime) return;
      // Centre de pression : traîne courte, point au signal (habillage « relevé » de l'accueil)
      somme.forEach(([sx, sy, sw], k) => {
        if (!sw || !centrePas(phase(t, k === 0), trajet)) { traces[k] = []; return; }
        const trace = traces[k];
        trace.push({ x: sx / sw, y: sy / sw });
        if (trace.length > 46) trace.shift();
        ctx.strokeStyle = signal; ctx.fillStyle = signal; ctx.lineWidth = TRAIT.fin * 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        trace.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.stroke();
        const fin = trace[trace.length - 1];
        ctx.beginPath(); ctx.arc(fin.x, fin.y, pasPx * 0.45, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    },
  };
}

// ———————————————————————————————————————————————— Coureur (Coureur.astro, fond sombre)

function coureur(cv: HTMLCanvasElement): RenduCanvas {
  const ctx = cv.getContext('2d')!;
  const CYCLE = CYCLES.foulee / 1000;
  const ratio = Math.min(2, devicePixelRatio || 1);
  let accent: string = PRESSION[1];
  const trait = (a: number) => transparence(NEUTRES.blanc, a);
  let l = 0, h = 0, precedent = -1;
  const traces: Record<string, Pt[]> = { cheville: [], genou: [], orteil: [] };
  const COULEURS: Record<string, string> = { cheville: PRESSION[2], genou: PRESSION[4], orteil: PRESSION[1] };
  const NIVEAUX_MARQUEURS: Record<string, number> = { cheville: 3, genou: 5, orteil: 2 };

  const segment = (a: Pt, b: Pt, largeur: number, couleur: string) => {
    ctx.strokeStyle = couleur; ctx.lineWidth = largeur; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  const chaussure = (pts: Pt[], couleur: string) => {
    const m = (i: number) => { const a = pts[i % pts.length], b = pts[(i + 1) % pts.length]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
    ctx.beginPath(); const d0 = m(0); ctx.moveTo(d0.x, d0.y);
    for (let i = 1; i <= pts.length; i++) { const p = pts[i % pts.length], q = m(i); ctx.quadraticCurveTo(p.x, p.y, q.x, q.y); }
    ctx.closePath(); ctx.fillStyle = couleur; ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = couleur; ctx.lineWidth = TRAIT.fin * 1.4; ctx.lineJoin = 'round'; ctx.stroke();
  };
  const marqueur = (p: Pt, r: number, couleur: string = NEUTRES.blanc) => {
    ctx.fillStyle = couleur; ctx.shadowColor = couleur; ctx.shadowBlur = r * 2.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  };
  const vider = () => { for (const k in traces) traces[k] = []; precedent = -1; };

  return {
    dimensionner() {
      l = cv.clientWidth; h = cv.clientHeight;
      cv.width = l * ratio; cv.height = h * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      vider();
      const style = getComputedStyle(cv);
      accent = style.getPropertyValue('--accent-pale').trim() || style.getPropertyValue('--signal').trim() || PRESSION[1];
      for (const k in NIVEAUX_MARQUEURS) COULEURS[k] = style.getPropertyValue(`--pression-${NIVEAUX_MARQUEURS[k]}`).trim() || COULEURS[k];
    },
    reinitialiser: vider,
    dessiner(ms, anime) {
      if (!l || !h) return;
      const t = 0.1 + (anime ? ms / 1000 : 0);
      const dt = precedent < 0 ? 0 : Math.min(0.05, Math.max(0, (ms - precedent) / 1000));
      precedent = ms;
      const p = (t / CYCLE) % 1;
      const taille = Math.min(h * 0.62, l * 0.9);
      const L = taille * 0.5;
      const sol = h * 0.86;
      const X = (q: Pt): Pt => ({ x: l * 0.5 + q.x, y: sol + q.y });
      const pose = poseCoureur(p, L);
      const [bassin, epaule, tete] = [X(pose.bassin), X(pose.epaule), X(pose.tete)];
      const jambe = (j: typeof pose.droite) => ({ g: X(j.genou), c: X(j.cheville), t: X(j.talon), o: X(j.orteil), ch: j.chaussure.map(X) });
      const d = jambe(pose.droite), g = jambe(pose.gauche);
      const bd = { coude: X(pose.brasDroit.coude), main: X(pose.brasDroit.main) }, bg = { coude: X(pose.brasGauche.coude), main: X(pose.brasGauche.main) };

      ctx.clearRect(0, 0, l, h);
      ctx.strokeStyle = trait(0.06); ctx.lineWidth = TRAIT.fin;
      const pas = Math.max(24, L / 4);
      for (let x = (l / 2) % pas; x < l; x += pas) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = sol % pas; y < h; y += pas) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(l, y); ctx.stroke(); }
      const vitesse = (reculParCycle(L) * L) / CYCLE;
      const tirets = [0, POINTILLE.contour.ecart * 2.5];
      ctx.strokeStyle = trait(0.35); ctx.lineWidth = TRAIT.fort; ctx.lineCap = 'round';
      ctx.setLineDash(tirets); ctx.lineDashOffset = (t * vitesse) % tirets[1];
      ctx.beginPath(); ctx.moveTo(0, sol + 2); ctx.lineTo(l, sol + 2); ctx.stroke(); ctx.setLineDash([]);

      if (anime) {
        for (const k in traces) {
          const tr = traces[k];
          for (const q of tr) q.x -= vitesse * dt;
          tr.push({ ...(k === 'cheville' ? d.c : k === 'genou' ? d.g : d.o) });
          while (tr.length && tr[0].x < l * 0.04) tr.shift();
          ctx.strokeStyle = COULEURS[k]; ctx.lineWidth = TRAIT.normal;
          for (let i = 1; i < tr.length; i++) {
            ctx.globalAlpha = (i / tr.length) * 0.8;
            ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y); ctx.lineTo(tr[i].x, tr[i].y); ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }

      const pale = trait(0.33);
      const [arriere, avant] = [TRAIT.marque * 0.85, TRAIT.marque];
      segment(epaule, bg.coude, arriere, pale); segment(bg.coude, bg.main, arriere, pale);
      segment(bassin, g.g, arriere, pale); segment(g.g, g.c, arriere, pale); chaussure(g.ch, pale);
      segment(bassin, epaule, avant, accent);
      segment(bassin, d.g, avant, accent); segment(d.g, d.c, avant, accent); chaussure(d.ch, accent);
      segment(epaule, bd.coude, avant, accent); segment(bd.coude, bd.main, avant, accent);
      ctx.strokeStyle = accent; ctx.lineWidth = arriere; ctx.beginPath(); ctx.arc(tete.x, tete.y, L * 0.085, 0, Math.PI * 2); ctx.stroke();

      for (const m of [g.g, g.c, g.o, bg.coude]) marqueur(m, 3, pale);
      marqueur(bassin, 4.5); marqueur(epaule, 4.5);
      marqueur(d.g, 4.5, COULEURS.genou); marqueur(d.c, 4.5, COULEURS.cheville); marqueur(d.o, 4, COULEURS.orteil); marqueur(bd.coude, 4);

      const a1 = Math.atan2(bassin.y - d.g.y, bassin.x - d.g.x), a2 = Math.atan2(d.c.y - d.g.y, d.c.x - d.g.x);
      ctx.strokeStyle = COULEURS.genou; ctx.lineWidth = TRAIT.normal;
      let ecart = a2 - a1;
      if (ecart > Math.PI) ecart -= 2 * Math.PI;
      if (ecart < -Math.PI) ecart += 2 * Math.PI;
      ctx.beginPath(); ctx.arc(d.g.x, d.g.y, L * 0.12, a1, a1 + ecart, ecart < 0); ctx.stroke();
    },
  };
}

/** Rendu canvas d'une animation (podoscope, coureur) ; null pour les autres */
export function renduCanvas(nom: string, cv: HTMLCanvasElement): RenduCanvas | null {
  if (nom === 'podoscope') return podoscope(cv);
  if (nom === 'coureur') return coureur(cv);
  return null;
}
