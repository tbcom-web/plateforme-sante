-- Image des articles du flux : photo 16:9 (WebP 1600 × 900) et texte alternatif, pour l'affichage,
-- les aperçus de partage (og:image) et les données structurées Article.
alter table public.articles_flux add column if not exists image text not null default '';
alter table public.articles_flux add column if not exists image_alt text not null default '';
