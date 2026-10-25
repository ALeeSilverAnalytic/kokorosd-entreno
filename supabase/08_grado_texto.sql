-- Kokorosd Entreno · Grado por texto (Silat y Boxeo: Principiante / Iniciado / Veterano). Lo fija el maestro.
-- Ejecutar DESPUÉS de 07. Se puede ejecutar una sola vez.
create table public.grado_texto (
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  programa_id uuid not null references public.programa(id) on delete cascade,
  grado text not null,
  primary key (alumno_id, programa_id)
);
alter table public.grado_texto enable row level security;
create policy "lee lo suyo" on public.grado_texto for select to authenticated
  using (alumno_id = (select auth.uid()) or public.es_maestro());
create policy "maestro escribe" on public.grado_texto for all to authenticated
  using (public.es_maestro()) with check (public.es_maestro());

grant select, insert, update, delete on public.grado_texto to authenticated;
