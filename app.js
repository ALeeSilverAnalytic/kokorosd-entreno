'use strict';
/* Kokorosd Entreno · fase 1
   Acceso con alias, rutinas asignadas, registro de series en Supabase y vista de maestro.
   La URL y la clave "publishable" son públicas por diseño: los datos los protegen las reglas por fila. */
const SB_URL = 'https://ieqnpgmhdiblfbfxacol.supabase.co';
const SB_KEY = 'sb_publishable_ZvC4adLa5PScOFl1GrfadQ_GIv620fH';
const DOMINIO = '@kokorosd.example';
const VERSION = 'v23';
const FORM_IMPRESO = 'https://forms.gle/qx2QtYunquHLNLHz9'; // enlace del Formulario de Google para subir el impreso firmado (vacío = sin botón)
const PDF_SOCIO = 'https://drive.google.com/uc?export=download&id=1oxZv3pTkijurfnZ24FoYqVkaXVRabOhK';
const PDF_VER = 'https://drive.google.com/file/d/1oxZv3pTkijurfnZ24FoYqVkaXVRabOhK/view?usp=sharing';
const TRIM = ['1.º', '2.º', '3.º', '4.º'];
const IMG = ['https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/',
             'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'];

const sb = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });

const MUS = {abdominals:'Abdomen',abductors:'Abductores',adductors:'Aductores',biceps:'Bíceps',calves:'Gemelos',chest:'Pecho',forearms:'Antebrazo',glutes:'Glúteos',hamstrings:'Isquiotibiales',lats:'Dorsal','lower back':'Lumbar','middle back':'Espalda media',neck:'Cuello',quadriceps:'Cuádriceps',shoulders:'Hombro',traps:'Trapecio',triceps:'Tríceps'};
const PROTO = {normal:'Series normales',asc:'Series ascendentes en peso, con descanso',pir:'Serie piramidal descendente, sin descanso',iso:'Isométrico, alternando piernas al fallo',alt:'Alternar: 2 abdominales por cada lumbar'};

/* ───────── utilidades ───────── */
const $ = s => document.querySelector(s);
const view = $('#view'), nav = $('#nav');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = n => String(n).replace('.', ',');
const pad = n => String(n).padStart(2, '0');
const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const dateEsY = d => new Date(d + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const dateEs = d => new Date(d + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
const lsGet = (k, d) => { try { const t = localStorage.getItem(k); return t ? JSON.parse(t) : d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) {} };
let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
const IC = {
  chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/></svg>',
  play2: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  play: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
};
const NAV = {
  inicio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>',
  hoy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  progreso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M6 16l4-5 4 3 5-7"/></svg>',
  alumnos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.3 3.3 0 010 6.4M18 14.8c2 .6 3.2 2.2 3.6 5"/></svg>',
  cuenta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4 3.8-6 8-6s7.3 2 8 6"/></svg>'
};
function imgSrc(e, i) { const p = e && e.imagenes && e.imagenes[i]; return p ? IMG[0] + p : ''; }
window.imgFail = el => { if (el.dataset.f) return; el.dataset.f = 1; el.src = el.src.replace(IMG[0], IMG[1]); };
const imgTag = (e, i, cls, alt) => `<img ${cls ? `class="${cls}"` : ''} alt="${esc(alt || '')}" src="${imgSrc(e, i)}" onerror="imgFail(this)">`;
const OKHOST = /^https:\/\/(www\.)?(youtube\.com|youtu\.be|drive\.google\.com)\//;
const rich = t => esc(t).replace(/\[([^\]]+)\]\((https:[^)\s]+|clips\/[A-Za-z0-9._-]+\.mp4)\)/g, (m, l, u) => /^clips\//.test(u) ? `<a class="vl" href="${u}" data-clip="${u}">${IC.play2}${l}</a>` : OKHOST.test(u.replace(/&amp;/g, '&')) ? `<a class="vl" href="${u}" target="_blank" rel="noopener noreferrer">${IC.play2}${l}</a>` : m);
/* reproductor de clips propios (alojados en la app) */
function cierraClip() { const m = document.getElementById('vmodal'); if (m) m.remove(); }
function abreClip(src, titulo) {
  cierraClip(); const m = document.createElement('div'); m.className = 'vmodal'; m.id = 'vmodal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', titulo || 'Clip');
  m.innerHTML = `<div class="vbox"><video src="${esc(src)}" controls playsinline autoplay loop muted preload="auto"></video><div class="vbar"><button data-vrate="1" class="on">1×</button><button data-vrate="0.5">½×</button><button data-vrate="0.25">¼×</button><button data-vclose>Cerrar</button></div></div>`;
  document.body.appendChild(m); m.querySelector('[data-vclose]').focus();
}
const q = async p => { const r = await p; if (r.error) throw r.error; return r.data || []; };
const isNet = e => !e || e.status === 0 || /fetch|network|failed|timeout/i.test(e.message || '') || e.status === 401 || e.code === 'PGRST301';

/* ───────── estado ───────── */
const S = { user: null, perfil: null, rutinas: [], rb: [], bloques: {}, items: {}, byBloque: {}, ex: {}, sust: {}, rec: {}, series: [], hechos: {}, sel: lsGet('kk_sel', {}) };
let tab = 'hoy';
let animT = null;
const stVals = { w: 20, r: 10, t: 30 };

/* ───────── cola de envíos (sin cobertura en el gimnasio) ───────── */
const OB = 'kk_outbox';
const obGet = () => lsGet(OB, []);
const obSet = a => lsSet(OB, a);
let flushing = false;
async function send(op) {
  try {
    const r = op.k === 'ins'
      ? await sb.from(op.t).upsert(op.row, { onConflict: op.conf, ignoreDuplicates: true })
      : op.k === 'ups'
        ? await sb.from(op.t).upsert(op.row, { onConflict: op.conf })
        : await sb.from(op.t).delete().match(op.m);
    if (r.error) { if (isNet(r.error)) return false; console.warn('Envío descartado', r.error); }
    return true;
  } catch (e) { return false; }
}
async function flush() {
  if (flushing || !S.user) return;
  flushing = true;
  try {
    let list = obGet();
    for (const op of list.filter(o => o.uid === S.user.id)) {
      if (!(await send(op))) { op.n = (op.n || 0) + 1; break; }
      list = list.filter(o => o !== op && JSON.stringify(o) !== JSON.stringify(op));
      obSet(list);
    }
  } finally { flushing = false; paintWho(); }
}
async function enqueue(op) {
  op.uid = S.user.id;
  if (await send(op)) { paintWho(); return true; }
  obSet([...obGet(), op]); paintWho();
  toast('Sin conexión: guardado en el móvil y se enviará solo.');
  return false;
}
const pendientes = () => S.user ? obGet().filter(o => o.uid === S.user.id).length : 0;
function paintWho() {
  if (!S.perfil) { $('#who').textContent = 'Entreno'; return; }
  const n = pendientes();
  $('#who').innerHTML = esc(S.perfil.alias) + (S.perfil.rol === 'maestro' ? ' · maestro' : '') + (n ? ` · <span class="pend">${n} sin enviar</span>` : '');
}
addEventListener('online', () => { flush(); });

/* ───────── carga de datos ───────── */
async function loadAll() {
  const uid = S.user.id, rol = S.perfil.rol;
  try {
    let rutinas;
    if (rol === 'maestro') rutinas = await q(sb.from('rutina').select('*').eq('activa', true).order('orden'));
    else {
      const asg = await q(sb.from('asignacion').select('rutina_id').eq('alumno_id', uid).eq('activa', true));
      const ids = asg.map(a => a.rutina_id);
      rutinas = ids.length ? await q(sb.from('rutina').select('*').in('id', ids).eq('activa', true).order('orden')) : [];
    }
    const rids = rutinas.map(r => r.id);
    const rb = rids.length ? await q(sb.from('rutina_bloque').select('*').in('rutina_id', rids).order('orden')) : [];
    const bids = [...new Set(rb.map(x => x.bloque_id))];
    const [bloques, items, sust, rec, series, hechos] = await Promise.all([
      bids.length ? q(sb.from('bloque_entreno').select('*').in('id', bids)) : [],
      bids.length ? q(sb.from('bloque_item').select('*').in('bloque_id', bids).order('orden')) : [],
      q(sb.from('sustitucion').select('*').eq('alumno_id', uid)),
      q(sb.from('recomendado').select('*').eq('alumno_id', uid)),
      q(sb.from('serie_registro').select('*').eq('alumno_id', uid).order('fecha', { ascending: false }).order('num_serie', { ascending: true }).limit(2000)),
      q(sb.from('marca_hecho').select('*').eq('alumno_id', uid).eq('fecha', hoy()))
    ]);
    const exIds = [...new Set([...items.map(i => i.ejercicio_id), ...sust.map(s => s.ejercicio_id), ...series.map(s => s.ejercicio_id)].filter(Boolean))];
    const ex = exIds.length ? await q(sb.from('ejercicio').select('*').in('id', exIds)) : [];
    const recursoIds = [...new Set(items.map(i => i.recurso_id).filter(Boolean))];
    const recursos = recursoIds.length ? await q(sb.from('recurso').select('*').in('id', recursoIds)) : [];
    const pack = { rutinas, rb, bloques, items, sust, rec, series, hechos, ex, recursos };
    lsSet('kk_cache', { uid, perfil: S.perfil, pack, ts: Date.now() });
    apply(pack);
    return true;
  } catch (e) {
    console.warn('Carga sin conexión', e);
    const c = lsGet('kk_cache', null);
    if (c && c.uid === uid) { apply(c.pack); toast('Sin conexión: mostrando los últimos datos guardados.'); return true; }
    throw e;
  }
}
function apply(p) {
  S.rutinas = p.rutinas; S.rb = p.rb;
  S.bloques = Object.fromEntries(p.bloques.map(b => [b.id, b]));
  S.items = Object.fromEntries(p.items.map(i => [i.id, i]));
  S.byBloque = {}; p.items.forEach(i => (S.byBloque[i.bloque_id] = S.byBloque[i.bloque_id] || []).push(i));
  Object.values(S.byBloque).forEach(l => l.sort((a, b) => a.orden - b.orden));
  S.ex = Object.fromEntries(p.ex.map(e => [e.id, e]));
  S.recursos = Object.fromEntries((p.recursos || []).map(r => [r.id, r]));
  S.sust = Object.fromEntries(p.sust.map(s => [s.bloque_item_id, s.ejercicio_id]));
  S.rec = Object.fromEntries(p.rec.map(r => [r.bloque_item_id, r]));
  S.series = p.series.slice();
  S.hechos = {}; (p.hechos || []).forEach(h => { S.hechos[h.bloque_item_id + '|' + h.fecha] = true; });
  // series pendientes de enviar también cuentan en pantalla
  obGet().filter(o => o.uid === S.user.id && o.k === 'ins' && o.t === 'serie_registro').forEach(o => { if (!S.series.some(s => s.id === o.row.id)) S.series.unshift(o.row); });
  obGet().filter(o => o.uid === S.user.id && o.k === 'ins' && o.t === 'marca_hecho').forEach(o => { S.hechos[o.row.bloque_item_id + '|' + o.row.fecha] = true; });
}

/* ───────── helpers de entreno ───────── */
const exOf = it => S.sust[it.id] || it.ejercicio_id;
const exName = id => (S.ex[id] && S.ex[id].nombre_es) || id;
const seriesDe = (exId, fecha) => S.series.filter(s => s.ejercicio_id === exId && s.fecha === fecha).sort((a, b) => a.num_serie - b.num_serie);
const seriesItemHoy = it => S.series.filter(s => s.bloque_item_id === it.id && s.fecha === hoy());
const isDone = it => it.modo === 'check' || it.tipo === 'video' ? !!S.hechos[it.id + '|' + hoy()] : seriesItemHoy(it).length >= (it.series || 1);
const diaLabel = b => /^D\d+$/.test(b.codigo) ? 'Día ' + b.codigo.slice(1) : b.codigo;
function bloquesDe(rutinaId) { return S.rb.filter(x => x.rutina_id === rutinaId).sort((a, b) => a.orden - b.orden).map(x => S.bloques[x.bloque_id]).filter(Boolean); }
const itemSub = it => it.modo === 'check' ? (it.repeticiones || '') : `${it.series || ''} × ${it.repeticiones || ''}${it.protocolo && it.protocolo !== 'normal' ? ' · ' + (PROTO[it.protocolo] || it.protocolo) : ''}`;

