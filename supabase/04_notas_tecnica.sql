-- Kokorosd Entreno · Notas personales por técnica (máx. 200 caracteres)
-- Ejecutar DESPUÉS de 01, 02 y 03. Se puede ejecutar una sola vez.
create table public.nota_tecnica (
  alumno_id uuid not null default auth.uid() references public.perfil(id) on delete cascade,
  tecnica_id uuid not null references public.tecnica(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 200),
  actualizado timestamptz not null default now(),
  primary key (alumno_id, tecnica_id)
);
alter table public.nota_tecnica enable row level security;
create policy "gestiona lo suyo" on public.nota_tecnica for all to authenticated
  using (alumno_id = (select auth.uid()) and public.es_activo())
  with check (alumno_id = (select auth.uid()) and public.es_activo());
create policy "maestro lee" on public.nota_tecnica for select to authenticated
  using (public.es_maestro());

-- Permiso de acceso por la API (necesario desde el 30-oct-2026 en tablas nuevas). RLS sigue limitando las filas.
grant select, insert, update, delete on public.nota_tecnica to authenticated;
