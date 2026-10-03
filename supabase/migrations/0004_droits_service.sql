-- Droits du robot de publication (clé secrète = rôle service_role), qui contourne RLS.
-- Nécessaire car les nouvelles tables ne sont pas exposées automatiquement à l'API.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
