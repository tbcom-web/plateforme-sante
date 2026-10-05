// Studio portrait : détourage (MediaPipe Image Segmenter, modèle « selfie segmenter ») et détection du visage (MediaPipe
// Face Detector, modèle BlazeFace courte portée), bibliothèque @mediapipe/tasks-vision (Apache-2.0).
// Chargés À LA DEMANDE (import dynamique) à l'ouverture du studio ; WebAssembly et modèles servis par l'admin elle-même
// (public/studio-portrait, voir scripts/copier-studio.mjs) : aucun CDN, aucune photo ne quitte le navigateur.
// Calcul sur le processeur (délégué CPU) : fonctionne sans WebGL, y compris sur iPhone (Safari).
import type { FaceDetector, ImageSegmenter } from '@mediapipe/tasks-vision';
import type { Rect } from '@plateforme/core/portrait';
import { masqueInverse, redimensionnerMasque } from './pixels';

const BASE = '/studio-portrait';

type Outils = { segmenteur: ImageSegmenter; visages: FaceDetector };
let chargement: Promise<Outils> | null = null;

/** Le navigateur peut-il faire tourner le studio (WebAssembly) ? */
export const studioPossible = () => typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';

/** Charge MediaPipe et les deux modèles (une seule fois par page). */
export function chargerOutils(): Promise<Outils> {
  chargement ??= (async () => {
    if (!studioPossible()) throw new Error('WebAssembly indisponible');
    const { FilesetResolver, ImageSegmenter, FaceDetector } = await import('@mediapipe/tasks-vision');
    const fichiers = await FilesetResolver.forVisionTasks(`${BASE}/wasm`);
    const [segmenteur, visages] = await Promise.all([
      ImageSegmenter.createFromOptions(fichiers, {
        baseOptions: { modelAssetPath: `${BASE}/modeles/selfie_segmenter.tflite`, delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      }),
      FaceDetector.createFromOptions(fichiers, {
        baseOptions: { modelAssetPath: `${BASE}/modeles/blaze_face_short_range.tflite`, delegate: 'CPU' },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5,
      }),
    ]);
    return { segmenteur, visages };
  })();
  chargement.catch(() => { chargement = null; });
  return chargement;
}

/** Masque de la personne (0 à 1 par pixel), à la taille de l'image. */
export async function masquePersonne(image: HTMLCanvasElement): Promise<Float32Array> {
  const { segmenteur } = await chargerOutils();
  const resultat = segmenteur.segment(image);
  try {
    const masques = resultat.confidenceMasks ?? [];
    // Modèle à une sortie : la personne ; modèles multiclasses : la dernière classe n'est pas le fond (0)
    const m = masques.length > 1 ? masques[masques.length - 1] : masques[0];
    if (!m) throw new Error('Aucun masque');
    let v = redimensionnerMasque(m.getAsFloat32Array().slice(), m.width, m.height, image.width, image.height);
    if (masqueInverse(v, image.width, image.height)) v = v.map((x) => 1 - x);
    return v;
  } finally {
    resultat.close();
  }
}

/** Boîte du visage le plus grand (pixels), ou null. */
export async function visagePrincipal(image: HTMLCanvasElement): Promise<Rect | null> {
  const { visages } = await chargerOutils();
  const r = visages.detect(image);
  const boites = r.detections
    .filter((d) => (d.categories?.[0]?.score ?? 0) >= 0.5 && d.boundingBox)
    .map((d) => d.boundingBox!)
    .map((b) => ({ x: b.originX, y: b.originY, l: b.width, h: b.height }))
    .sort((a, b) => b.l * b.h - a.l * a.h);
  return boites[0] ?? null;
}
