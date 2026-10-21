-- Kokorosd Entreno · Panel de inicio: avisos, información general, entregas de la regla y cuotas pendientes
-- Ejecutar DESPUÉS de 01 a 04. Se puede ejecutar una sola vez.
create table public.aviso (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 1 and 80),
  texto text check (char_length(texto) <= 500),
  creado timestamptz not null default now(),
  activo boolean not null default true
);
create table public.info_pagina (
  slug text primary key,
  titulo text not null,
  contenido text not null,
  orden int not null default 0
);
create table public.entrega_regla (          -- entregas 1 a 10 por alumno
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  numero int not null check (numero between 1 and 10),
  fecha_entrega date,
  fecha_terminada date,
  primary key (alumno_id, numero)
);
create table public.cuota_pendiente (        -- año y trimestre que debe cada alumno
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  anio int not null check (anio between 2000 and 2100),
  trimestre int not null check (trimestre between 1 and 4),
  primary key (alumno_id, anio, trimestre)
);

alter table public.aviso enable row level security;
alter table public.info_pagina enable row level security;
alter table public.entrega_regla enable row level security;
alter table public.cuota_pendiente enable row level security;

create policy "leen socios activos" on public.aviso for select to authenticated using (public.es_activo());
create policy "maestro escribe" on public.aviso for all to authenticated using (public.es_maestro()) with check (public.es_maestro());
create policy "leen socios activos" on public.info_pagina for select to authenticated using (public.es_activo());
create policy "maestro escribe" on public.info_pagina for all to authenticated using (public.es_maestro()) with check (public.es_maestro());
create policy "lee lo suyo" on public.entrega_regla for select to authenticated using (alumno_id = (select auth.uid()) or public.es_maestro());
create policy "maestro escribe" on public.entrega_regla for all to authenticated using (public.es_maestro()) with check (public.es_maestro());
create policy "lee lo suyo" on public.cuota_pendiente for select to authenticated using (alumno_id = (select auth.uid()) or public.es_maestro());
create policy "maestro escribe" on public.cuota_pendiente for all to authenticated using (public.es_maestro()) with check (public.es_maestro());

-- Permisos de acceso por la API (necesarios desde el 30-oct-2026 en tablas nuevas). RLS sigue limitando las filas.
grant select, insert, update, delete on public.aviso, public.info_pagina, public.entrega_regla, public.cuota_pendiente to authenticated;
