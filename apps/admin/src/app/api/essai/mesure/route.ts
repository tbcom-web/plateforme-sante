import { clientAnonyme, estRobot } from '@/lib/capture';

// Mesure de l'entonnoir de l'essai sans traceur : la page /essai envoie un signal au chargement, compté par jour
// (fonction SQL compter_visite_essai, migration 0024). Aucun cookie, aucun identifiant, aucune IP enregistrée.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!estRobot(req.headers.get('user-agent'))) {
    const { error } = await clientAnonyme().rpc('compter_visite_essai');
    if (error && error.code !== 'PGRST202') console.error('compter_visite_essai', error.code, error.message);
  }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
