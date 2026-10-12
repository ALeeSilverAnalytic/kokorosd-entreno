'use strict';
/* Kokorosd Entreno · fase 1
   Acceso con alias, rutinas asignadas, registro de series en Supabase y vista de maestro.
   La URL y la clave "publishable" son públicas por diseño: los datos los protegen las reglas por fila. */
const SB_URL = 'https://ieqnpgmhdiblfbfxacol.supabase.co';
const SB_KEY = 'sb_publishable_ZvC4adLa5PScOFl1GrfadQ_GIv620fH';
const DOMINIO = '@kokorosd.example';
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
  play: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
};
const NAV = {
  hoy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  progreso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M6 16l4-5 4 3 5-7"/></svg>',
  alumnos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.3 3.3 0 010 6.4M18 14.8c2 .6 3.2 2.2 3.6 5"/></svg>',
  cuenta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4 3.8-6 8-6s7.3 2 8 6"/></svg>'
};
function imgSrc(e, i) { const p = e && e.imagenes && e.imagenes[i]; return p ? IMG[0] + p : ''; }
window.imgFail = el => { if (el.dataset.f) return; el.dataset.f = 1; el.src = el.src.replace(IMG[0], IMG[1]); };
const imgTag = (e, i, cls, alt) => `<img ${cls ? `class="${cls}"` : ''} alt="${esc(alt || '')}" src="${imgSrc(e, i)}" onerror="imgFail(this)">`;
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
  const tabs = [['hoy', 'Entreno'], ['progreso', 'Mi progreso']];
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
  tab = 'hoy'; setNav(); go('hoy'); flush();
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
  const f = { hoy: renderToday, progreso: renderProgress, alumnos: renderAlumnos, cuenta: renderCuenta }[t];
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
  <div class="panel"><h2 style="margin-bottom:6px">Créditos</h2><p style="margin:0 0 8px">Imágenes e instrucciones de <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">Free Exercise DB</a>, en dominio público (Unlicense). Los textos de instrucciones están en inglés.</p><p class="muted" style="margin:0">Herramienta interna de la Asociación Kokorosd de Silat y otras AAMM. Gratuita y sin fines de lucro.</p></div>`;
}

/* ───────── vista de maestro ───────── */
async function renderAlumnos() {
  view.innerHTML = '<h1>Alumnos</h1><div class="loading">Cargando…</div>';
  const [al, ses] = await Promise.all([
    q(sb.from('perfil').select('*').eq('rol', 'alumno').order('alias')),
    q(sb.from('serie_registro').select('alumno_id,fecha').order('fecha', { ascending: false }).limit(3000))
  ]);
  const last = {}; ses.forEach(s => { if (!last[s.alumno_id]) last[s.alumno_id] = s.fecha; });
  view.innerHTML = `<h1>Alumnos</h1>` + (al.length ? al.map(a => `<button class="stu" data-alumno="${a.id}"><span class="tx"><b>${esc(a.alias)}</b>${!a.activo ? '<span class="badge">Baja</span>' : ''}${a.debe_cambiar_clave ? '<span class="badge">Clave temporal</span>' : ''}<span class="s">${last[a.id] ? 'Último registro: ' + dateEs(last[a.id]) : 'Sin registros'}</span></span>${IC.chev.replace('M15 18l-6-6 6-6', 'M9 18l6-6-6-6')}</button>`).join('') : '<div class="panel"><p class="muted" style="margin:0">Aún no hay alumnos. Créalos en Supabase: Authentication → Users → Add user, con correo <b>alias@kokorosd.example</b>, una contraseña temporal y "Auto Confirm User".</p></div>');
}
async function renderAlumno(id) {
  view.innerHTML = '<div class="loading">Cargando…</div>';
  const [perfil, asg, rec, ser] = await Promise.all([
    q(sb.from('perfil').select('*').eq('id', id)),
    q(sb.from('asignacion').select('*').eq('alumno_id', id)),
    q(sb.from('recomendado').select('*').eq('alumno_id', id)),
    q(sb.from('serie_registro').select('*').eq('alumno_id', id).order('fecha', { ascending: false }).limit(400))
  ]);
  const a = perfil[0]; if (!a) return go('alumnos');
  const faltan = [...new Set(ser.map(s => s.ejercicio_id))].filter(x => !S.ex[x]);
  if (faltan.length) (await q(sb.from('ejercicio').select('*').in('id', faltan))).forEach(e => { S.ex[e.id] = e; });
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
  h += `<h2 style="margin:18px 0 8px">Actividad reciente</h2>`;
  if (!ser.length) h += '<p class="muted">Sin registros todavía.</p>';
  else {
    const porFecha = {}; ser.forEach(s => { ((porFecha[s.fecha] = porFecha[s.fecha] || {})[s.ejercicio_id] = porFecha[s.fecha][s.ejercicio_id] || []).push(s); });
    h += `<div class="panel" style="padding:6px 14px">` + Object.keys(porFecha).sort().reverse().slice(0, 8).map(f => `<div class="sess"><b>${dateEs(f)}</b>${Object.entries(porFecha[f]).map(([ex, ss]) => `<div><span>${esc(exName(ex))}: ${ss.sort((x, y) => x.num_serie - y.num_serie).map(s => Number(s.peso_kg) > 0 || s.repeticiones ? `${fmt(Number(s.peso_kg || 0))}×${s.repeticiones}` : `${s.tiempo_seg}s`).join(' · ')}</span></div>`).join('')}</div>`).join('') + '</div>';
    h += `<h2 style="margin:18px 0 8px">Evolución</h2>` + progresoCards(ser);
  }
  h += `<button class="btn alt sm" style="margin-top:14px" data-baja="${id}" data-act="${a.activo ? 1 : 0}">${a.activo ? 'Dar de baja a este alumno' : 'Reactivar a este alumno'}</button>`;
  view.innerHTML = h;
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
document.addEventListener('click', async ev => {
  const b = ev.target.closest('button'); if (!b) return;
  const d = b.dataset;
  try {
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
    if (d.baja) {
      const r = await sb.from('perfil').update({ activo: d.act !== '1' }).eq('id', d.baja);
      if (r.error) return toast('No se pudo guardar.'); return renderAlumno(d.baja);
    }
  } catch (e) { console.warn(e); toast('Algo ha fallado. Inténtalo de nuevo.'); }
});

/* ───────── arranque ───────── */
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
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
