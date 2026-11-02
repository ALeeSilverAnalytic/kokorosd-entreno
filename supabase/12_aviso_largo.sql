-- Kokorosd Entreno · Avisos largos: sube el límite del texto de 500 a 2000 caracteres
alter table public.aviso drop constraint if exists aviso_texto_check;
alter table public.aviso add constraint aviso_texto_check check (char_length(texto) <= 2000);