/* ───────── acceso ───────── */
function setNav() {
  const tabs = [['inicio', 'Inicio'], ['hoy', 'Entreno'], ['progreso', 'Mi progreso']];
  if (S.perfil && S.perfil.rol === 'maestro') tabs.push(['alumnos', 'Alumnos']);
  tabs.push(['cuenta', 'Cuenta']);
  nav.innerHTML = tabs.map(([k, l]) => `<button data-tab="${k}" aria-current="${k === tab ? 'page' : 'false'}">${NAV[k]}${l}</button>`).join('');
  nav.hidden = false;
}
function showLogin(msg) {
  clearInterval(animT); nav.hidden = true; S.user = null; S.perfil = null; paintWho();
  view.innerHTML = `<div class="login"><img class="logo-w" alt="" src="img/logo-white.png"><img class="logo-r" alt="" src="img/logo-red.png">
  <h1>Entreno Kokorosd</h1><p>Entra con el alias que te ha dado tu maestro.</p>
  ${msg ? `<div class="err" role="alert">${esc(msg)}</div>` : ''}
  <form id="f-login" autocomplete="on">
    <div class="field"><label for="alias">Alias</label><input id="alias" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required></div>
    <div class="field"><label for="clave">Contraseña</label><input id="clave" name="password" type="password" autocomplete="current-password" required></div>
    <button class="btn" type="submit">Entrar</button>
  </form><p style="margin-top:18px">¿Sin alias o contraseña? Pídeselos a tu maestro.</p></div>`;
}
const toEmail = a => { a = String(a).trim().toLowerCase().replace(/\s+/g, ''); return a.includes('@') ? a : a + DOMINIO; };
async function doLogin(alias, clave) {
  const { data, error } = await sb.auth.signInWithPassword({ email: toEmail(alias), password: clave });
  if (error) {
    if (isNet(error) && !/invalid/i.test(error.message || '')) return showLogin('No hay conexión. Comprueba tu cobertura e inténtalo otra vez.');
    return showLogin('Alias o contraseña incorrectos.');
  }
  await afterLogin(data.user);
}
async function afterLogin(user) {
  S.user = user;
  let perfil = null;
  try { const r = await sb.from('perfil').select('*').eq('id', user.id).maybeSingle(); if (r.error) throw r.error; perfil = r.data; if (perfil) lsSet('kk_perfil', perfil); }
  catch (e) { const c = lsGet('kk_perfil', null); if (c && c.id === user.id) perfil = c; }
  if (!perfil) { await sb.auth.signOut(); return showLogin('Tu cuenta aún no está lista. Avisa a tu maestro.'); }
  if (!perfil.activo) { await sb.auth.signOut(); return showLogin('Tu cuenta está dada de baja. Habla con tu maestro.'); }
  S.perfil = perfil; paintWho();
  if (perfil.debe_cambiar_clave) return showForceChange();
  try { await loadAll(); } catch (e) { return showError(e); }
  tab = 'inicio'; setNav(); go('inicio'); flush();
}
function showForceChange(msg) {
  nav.hidden = true;
  view.innerHTML = `<div class="login"><h1>Elige tu contraseña</h1><p>La que te dieron es temporal. Escribe una nueva, de al menos 8 caracteres.</p>
  ${msg ? `<div class="err" role="alert">${esc(msg)}</div>` : ''}
  <form id="f-pass" data-force="1">
    <div class="field"><label for="p1">Contraseña nueva</label><input id="p1" type="password" autocomplete="new-password" minlength="8" required></div>
    <div class="field"><label for="p2">Repítela</label><input id="p2" type="password" autocomplete="new-password" minlength="8" required></div>
    <button class="btn" type="submit">Guardar y entrar</button></form></div>`;
}
async function doChangePass(p1, p2, force) {
  const fail = m => force ? showForceChange(m) : toast(m);
  if (p1.length < 8) return fail('La contraseña debe tener al menos 8 caracteres.');
  if (p1 !== p2) return fail('Las dos contraseñas no coinciden.');
  const { error } = await sb.auth.updateUser({ password: p1 });
  if (error) return fail(/same|different/i.test(error.message) ? 'Elige una contraseña distinta de la actual.' : 'No se pudo cambiar la contraseña. Inténtalo de nuevo.');
  const r = await sb.rpc('marcar_clave_cambiada'); if (r.error) console.warn(r.error);
  S.perfil.debe_cambiar_clave = false; lsSet('kk_perfil', S.perfil);
  if (force) { try { await loadAll(); } catch (e) { return showError(e); } setNav(); go('hoy'); } else { toast('Contraseña cambiada'); }
}
function showError(e) {
  console.warn(e); nav.hidden = !S.perfil;
  view.innerHTML = `<div class="panel"><h2 style="margin-bottom:6px">No se pudo cargar</h2><p class="muted" style="margin:0 0 10px">Comprueba tu conexión e inténtalo de nuevo.</p><button class="btn sm" data-reload>Reintentar</button><button class="link" data-logout>Cerrar sesión</button></div>`;
}
async function logout() { await sb.auth.signOut(); lsDel('kk_cache'); lsDel('kk_perfil'); S.series = []; showLogin(); }

/* ───────── pantallas ───────── */
function go(t) {
  tab = t; clearInterval(animT);
  document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === t ? 'page' : 'false'));
  const f = { inicio: renderInicio, hoy: renderToday, progreso: renderProgress, alumnos: renderAlumnos, cuenta: renderCuenta }[t];
  Promise.resolve(f()).catch(showError);
  view.scrollTop = 0;
}

function renderToday() {
  const rutinas = S.rutinas;
  if (!rutinas.length) {
    view.innerHTML = `<h1>Entreno</h1><div class="panel"><h2 style="margin-bottom:6px">Aún sin rutina</h2><p class="muted" style="margin:0">Tu maestro todavía no te ha asignado una rutina. Cuando lo haga, aparecerá aquí.</p></div>`;
    return;
  }
  const rut = rutinas.find(r => r.id === S.sel.r) || rutinas[0];
  const bl = bloquesDe(rut.id);
  const dia = bl.find(b => b.id === S.sel.b) || bl[0];
  S.sel = { r: rut.id, b: dia && dia.id }; lsSet('kk_sel', S.sel);
  let h = `<h1>${esc(rut.nombre)}</h1>`;
  if (rutinas.length > 1) h += `<div class="chips" role="group" aria-label="Rutina">${rutinas.map(r => `<button data-rut="${r.id}" aria-pressed="${r.id === rut.id}">${esc(r.nombre)}</button>`).join('')}</div>`;
  if (!dia) { view.innerHTML = h + '<p class="muted">Esta rutina aún no tiene días.</p>'; return; }
  h += `<div class="days" role="group" aria-label="Día de entreno">${bl.map(b => `<button data-dia="${b.id}" aria-pressed="${b.id === dia.id}">${esc(diaLabel(b))}<small>${esc(b.nombre)}</small></button>`).join('')}</div>`;
  const items = S.byBloque[dia.id] || [];
  const done = items.filter(isDone).length;
  h += `<div class="muted">${done} de ${items.length} hechos</div><div class="prog"><i style="width:${items.length ? done / items.length * 100 : 0}%"></i></div>`;
  let cur = null;
  items.forEach(it => {
    if (it.seccion !== cur) { if (cur !== null) h += '</section>'; cur = it.seccion; const sec = items.filter(x => x.seccion === cur); h += `<section class="block"><h2>${esc(cur)}<em>${sec.filter(isDone).length}/${sec.length}</em></h2>`; }
    const d = isDone(it), star = !!S.rec[it.id];
    if (it.tipo === 'video') {
      const rc = S.recursos[it.recurso_id] || {};
      h += `<button class="item${d ? ' done' : ''}" data-open="${it.id}"><span class="play">${IC.play}</span><span class="tx"><b>${esc(rc.titulo || 'Vídeo')}</b><span>Vídeo</span></span><span class="st">${d ? IC.check : ''}</span></button>`;
      return;
    }
    const id = exOf(it), e = S.ex[id] || {};
    h += `<button class="item${d ? ' done' : ''}" data-open="${it.id}">${imgTag(e, 0, 'th', '')}<span class="tx"><b>${esc(exName(id))}</b>${it.etiqueta ? `<span>${esc(it.etiqueta)}</span>` : ''}<span>${esc(itemSub(it))}</span>${star ? `<span class="rec">${IC.star}Recomendado por el maestro</span>` : ''}</span><span class="st">${d ? IC.check : ''}</span></button>`;
  });
  if (cur !== null) h += '</section>';
  view.innerHTML = h;
}

function stepper(id, label, val, step, unit) {
  return `<div class="row"><label for="${id}">${label}</label><div class="step"><button type="button" data-st="${id}" data-d="${-step}" aria-label="Menos ${label}">−</button><output id="${id}">${fmt(val)}<small>${unit}</small></output><button type="button" data-st="${id}" data-d="${step}" aria-label="Más ${label}">+</button></div></div>`;
}
function renderExercise(itemId) {
  clearInterval(animT);
  const it = S.items[itemId]; if (!it) return go('hoy');
  if (it.tipo === 'video') {
    const rc = S.recursos[it.recurso_id] || {}; const d = isDone(it);
    view.innerHTML = `<button class="back" data-back>${IC.chev}Volver al entreno</button><h1>${esc(rc.titulo || 'Vídeo')}</h1>
    <div class="panel"><a href="${esc(rc.url || '#')}" target="_blank" rel="noopener">Abrir vídeo</a></div>
    <button class="btn${d ? ' alt' : ''}" data-check="${it.id}">${d ? 'Hecho (toca para deshacer)' : 'Marcar como hecho'}</button>`;
    return;
  }
  const id = exOf(it), e = S.ex[id] || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hoyS = seriesDe(id, hoy());
  const prev = S.series.filter(s => s.ejercicio_id === id && s.fecha < hoy());
  const lastDate = prev.reduce((m, s) => s.fecha > m ? s.fecha : m, '');
  const hist = lastDate ? seriesDe(id, lastDate) : [];
  if (it.modo === 'reps') {
    const ref = hoyS.length ? hoyS[hoyS.length - 1] : hist[hist.length - 1];
    stVals.w = ref && ref.peso_kg != null ? Number(ref.peso_kg) : 20;
    stVals.r = /^\d+$/.test(it.repeticiones || '') ? +it.repeticiones : (ref && ref.repeticiones) || 10;
  }
  if (it.modo === 'tiempo') { const m = /^(\d+)\s*s/.exec(it.repeticiones || ''); stVals.t = m ? +m[1] : 30; }
  const imgs = (e.imagenes || []);
  let h = `<button class="back" data-back>${IC.chev}Volver al entreno</button>
  <div class="anim${reduce ? ' both' : ''}" id="anim">${imgs.map((_, i) => imgTag(e, i, reduce || i === 0 ? (reduce ? '' : 'on') : '', i ? 'Posición final' : 'Posición inicial')).join('')}</div>
  <h1>${esc(exName(id))}</h1>
  <div style="margin-top:8px">${(e.musculos_principales || []).map(m => `<span class="chip p">${MUS[m] || m}</span>`).join('')}${(e.musculos_secundarios || []).filter((m, i, a) => a.indexOf(m) === i && !(e.musculos_principales || []).includes(m)).map(m => `<span class="chip">${MUS[m] || m}</span>`).join('')}</div>
  <p class="muted" style="margin:2px 0 0">Músculo principal en rojo, secundarios en gris.</p>`;
  const notas = [it.nota, S.rec[it.id] && S.rec[it.id].nota].filter(Boolean);
  if (S.rec[it.id] || notas.length) h += `<div class="note"><b>${IC.star.replace('<svg', '<svg style="width:12px;height:12px;vertical-align:-1px;margin-right:4px"')}${S.rec[it.id] ? 'Recomendado por el maestro' : 'Nota del maestro'}</b>${notas.map(esc).join('<br>') || 'Dale prioridad en tu entreno.'}</div>`;
  if (S.sust[it.id]) h += `<div class="note" style="border-left-color:var(--muted)"><b style="color:var(--muted)">Cambiado por ti</b>La propuesta del maestro era: ${esc(exName(it.ejercicio_id))}. <button class="link" style="padding:0" data-unswap="${it.id}">Volver a la del maestro</button></div>`;
  if (it.modo === 'check') {
    const d = isDone(it);
    h += `<div class="panel"><div class="row"><label>${esc(it.repeticiones || '')}</label></div><button class="btn${d ? ' alt' : ''}" data-check="${it.id}">${d ? 'Hecho (toca para deshacer)' : 'Marcar como hecho'}</button></div>`;
  } else {
    const n = seriesItemHoy(it).length;
    h += `<div class="panel"><h2 style="margin-bottom:4px">Pauta</h2><div style="font-size:16px">${esc(itemSub(it))}</div></div>
    <div class="panel"><h2>Registrar serie ${n + 1}</h2>${it.modo === 'reps' ? stepper('w', 'Peso', stVals.w, 2.5, 'kg') + stepper('r', 'Repeticiones', stVals.r, 1, '') : stepper('t', 'Tiempo', stVals.t, 5, 's')}
    <button class="btn" data-save="${it.id}">Guardar serie</button></div>`;
    const mias = seriesItemHoy(it).sort((a, b) => a.num_serie - b.num_serie);
    if (mias.length) h += `<div class="panel"><h2 style="margin-bottom:4px">Hoy</h2><ul class="sets">${mias.map((s, i) => `<li><span class="n">${i + 1}</span><span class="v">${it.modo === 'reps' ? `${fmt(Number(s.peso_kg))} kg × ${s.repeticiones}` : `${s.tiempo_seg} s`}</span><button data-del="${s.id}" aria-label="Borrar serie ${i + 1}">×</button></li>`).join('')}</ul></div>`;
    if (hist.length) h += `<div class="panel"><h2 style="margin-bottom:4px">Última vez · ${dateEs(lastDate)}</h2><div class="muted">${hist.map(s => it.modo === 'reps' ? `${fmt(Number(s.peso_kg))}×${s.repeticiones}` : `${s.tiempo_seg}s`).join('  ·  ')}</div></div>`;
    h += `<button class="btn alt sm" data-swap="${it.id}">Cambiar ejercicio</button>`;
  }
  if ((e.instrucciones || []).length) h += `<details><summary>Cómo se hace (texto original en inglés)</summary><ol>${e.instrucciones.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>`;
  view.innerHTML = h; view.scrollTop = 0;
  if (!reduce && imgs.length > 1) { let i = 0; const els = [...$('#anim').children]; animT = setInterval(() => { els[i].classList.remove('on'); i = (i + 1) % els.length; els[i].classList.add('on'); }, 1000); }
}

