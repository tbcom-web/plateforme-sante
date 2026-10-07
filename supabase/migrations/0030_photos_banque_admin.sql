-- Photos libres (Pexels, Pixabay) : l'admin doit pouvoir écrire dans photos/banque/ (rejouable sans risque).
-- Rétablit la version de peut_gerer_photos de 0011 (dossier « banque » réservé aux admins, en plus des dossiers de site)
-- au cas où seule la version de 0008 serait en place, et ajoute la lecture des objets du bucket « photos » pour l'admin
-- (nécessaire pour remplacer un fichier existant).

create or replace function public.peut_gerer_photos(chemin text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (split_part(chemin, '/', 1) = 'banque' and public.is_admin())
    or exists (
      select 1 from public.sites s
      where s.id::text = split_part(chemin, '/', 1)
        and (s.owner = auth.uid() or public.is_admin())
    );
$$;

grant execute on function public.peut_gerer_photos(text) to authenticated;

drop policy if exists "photos : lecture admin" on storage.objects;
create policy "photos : lecture admin" on storage.objects
  for select to authenticated using (bucket_id = 'photos' and public.peut_gerer_photos(name));
