-- Kokorosd Entreno · Permite que cada alumno anote las fechas de sus propias entregas de la regla
-- Ejecutar DESPUÉS de 05. Se puede ejecutar una sola vez. El maestro sigue pudiendo editarlas todas.
create policy "gestiona lo suyo" on public.entrega_regla for all to authenticated
  using (alumno_id = (select auth.uid()) and public.es_activo())
  with check (alumno_id = (select auth.uid()) and public.es_activo());