let swapTimer;
function renderSwap(itemId, texto) {
  clearInterval(animT);
  const it = S.items[itemId], cur = S.ex[exOf(it)] || {};
  view.innerHTML = `<button class="back" data-open="${itemId}">${IC.chev}Volver al ejercicio</button><h1>Cambiar ejercicio</h1>
  <p class="muted">Tu elección se guarda en tu cuenta. El plan del maestro no se modifica.</p>
  <div class="field"><label for="busca">Buscar por nombre</label><input id="busca" type="search" value="${esc(texto || '')}" autocomplete="off" placeholder="Ej.: press, remo, sentadilla"></div>
  <div id="res"><div class="loading">Buscando…</div></div>`;
  buscarEj(itemId, texto || '', cur);
}
async function buscarEj(itemId, texto, cur) {
  const box = $('#res'); if (!box) return;
  try {
    let rows;
    if (texto.trim()) rows = await q(sb.from('ejercicio').select('*').eq('activo', true).neq('tipo_registro', 'check').ilike('nombre_es', '%' + texto.trim() + '%').order('nombre_es').limit(40));
    else rows = await q(sb.from('ejercicio').select('*').eq('activo', true).neq('tipo_registro', 'check').overlaps('musculos_principales', cur.musculos_principales || []).order('nombre_es').limit(40));
    rows = rows.filter(r => r.id !== exOf(S.items[itemId]));
    rows.forEach(r => { S.ex[r.id] = r; });
    if ($('#res')) $('#res').innerHTML = (texto.trim() ? '' : '<h2 style="margin:6px 0 8px">Mismo músculo</h2>') + (rows.map(r => `<button class="ex-pick" data-pick="${esc(r.id)}" data-item="${itemId}">${imgTag(r, 0, '', '')}<span><b style="font-weight:600">${esc(r.nombre_es)}</b><br><span class="muted">${(r.musculos_principales || []).map(m => MUS[m] || m).join(', ')}</span></span></button>`).join('') || '<p class="muted">No hay resultados.</p>');
  } catch (e) { if ($('#res')) $('#res').innerHTML = '<p class="muted">No se pudo buscar. Comprueba tu conexión.</p>'; }
}

function chart(vals) {
  const W = 300, H = 90, p = 14, mx = Math.max(...vals.map(v => v.y)), mn = Math.min(...vals.map(v => v.y)), rg = (mx - mn) || 1;
  const X = i => p + i * (W - 2 * p) / Math.max(1, vals.length - 1), Y = y => H - p - (y - mn) / rg * (H - 2 * p - 6);
  const pts = vals.map((v, i) => [X(i), Y(v.y)]);
  return `<svg class="ch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución"><line x1="${p}" y1="${H - p}" x2="${W - p}" y2="${H - p}" stroke="var(--line)"/><polyline fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" points="${pts.map(a => a.join(',')).join(' ')}"/>${pts.map((a, i) => `<circle cx="${a[0]}" cy="${a[1]}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${i === pts.length - 1 ? 'var(--accent)' : 'var(--bg)'}" stroke="var(--accent)" stroke-width="2"/>`).join('')}${vals.map((v, i) => i === 0 || i === vals.length - 1 ? `<text x="${X(i)}" y="${H - 1}" font-size="10" fill="var(--muted)" text-anchor="${i ? 'end' : 'start'}">${dateEs(v.d)}</text>` : '').join('')}</svg>`;
}
function progresoCards(series) {
  const por = {}; series.forEach(s => { (por[s.ejercicio_id] = por[s.ejercicio_id] || []).push(s); });
  const ids = Object.keys(por);
  if (!ids.length) return '';
  return ids.map(id => {
    const fechas = {}; por[id].forEach(s => { const v = s.peso_kg != null && Number(s.peso_kg) > 0 ? Number(s.peso_kg) : (s.tiempo_seg || 0); fechas[s.fecha] = Math.max(fechas[s.fecha] || 0, v); });
    const isT = por[id].every(s => !(Number(s.peso_kg) > 0) && s.tiempo_seg);
    const vals = Object.keys(fechas).sort().map(d => ({ d, y: fechas[d] }));
    const first = vals[0].y, last = vals[vals.length - 1].y, diff = last - first;
    return `<div class="card"><div class="hd"><b>${esc(exName(id))}</b><span>${isT ? 'tiempo máx.' : 'peso máx.'}</span></div>
    <div style="display:flex;align-items:baseline;gap:8px;margin-top:4px"><span style="font-family:var(--f-display);font-size:30px;font-weight:600">${fmt(last)} ${isT ? 's' : 'kg'}</span><span class="muted" style="color:${diff > 0 ? 'var(--ok)' : 'var(--muted)'}">${diff > 0 ? '+' : ''}${fmt(Math.round(diff * 100) / 100)} desde ${dateEs(vals[0].d)}</span></div>
    ${vals.length > 1 ? chart(vals) : '<p class="muted" style="margin:6px 0 0">Guarda otra sesión para ver la evolución.</p>'}</div>`;
  }).join('');
}
function renderProgress() {
  const c = progresoCards(S.series);
  view.innerHTML = `<h1>Mi progreso</h1>` + (c || `<p class="muted" style="margin-top:12px">Aún no has registrado series. Entra en un ejercicio del entreno y guarda tu primera serie.</p>`);
}

function renderCuenta() {
  view.innerHTML = `<h1>Cuenta</h1>
  <div class="panel"><div class="row"><label>Alias</label><b>${esc(S.perfil.alias)}</b></div><div class="row"><label>Rol</label><b>${S.perfil.rol === 'maestro' ? 'Maestro' : 'Alumno'}</b></div></div>
  <div class="panel"><h2 style="margin-bottom:8px">Cambiar contraseña</h2>
  <form id="f-pass"><div class="field"><label for="p1">Contraseña nueva</label><input id="p1" type="password" autocomplete="new-password" minlength="8" required></div>
  <div class="field"><label for="p2">Repítela</label><input id="p2" type="password" autocomplete="new-password" minlength="8" required></div>
  <button class="btn sm" type="submit">Cambiar contraseña</button></form></div>
  <button class="btn alt sm" data-logout>Cerrar sesión</button>
  <div class="panel"><div class="row"><label>Versión de la app</label><b>${VERSION}</b></div><button class="btn alt sm" data-update style="margin-top:10px">Actualizar la app</button><p class="muted" style="margin:8px 0 0">Si falta algo que ya debería estar, pulsa este botón: borra la copia guardada y vuelve a descargar la última versión.</p></div>
  <div class="panel"><h2 style="margin-bottom:6px">Créditos</h2><p style="margin:0 0 8px">Imágenes e instrucciones de <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">Free Exercise DB</a>, en dominio público (Unlicense). Los textos de instrucciones están en inglés.</p><p class="muted" style="margin:0">Herramienta interna de la Asociación Kokorosd de Silat y otras AAMM. Gratuita y sin fines de lucro.</p></div>`;
}

/* ───────── vista de maestro ───────── */
const avisosPanel = avs => avs === null ? '' : `<div class="panel"><h2 style="margin-bottom:8px">Avisos</h2>
  <div class="field"><label for="av-t">Título (máx. 80)</label><input id="av-t" maxlength="80"></div>
  <div class="field"><label for="av-x">Texto (máx. 500)</label><textarea id="av-x" maxlength="500" rows="3" class="ta"></textarea></div>
  <button class="btn sm" data-avnuevo>Publicar aviso</button>
  ${avs.map(a => `<div class="kv" style="margin-top:8px"><span style="color:var(--fg)">${esc(a.titulo)}</span><button class="btn alt sm" data-avdel="${a.id}">Quitar</button></div>`).join('')}</div>`;
/* ───────── altas, claves y copia de seguridad (solo maestro) ───────── */
const GRADOS_TXT = { silat: ['Principiante', 'Iniciado', 'Veterano'], boxeo: ['Principiante', 'Iniciado', 'Veterano'] };
const BK_TABLAS = { examen_alumno: 'examen_id,alumno_id', examen_tarea_alumno: 'alumno_id,tarea_id', examen_tecnica_alumno: 'alumno_id,examen_id,tecnica_id', grado_texto: 'alumno_id,programa_id', asignacion: 'alumno_id,rutina_id', recomendado: 'alumno_id,bloque_item_id', sustitucion: 'alumno_id,bloque_item_id', serie_registro: 'id', marca_hecho: 'alumno_id,bloque_item_id,fecha', progreso_tecnica: 'alumno_id,tecnica_id', validacion_tecnica: 'alumno_id,tecnica_id', grado_alumno: 'alumno_id,nivel_id', nota_tecnica: 'alumno_id,tecnica_id', entrega_regla: 'alumno_id,numero', cuota_pendiente: 'alumno_id,anio,trimestre', impreso_socio: 'alumno_id', aviso: 'id' };
const ALTA = { prev: [], res: [], exist: new Set() };
const normAlias = t => String(t || '').split(/[\t;,]/)[0].split('@')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '');
const aliasOk = a => /^[a-z0-9][a-z0-9._-]{2,29}$/.test(a);
const urlApp = () => location.origin + location.pathname;
const msgAlta = (alias, clave) => `Hola, ya tienes tu cuenta en la app de la escuela.\nEntra en: ${urlApp()}\nAlias: ${alias}\nClave temporal: ${clave}\nAl entrar te pedirá elegir una clave tuya. Guárdala bien.`;
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch (e) {
    const t = document.createElement('textarea'); t.value = txt; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {} t.remove(); return ok;
  }
}
function descargar(nombre, texto, tipo) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function llamarAdmin(body) {
  const { data, error } = await sb.functions.invoke('admin-alumnos', { body });
  if (error) {
    let m = error.message || 'Error';
    try { const j = await error.context.json(); if (j && j.error) m = j.error; } catch (e) {}
    if (/not found|404|Failed to send/i.test(m)) m = 'La función de Supabase aún no está activada (o no responde).';
    throw new Error(m);
  }
  return data;
}
const altaPanel = () => `<div class="panel"><h2 style="margin-bottom:6px">Añadir alumnos</h2>
  <p class="muted" style="margin:0 0 10px">Pega los alias, uno por línea (puedes copiar una columna del Excel). Se pasan a minúsculas y sin acentos.</p>
  <textarea id="alta-txt" class="ta" rows="4" placeholder="maria-lopez&#10;juan.perez&#10;…" aria-label="Alias de los nuevos alumnos"></textarea>
  <button class="btn alt sm" data-alta-rev>Revisar</button><div id="alta-out" style="margin-top:10px"></div></div>`;
const copiaPanel = () => `<div class="panel"><h2 style="margin-bottom:6px">Copia de seguridad</h2>
  <p class="muted" style="margin:0 0 10px">Descarga todos los datos de los alumnos en un archivo. Guárdalo fuera del móvil (Drive, correo). No incluye las claves. Para restaurar, primero deben existir las cuentas (mismos alias).</p>
  <button class="btn sm" data-bk-export>Descargar copia</button>
  <button class="btn alt sm" data-bk-import>Importar copia</button><input type="file" id="bk-file" data-bkfile accept=".json,application/json" hidden>
  <div id="bk-out" class="muted" style="margin-top:10px"></div></div>`;
