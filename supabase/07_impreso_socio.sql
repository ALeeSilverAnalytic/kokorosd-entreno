-- Kokorosd Entreno · Registro de "impreso de socio firmado recibido" (solo la fecha, nunca el documento)
-- Ejecutar DESPUÉS de 05. Se puede ejecutar una sola vez.
create table public.impreso_socio (
  alumno_id uuid primary key references public.perfil(id) on delete cascade,
  fecha_recibido date not null
);
alter table public.impreso_socio enable row level security;
create policy "lee lo suyo" on public.impreso_socio for select to authenticated
  using (alumno_id = (select auth.uid()) or public.es_maestro());
create policy "maestro escribe" on public.impreso_socio for all to authenticated
  using (public.es_maestro()) with check (public.es_maestro());
