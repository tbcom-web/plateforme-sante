import { createBrowserClient } from '@supabase/ssr';

/** Client Supabase côté navigateur (session de l'utilisateur connecté). */
export const createClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