function altaRender() {
  const o = $('#alta-out'); if (!o) return;
  if (ALTA.res.length) {
    const ok = ALTA.res.filter(r => r.ok), ko = ALTA.res.filter(r => !r.ok);
    o.innerHTML = `<div class="panel" style="margin:0"><b>${ok.length} cuenta(s) creada(s)</b><p class="muted" style="margin:4px 0 10px">Las claves solo se muestran ahora. Cópialas antes de salir de esta pantalla.</p>`
      + ok.map(r => `<div class="kv"><span style="color:var(--fg)">${esc(r.alias)} · <b>${esc(r.clave)}</b></span><button class="btn alt sm" style="width:auto;padding:8px 12px" data-msg-alias="${esc(r.alias)}" data-msg-clave="${esc(r.clave)}">Copiar mensaje</button></div>`).join('')
      + (ko.length ? `<p class="muted" style="margin:10px 0 0">No creadas: ${ko.map(r => esc(r.alias) + ' (' + esc(r.error) + ')').join(', ')}</p>` : '')
      + (ok.length ? `<button class="btn sm" data-alta-copy>Copiar todas</button><button class="btn alt sm" data-alta-csv>Descargar CSV</button>` : '') + `</div>`;
    return;
  }
  const v = ALTA.prev;
  if (!v.length) { o.innerHTML = '<span class="muted">No hay ningún alias.</span>'; return; }
  const nuevos = v.filter(x => x.est === 'nuevo');
  o.innerHTML = v.map(x => `<div class="kv"><span style="color:var(--fg)">${esc(x.alias || '—')}</span><b class="${x.est === 'nuevo' ? 'okc' : 'pend'}">${x.est === 'nuevo' ? 'Nuevo' : x.est}</b></div>`).join('')
    + (nuevos.length ? `<button class="btn sm" data-alta-go>Crear ${nuevos.length} cuenta(s)</button>` : '');
}
async function renderAlumnos() {
  view.innerHTML = '<h1>Alumnos</h1><div class="loading">Cargando…</div>';
  const [al, ses, avs] = await Promise.all([
    q(sb.from('perfil').select('*').eq('rol', 'alumno').order('alias')),
    q(sb.from('serie_registro').select('alumno_id,fecha').order('fecha', { ascending: false }).limit(3000)),
    q(sb.from('aviso').select('*').eq('activo', true).order('creado', { ascending: false }).limit(10)).catch(() => null)
  ]);
  const last = {}; ses.forEach(s => { if (!last[s.alumno_id]) last[s.alumno_id] = s.fecha; });
  ALTA.exist = new Set(al.map(a => a.alias)); ALTA.prev = []; ALTA.res = [];
  view.innerHTML = `<h1>Alumnos</h1>` + `<div class="panel"><h2 style="margin-bottom:6px">Contenido</h2><p class="muted" style="margin:0 0 10px">Carga o actualiza programas y ejercicios publicados en el repositorio. Se puede repetir sin duplicar nada.</p><button class="btn sm" data-sync>Sincronizar contenido</button><div id="syncout" class="muted" style="margin-top:10px"></div></div>` + altaPanel() + copiaPanel() + avisosPanel(avs) + (al.length ? al.map(a => `<button class="stu" data-alumno="${a.id}"><span class="tx"><b>${esc(a.alias)}</b>${!a.activo ? '<span class="badge">Baja</span>' : ''}${a.debe_cambiar_clave ? '<span class="badge">Clave temporal</span>' : ''}<span class="s">${last[a.id] ? 'Último registro: ' + dateEs(last[a.id]) : 'Sin registros'}</span></span>${IC.chev.replace('M15 18l-6-6 6-6', 'M9 18l6-6-6-6')}</button>`).join('') : '<div class="panel"><p class="muted" style="margin:0">Aún no hay alumnos. Añádelos con el cuadro "Añadir alumnos".</p></div>');
}
async function exMaestroPanel(al, eids) {
  let h = '';
  for (const eid of eids) {
    const [ex] = await q(sb.from('examen').select('*').eq('id', eid)); if (!ex) continue;
    const [tr, ta, tc] = await Promise.all([q(sb.from('examen_tarea').select('*').eq('examen_id', eid).order('orden')),
      q(sb.from('examen_tarea_alumno').select('*').eq('alumno_id', al)).catch(() => []), q(sb.from('examen_tecnica_alumno').select('tecnica_id,completada,nota').eq('alumno_id', al).eq('examen_id', eid)).catch(() => [])]);
    const nids = [...new Set(tr.map(t => t.nivel_id).filter(Boolean))];
    const tecs = nids.length ? await q(sb.from('tecnica').select('id,nivel_id,seccion').in('nivel_id', nids).limit(5000)) : [];
    const hecho = new Set(tc.filter(x => x.completada).map(x => x.tecnica_id)), notas = tc.filter(x => x.nota).length, mio = Object.fromEntries(ta.map(x => [x.tarea_id, x]));
    let fase = null, tot = 0, hec = 0; h += `<h2 style="margin:18px 0 8px">Avance · ${esc(ex.nombre)}</h2><div class="panel" style="margin:0">`;
    tr.forEach(t => {
      const l = exFiltra(tecs, t.nivel_id, t.seccion);
      const o = mio[t.id] || {}, n = l.filter(x => hecho.has(x.id)).length, fin = l.length ? n === l.length : !!o.hecha; tot++; if (fin) hec++;
      if (t.fase !== fase) { fase = t.fase; h += `<div class="muted" style="margin:10px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.06em">${esc(fase)}</div>`; }
      const ini = o.inicio || t.inicio, fi = o.fin || t.fin, propia = !!(o.inicio || o.fin);
      h += `<div class="kv"><span>${esc(t.titulo)}${ini ? `<small style="display:block">${esc(exFechaTxt(ini, fi))}${propia ? ' · fecha propia' : ''}</small>` : ''}</span><b class="${fin ? 'okc' : ''}">${l.length ? n + ' de ' + l.length : fin ? 'Hecha' : 'Pendiente'}</b></div>`;
    });
    h += `<small class="muted" style="display:block;margin-top:10px">${hec} de ${tot} tareas completas · ${notas} notas propias.</small></div>`;
  }
  return h;
}
function escuelaMaestro(id, regla, cuotas, grs, progs, nivs, imp, gtx, exm, eal, exh) {
  const yr = new Date().getFullYear();
  let h = `<h2 style="margin:18px 0 8px">Grados</h2><div class="panel" style="margin:0">`;
  progs.filter(p => p.slug !== 'fisico').forEach(p => {
    if (GRADOS_TXT[p.slug]) {
      const cu = ((gtx || []).find(g => g.programa_id === p.id) || {}).grado || '';
      h += `<div class="kv"><span>${esc(p.nombre)}</span><select class="sel" data-gtxt="${p.id}" data-al="${id}" aria-label="Grado en ${esc(p.nombre)}"><option value="">Sin asignar</option>${GRADOS_TXT[p.slug].map(n => `<option value="${esc(n)}"${n === cu ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
      return;
    }
    const ns = nivs.filter(n => n.programa_id === p.id), cur = (grs.find(g => ns.some(n => n.id === g.nivel_id)) || {}).nivel_id || '';
    h += `<div class="kv"><span>${esc(p.nombre)}</span>${ns.length ? `<select class="sel" data-grado="${p.id}" data-al="${id}" aria-label="Grado en ${esc(p.nombre)}"><option value="">Sin asignar</option>${ns.map(n => `<option value="${n.id}"${n.id === cur ? ' selected' : ''}>${esc(n.nombre)}</option>`).join('')}</select>` : '<b>—</b>'}</div>`;
  });
  h += `</div>`;
  if (exm && exm.length) h += `<h2 style="margin:18px 0 8px">Examen</h2><div class="panel" style="margin:0">${exm.map(e => `<div class="kv"><span>${esc(e.nombre)} · ${dateEsY(e.fecha)}</span><select class="sel" data-exal="${e.id}" data-al="${id}" aria-label="${esc(e.nombre)}"><option value="0">No se examina</option><option value="1"${(eal || []).some(x => x.examen_id === e.id) ? ' selected' : ''}>Se examina</option></select></div>`).join('')}</div>`;
  h += exh || '';
  if (imp !== null && imp !== undefined) {
    h += `<h2 style="margin:18px 0 8px">Impreso de socio</h2><div class="panel" style="margin:0"><div class="reg"><label>Firmado recibido<input type="date" data-imp="1" data-al="${id}" value="${imp[0] ? imp[0].fecha_recibido : ''}"></label></div><small class="muted">Déjalo vacío si aún no ha llegado.</small></div>`;
  }
  if (regla !== null) {
    const rm = Object.fromEntries(regla.map(r => [r.numero, r]));
    h += `<h2 style="margin:18px 0 8px">Entregas de la regla</h2><div class="panel" style="margin:0">` + Array.from({ length: 10 }, (_, i) => { const r = rm[i + 1] || {}; return `<div class="reg"><b>${i + 1}.ª</b><label>Recibida<input type="date" data-reg="${i + 1}" data-f="e" data-al="${id}" value="${r.fecha_entrega || ''}"></label><label>Terminada<input type="date" data-reg="${i + 1}" data-f="t" data-al="${id}" value="${r.fecha_terminada || ''}"></label></div>`; }).join('') + `</div>`;
  }
  if (cuotas !== null) {
    h += `<h2 style="margin:18px 0 8px">Cuotas pendientes</h2><div class="panel" style="margin:0"><div class="chips" style="margin:0 0 10px">${cuotas.length ? cuotas.map(c => `<button data-cdel="${c.anio}-${c.trimestre}" data-al="${id}" aria-label="Quitar ${c.anio} trimestre ${c.trimestre}">${c.anio} · ${TRIM[c.trimestre - 1]} trim. ✕</button>`).join('') : '<span class="muted">Al día</span>'}</div>
    <div class="reg"><select class="sel" id="cu-a" aria-label="Año">${[yr, yr - 1, yr - 2].map(a => `<option>${a}</option>`).join('')}</select><select class="sel" id="cu-t" aria-label="Trimestre">${[1, 2, 3, 4].map(t => `<option value="${t}">${TRIM[t - 1]} trimestre</option>`).join('')}</select><button class="btn sm" data-cadd="${id}">Añadir</button></div></div>`;
  }
  return h;
}
async function renderAlumno(id) {
  view.innerHTML = '<div class="loading">Cargando…</div>';
  const [perfil, asg, rec, ser, regla, cuotas, grs, progs, nivs, imp, gtx, exm, eal] = await Promise.all([
    q(sb.from('perfil').select('*').eq('id', id)),
    q(sb.from('asignacion').select('*').eq('alumno_id', id)),
    q(sb.from('recomendado').select('*').eq('alumno_id', id)),
    q(sb.from('serie_registro').select('*').eq('alumno_id', id).order('fecha', { ascending: false }).limit(400)),
    q(sb.from('entrega_regla').select('*').eq('alumno_id', id)).catch(() => null),
    q(sb.from('cuota_pendiente').select('*').eq('alumno_id', id).order('anio').order('trimestre')).catch(() => null),
    q(sb.from('grado_alumno').select('*').eq('alumno_id', id)).catch(() => []),
    q(sb.from('programa').select('*').order('orden')).catch(() => []),
    q(sb.from('nivel').select('id,programa_id,nombre,orden').order('orden')).catch(() => []),
    q(sb.from('impreso_socio').select('fecha_recibido').eq('alumno_id', id)).catch(() => null),
    q(sb.from('grado_texto').select('*').eq('alumno_id', id)).catch(() => []),
    q(sb.from('examen').select('id,nombre,fecha').order('fecha')).catch(() => []),
    q(sb.from('examen_alumno').select('examen_id').eq('alumno_id', id)).catch(() => [])
  ]);
  const a = perfil[0]; if (!a) return go('alumnos');
  const faltan = [...new Set(ser.map(s => s.ejercicio_id))].filter(x => !S.ex[x]);
  if (faltan.length) (await q(sb.from('ejercicio').select('*').in('id', faltan))).forEach(e => { S.ex[e.id] = e; });
  let exh = ''; try { if (eal && eal.length) exh = await exMaestroPanel(id, eal.map(x => x.examen_id)); } catch (e) { console.warn(e); }
  const asignadas = new Set(asg.filter(x => x.activa).map(x => x.rutina_id));
  const recIds = new Set(rec.map(r => r.bloque_item_id));
  let h = `<button class="back" data-alumnos>${IC.chev}Alumnos</button><h1>${esc(a.alias)}</h1>
  <p class="muted" style="margin:4px 0 0">${a.activo ? 'Cuenta activa' : 'Cuenta dada de baja'}${a.debe_cambiar_clave ? ' · aún no ha cambiado la clave temporal' : ''}</p>
  <h2 style="margin:18px 0 8px">Rutinas asignadas</h2>`;
  h += S.rutinas.map(r => `<button class="tog${asignadas.has(r.id) ? ' on' : ''}" data-asig="${r.id}" data-al="${id}" data-on="${asignadas.has(r.id) ? 1 : 0}"><span class="tx">${esc(r.nombre)}<small>${bloquesDe(r.id).length} días</small></span><span class="sw">${asignadas.has(r.id) ? 'Asignada' : 'Asignar'}</span></button>`).join('') || '<p class="muted">No hay rutinas.</p>';
  const rutAs = S.rutinas.filter(r => asignadas.has(r.id));
  if (rutAs.length) {
    h += `<h2 style="margin:18px 0 8px">Recomendados ★</h2><p class="muted" style="margin:0 0 8px">Marca los ejercicios que quieres destacar a este alumno.</p>`;
    rutAs.forEach(r => bloquesDe(r.id).forEach(b => {
      h += `<h3 style="font-size:20px;margin:12px 0 6px">${esc(diaLabel(b))} · ${esc(b.nombre)}</h3>`;
      (S.byBloque[b.id] || []).filter(i => i.tipo === 'ejercicio' && i.modo !== 'check').forEach(i => {
        const on = recIds.has(i.id);
        h += `<button class="tog${on ? ' on' : ''}" data-rec="${i.id}" data-al="${id}" data-on="${on ? 1 : 0}"><span class="tx">${esc(exName(i.ejercicio_id))}<small>${esc(i.etiqueta || i.seccion)}</small></span><span class="sw">${on ? '★ Recomendado' : 'Recomendar'}</span></button>`;
      });
    }));
  }
  h += escuelaMaestro(id, regla, cuotas, grs, progs, nivs, imp, gtx, exm, eal, exh);
  h += `<h2 style="margin:18px 0 8px">Actividad reciente</h2>`;
  if (!ser.length) h += '<p class="muted">Sin registros todavía.</p>';
  else {
    const porFecha = {}; ser.forEach(s => { ((porFecha[s.fecha] = porFecha[s.fecha] || {})[s.ejercicio_id] = porFecha[s.fecha][s.ejercicio_id] || []).push(s); });
    h += `<div class="panel" style="padding:6px 14px">` + Object.keys(porFecha).sort().reverse().slice(0, 8).map(f => `<div class="sess"><b>${dateEs(f)}</b>${Object.entries(porFecha[f]).map(([ex, ss]) => `<div><span>${esc(exName(ex))}: ${ss.sort((x, y) => x.num_serie - y.num_serie).map(s => Number(s.peso_kg) > 0 || s.repeticiones ? `${fmt(Number(s.peso_kg || 0))}×${s.repeticiones}` : `${s.tiempo_seg}s`).join(' · ')}</span></div>`).join('')}</div>`).join('') + '</div>';
    h += `<h2 style="margin:18px 0 8px">Evolución</h2>` + progresoCards(ser);
  }
  try {
    const nts = await q(sb.from('nota_tecnica').select('tecnica_id,texto,actualizado').eq('alumno_id', id).order('actualizado', { ascending: false }));
    if (nts.length) {
      const ts = await q(sb.from('tecnica').select('id,titulo,codigo,nivel_id').in('id', nts.map(n => n.tecnica_id)));
      const nv = await q(sb.from('nivel').select('id,nombre'));
      h += `<h2 style="margin:18px 0 8px">Notas en técnicas</h2><div class="panel" style="padding:6px 14px">` + nts.map(n => { const t = ts.find(x => x.id === n.tecnica_id) || {}; const l = nv.find(x => x.id === t.nivel_id) || {}; return `<div class="sess"><b>${esc(l.nombre || '')} · ${esc(t.codigo || '')} ${esc(t.titulo || '')}</b><div><span>${esc(n.texto)}</span></div></div>`; }).join('') + '</div>';
    }
  } catch (e) { console.warn(e); }
  h += `<button class="btn alt sm" style="margin-top:14px" data-reset="${id}" data-alias="${esc(a.alias)}">Restablecer clave</button><div id="reset-out" style="margin-top:8px"></div>`;
  h += `<button class="btn alt sm" style="margin-top:14px" data-baja="${id}" data-act="${a.activo ? 1 : 0}">${a.activo ? 'Dar de baja a este alumno' : 'Reactivar a este alumno'}</button>`;
  view.innerHTML = h;
}

/* ───────── inicio y programas técnicos ───────── */
const P = { cargado: false, progs: [], nivs: [], tecs: [], mio: {}, val: {}, regSel: 0, grados: {}, gtxt: {}, exams: [], exT: {}, exTec: {}, notas: {}, avisos: [], infos: [], regla: {}, cuotas: [], impreso: null };
async function cargarProgramas() {
  const uid = S.user.id;
  const [progs, nivs, tecs, mio, val, gr, notas] = await Promise.all([
    q(sb.from('programa').select('*').order('orden')), q(sb.from('nivel').select('*').order('orden')),
    q(sb.from('tecnica').select('id,nivel_id,seccion,codigo,titulo,descripcion,orden').order('orden').limit(5000)),
    q(sb.from('progreso_tecnica').select('*').eq('alumno_id', uid)), q(sb.from('validacion_tecnica').select('*').eq('alumno_id', uid)),
    q(sb.from('grado_alumno').select('*').eq('alumno_id', uid).order('fecha')),
    q(sb.from('nota_tecnica').select('tecnica_id,texto').eq('alumno_id', uid)).catch(() => [])]);
  const [avisos, infos, regla, cuotas, imp, gtx] = await Promise.all([
    q(sb.from('aviso').select('*').eq('activo', true).order('creado', { ascending: false }).limit(5)).catch(() => []),
    q(sb.from('info_pagina').select('slug,titulo,orden').order('orden')).catch(() => []),
    q(sb.from('entrega_regla').select('*').eq('alumno_id', uid)).catch(() => []),
    q(sb.from('cuota_pendiente').select('*').eq('alumno_id', uid).order('anio').order('trimestre')).catch(() => []),
    q(sb.from('impreso_socio').select('fecha_recibido').eq('alumno_id', uid)).catch(() => []),
    q(sb.from('grado_texto').select('*').eq('alumno_id', uid)).catch(() => [])]);
  P.gtxt = Object.fromEntries(gtx.map(g => [g.programa_id, g.grado]));
  P.impreso = imp[0] ? imp[0].fecha_recibido : null;
  P.avisos = avisos; P.infos = infos; P.cuotas = cuotas; P.regla = Object.fromEntries(regla.map(r => [r.numero, r]));
  P.notas = Object.fromEntries(notas.map(n => [n.tecnica_id, n.texto]));
  P.progs = progs.filter(p => p.slug !== 'fisico'); P.nivs = nivs; P.tecs = tecs;
  P.mio = Object.fromEntries(mio.map(m => [m.tecnica_id, m.estado])); P.val = Object.fromEntries(val.map(v => [v.tecnica_id, v]));
  P.grados = {}; gr.forEach(g => { const n = nivs.find(x => x.id === g.nivel_id); if (n) P.grados[n.programa_id] = n; });
  P.exams = [];
  try {
    const ids = S.perfil.rol === 'maestro' ? null : (await q(sb.from('examen_alumno').select('examen_id').eq('alumno_id', uid))).map(x => x.examen_id);
    if (ids === null || ids.length) {
      let ex = await q(sb.from('examen').select('*').order('fecha')); if (ids) ex = ex.filter(e => ids.includes(e.id));
      const tr = ex.length ? await q(sb.from('examen_tarea').select('*').in('examen_id', ex.map(e => e.id)).order('orden')) : [];
      P.exams = ex.map(e => ({ ...e, tareas: tr.filter(t => t.examen_id === e.id) }));
      if (ex.length) {
        const [ta, tc] = await Promise.all([q(sb.from('examen_tarea_alumno').select('*').eq('alumno_id', uid)).catch(() => []), q(sb.from('examen_tecnica_alumno').select('*').eq('alumno_id', uid)).catch(() => [])]);
        P.exT = Object.fromEntries(ta.map(x => [x.tarea_id, x])); P.exTec = Object.fromEntries(tc.map(x => [x.examen_id + '|' + x.tecnica_id, x]));
      }
    }
  } catch (e) { console.warn(e); }
  P.cargado = true;
}
const tecsDe = nid => P.tecs.filter(t => t.nivel_id === nid);
const nDom = list => list.filter(t => P.val[t.id] || P.mio[t.id] === 'dominada').length;
const md = t => String(t || '').split('\n').filter(l => l.trim()).map(l => `<p${/^[a-d]\) /.test(l) ? ' class="ind"' : ''}>${esc(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`).join('');
const cuotaTxt = list => list.map(c => `${c.anio} · ${TRIM[c.trimestre - 1]} trim.`).join(', ');
function escuelaCard() {
  const gradoDe = p => GRADOS_TXT[p.slug] ? (P.gtxt[p.id] || '') : ((P.grados[p.id] || {}).nombre || '');
  const gr = P.progs.map(p => { const ns = P.nivs.filter(n => n.programa_id === p.id); return `<div class="kv"><span>${esc(p.nombre)}</span><b>${ns.length || GRADOS_TXT[p.slug] ? esc(gradoDe(p) || 'Sin asignar') : '—'}</b></div>`; }).join('');
  const rec = Object.values(P.regla).filter(r => r.fecha_entrega).length, ter = Object.values(P.regla).filter(r => r.fecha_terminada).length;
  const pills = Array.from({ length: 10 }, (_, i) => { const r = P.regla[i + 1] || {}, c = r.fecha_terminada ? 'ter' : r.fecha_entrega ? 'rec' : ''; return `<button class="pill ${c}${P.regSel === i + 1 ? ' sel' : ''}" data-regsel="${i + 1}" aria-label="Entrega ${i + 1}" title="${r.fecha_entrega ? 'Recibida ' + dateEs(r.fecha_entrega) : 'Pendiente'}${r.fecha_terminada ? ' · terminada ' + dateEs(r.fecha_terminada) : ''}">${i + 1}</button>`; }).join('');
  const sel = P.regSel, rs = P.regla[sel] || {};
  const ed = sel ? `<div class="reged"><b>Entrega ${sel}</b><label>Recibida<input type="date" id="rg-e" value="${rs.fecha_entrega || ''}"></label><label>Terminada<input type="date" id="rg-t" value="${rs.fecha_terminada || ''}"></label><div class="acts"><button class="btn sm" data-regsave="${sel}">Guardar</button><button class="btn alt sm" data-regclear="${sel}">Borrar</button><button class="btn alt sm" data-regclose>Cerrar</button></div></div>` : '<small class="muted">Toca un número para anotar las fechas.</small>';
  const cuo = `<div class="panel" style="margin:0 0 10px"><div class="kv"><span>Cuotas pendientes</span><b class="${P.cuotas.length ? 'pend' : 'okc'}">${P.cuotas.length ? P.cuotas.length : 'Al día'}</b></div>${P.cuotas.length ? `<small class="muted">${esc(cuotaTxt(P.cuotas))}</small>` : ''}</div>`;
  const imp = `<div class="panel" style="margin:0 0 10px"><div class="kv" style="align-items:center"><span>Impreso de socio</span>${P.impreso ? `<b class="okc">Firmado, recibido el ${dateEs(P.impreso)}</b>` : '<b class="pend">Pendiente</b>'}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><a class="btn alt sm" style="width:auto;flex:1 1 0;text-align:center" href="${PDF_SOCIO}" target="_blank" rel="noopener noreferrer">Descargar</a>${!P.impreso && FORM_IMPRESO ? `<a class="btn sm" style="width:auto;flex:1 1 0;text-align:center" href="${FORM_IMPRESO}" target="_blank" rel="noopener noreferrer">Subir firmado</a>` : ''}</div>${P.impreso ? '' : '<small class="muted" style="display:block;margin-top:8px">Descárgalo, rellénalo, fírmalo y súbelo.</small>'}</div>`;
  return cuo + imp + `<div class="panel" style="margin:0 0 10px">${gr}</div>
  <div class="panel" style="margin:0"><div class="kv"><span>Entregas de la regla</span><b>${rec} de 10 recibidas · ${ter} terminadas</b></div><div class="pills">${pills}</div>${ed}</div>`;
}
async function renderInicio() {
  view.innerHTML = '<h1>Hola, ' + esc(S.perfil.alias) + '</h1><div class="loading">Cargando…</div>';
  try { await cargarProgramas(); } catch (e) { view.innerHTML = '<h1>Hola, ' + esc(S.perfil.alias) + '</h1><div class="panel"><p class="muted" style="margin:0">No se pudo cargar. Comprueba tu conexión.</p></div>'; return; }
  const rut = S.rutinas.find(r => r.id === S.sel.r) || S.rutinas[0], bl = rut ? bloquesDe(rut.id) : [], dia = bl.find(b => b.id === S.sel.b) || bl[0];
  let h = `<h1>Hola, ${esc(S.perfil.alias)}</h1>`;
  if (P.avisos.length) h += `<h2 style="margin:18px 0 8px">Avisos</h2>` + P.avisos.map(a => `<details class="panel aviso" style="margin:0 0 8px"><summary><b>${esc(a.titulo)}</b><small class="muted">${dateEs(a.creado.slice(0, 10))}</small></summary>${a.texto ? `<p style="margin:8px 0 0">${esc(a.texto)}</p>` : ''}</details>`).join('');
  h += `<h2 style="margin:22px 0 8px">Programas técnicos</h2><div class="pgrid">` + P.progs.map(p => {
    const ns = P.nivs.filter(n => n.programa_id === p.id), all = ns.flatMap(n => tecsDe(n.id)), g = P.grados[p.id];
    return `<button class="pcard${ns.length ? '' : ' soon'}" ${ns.length ? `data-prog="${p.id}"` : 'disabled'}><b>${esc(p.nombre)}</b><small>${ns.length ? esc(g ? g.nombre : (GRADOS_TXT[p.slug] && P.gtxt[p.id]) || 'Sin grado asignado') : 'Próximamente'}</small>${ns.length ? `<span class="prog"><i style="width:${all.length ? nDom(all) / all.length * 100 : 0}%"></i></span><small>${nDom(all)} de ${all.length} técnicas</small>` : ''}</button>`;
  }).join('') + `</div>`;
  P.exams.forEach(e => { const dd = diasPara(e.fecha); h += `<h2 style="margin:22px 0 8px">${esc(e.nombre)}</h2><button class="pcard wide" data-exam="${e.id}"><span class="tx"><b>${dateEsY(e.fecha)}</b><small>${dd > 0 ? 'Faltan ' + dd + ' días' : dd === 0 ? 'Es hoy' : 'Examen realizado'} · ${e.tareas.length} tareas en el plan</small></span>${IC.chev.replace('M15 18l-6-6 6-6', 'M9 18l6-6-6-6')}</button>`; });
  h += `<h2 style="margin:22px 0 8px">Entrenamiento físico</h2>` + (rut && dia
    ? `<button class="pcard wide" data-tab="hoy"><span class="tx"><b>${esc(rut.nombre)}</b><small>${esc(diaLabel(dia))} · ${esc(dia.nombre)}</small></span>${IC.chev.replace('M15 18l-6-6 6-6', 'M9 18l6-6-6-6')}</button>`
    : `<div class="panel" style="margin:0"><p class="muted" style="margin:0">Aún no tienes rutina asignada.</p></div>`);
  h += `<h2 style="margin:22px 0 8px">Tú en la escuela</h2><div id="escuela-card">` + escuelaCard() + `</div>`;
  h += `<h2 style="margin:22px 0 8px">Info general</h2>` + P.infos.map(i => `<button class="pcard wide" data-info="${esc(i.slug)}"><span class="tx"><b>${esc(i.titulo)}</b></span>${IC.chev.replace('M15 18l-6-6 6-6', 'M9 18l6-6-6-6')}</button>`).join('');
  view.innerHTML = h;
}
async function renderInfo(slug) {
  view.innerHTML = '<div class="loading">Cargando…</div>';
  const r = await q(sb.from('info_pagina').select('*').eq('slug', slug));
  const p = r[0]; if (!p) return go('inicio');
  view.innerHTML = `<button class="back" data-tab="inicio">${IC.chev}Inicio</button><h1>${esc(p.titulo)}</h1><div class="prosa">${md(p.contenido)}</div>`;
  view.scrollTop = 0;
}
const diasPara = f => Math.round((new Date(f + 'T00:00:00') - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')) / 864e5);
/* Sección de una tarea del examen: «Sec» = toda la sección; «Sec › grupo» = solo ese grupo; «-Sec › grupo» = excluirlo; varias separadas por | */
const exFiltra = (lista, nivelId, secs) => {
  if (!nivelId) return [];
  const ent = (secs || '').split('|').map(x => x.trim()).filter(Boolean), inc = ent.filter(x => x[0] !== '-'), exc = ent.filter(x => x[0] === '-').map(x => x.slice(1).trim());
  const m = (sec, e) => e.includes(' › ') ? sec === e : sec.split(' › ')[0] === e;
  return lista.filter(x => x.nivel_id === nivelId && (!inc.length || inc.some(e => m(x.seccion, e))) && !exc.some(e => m(x.seccion, e)));
};
const exTecs = t => exFiltra(P.tecs, t.nivel_id, t.seccion);
const exF = t => { const o = P.exT[t.id] || {}; return { ini: o.inicio || t.inicio, fin: o.fin || t.fin, propia: !!(o.inicio || o.fin) }; };
const exFechaTxt = (i, f) => !i ? '' : f && f !== i ? dateEsY(i) + ' → ' + dateEsY(f) : dateEsY(i);
function exProg(e, t) { const l = exTecs(t); if (!l.length) return null; return { n: l.filter(x => (P.exTec[e.id + '|' + x.id] || {}).completada).length, m: l.length }; }
function renderExamen(id) {
  const e = P.exams.find(x => x.id === id); if (!e) return go('inicio');
  const hoy = new Date().toISOString().slice(0, 10), dd = diasPara(e.fecha);
  let h = `<button class="back" data-tab="inicio">${IC.chev}Inicio</button><h1>${esc(e.nombre)}</h1><p class="muted" style="margin:4px 0 14px">${dateEsY(e.fecha)} · ${dd > 0 ? 'faltan ' + dd + ' días' : dd === 0 ? 'es hoy' : 'examen realizado'}. Toca una tarea para ver su detalle, marcar lo completado, anotar y ajustar tus fechas.</p>`;
  let fase = null;
  e.tareas.forEach(t => {
    if (t.fase !== fase) { if (fase !== null) h += '</section>'; fase = t.fase; h += `<section class="block"><h2>${esc(fase || 'Plan')}</h2>`; }
    const f = exF(t), pg = exProg(e, t), hecha = pg ? pg.n === pg.m : (P.exT[t.id] || {}).hecha;
    const chip = hecha ? '<span class="chip ok">Completada</span>' : f.fin && f.fin < hoy ? '<span class="chip">Vencida</span>' : f.ini && f.ini <= hoy ? '<span class="chip pr">En curso</span>' : '';
    h += `<button class="pcard wide" style="margin:0 0 6px" data-ex="${e.id}" data-extarea="${t.id}"><span class="tx"><b>${esc(t.titulo)}</b><small>${esc(exFechaTxt(f.ini, f.fin))}${f.propia ? ' · tu fecha' : ''}${pg ? ' · ' + pg.n + ' de ' + pg.m + ' completadas' : ''}${t.quien && t.quien !== 'TODOS' ? ' · ' + esc(t.quien) : ''}</small></span>${chip}</button>`;
  });
  if (fase !== null) h += '</section>';
  view.innerHTML = h;
}
function renderExamenTarea(eid, tid) {
  const e = P.exams.find(x => x.id === eid), t = e && e.tareas.find(x => x.id === tid); if (!t) return go('inicio');
  const f = exF(t), o = P.exT[tid] || {}, l = exTecs(t);
  let h = `<button class="back" data-exam="${eid}">${IC.chev}${esc(e.nombre)}</button><h1>${esc(t.titulo)}</h1>${t.nota ? `<p class="muted" style="margin:4px 0 8px">${esc(t.nota)}</p>` : ''}`;
  h += `<div class="panel"><div class="reg"><label>Inicio<input type="date" id="ex-i" value="${f.ini || ''}"></label><label>Fin<input type="date" id="ex-f" value="${f.fin || ''}"></label></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn sm" data-exfsave="${tid}" data-ex="${eid}">Guardar mis fechas</button>${f.propia ? `<button class="btn alt sm" data-exfreset="${tid}" data-ex="${eid}">Volver a la fecha del plan</button>` : ''}</div><small class="muted" style="display:block;margin-top:8px">Plan: ${esc(exFechaTxt(t.inicio, t.fin) || 'sin fecha')}. Tus cambios solo afectan a tu copia.</small></div>`;
  if (!l.length) h += `<button class="tog${o.hecha ? ' on' : ''}" data-exhecha="${tid}" data-ex="${eid}"><span class="tx">${o.hecha ? 'Hecha' : 'Marcar como hecha'}</span></button>`;
  else {
    const n = l.filter(x => (P.exTec[eid + '|' + x.id] || {}).completada).length;
    h += `<p class="muted" style="margin:10px 0 8px">${n} de ${l.length} completadas. Toca una técnica para marcarla; esto es aparte de «dominada» de los programas.</p>`;
    let sec = null, sub = null;
    l.forEach(x => {
      const [a, b] = x.seccion.split(' › ');
      if (a !== sec) { if (sec !== null) h += '</section>'; sec = a; sub = null; h += `<section class="block"><h2>${esc(a)}</h2>`; }
      if (b && b !== sub) { sub = b; h += `<h3 class="sub">${esc(b)}</h3>`; }
      const r = P.exTec[eid + '|' + x.id] || {}, k = eid + '|' + x.id;
      h += `<div class="tecw"><div class="tec${r.completada ? ' val' : ''}" role="button" tabindex="0" data-extec="${x.id}" data-ex="${eid}" data-extarea="${tid}" data-exact="1"><span class="cod">${esc(x.codigo || '·')}</span><span class="tx">${rich(x.titulo)}</span>${r.completada ? '<span class="chip ok">Completada</span>' : ''}</div><button class="nbtn${r.nota ? ' on' : ''}" data-exnb="${x.id}" aria-label="Nota de la técnica ${esc(x.codigo || '')}" aria-expanded="false"><svg width="18" height="18" viewBox="0 0 24 24" fill="${r.nota ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3h14v14l-5 4H5z"/><path d="M14 21v-4h5"/></svg></button><div class="nbox" id="exnb-${x.id}" hidden><textarea maxlength="200" rows="2" data-exnotatxt="${esc(k)}" placeholder="Tu nota para el examen (máx. 200 caracteres)">${esc(r.nota || '')}</textarea><small class="muted">Solo la ves tú y tu maestro.</small></div></div>`;
    });
    if (sec !== null) h += '</section>';
  }
  view.innerHTML = h;
}
async function exGuarda(tabla, conf, row) { return enqueue({ k: 'ups', t: tabla, conf, row: { alumno_id: S.user.id, ...row } }); }
async function exToggleTec(eid, tid, tarea) {
  const k = eid + '|' + tid, cur = P.exTec[k] || {}, nv = !cur.completada;
  P.exTec[k] = { ...cur, completada: nv };
  const y = view.scrollTop; renderExamenTarea(eid, tarea); view.scrollTop = y;
  await exGuarda('examen_tecnica_alumno', 'alumno_id,examen_id,tecnica_id', { examen_id: eid, tecnica_id: tid, completada: nv, nota: cur.nota || null, actualizado: new Date().toISOString() });
}
async function exFechas(eid, tid, reset) {
  const o = P.exT[tid] || {};
  const row = reset ? { tarea_id: tid, inicio: null, fin: null, hecha: !!o.hecha } : { tarea_id: tid, inicio: $('#ex-i').value || null, fin: $('#ex-f').value || null, hecha: !!o.hecha };
  if (!reset && row.inicio && row.fin && row.fin < row.inicio) return toast('El fin no puede ser anterior al inicio.');
  P.exT[tid] = { ...o, ...row, alumno_id: S.user.id }; renderExamenTarea(eid, tid); toast(reset ? 'Fechas del plan restauradas' : 'Fechas guardadas');
  await exGuarda('examen_tarea_alumno', 'alumno_id,tarea_id', row);
}
async function exHecha(eid, tid) {
  const o = P.exT[tid] || {}, nv = !o.hecha; P.exT[tid] = { ...o, hecha: nv, alumno_id: S.user.id }; renderExamenTarea(eid, tid);
  await exGuarda('examen_tarea_alumno', 'alumno_id,tarea_id', { tarea_id: tid, inicio: o.inicio || null, fin: o.fin || null, hecha: nv });
}
function renderPrograma(pid) {
  const p = P.progs.find(x => x.id === pid); if (!p) return go('inicio');
  const ns = P.nivs.filter(n => n.programa_id === pid), g = P.grados[pid];
  let h = `<button class="back" data-tab="inicio">${IC.chev}Inicio</button><h1>${esc(p.nombre)}</h1><p class="muted" style="margin:4px 0 14px">${g || P.gtxt[pid] ? 'Tu grado: ' + esc(g ? g.nombre : P.gtxt[pid]) : 'Aún sin grado asignado'}</p>`;
  h += ns.map(n => {
    const l = tecsDe(n.id), t = (n.detalle || {}).tiempo_minimo_antes_examen || {};
    return `<button class="pcard wide" data-niv="${n.id}"><span class="tx"><b>${esc(n.nombre)}${g && g.id === n.id ? '<span class="badge">Tu grado</span>' : ''}</b><small>${nDom(l)} de ${l.length} técnicas${t.meses_adultos ? ` · mínimo ${t.meses_adultos} meses (adultos)` : ''}</small><span class="prog" style="margin:8px 0 0"><i style="width:${l.length ? nDom(l) / l.length * 100 : 0}%"></i></span></span>${IC.chev.replace('M15 18l-6-6 6-6', 'M9 18l6-6-6-6')}</button>`;
  }).join('');
  view.innerHTML = h; view.scrollTop = 0;
}
const EST = { practicando: ['Practicando', 'pr'], dominada: ['Dominada', 'dom'] };
function renderNivel(nid) {
  const n = P.nivs.find(x => x.id === nid); if (!n) return go('inicio');
  const l = tecsDe(nid);
  let h = `<button class="back" data-prog="${n.programa_id}">${IC.chev}${esc((P.progs.find(p => p.id === n.programa_id) || {}).nombre || 'Programa')}</button><h1>${esc(n.nombre)}</h1><p class="muted" style="margin:4px 0 8px">${nDom(l)} de ${l.length} técnicas. Toca una técnica para cambiar su estado: sin marcar, practicando, dominada.</p>`;
  const dt = n.detalle || {};
  if (dt.virtud) h += `<div class="panel nivdet"><b>Virtud: ${esc(dt.virtud)}</b>${[['Trabajo base', dt.trabajo_base], ['Actitudes', dt.actitudes], ['Pensamientos correctos', dt.pensamientos], ['Hitos', dt.hitos], ['Defectos', dt.defectos]].filter(x => x[1]).map(x => `<div><span>${x[0]}:</span> ${esc(x[1])}</div>`).join('')}${dt.intro ? `<p class="muted">${esc(dt.intro)}</p>` : ''}</div>`;
const matChips = k => ((dt.material || {})[k] || []).map(m => `<a class="vl" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${esc(m.titulo)}</a>`).join('');
  if (matChips('_')) h += `<div class="panel nivdet"><b>Teoría y material de apoyo</b><div>${matChips('_')}</div></div>`;
  const grupos = []; l.forEach(t => { let g = grupos[grupos.length - 1]; if (!g || g.k !== t.seccion) { g = { k: t.seccion, l: [] }; grupos.push(g); } g.l.push(t); });
  let sec = null;
  grupos.forEach(g => {
    const [a, b] = g.k.split(' › ');
    if (a !== sec) { if (sec !== null) h += '</section>'; sec = a; const vu = (dt.videos || {})[a]; h += `<section class="block"><h2>${esc(a)}</h2>${vu ? `<a class="vl vsec" href="${vu}" target="_blank" rel="noopener noreferrer">${IC.play2}Ver vídeo de ${esc(a.toLowerCase())}</a>` : ''}${matChips(a) ? `<div style="margin:0 0 10px">${matChips(a)}</div>` : ''}`; }
    if (b) h += `<h3 class="sub">${esc(b)}${g.l[0].descripcion ? `<small>${esc(g.l[0].descripcion)}</small>` : ''}</h3>`;
    g.l.forEach(t => {
      const v = P.val[t.id], e = EST[P.mio[t.id]];
      const nt = P.notas[t.id];
      h += `<div class="tecw"><div class="tec${v ? ' val' : ''}" role="button" tabindex="0" data-tec="${t.id}"><span class="cod">${esc(t.codigo || '·')}</span><span class="tx">${rich(t.titulo)}</span>${v ? '<span class="chip ok">Validada</span>' : e ? `<span class="chip ${e[1]}">${e[0]}</span>` : ''}</div><button class="nbtn${nt ? ' on' : ''}" data-nota="${t.id}" aria-label="Nota de la técnica ${esc(t.codigo || '')}" aria-expanded="false"><svg width="18" height="18" viewBox="0 0 24 24" fill="${nt ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3h14v14l-5 4H5z"/><path d="M14 21v-4h5"/></svg></button><div class="nbox" id="nb-${t.id}" hidden><textarea maxlength="200" rows="2" data-notatxt="${t.id}" placeholder="Tu nota (máx. 200 caracteres)">${esc(nt || '')}</textarea><small class="muted">Solo la ves tú y tu maestro.</small></div></div>`;
    });
  });
  if (sec !== null) h += '</section>';
  view.innerHTML = h;
}
async function ciclarTecnica(id) {
  const orden = [undefined, 'practicando', 'dominada'], cur = P.mio[id], nx = orden[(orden.indexOf(cur) + 1) % 3];
  if (nx) P.mio[id] = nx; else delete P.mio[id];
  const y = view.scrollTop, t = P.tecs.find(x => x.id === id); renderNivel(t.nivel_id); view.scrollTop = y;
  await enqueue(nx ? { k: 'ups', t: 'progreso_tecnica', conf: 'alumno_id,tecnica_id', row: { alumno_id: S.user.id, tecnica_id: id, estado: nx, actualizado: new Date().toISOString() } } : { k: 'del', t: 'progreso_tecnica', m: { alumno_id: S.user.id, tecnica_id: id } });
}

/* ───────── sincronizar contenido (solo maestro) ───────── */
async function sincronizar(log) {
  const get = async f => { const r = await fetch('content/' + f + '?v=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error('No se pudo leer ' + f); return r.json(); };
  const idx = await get('index.json'); let progs = {};
  for (const f of idx.files) {
    const c = await get(f);
    for (const op of c.ops) {
      let rows = op.rows;
      if (op.t === 'nivel') {
        if (!Object.keys(progs).length) (await q(sb.from('programa').select('id,slug'))).forEach(p => { progs[p.slug] = p.id; });
        rows = rows.map(r => { const { programa_slug, ...o } = r; if (!progs[programa_slug]) throw new Error('Falta el programa ' + programa_slug); return { ...o, programa_id: progs[programa_slug] }; });
      }
      if (op.t === 'examen_tarea') {
        const ex = Object.fromEntries((await q(sb.from('examen').select('id,slug'))).map(e => [e.slug, e.id]));
        const pr = Object.fromEntries((await q(sb.from('programa').select('id,slug'))).map(p => [p.slug, p.id]));
        const nv = {}; (await q(sb.from('nivel').select('id,codigo,programa_id'))).forEach(n => { nv[n.programa_id + '|' + n.codigo] = n.id; });
        rows = rows.map(r => {
          const { examen_slug, programa_slug, nivel_codigo, ...o } = r; if (!ex[examen_slug]) throw new Error('Falta el examen ' + examen_slug);
          const nid = nivel_codigo ? nv[pr[programa_slug] + '|' + nivel_codigo] : null; if (nivel_codigo && !nid) throw new Error('Falta el nivel ' + programa_slug + '/' + nivel_codigo);
          return { ...o, examen_id: ex[examen_slug], nivel_id: nid || null, seccion: o.seccion || null };
        });
      }
      for (let i = 0; i < rows.length; i += 200) {
        const r = await sb.from(op.t).upsert(rows.slice(i, i + 200), { onConflict: op.k });
        if (r.error) throw new Error(op.t + ': ' + r.error.message);
        log(`${f} · ${op.t}: ${Math.min(i + 200, rows.length)} de ${rows.length}`);
      }
      if (op.t === 'examen_tarea' && rows.length) {      // quita del plan las tareas que ya no están en el archivo
        const eid = rows[0].examen_id, ids = new Set(rows.map(r => r.id));
        const sobran = (await q(sb.from('examen_tarea').select('id').eq('examen_id', eid))).map(x => x.id).filter(x => !ids.has(x));
        if (sobran.length) { const r = await sb.from('examen_tarea').delete().in('id', sobran); if (r.error) throw new Error('examen_tarea: ' + r.error.message); }
      }
      if (op.t === 'programa') progs = {};          // programas nuevos: se vuelven a leer antes de resolver los niveles
    }
  }
}

/* ───────── eventos ───────── */
document.addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = ev.target;
  if (f.id === 'f-login') { const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Entrando…'; await doLogin($('#alias').value, $('#clave').value); }
  if (f.id === 'f-pass') { await doChangePass($('#p1').value, $('#p2').value, !!f.dataset.force); if (!f.dataset.force) f.reset(); }
});
document.addEventListener('input', ev => {
  if (ev.target.id === 'busca') { clearTimeout(swapTimer); const v = ev.target.value; swapTimer = setTimeout(() => { buscarEj(window.__swapItem, v, S.ex[exOf(S.items[window.__swapItem])] || {}); }, 300); }
});
document.addEventListener('change', async ev => {
  const t = ev.target, d = t.dataset || {};
  try {
    if (d.bkfile !== undefined) {
      const f = t.files && t.files[0]; t.value = ''; if (!f) return;
      const out = $('#bk-out'); let cp;
      try { cp = JSON.parse(await f.text()); if (cp.version !== 1 || !cp.tablas || !cp.perfiles) throw 0; } catch (e) { return toast('El archivo no es una copia válida.'); }
      const actuales = await q(sb.from('perfil').select('id,alias')), porAlias = Object.fromEntries(actuales.map(p => [p.alias, p.id]));
      const mapa = {}; cp.perfiles.forEach(p => { if (porAlias[p.alias]) mapa[p.id] = porAlias[p.alias]; });
      const sinCuenta = cp.perfiles.filter(p => !mapa[p.id] && p.rol === 'alumno').map(p => p.alias);
      const total = Object.values(cp.tablas).reduce((x, r) => x + r.length, 0);
      if (!confirm('Importar ' + total + ' filas de ' + Object.keys(mapa).length + ' alumnos con cuenta.' + (sinCuenta.length ? '\nSin cuenta (se omiten): ' + sinCuenta.join(', ') + '.' : '') + '\nSe mezcla con lo actual y no se borra nada. ¿Seguir?')) return;
      let ok = 0, omit = 0, fall = 0;
      for (const [tb, rows] of Object.entries(cp.tablas)) {
        if (!BK_TABLAS[tb]) continue;
        const buenas = [];
        rows.forEach(r => {
          const x = { ...r };
          if ('alumno_id' in x) { if (!mapa[x.alumno_id]) { omit++; return; } x.alumno_id = mapa[x.alumno_id]; }
          ['validada_por', 'asignado_por'].forEach(c => { if (c in x) x[c] = x[c] ? (mapa[x[c]] || null) : null; });
          buenas.push(x);
        });
        for (let i = 0; i < buenas.length; i += 400) {
          out.textContent = 'Importando ' + tb + ' (' + Math.min(i + 400, buenas.length) + ' de ' + buenas.length + ')…';
          try { const r = await llamarAdmin({ accion: 'importar', tabla: tb, filas: buenas.slice(i, i + 400) }); ok += r.ok; fall += r.fallidas; } catch (e) { out.textContent = e.message; return; }
        }
      }
      out.textContent = 'Importación terminada: ' + ok + ' filas cargadas' + (omit ? ', ' + omit + ' omitidas (alumno sin cuenta)' : '') + (fall ? ', ' + fall + ' no se pudieron cargar' : '') + '.';
      return;
    }
    if (d.exal) {
      const r = t.value === '1' ? await sb.from('examen_alumno').upsert({ examen_id: d.exal, alumno_id: d.al }, { onConflict: 'examen_id,alumno_id' }) : await sb.from('examen_alumno').delete().eq('examen_id', d.exal).eq('alumno_id', d.al);
      if (r.error) throw r.error; toast('Examen guardado');
    }
    if (d.gtxt) {
      const r = t.value ? await sb.from('grado_texto').upsert({ alumno_id: d.al, programa_id: d.gtxt, grado: t.value }, { onConflict: 'alumno_id,programa_id' }) : await sb.from('grado_texto').delete().eq('alumno_id', d.al).eq('programa_id', d.gtxt);
      if (r.error) throw r.error; toast('Grado guardado');
    }
    if (d.grado) {
      const ns = (await q(sb.from('nivel').select('id').eq('programa_id', d.grado))).map(n => n.id);
      let r = await sb.from('grado_alumno').delete().eq('alumno_id', d.al).in('nivel_id', ns); if (r.error) throw r.error;
      if (t.value) { r = await sb.from('grado_alumno').insert({ alumno_id: d.al, nivel_id: t.value, asignado_por: S.user.id }); if (r.error) throw r.error; }
      toast('Grado guardado');
    }
    if (d.imp) {
      const r = t.value ? await sb.from('impreso_socio').upsert({ alumno_id: d.al, fecha_recibido: t.value }, { onConflict: 'alumno_id' }) : await sb.from('impreso_socio').delete().eq('alumno_id', d.al);
      if (r.error) throw r.error; toast('Impreso guardado');
    }
    if (d.reg) {
      const row = t.closest('.reg'), e = row.querySelector('[data-f="e"]').value || null, f = row.querySelector('[data-f="t"]').value || null;
      const r = (e || f) ? await sb.from('entrega_regla').upsert({ alumno_id: d.al, numero: +d.reg, fecha_entrega: e, fecha_terminada: f }, { onConflict: 'alumno_id,numero' }) : await sb.from('entrega_regla').delete().match({ alumno_id: d.al, numero: +d.reg });
      if (r.error) throw r.error; toast('Entrega guardada');
    }
  } catch (e) { console.warn(e); toast('No se pudo guardar.'); }
});
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') cierraClip(); });
document.addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[data-tec],[data-extec]')) { ev.preventDefault(); ev.target.click(); } });
document.addEventListener('focusout', async ev => {
  const xa = ev.target;
  if (xa.dataset && xa.dataset.exnotatxt) {
    const k = xa.dataset.exnotatxt, [eid, tid] = k.split('|'), txt = xa.value.trim().slice(0, 200), cur = P.exTec[k] || {};
    if ((cur.nota || '') === txt) return;
    P.exTec[k] = { ...cur, nota: txt || null };
    const nb = document.querySelector(`[data-exnb="${tid}"]`); if (nb) { nb.classList.toggle('on', !!txt); nb.querySelector('svg').setAttribute('fill', txt ? 'currentColor' : 'none'); }
    return exGuarda('examen_tecnica_alumno', 'alumno_id,examen_id,tecnica_id', { examen_id: eid, tecnica_id: tid, completada: !!cur.completada, nota: txt || null, actualizado: new Date().toISOString() });
  }
  const ta = ev.target; if (!ta.dataset || !ta.dataset.notatxt) return;
  const id = ta.dataset.notatxt, txt = ta.value.trim().slice(0, 200);
  if ((P.notas[id] || '') === txt) return;
  if (txt) P.notas[id] = txt; else delete P.notas[id];
  const nb = document.querySelector(`[data-nota="${id}"]`); if (nb) { nb.classList.toggle('on', !!txt); nb.querySelector('svg').setAttribute('fill', txt ? 'currentColor' : 'none'); }
  await enqueue(txt ? { k: 'ups', t: 'nota_tecnica', conf: 'alumno_id,tecnica_id', row: { alumno_id: S.user.id, tecnica_id: id, texto: txt, actualizado: new Date().toISOString() } } : { k: 'del', t: 'nota_tecnica', m: { alumno_id: S.user.id, tecnica_id: id } });
});
document.addEventListener('click', async ev => {
  const ca = ev.target.closest('a[data-clip]'); if (ca) { ev.preventDefault(); return abreClip(ca.dataset.clip, ca.textContent); }
  if (ev.target.id === 'vmodal') return cierraClip();
  if (ev.target.closest('a')) return;
  const b = ev.target.closest('button, [data-tec], [data-extec]'); if (!b) return;
  const d = b.dataset;
  try {
    if (d.vrate) { const v = document.querySelector('#vmodal video'); if (v) v.playbackRate = +d.vrate; document.querySelectorAll('[data-vrate]').forEach(x => x.classList.toggle('on', x === b)); return; }
    if ('vclose' in d) return cierraClip();
    if (d.tab) return go(d.tab);
    if ('reload' in d) return afterLogin(S.user);
    if ('logout' in d) return logout();
    if (d.rut) { S.sel = { r: d.rut, b: null }; lsSet('kk_sel', S.sel); return renderToday(); }
    if (d.dia) { S.sel.b = d.dia; lsSet('kk_sel', S.sel); return renderToday(); }
    if (d.open) return renderExercise(d.open);
    if ('back' in d) return go('hoy');
    if (d.st) { const o = document.getElementById(d.st), k = d.st, v = Math.max(0, Math.round((stVals[k] + +d.d) * 100) / 100); stVals[k] = v; o.firstChild.nodeValue = fmt(v); return; }
    if (d.save) {
      const it = S.items[d.save], id = exOf(it), n = seriesDe(id, hoy()).length + 1;
      const row = { id: uuid(), alumno_id: S.user.id, bloque_item_id: it.id, ejercicio_id: id, fecha: hoy(), num_serie: seriesItemHoy(it).length + 1, peso_kg: it.modo === 'reps' ? stVals.w : null, repeticiones: it.modo === 'reps' ? stVals.r : null, tiempo_seg: it.modo === 'tiempo' ? stVals.t : null };
      S.series.unshift(row);
      const y = view.scrollTop; renderExercise(it.id); view.scrollTop = y;
      if (await enqueue({ k: 'ins', t: 'serie_registro', conf: 'id', row })) toast(`Serie ${row.num_serie} guardada`);
      return;
    }
    if (d.del) {
      const s = S.series.find(x => x.id === d.del); if (!s) return;
      S.series = S.series.filter(x => x !== s);
      const pend = obGet(); const i = pend.findIndex(o => o.k === 'ins' && o.row && o.row.id === s.id);
      const it = S.items[s.bloque_item_id];
      if (i >= 0) { pend.splice(i, 1); obSet(pend); paintWho(); } else await enqueue({ k: 'del', t: 'serie_registro', m: { id: s.id } });
      if (it) { const y = view.scrollTop; renderExercise(it.id); view.scrollTop = y; }
      return;
    }
    if (d.check) {
      const it = S.items[d.check], key = it.id + '|' + hoy(), on = !S.hechos[key];
      S.hechos[key] = on; if (!on) delete S.hechos[key];
      renderExercise(it.id);
      await enqueue(on ? { k: 'ins', t: 'marca_hecho', conf: 'alumno_id,bloque_item_id,fecha', row: { alumno_id: S.user.id, bloque_item_id: it.id, fecha: hoy() } } : { k: 'del', t: 'marca_hecho', m: { alumno_id: S.user.id, bloque_item_id: it.id, fecha: hoy() } });
      return;
    }
    if (d.swap) { window.__swapItem = d.swap; return renderSwap(d.swap); }
    if (d.pick) {
      const r = await sb.from('sustitucion').upsert({ alumno_id: S.user.id, bloque_item_id: d.item, ejercicio_id: d.pick }, { onConflict: 'alumno_id,bloque_item_id' });
      if (r.error) return toast('No se pudo cambiar. Comprueba tu conexión.');
      S.sust[d.item] = d.pick; toast('Ejercicio cambiado'); return renderExercise(d.item);
    }
    if (d.unswap) {
      const r = await sb.from('sustitucion').delete().match({ alumno_id: S.user.id, bloque_item_id: d.unswap });
      if (r.error) return toast('No se pudo cambiar. Comprueba tu conexión.');
      delete S.sust[d.unswap]; return renderExercise(d.unswap);
    }
    // maestro
    if (d.regsel) { P.regSel = P.regSel === +d.regsel ? 0 : +d.regsel; $('#escuela-card').innerHTML = escuelaCard(); return; }
    if ('regclose' in d) { P.regSel = 0; $('#escuela-card').innerHTML = escuelaCard(); return; }
    if (d.regsave || d.regclear) {
      const n = +(d.regsave || d.regclear), e = d.regclear ? null : ($('#rg-e').value || null), f = d.regclear ? null : ($('#rg-t').value || null);
      if (f && !e) return toast('Indica también la fecha de recibida.');
      if (e && f && f < e) return toast('La fecha de terminada no puede ser anterior a la de recibida.');
      if (e) P.regla[n] = { alumno_id: S.user.id, numero: n, fecha_entrega: e, fecha_terminada: f }; else delete P.regla[n];
      P.regSel = 0; $('#escuela-card').innerHTML = escuelaCard();
      await enqueue(e ? { k: 'ups', t: 'entrega_regla', conf: 'alumno_id,numero', row: { alumno_id: S.user.id, numero: n, fecha_entrega: e, fecha_terminada: f } } : { k: 'del', t: 'entrega_regla', m: { alumno_id: S.user.id, numero: n } });
      return;
    }
    if ('avnuevo' in d) {
      const t = $('#av-t').value.trim(), x = $('#av-x').value.trim(); if (!t) return toast('Escribe un título.');
      const r = await sb.from('aviso').insert({ titulo: t, texto: x || null }); if (r.error) return toast('No se pudo publicar.');
      toast('Aviso publicado'); return renderAlumnos();
    }
    if (d.avdel) { const r = await sb.from('aviso').update({ activo: false }).eq('id', d.avdel); if (r.error) return toast('No se pudo quitar.'); return renderAlumnos(); }
    if (d.cadd) {
      const r = await sb.from('cuota_pendiente').upsert({ alumno_id: d.cadd, anio: +$('#cu-a').value, trimestre: +$('#cu-t').value }, { onConflict: 'alumno_id,anio,trimestre' });
      if (r.error) return toast('No se pudo guardar.'); const y = view.scrollTop; await renderAlumno(d.cadd); view.scrollTop = y; return;
    }
    if (d.cdel) {
      const [a, tr] = d.cdel.split('-'), r = await sb.from('cuota_pendiente').delete().match({ alumno_id: d.al, anio: +a, trimestre: +tr });
      if (r.error) return toast('No se pudo guardar.'); const y = view.scrollTop; await renderAlumno(d.al); view.scrollTop = y; return;
    }
    if ('update' in d) {
      b.disabled = true; b.textContent = 'Actualizando…';
      try { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) { console.warn(e); }
      return location.reload();
    }
    if ('sync' in d) {
      const out = $('#syncout'); b.disabled = true; b.textContent = 'Sincronizando…';
      try { await sincronizar(m => { out.textContent = m; }); out.textContent = 'Listo. ' + out.textContent; toast('Contenido sincronizado'); }
      catch (e) { out.textContent = 'No se pudo completar: ' + e.message; }
      b.disabled = false; b.textContent = 'Sincronizar contenido'; return;
    }
    if (d.info) return renderInfo(d.info);
    if (d.exfsave) return exFechas(d.ex, d.exfsave, false);
    if (d.exfreset) return exFechas(d.ex, d.exfreset, true);
    if (d.exhecha) return exHecha(d.ex, d.exhecha);
    if (d.extec) return exToggleTec(d.ex, d.extec, d.extarea);
    if (d.exnb) { const bx = document.getElementById('exnb-' + d.exnb); bx.hidden = !bx.hidden; b.setAttribute('aria-expanded', !bx.hidden); if (!bx.hidden) bx.querySelector('textarea').focus(); return; }
    if (d.extarea) return renderExamenTarea(d.ex, d.extarea);
    if (d.exam) return renderExamen(d.exam);
    if (d.prog) return renderPrograma(d.prog);
    if (d.niv) return renderNivel(d.niv);
    if (d.tec) return ciclarTecnica(d.tec);
    if (d.nota) { const bx = document.getElementById('nb-' + d.nota); bx.hidden = !bx.hidden; b.setAttribute('aria-expanded', !bx.hidden); if (!bx.hidden) bx.querySelector('textarea').focus(); return; }
    if (d.alumno) return renderAlumno(d.alumno);
    if ('alumnos' in d) return renderAlumnos();
    if (d.asig) {
      const r = d.on === '1' ? await sb.from('asignacion').delete().match({ alumno_id: d.al, rutina_id: d.asig }) : await sb.from('asignacion').upsert({ alumno_id: d.al, rutina_id: d.asig, activa: true }, { onConflict: 'alumno_id,rutina_id' });
      if (r.error) return toast('No se pudo guardar.'); return renderAlumno(d.al);
    }
    if (d.rec) {
      const r = d.on === '1' ? await sb.from('recomendado').delete().match({ alumno_id: d.al, bloque_item_id: d.rec }) : await sb.from('recomendado').upsert({ alumno_id: d.al, bloque_item_id: d.rec }, { onConflict: 'alumno_id,bloque_item_id' });
      if (r.error) return toast('No se pudo guardar.'); const y = view.scrollTop; await renderAlumno(d.al); view.scrollTop = y; return;
    }
    if ('altaRev' in d) {
      const ls = $('#alta-txt').value.split('\n').map(x => x.trim()).filter(Boolean), vistos = new Set();
      ALTA.res = []; ALTA.prev = ls.map(raw => { const alias = normAlias(raw); let est = 'nuevo';
        if (!aliasOk(alias)) est = 'No válido (3 a 30 caracteres)'; else if (ALTA.exist.has(alias)) est = 'Ya existe'; else if (vistos.has(alias)) est = 'Repetido'; vistos.add(alias); return { alias, est }; });
      return altaRender();
    }
    if ('altaGo' in d) {
      const al = ALTA.prev.filter(x => x.est === 'nuevo').map(x => x.alias); if (!al.length) return;
      b.disabled = true; b.textContent = 'Creando…';
      try { const r = await llamarAdmin({ accion: 'crear', aliases: al }); ALTA.res = r.resultados || []; ALTA.res.filter(x => x.ok).forEach(x => ALTA.exist.add(x.alias)); }
      catch (e) { b.disabled = false; b.textContent = 'Crear cuentas'; return toast(e.message); }
      return altaRender();
    }
    if (d.msgAlias) return toast(await copiar(msgAlta(d.msgAlias, d.msgClave)) ? 'Mensaje copiado' : 'No se pudo copiar');
    if ('altaCopy' in d) return toast(await copiar(ALTA.res.filter(r => r.ok).map(r => msgAlta(r.alias, r.clave)).join('\n\n———\n\n')) ? 'Copiado' : 'No se pudo copiar');
    if ('altaCsv' in d) return descargar('claves-temporales-' + hoy() + '.csv', '﻿alias;clave_temporal\n' + ALTA.res.filter(r => r.ok).map(r => r.alias + ';' + r.clave).join('\n') + '\n', 'text/csv');
    if (d.reset) {
      if (!confirm('¿Generar una clave temporal nueva para ' + d.alias + '? La anterior dejará de valer y tendrá que elegir una nueva al entrar.')) return;
      b.disabled = true;
      try { const r = await llamarAdmin({ accion: 'restablecer', alumno_id: d.reset }); $('#reset-out').innerHTML = `<div class="panel" style="margin:0"><div class="kv"><span style="color:var(--fg)">${esc(d.alias)} · <b>${esc(r.clave)}</b></span><button class="btn alt sm" style="width:auto;padding:8px 12px" data-msg-alias="${esc(d.alias)}" data-msg-clave="${esc(r.clave)}">Copiar mensaje</button></div><small class="muted">Solo se muestra ahora.</small></div>`; }
      catch (e) { toast(e.message); }
      b.disabled = false; return;
    }
    if ('bkExport' in d) {
      const out = $('#bk-out'); b.disabled = true;
      try {
        const perfiles = await q(sb.from('perfil').select('id,alias,rol,activo,debe_cambiar_clave'));
        const tablas = {}, nota = [];
        for (const [t, conf] of Object.entries(BK_TABLAS)) {
          out.textContent = 'Leyendo ' + t + '…'; const rows = [];
          try { for (let i = 0; ; i += 1000) { let qq = sb.from(t).select('*'); conf.split(',').forEach(c => { qq = qq.order(c); }); const r = await q(qq.range(i, i + 999)); rows.push(...r); if (r.length < 1000) break; } tablas[t] = rows; }
          catch (e) { nota.push(t); }
        }
        const n = Object.values(tablas).reduce((x, r) => x + r.length, 0);
        descargar('kokorosd-copia-' + hoy() + '.json', JSON.stringify({ version: 1, creado: new Date().toISOString(), perfiles, tablas }), 'application/json');
        out.textContent = 'Copia descargada: ' + n + ' filas de ' + perfiles.length + ' perfiles.' + (nota.length ? ' Sin leer (¿tabla sin crear?): ' + nota.join(', ') + '.' : '');
      } catch (e) { console.warn(e); out.textContent = 'No se pudo crear la copia.'; }
      b.disabled = false; return;
    }
    if ('bkImport' in d) return $('#bk-file').click();
    if (d.baja) {
      const r = await sb.from('perfil').update({ activo: d.act !== '1' }).eq('id', d.baja);
      if (r.error) return toast('No se pudo guardar.'); return renderAlumno(d.baja);
    }
  } catch (e) { console.warn(e); toast('Algo ha fallado. Inténtalo de nuevo.'); }
});

/* ───────── arranque ───────── */
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {}));
(async function boot() {
  try {
    const { data } = await sb.auth.getSession();
    if (data && data.session) return afterLogin(data.session.user);
  } catch (e) { console.warn(e); }
  const c = lsGet('kk_cache', null);
  if (c && !navigator.onLine) { S.user = { id: c.uid }; S.perfil = c.perfil; paintWho(); apply(c.pack); setNav(); go('hoy'); toast('Sin conexión: mostrando los últimos datos guardados.'); return; }
  showLogin();
})();
sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && S.user && !nav.hidden) showLogin(); });
