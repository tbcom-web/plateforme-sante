// Ambiances de cabinet : palette, typographie et formes conçues ensemble.
// Toutes les combinaisons texte/fond respectent un contraste AA (4,5:1) pour le texte courant.

export type Ambiance = {
  id: string;
  nom: string;
  esprit: string;
  couleurs: {
    fond: string; // fond de page
    surface: string; // cartes, encarts
    encre: string; // texte principal
    encreDouce: string; // texte secondaire
    principal: string; // boutons, liens (texte blanc dessus)
    accent: string; // détails, illustrations
    doux: string; // aplats, fonds de sections
    ligne: string; // bordures
  };
  polices: { titres: string; texte: string; nomTitres: string; nomTexte: string };
  titres: { graisse: number; casse: 'normale' | 'capitales'; interlettrage: string };
  rayon: { petit: string; grand: string; bouton: string };
};

export const AMBIANCES: Ambiance[] = [
  {
    id: 'canard',
    nom: 'Vert canard',
    esprit: 'Élégant et rassurant, touches de laiton',
    couleurs: {
      fond: '#f6f3ec',
      surface: '#fffdf8',
      encre: '#13302f',
      encreDouce: '#4d625f',
      principal: '#1d5856',
      accent: '#b08d57',
      doux: '#dfe7e1',
      ligne: '#d9d4c7',
    },
    polices: { titres: "'Fraunces Variable', Georgia, serif", texte: "'Inter Variable', system-ui, sans-serif", nomTitres: 'Fraunces', nomTexte: 'Inter' },
    titres: { graisse: 420, casse: 'normale', interlettrage: '-0.02em' },
    rayon: { petit: '10px', grand: '28px', bouton: '999px' },
  },
  {
    id: 'zen',
    nom: 'Pastel zen',
    esprit: 'Doux et apaisant, sauge et lin',
    couleurs: {
      fond: '#f5f2eb',
      surface: '#fbfaf6',
      encre: '#2d3934',
      encreDouce: '#5d6b64',
      principal: '#4e6a5c',
      accent: '#9fb6c6',
      doux: '#e3eadf',
      ligne: '#e0ddd3',
    },
    polices: { titres: "'Nunito Variable', system-ui, sans-serif", texte: "'Nunito Variable', system-ui, sans-serif", nomTitres: 'Nunito', nomTexte: 'Nunito' },
    titres: { graisse: 700, casse: 'normale', interlettrage: '-0.01em' },
    rayon: { petit: '20px', grand: '40px', bouton: '999px' },
  },
  {
    id: 'nordique',
    nom: 'Nordique',
    esprit: 'Épuré et design, bois clair et noir doux',
    couleurs: {
      fond: '#f4f2ee',
      surface: '#ffffff',
      encre: '#1d1d1b',
      encreDouce: '#5f5b55',
      principal: '#262624',
      accent: '#c9a47c',
      doux: '#e8e3da',
      ligne: '#dedad2',
    },
    polices: { titres: "'Inter Variable', system-ui, sans-serif", texte: "'Inter Variable', system-ui, sans-serif", nomTitres: 'Inter', nomTexte: 'Inter' },
    titres: { graisse: 500, casse: 'normale', interlettrage: '-0.035em' },
    rayon: { petit: '2px', grand: '2px', bouton: '2px' },
  },
  {
    id: 'terracotta',
    nom: 'Terracotta',
    esprit: 'Chaleureux et méditerranéen, sable et olive',
    couleurs: {
      fond: '#f7eee4',
      surface: '#fffaf3',
      encre: '#3b2a21',
      encreDouce: '#6e5a4e',
      principal: '#9a4a2f',
      accent: '#7d8150',
      doux: '#f0dcca',
      ligne: '#e6d5c4',
    },
    polices: { titres: "'Fraunces Variable', Georgia, serif", texte: "'Inter Variable', system-ui, sans-serif", nomTitres: 'Fraunces', nomTexte: 'Inter' },
    titres: { graisse: 560, casse: 'normale', interlettrage: '-0.015em' },
    rayon: { petit: '14px', grand: '200px 200px 24px 24px', bouton: '999px' },
  },
  {
    id: 'clinique',
    nom: 'Clinique moderne',
    esprit: 'Précis et médical, bleu nuit et glacier',
    couleurs: {
      fond: '#ffffff',
      surface: '#f3f7fa',
      encre: '#0e1d31',
      encreDouce: '#4a5a6e',
      principal: '#1b4d86',
      accent: '#5ba7d1',
      doux: '#e2eef7',
      ligne: '#dde6ee',
    },
    polices: { titres: "'Inter Variable', system-ui, sans-serif", texte: "'Inter Variable', system-ui, sans-serif", nomTitres: 'Inter', nomTexte: 'Inter' },
    titres: { graisse: 650, casse: 'normale', interlettrage: '-0.025em' },
    rayon: { petit: '12px', grand: '20px', bouton: '10px' },
  },
];

/** Variables CSS d'une ambiance, à poser sur <html> ou sur un conteneur. */
export function variablesAmbiance(a: Ambiance): string {
  const c = a.couleurs;
  return [
    `--fond:${c.fond}`,
    `--surface:${c.surface}`,
    `--encre:${c.encre}`,
    `--encre-douce:${c.encreDouce}`,
    `--principal:${c.principal}`,
    `--accent:${c.accent}`,
    `--doux:${c.doux}`,
    `--ligne:${c.ligne}`,
    `--police-titres:${a.polices.titres}`,
    `--police-texte:${a.polices.texte}`,
    `--graisse-titres:${a.titres.graisse}`,
    `--interlettrage-titres:${a.titres.interlettrage}`,
    `--rayon:${a.rayon.petit}`,
    `--rayon-grand:${a.rayon.grand}`,
    `--rayon-bouton:${a.rayon.bouton}`,
  ].join(';');
}
