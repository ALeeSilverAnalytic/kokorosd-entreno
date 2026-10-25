// Kokorosd Entreno · Función de administración de cuentas (solo la puede usar el maestro).
// Acciones: "crear" (lista de alias -> cuentas con clave temporal) y "restablecer" (nueva clave temporal).
// La clave de administrador (service role) la inyecta Supabase en el servidor; nunca sale de aquí.
import { createClient } from "npm:@supabase/supabase-js@2";

const DOMINIO = "@kokorosd.example";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Clave temporal legible: 8 caracteres sin ambiguos (sin 0/o/1/l/i), en dos grupos: abcd-efgh
function clave() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  const r = crypto.getRandomValues(new Uint8Array(8));
  const s = Array.from(r, (x) => a[x % a.length]).join("");
  return s.slice(0, 4) + "-" + s.slice(4);
}

// Tablas que acepta la importación de copias y su clave de conflicto
const IMPORTABLES: Record<string, string> = {
  asignacion: "alumno_id,rutina_id", recomendado: "alumno_id,bloque_item_id", sustitucion: "alumno_id,bloque_item_id",
  serie_registro: "id", marca_hecho: "alumno_id,bloque_item_id,fecha", progreso_tecnica: "alumno_id,tecnica_id",
  validacion_tecnica: "alumno_id,tecnica_id", grado_alumno: "alumno_id,nivel_id", grado_texto: "alumno_id,programa_id", nota_tecnica: "alumno_id,tecnica_id",
  entrega_regla: "alumno_id,numero", cuota_pendiente: "alumno_id,anio,trimestre", impreso_socio: "alumno_id", aviso: "id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Quién llama: debe ser un maestro activo
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u?.user) return json({ error: "Sesión no válida" }, 401);
  const { data: yo } = await admin.from("perfil").select("rol,activo").eq("id", u.user.id).maybeSingle();
  if (!yo || yo.rol !== "maestro" || !yo.activo) return json({ error: "Solo el maestro puede hacer esto" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Petición no válida" }, 400); }

  // 2) Crear cuentas
  if (body.accion === "crear") {
    const aliases: string[] = Array.isArray(body.aliases) ? body.aliases.slice(0, 100) : [];
    const out = [];
    for (const raw of aliases) {
      const alias = String(raw).toLowerCase().trim();
      if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(alias)) { out.push({ alias, ok: false, error: "Alias no válido" }); continue; }
      const pass = clave();
      const { error } = await admin.auth.admin.createUser({ email: alias + DOMINIO, password: pass, email_confirm: true });
      out.push(error ? { alias, ok: false, error: /already|exist|registered/i.test(error.message) ? "Ya existe" : error.message } : { alias, ok: true, clave: pass });
    }
    return json({ resultados: out });
  }

  // 3) Restablecer clave de un alumno
  if (body.accion === "restablecer") {
    const id = String(body.alumno_id ?? "");
    const { data: p } = await admin.from("perfil").select("id,rol").eq("id", id).maybeSingle();
    if (!p) return json({ error: "Alumno no encontrado" }, 404);
    if (p.rol === "maestro" && id !== u.user.id) return json({ error: "No se puede restablecer a otro maestro" }, 403);
    const pass = clave();
    const { error } = await admin.auth.admin.updateUserById(id, { password: pass });
    if (error) return json({ error: error.message }, 400);
    await admin.from("perfil").update({ debe_cambiar_clave: true }).eq("id", id);
    return json({ clave: pass });
  }

  // 4) Importar filas de una copia de seguridad (tabla en lista blanca)
  if (body.accion === "importar") {
    const t = String(body.tabla ?? "");
    const conf = IMPORTABLES[t];
    const filas: any[] = Array.isArray(body.filas) ? body.filas.slice(0, 500) : [];
    if (!conf) return json({ error: "Tabla no permitida" }, 400);
    if (!filas.length) return json({ ok: 0, fallidas: 0 });
    let r = await admin.from(t).upsert(filas, { onConflict: conf });
    if (!r.error) return json({ ok: filas.length, fallidas: 0 });
    let ok = 0, fallidas = 0;                 // si falla el bloque, se reintenta fila a fila
    for (const f of filas) {
      r = await admin.from(t).upsert(f, { onConflict: conf });
      if (r.error) fallidas++; else ok++;
    }
    return json({ ok, fallidas });
  }

  return json({ error: "Acción desconocida" }, 400);
});
