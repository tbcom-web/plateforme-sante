-- Photos des sites (accueil, cabinet, portraits) : stockage Supabase, lecture publique.
-- Chaque fichier est rangé dans un dossier au nom de l'identifiant du site : <site_id>/<fichier>.webp
-- Seul le propriétaire du site (ou un admin) peut ajouter, remplacer ou supprimer ses photos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

create or replace function public.peut_gerer_photos(chemin text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sites s
    where s.id::text = split_part(chemin, '/', 1)
      and (s.owner = auth.uid() or public.is_admin())
  );
$$;

grant execute on function public.peut_gerer_photos(text) to authenticated;

drop policy if exists "photos : ajout" on storage.objects;
drop policy if exists "photos : modification" on storage.objects;
drop policy if exists "photos : suppression" on storage.objects;

create policy "photos : ajout" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and public.peut_gerer_photos(name));

create policy "photos : modification" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and public.peut_gerer_photos(name))
  with check (bucket_id = 'photos' and public.peut_gerer_photos(name));

create policy "photos : suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and public.peut_gerer_photos(name));
