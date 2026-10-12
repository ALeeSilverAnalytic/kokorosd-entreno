# Kokorosd Entreno

App web (PWA) de entreno para los alumnos de la Asociación Kokorosd de Silat y otras AAMM.
Herramienta interna, gratuita y sin fines de lucro.

- `index.html`, `app.css`, `app.js`: la app. El código es público y no contiene datos de nadie.
- `supabase/`: esquema SQL y datos iniciales. Las cuentas y los registros viven en Supabase, protegidos por permisos por fila.
- Acceso: alias y contraseña creados por el maestro. Internamente el alias se convierte en `alias@kokorosd.example`.

Ejercicios e imágenes: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (dominio público, Unlicense).
