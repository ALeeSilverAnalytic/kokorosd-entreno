-- Kokorosd Entreno · Examen: cada tarea se enlaza con una sección del programa; cada alumno marca técnicas
-- completadas (separado de "dominada"), anota y cambia sus propias fechas.
-- Ejecutar DESPUÉS de 09. Se puede ejecutar una sola vez.
alter table public.examen_tarea
  add column nivel_id uuid references public.nivel(id) on delete set null,
  add column seccion text;

create table public.examen_tarea_alumno (          -- fechas propias y "hecha" por alumno
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  tarea_id uuid not null references public.examen_tarea(id) on delete cascade,
  inicio date,
  fin date,
  hecha boolean not null default false,
  primary key (alumno_id, tarea_id)
);
create table public.examen_tecnica_alumno (        -- técnicas completadas para el examen y nota propia
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  examen_id uuid not null references public.examen(id) on delete cascade,
  tecnica_id uuid not null references public.tecnica(id) on delete cascade,
  completada boolean not null default false,
  nota text check (nota is null or char_length(nota) <= 200),
  actualizado timestamptz not null default now(),
  primary key (alumno_id, examen_id, tecnica_id)
);
alter table public.examen_tarea_alumno enable row level security;
alter table public.examen_tecnica_alumno enable row level security;
create policy "gestiona lo suyo" on public.examen_tarea_alumno for all to authenticated
  using (alumno_id = (select auth.uid())) with check (alumno_id = (select auth.uid()));
create policy "maestro lee" on public.examen_tarea_alumno for select to authenticated
  using (public.es_maestro());
create policy "gestiona lo suyo" on public.examen_tecnica_alumno for all to authenticated
  using (alumno_id = (select auth.uid())) with check (alumno_id = (select auth.uid()));
create policy "maestro lee" on public.examen_tecnica_alumno for select to authenticated
  using (public.es_maestro());

-- Permiso de acceso por la API (necesario desde el 30-oct-2026 en tablas nuevas). RLS sigue limitando las filas.
grant select, insert, update, delete on public.examen_tarea_alumno to authenticated;
grant select, insert, update, delete on public.examen_tecnica_alumno to authenticated;
