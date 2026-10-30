-- Kokorosd Entreno · Sugerencias de mejora de la app: el alumno escribe, el maestro lee y borra.
-- Se puede ejecutar una sola vez.
create table public.sugerencia (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.perfil(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  creado timestamptz not null default now()
);
alter table public.sugerencia enable row level security;
create policy "alumno envia y ve las suyas" on public.sugerencia for select to authenticated
  using (alumno_id = (select auth.uid()));
create policy "alumno inserta las suyas" on public.sugerencia for insert to authenticated
  with check (alumno_id = (select auth.uid()));
create policy "maestro lee" on public.sugerencia for select to authenticated
  using (public.es_maestro());
create policy "maestro borra" on public.sugerencia for delete to authenticated
  using (public.es_maestro());
grant select, insert, delete on public.sugerencia to authenticated;
