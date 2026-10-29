-- Kokorosd Entreno · Plan de examen (visible solo para los alumnos marcados por el maestro)
-- Ejecutar DESPUÉS de 08. Se puede ejecutar una sola vez.
create table public.examen (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  fecha date not null
);
create table public.examen_tarea (
  id uuid primary key default gen_random_uuid(),
  examen_id uuid not null references public.examen(id) on delete cascade,
  orden int not null,
  fase text not null default '',
  titulo text not null,
  inicio date,
  fin date,
  quien text not null default 'TODOS',
  nota text
);
create table public.examen_alumno (
  examen_id uuid not null references public.examen(id) on delete cascade,
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  primary key (examen_id, alumno_id)
);
alter table public.examen enable row level security;
alter table public.examen_tarea enable row level security;
alter table public.examen_alumno enable row level security;

create policy "ve el suyo o maestro" on public.examen for select to authenticated
  using (public.es_maestro() or exists (select 1 from public.examen_alumno ea where ea.examen_id = examen.id and ea.alumno_id = (select auth.uid())));
create policy "maestro escribe" on public.examen for all to authenticated
  using (public.es_maestro()) with check (public.es_maestro());

create policy "ve el suyo o maestro" on public.examen_tarea for select to authenticated
  using (public.es_maestro() or exists (select 1 from public.examen_alumno ea where ea.examen_id = examen_tarea.examen_id and ea.alumno_id = (select auth.uid())));
create policy "maestro escribe" on public.examen_tarea for all to authenticated
  using (public.es_maestro()) with check (public.es_maestro());

create policy "lee lo suyo" on public.examen_alumno for select to authenticated
  using (alumno_id = (select auth.uid()) or public.es_maestro());
create policy "maestro escribe" on public.examen_alumno for all to authenticated
  using (public.es_maestro()) with check (public.es_maestro());

-- Permiso de acceso por la API (necesario desde el 30-oct-2026 en tablas nuevas). RLS sigue limitando las filas.
grant select, insert, update, delete on public.examen to authenticated;
grant select, insert, update, delete on public.examen_tarea to authenticated;
grant select, insert, update, delete on public.examen_alumno to authenticated;
