'use strict';
/* Transportes Blue CJ · Centro de control
   Los registros se guardan en este navegador (localStorage) y las fotos en IndexedDB.
   Toda lectura/escritura pasa por load(), persist() y Fotos, para poder cambiar luego
   a una base de datos compartida. Los datos iniciales salen de datos.js (Excel). */

// ---------- Utilidades ----------
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const D = d => new Date(d + 'T12:00:00Z');
const shift = (date, n) => { const d = D(date); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const days = (a, b) => Math.round((D(a) - D(b)) / 86400000);
const fmt = d => d ? D(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Sin registrar';
const fmtS = d => D(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' }).replace('.', '');
const fmtLong = d => D(d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const money = v => 'S/ ' + Number(v || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kms = v => Number(v || 0).toLocaleString('es-PE');
const sum = (rows, k) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
const weekStart = d => shift(d, -((D(d).getUTCDay() + 6) % 7));
const weekDays = ws => Array.from({ length: 7 }, (_, i) => shift(ws, i));
const addMonth = (m, n) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1)).toISOString().slice(0, 7);
const monthName = m => D(m + '-01').toLocaleDateString('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthLen = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
const NARROW = () => innerWidth < 1180;
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], DOW1 = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const KEY = 'bluecj-v2', LISTS = ['people', 'trucks', 'docs', 'attendance', 'notes', 'maint', 'daily', 'moves', 'events'];
const DOC_TYPES = ['SOAT', 'CITV (revisión técnica)', 'TUC', 'Identificación vehicular', 'Seguro vehicular', 'Tarjeta de propiedad', 'Permiso de operación', 'Otro'];
const TIPOS =['2 t', '4 t', '8 t cortinero'];
const ROLES = ['Conductor', 'Liquidador', 'Armador', 'Auxiliar', 'Conductor-Liquidador', 'Coordinador', 'Dueño', 'Dueña', 'Otro', 'Sin definir'];
const PX = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

const ICONS = {
  patio: 'M3 10l9-6 9 6v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 20v-6h6v6',
  users: 'M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.8M16 4.2a3.5 3.5 0 0 1 0 6.6',
  truck: 'M2 6h11v10H2zM13 9h4l4 4v3h-8zM6.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  doc: 'M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h7',
  wrench: 'M14.5 6.5a4 4 0 0 0-5.2 5.2L3 18l3 3 6.3-6.3a4 4 0 0 0 5.2-5.2l-2.6 2.6-2.5-.6-.6-2.5z',
  box: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M21 20H3',
  cal: 'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5',
  check: 'M5 4h14v17H5zM9 12.5l2 2 4-4.5',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  more: 'M5 12h.01M12 12h.01M19 12h.01'
};
const ico = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;
const PAGES = [['patio', 'patio', 'Patio en vivo'], ['reparto', 'box', 'Reparto diario'], ['asistencia', 'check', 'Asistencia'], ['pagos', 'wallet', 'Pagos'],['personal', 'users', 'Personal'], ['flota', 'truck', 'Camiones'], ['documentos', 'doc', 'Documentos'], ['mantenimiento', 'wrench', 'Mantenimiento'], ['reportes', 'chart', 'Reportes'], ['calendario', 'cal', 'Calendario'], ['config', 'gear', 'Configuración']];

// ---------- Estado ----------
let page = 'patio', selected = today(), query = '', filter = '', selTruck = null;
let selUnit = null, utab = 'ficha', selPerson = null, ptab = 'perfil', pMonth = today().slice(0, 7), personModal = false;
let patioZoom = 1.75, pan = null, attPlate = '', fRole = '', fUnit = '', fState = 'Activo', fType = '', formPhotos = [], drag = null, suppressClick = false;
let payWeek = weekStart(today()), repMonth = today().slice(0, 7), calMonth = today().slice(0, 7), calDay = today();

// ---------- Fotos (IndexedDB) ----------
const Fotos = (() => {
  let dbp; const cache = new Map();
  const open = () => dbp ||= new Promise((res, rej) => { const r = indexedDB.open('bluecj-fotos', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('f', mode), rq = fn(t.objectStore('f')); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }); };
  return {
    async put(id, data) { cache.set(id, data); await tx('readwrite', s => s.put(data, id)); },
    async get(id) { if (cache.has(id)) return cache.get(id); const v = await tx('readonly', s => s.get(id)); if (v) cache.set(id, v); return v; },
    async del(id) { cache.delete(id); await tx('readwrite', s => s.delete(id)); },
    keys: () => tx('readonly', s => s.getAllKeys()),
    async all() { const o = {}; for (const k of await this.keys()) o[k] = await this.get(k); return o; },
    async clear() { cache.clear(); await tx('readwrite', s => s.clear()); }
  };
})();
function hydrate() { $$('img[data-foto]').forEach(async im => { if (im.dataset.ok) return; try { const v = await Fotos.get(im.dataset.foto); if (v) { im.src = v; im.dataset.ok = 1; } } catch { } }); }
function pick(multiple) { return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = multiple; i.onchange = () => res([...i.files]); i.click(); }); }
function shrink(file, max, square = false) {
  return new Promise((res, rej) => {
    const im = new Image(), u = URL.createObjectURL(file);
    im.onload = () => {
      const c = document.createElement('canvas');
      if (square) { const s = Math.min(im.width, im.height); c.width = c.height = Math.min(max, s); c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, c.width, c.height); }
      else { const k = Math.min(1, max / Math.max(im.width, im.height)); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); }
      URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', .8));
    };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('imagen')); }; im.src = u;
  });
}
const usedPhotos = () => new Set([...db.people.map(p => p.photo), ...db.docs.flatMap(d => d.photos || []), ...db.maint.flatMap(m => m.photos || [])].filter(Boolean));
async function cleanPhotos() { try { const used = usedPhotos(); for (const k of await Fotos.keys()) if (!used.has(k)) await Fotos.del(k); } catch { } }

// ---------- Almacenamiento ----------
const blank = () => ({ version: 2, people: [], trucks: [], docs: [], attendance: [], notes: [], maint: [], daily: [], moves: [], events: [], paid: {} });
function normalize(d) { LISTS.forEach(k => d[k] ||= []); d.paid ||= {}; d.trucks.forEach(u => u.tipo ||= /H100/i.test(u.model || '') ? '2 t' : u.plate === 'CPS907' ? '8 t cortinero' : '4 t'); return d; }
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.version === 2) return normalize(d); } catch { } return normalize(initialData()); }
let db = load();
function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch { toast('No se pudo guardar. Descarga un respaldo antes de salir.'); return false; } }
function toast(s) { const t = $('#toast'); t.textContent = s; t.style.display = 'block'; clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => t.style.display = 'none', 3500); }
let backTo = null;   // trabajador cuya constancia se reabre después de guardar un descuento o adicional
function save(msg = 'Registro guardado') { const ok = persist(), b = backTo; closeModal(); render(); if (b && person(b)) payDetail(b); if (ok) toast(msg); }

// ---------- Consultas ----------
const person = id => db.people.find(p => p.id === id), unit = id => db.trucks.find(u => u.id === id);
const pname = id => person(id)?.name || 'Sin asignar', plate = id => unit(id)?.plate || '—';
const first = id => pname(id).split(' ')[0];
const short = n => { const w = n.split(' '); return w.length > 2 ? w[0] + ' ' + w[w.length - 2] : n; };
const initials = n => n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const isOwner = p => /^Dueñ/.test(p.role);
const crew = r => [r.driver, r.helper1, r.helper2, r.helper3, r.helper4].filter(Boolean);
const worked = r => r.status === 'Completada' || r.status === 'En ruta';
const hasIssue = r => Number(r.missingGoods) > 0 || Number(r.missingMoney) > 0 || !!r.fault;
const issueText = r => [r.fault, Number(r.missingGoods) ? r.missingGoods + ' bultos faltantes' : '', Number(r.missingMoney) ? 'Faltante ' + money(r.missingMoney) : ''].filter(Boolean).join(' · ');
const spend = r => Number(r.fuel || 0) + Number(r.toll || 0) + Number(r.extra || 0);
const due = d => days(d, today());
const docStatus = d => !d.expiry ? (d.type === 'TUC' ? 'Sin vencimiento' : 'Falta fecha') : due(d.expiry) < 0 ? 'Vencido' : due(d.expiry) <= 30 ? 'Por vencer' : 'Vigente';
const todayRec = uidv => db.daily.filter(r => r.unit === uidv && r.date === today() && r.status !== 'Cancelada').sort((a, b) => (a.status === 'En ruta' ? -1 : 1) - (b.status === 'En ruta' ? -1 : 1))[0];
function unitState(u) { if (u.status === 'En taller' || u.status === 'Inactiva') return u.status; return db.daily.some(r => r.unit === u.id && r.date === today() && r.status === 'En ruta') ? 'En ruta' : 'En patio'; }
const stateKey = s => ({ 'En ruta': 'ruta', 'En patio': 'patio', 'En taller': 'taller', 'Inactiva': 'inactiva' }[s]);
function tenure(start) { if (!start) return 'Sin registrar'; const e = D(today()), s = D(start); if (s > e) return 'Ingreso futuro'; let m = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + e.getUTCMonth() - s.getUTCMonth(); if (e.getUTCDate() < s.getUTCDate()) m--; return Math.floor(m / 12) + ' años, ' + m % 12 + ' meses'; }
function bdayIn(p, from = today()) { if (!p.birth) return null; let d = from.slice(0, 4) + p.birth.slice(4); if (d < from) d = (+from.slice(0, 4) + 1) + p.birth.slice(4); return { in: days(d, from), date: d, age: +d.slice(0, 4) - +p.birth.slice(0, 4) }; }
function badge(s) { const c = /Vencid|Cancelada|pendiente$/i.test(s) ? 'red' : /vencer|taller|Pendiente|incidencia|Falta/i.test(s) ? 'amber' : /Programada|registr|Inactiv|Sin /.test(s) ? 'gray' : /En ruta/.test(s) ? 'blue' : ''; return `<span class="badge ${c}">${esc(s)}</span>`; }
function allAlerts() {
  const a = db.docs.filter(d => unit(d.unit) && d.expiry && due(d.expiry) <= 30).map(d => ({ title: d.type + ' · ' + plate(d.unit), sub: 'Vence el ' + fmt(d.expiry), tag: due(d.expiry) < 0 ? 'Vencido' : due(d.expiry) === 0 ? 'Vence hoy' : due(d.expiry) + ' días', danger: due(d.expiry) < 0, unit: d.unit, doc: true }));
  db.people.filter(p => p.status === 'Activo' && p.license && p.licenseExpiry && due(p.licenseExpiry) <= 30).forEach(p => a.push({ title: 'Licencia · ' + p.name, sub: 'Vence el ' + fmt(p.licenseExpiry), tag: due(p.licenseExpiry) < 0 ? 'Vencida' : due(p.licenseExpiry) + ' días', danger: due(p.licenseExpiry) < 0, person: p.id }));
  db.trucks.forEach(u => {
    if (u.status !== 'Inactiva' && Number(u.nextOil) > 0 && Number(u.km) >= Number(u.nextOil)) a.push({ title: 'Cambio de aceite · ' + u.plate, sub: 'Tocaba a los ' + kms(u.nextOil) + ' km', tag: 'Pendiente', unit: u.id });
    if (Number(u.papeletas) > 0) a.push({ title: 'Papeletas · ' + u.plate, sub: 'Registradas en la ficha del camión', tag: u.papeletas + ' pendiente' + (u.papeletas > 1 ? 's' : ''), unit: u.id });
  });
  db.maint.filter(m => unit(m.unit) && m.nextDate && due(m.nextDate) <= 7 && !db.maint.some(x => x.unit === m.unit && x.date > m.date && x.date >= m.nextDate)).forEach(m => a.push({ title: 'Revisión programada · ' + plate(m.unit), sub: m.type + ' · ' + fmt(m.nextDate), tag: due(m.nextDate) < 0 ? 'Atrasada' : 'Pendiente', unit: m.unit }));
  db.people.filter(p => p.status === 'Activo').map(p => ({ p, b: bdayIn(p) })).filter(x => x.b && x.b.in <= 7).sort((x, y) => x.b.in - y.b.in).forEach(({ p, b }) => a.push({ title: 'Cumpleaños · ' + p.name, sub: fmtLong(b.date) + ' · cumple ' + b.age + ' años', tag: b.in === 0 ? '¡Hoy!' : b.in === 1 ? 'Mañana' : 'En ' + b.in + ' días', person: p.id, bday: true }));
  db.events.filter(e => due(e.date) >= 0 && due(e.date) <= 3).sort((x, y) => x.date.localeCompare(y.date)).forEach(e => a.push({ title: 'Recordatorio · ' + e.title, sub: fmtLong(e.date) + (e.note ? ' · ' + e.note : ''), tag: due(e.date) === 0 ? 'Hoy' : due(e.date) === 1 ? 'Mañana' : 'En ' + due(e.date) + ' días', event: e.id }));
  return a.sort((x, y) => Number(!!y.danger) - Number(!!x.danger));
}
const sizeKey = u => /^8/.test(u.tipo || '') ? '8' : /^2/.test(u.tipo || '') ? '2' : '4';
// Tripulación del día: la del reparto de hoy si existe; si no, el personal asignado a la placa (conductor primero)
function unitCrew(u) { const r = todayRec(u.id); if (r) return crew(r); const team = db.people.filter(p => p.unit === u.id && p.status === 'Activo').sort((a, b) => roleOrder(a) - roleOrder(b)), drv = team.find(p => p.id === u.driver) || team.find(p => /^Conductor/.test(p.role)); return [drv, ...team.filter(p => p !== drv)].filter(Boolean).slice(0, cap(u)).map(p => p.id); }
const unitAlerts = (id, all = allAlerts()) => all.filter(a => a.unit === id);

// ---------- Piezas de interfaz ----------
const title = (t, sub, buttons = '') => `<div class="titlebar"><div><h1>${t}</h1><p>${sub}</p></div><div class="actions">${buttons}</div></div>`;
const btn = (text, action, cls = '') => `<button type="button" class="btn ${cls}" data-action="${action}">${text}</button>`;
const dateInput = () => `<input aria-label="Fecha de consulta" class="date" type="date" id="selectedDate" value="${selected}">`;
const stat = (label, value, sub, cls = '') => `<div class="stat"><div class="statlabel">${label}</div><div class="value">${value}</div><div class="sub ${cls}">${sub}</div></div>`;
const card = (t, sub, content, action = '') => `<section class="card"><div class="cardhead"><div><h2>${t}</h2>${sub ? '<p>' + sub + '</p>' : ''}</div>${action}</div>${content}</section>`;
const table = (h, rows, empty = 'No hay registros para esta consulta.') => `<div class="tablewrap"><table><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map((c, i) => `<td data-l="${esc(h[i] || '')}">${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${h.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
const who = (main, sub) => `<span><strong>${esc(main)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
const toolbar = (ph, options = [], extra = '') => `<div class="toolbar"><input id="search" class="search" placeholder="${ph}" aria-label="Buscar" value="${esc(query)}">${options.length ? `<select id="filter" aria-label="Filtrar por estado"><option value="">Todos los estados</option>${options.map(o => `<option ${filter === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : ''}${extra}</div>`;
const matches = s => s.toLowerCase().includes(query.toLowerCase());
const alertRows = list => list.length ? list.map(a => `<div class="alertrow"><span class="alerticon ${a.danger ? 'danger' : ''}">${a.bday ? '🎂' : '!'}</span><div><button class="link" data-action="${a.event ? 'event:' + a.event : a.unit ? 'unit:' + a.unit : 'person:' + a.person}">${esc(a.title)}</button><small>${esc(a.sub)}</small></div><span class="badge ${a.danger ? 'red' : a.bday ? 'blue' : 'amber'}">${esc(a.tag)}</span></div>`).join('') : '<div class="empty">Todo al día. No hay alertas pendientes.</div>';
const weekNav = w => `<div class="weeknav">${btn('‹', 'week:-7', 'sm')}<b>${fmtS(w)} – ${fmtS(shift(w, 6))}</b>${btn('›', 'week:7', 'sm')}</div>`;
const monthNav = (m, act) => `<div class="monthnav">${btn('‹', act + ':-1', 'sm')}<b>${monthName(m)}</b>${btn('›', act + ':1', 'sm')}</div>`;
const avatar = p => `<span class="ph">${p.photo ? `<img src="${PX}" data-foto="${p.photo}" alt="Foto de ${esc(p.name)}">` : esc(initials(p.name))}</span>`;
const thumbs = (ids, max = 3) => ids && ids.length ? ids.slice(0, max).map(id => `<span class="thumb sm"><img src="${PX}" data-foto="${id}" data-action="view:${id}" alt="Foto"></span>`).join(' ') + (ids.length > max ? `<span class="more">+${ids.length - max}</span>` : '') : '—';
const tabsBar = (items, cur, act) => `<div class="tabs" role="tablist">${items.map(([k, l]) => `<button role="tab" aria-selected="${cur === k}" class="${cur === k ? 'on' : ''}" data-action="${act}:${k}">${l}</button>`).join('')}</div>`;
const kv = (l, v, cls = '') => `<div class="kv"><span>${l}</span><b class="${cls}">${v}</b></div>`;
function monthGrid(m, cellFn) { const off = (D(m + '-01').getUTCDay() + 6) % 7; let h = DOW1.map(d => `<span class="cdow">${d}</span>`).join('') + '<span></span>'.repeat(off); for (let d = 1; d <= monthLen(m); d++) h += cellFn(m + '-' + String(d).padStart(2, '0'), d); return `<div class="mgrid">${h}</div>`; }

// ---------- Patio en vivo ----------
function sceneList(list = db.trucks) { const al = allAlerts(); return list.map(u => ({ id: u.id, plate: esc(u.plate), state: stateKey(unitState(u)), alert: unitAlerts(u.id, al).length > 0, size: sizeKey(u), cap: cap(u), crew: unitCrew(u).map((id, i) => ({ name: esc(short(pname(id))), driver: i === 0 })) })); }
// Tripulación del día de una unidad: se confirma al salir a ruta y se puede corregir mientras está en ruta
const cap = u => sizeKey(u) === '8' ? 5 : 4;   // el camión de 8 t lleva 5 personas
const HELPERS = ['helper1', 'helper2', 'helper3', 'helper4'];
function crewForm(id, depart) {
  const u = unit(id); if (!u) return; const t = today();
  if (depart && u.status !== 'Operativa') return toast(u.plate + ' figura como ' + u.status.toLowerCase() + '. Cambia su estado en Camiones.');
  if (depart && unitState(u) === 'En ruta') return;
  const old = depart ? db.daily.find(x => x.unit === id && x.date === t && x.status === 'Programada') : todayRec(id);
  const onRoad = old?.status === 'En ruta', ids = unitCrew(u), n = cap(u), ppl = [['', '— Sin asignar —'], ...activePeople(ids)], pl = `<b>${esc(u.plate)}</b>`;
  if (selTruck !== id) selectTruck(id);
  const intro = depart ? `Esta es la tripulación que sale hoy en ${pl}. Cámbiala si hace falta; al confirmar se marca su asistencia.`
    : onRoad ? `${pl} está en ruta. Corrige aquí al personal si hubo un error: la asistencia de hoy se actualiza sola.`
      : `Personal que sale hoy en ${pl}.` + (old ? '' : ' Queda guardado como la salida programada de hoy.');
  form((depart ? 'Salida a ruta · ' : 'Tripulación de hoy · ') + u.plate, `<p class="wide" style="margin:0">${intro}</p>` + selectField('driver', 'Conductor', ppl, ids[0] || '', false) + HELPERS.slice(0, n - 1).map((k, i) => selectField(k, 'Auxiliar ' + (i + 1), ppl, ids[i + 1] || '', false)).join(''),
    data => {
      HELPERS.forEach(k => data[k] ||= '');
      const c = crew(data); if (new Set(c).size !== c.length) return toast('Un trabajador está repetido en la tripulación');
      const other = pid => db.daily.find(x => x.date === t && x.status === 'En ruta' && x.unit !== id && crew(x).includes(pid)), busy = (depart || onRoad) && c.find(other);
      if (busy) return toast(first(busy) + ' ya está en ruta en ' + plate(other(busy).unit));
      const prev = old ? crew(old) : [];
      let r = old; if (r) Object.assign(r, data, depart ? { status: 'En ruta' } : {});
      else { r = { id: uid(), date: t, unit: id, status: depart ? 'En ruta' : 'Programada', ...data, fuel: 0, gallons: 0, toll: 0, extra: 0, extraNote: '', km: '', missingGoods: 0, missingMoney: 0, fault: '', note: '' }; db.daily.push(r); }
      if (worked(r)) {
        markCrew(r, true);
        // a quien se quitó por error se le retira la asistencia de hoy, salvo que tenga otra salida o un monto/comentario puesto a mano
        prev.filter(pid => !c.includes(pid) && !db.daily.some(x => x !== r && x.date === t && worked(x) && crew(x).includes(pid))).forEach(pid => { const a = attOf(pid, t); if (a && a.amount === '' && !a.note && !a.role) db.attendance = db.attendance.filter(x => x !== a); });
      }
      selTruck = id;
      save(depart ? (c.length ? `${u.plate} salió a ruta con ${c.map(first).join(', ')}. Asistencia marcada.` : `${u.plate} salió a ruta sin tripulación asignada.`) : `Tripulación de ${u.plate} actualizada` + (worked(r) ? '. Asistencia al día.' : ''));
    }, null, depart ? 'Confirmar salida a ruta' : 'Guardar tripulación');
}
const departUnit = id => crewForm(id, true);
// Caras de la tripulación de una unidad (foto o iniciales, nombre y puesto). Con edit, tocarlas abre el cambio de tripulación
function faces(u, edit) {
  const ids = unitCrew(u), n = cap(u);
  return `<div class="faces" style="grid-template-columns:repeat(${n},1fr)">` + Array.from({ length: n }, (_, i) => {
    const p = person(ids[i]), act = edit ? 'crew:' + u.id : p ? 'person:' + p.id : '';
    if (p) return `<button type="button" class="face" data-action="${act}" title="${esc(p.name)} · ${esc(p.role)}${edit ? ' · tocar para cambiar' : ''}">${avatar(p)}<small>${esc(first(p.id))}</small><small class="rol">${i ? esc(p.role) : 'Conductor'}</small></button>`;
    return edit ? `<button type="button" class="face empty" data-action="${act}" title="Agregar a la tripulación"><span class="ph">＋</span><small>Libre</small></button>` : `<span class="face empty"><span class="ph">＋</span><small>Libre</small></span>`;
  }).join('') + '</div>';
}
function truckPanel() {
  const u = unit(selTruck);
  if (!u) return `<div class="hint">${ico('truck')}<h3 style="margin:12px 0 6px">Toca un camión</h3><p>Selecciona una unidad en el patio para ver su tripulación, su salida de hoy, sus documentos y sus pendientes.</p></div>`;
  const st = unitState(u), r = todayRec(u.id), docs = db.docs.filter(d => d.unit === u.id), oil = Number(u.nextOil) - Number(u.km);
  const last = db.daily.filter(x => x.unit === u.id && hasIssue(x)).sort((a, b) => b.date.localeCompare(a.date))[0];
  const act = r && r.status === 'Programada' ? btn('Marcar salida', 'depart:' + r.id, 'primary') : r && r.status === 'En ruta' ? btn('Registrar retorno', 'return:' + r.id, 'primary') : st === 'En patio' ? btn('Salir a ruta ahora', 'departnow:' + u.id, 'primary') + (r ? '' : btn('Programar', 'newdailyunit:' + u.id)) : '';
  return `<div class="tphead"><div><h2>${esc(u.plate)}</h2><small>${esc(u.brand + ' ' + u.model)} · ${esc(u.year)}</small></div>${badge(st)}</div>
    <h3 style="margin-top:0">${r ? 'Tripulación de hoy' : 'Tripulación asignada'}${st === 'En ruta' ? ' · en ruta' : ''}</h3>${faces(u, true)}
    <p class="crewhint">Toca a la tripulación para cambiarla${st === 'En ruta' ? ', aunque el camión ya esté en ruta' : ''}.</p>
    <div class="actions">${act}${btn('Cambiar tripulación', 'crew:' + u.id)}</div>
    ${kv('Salida de hoy', r ? esc(r.status) : 'Sin salida registrada')}
    ${kv('Kilometraje', kms(u.km) + ' km')}${kv('Cambio de aceite', Number(u.nextOil) ? (oil <= 0 ? 'Pendiente' : 'Faltan ' + kms(oil) + ' km') : 'Sin programar', oil <= 0 && Number(u.nextOil) ? 'red' : '')}
    <h3>Documentos</h3>${docs.length ? docs.map(d => kv(esc(d.type), (d.expiry ? fmtS(d.expiry) + ' ' : '') + badge(docStatus(d)))).join('') : '<p>Sin documentos registrados.</p>'}
    <h3>Última incidencia</h3><p>${last ? esc(fmtS(last.date) + ' · ' + issueText(last)) : 'Sin incidencias registradas.'}</p>
    <div class="actions">${btn('Ver ficha', 'unit:' + u.id)}${btn('Taller', 'unitmaint:' + u.id)}</div>`;
}
function tripRow(r) {
  const n = { Programada: 0, 'En ruta': 1, Completada: 2 }[r.status] ?? -1, steps = ['Programada', 'En ruta', 'Completada'];
  const bar = n < 0 ? badge('Cancelada') : `<div class="steps">${steps.map((s, i) => `${i ? `<span class="stepline ${i <= n ? 'done' : ''}"></span>` : ''}<span class="step ${i < n || n === 2 ? 'done' : i === n ? 'now' : ''}"><i>${i < n || n === 2 ? '✓' : ''}</i>${s}</span>`).join('')}</div>`;
  const act = r.status === 'Programada' ? btn('Marcar salida', 'depart:' + r.id, 'primary sm') : r.status === 'En ruta' ? btn('Registrar retorno', 'return:' + r.id, 'primary sm') : btn('Ver detalle', 'daily:' + r.id, 'sm');
  return `<div class="trip"><div>${who(plate(r.unit), crew(r).map(first).join(', '))}${hasIssue(r) ? ' ' + badge('Con incidencia') : ''}</div>${bar}<div class="actions">${act}</div></div>`;
}
function patioPage() {
  const t = today(), day = db.daily.filter(r => r.date === t), present = db.attendance.filter(a => a.date === t).length, alerts = allAlerts(), act = db.people.filter(p => p.status === 'Activo' && !isOwner(p)).length;
  const st = db.trucks.map(unitState), chip = (i, l, v) => `<div class="chip"><span class="ci">${ico(i)}</span><span>${l}<b>${v}</b></span></div>`;
  const crewCard = card('Tripulación de hoy', 'Las personas que salen en cada unidad (4, o 5 en el camión de 8 t). Si el camión ya tiene salida registrada hoy, se muestra esa tripulación; si no, su personal asignado.', `<div class="crewgrid">${db.trucks.map(u => `<div class="crewbox"><div class="crewhead"><button class="link" data-action="sel:${u.id}"><i class="sdot ${stateKey(unitState(u))}"></i> ${esc(u.plate)}</button><small>${esc(u.tipo || '')} · ${esc(unitState(u))}</small></div>${faces(u)}</div>`).join('')}</div>`);
  return title('Patio en vivo', 'Toca un camión para ver su tripulación. Arrástralo a la pista para sacarlo a ruta. Mantén presionado el fondo para mover el patio.', btn('＋ Registrar reparto', 'newdaily', 'primary')) +
    `<div class="live"><div class="scenecard"><div class="chips">${chip('truck', 'En ruta', st.filter(s => s === 'En ruta').length + ' <em>/ ' + db.trucks.length + '</em>')}${chip('users', 'Asistencia de hoy', present + ' <em>/ ' + act + '</em>')}${chip('bell', 'Alertas', alerts.length)}${chip('wallet', 'Gasto de hoy', money(day.reduce((a, r) => a + spend(r), 0)))}</div>
    <div class="zoomctl" role="group" aria-label="Ampliar el patio"><button data-action="zoom:-1" aria-label="Alejar" title="Alejar">−</button><b id="zoomlbl">${Math.round(patioZoom * 100)}%</b><button data-action="zoom:1" aria-label="Acercar" title="Acercar">＋</button><button data-action="zoom:0" title="Ver todo el patio">Ver todo</button></div>
    <div class="scenewrap" id="scenewrap">${db.trucks.length ? Patio.svg(sceneList(), selTruck) : '<div class="empty">Aún no hay camiones. Regístralos en la sección Camiones.</div>'}</div>
    <div class="scenefoot"><div class="platebar">${db.trucks.map(u => `<button class="plate ${u.id === selTruck ? 'active' : ''}" data-action="sel:${u.id}" data-plate="${u.id}"><i class="sdot ${stateKey(unitState(u))}"></i>${esc(u.plate)}</button>`).join('')}</div>
    <div class="legend"><span><i class="sdot"></i>En patio</span><span><i class="sdot ruta"></i>En ruta</span><span><i class="sdot taller"></i>En taller</span></div></div></div>
    <aside class="tpanel" id="tpanel">${truckPanel()}</aside></div>` + crewCard +
    `<div class="grid2">${card('Salidas de hoy', fmtLong(t), day.length ? day.map(tripRow).join('') : '<div class="empty">No hay salidas registradas hoy.</div>', '<button class="link" data-action="go:reparto">Ver reparto ↗</button>')}${card('Atención prioritaria', 'Documentos, mantenimiento y cumpleaños', alertRows(alerts.slice(0, 5)), alerts.length > 5 ? '<button class="link" data-action="alerts">Ver todas ↗</button>' : '')}</div>`;
}
// Ampliar el patio: el dibujo crece y se recorre dentro de su marco, manteniendo el centro de lo que se estaba viendo
const ZOOMS = [1, 1.35, 1.75, 2.25, 3, 4];
function applyZoom(center = true) {
  const w = $('#scenewrap'), s = w?.querySelector('.scene'); if (!s) return;
  const cx = w.scrollWidth ? (w.scrollLeft + w.clientWidth / 2) / w.scrollWidth : .5, cy = w.scrollHeight ? (w.scrollTop + w.clientHeight / 2) / w.scrollHeight : .5;
  const px = Math.max(w.clientWidth, innerWidth < 820 ? 760 : 0) * patioZoom; s.style.width = s.style.minWidth = px + 'px';
  if (center) { w.scrollLeft = (patioZoom === 1 && w.scrollWidth <= w.clientWidth + 1 ? 0 : cx * w.scrollWidth - w.clientWidth / 2); w.scrollTop = cy * w.scrollHeight - w.clientHeight / 2; }
  const l = $('#zoomlbl'); if (l) l.textContent = Math.round(patioZoom * 100) + '%';
}
function selectTruck(id) {
  selTruck = selTruck === id ? null : id;
  if (!$('#tpanel')) return;
  $$('#scenewrap .trk').forEach(g => g.classList.toggle('sel', g.dataset.truck === selTruck));
  $$('.plate').forEach(b => b.classList.toggle('active', b.dataset.plate === selTruck));
  const p = $('#tpanel'); p.innerHTML = truckPanel(); p.style.animation = 'none'; p.offsetHeight; p.style.animation = '';
  if (selTruck && NARROW()) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------- Reparto diario ----------
const dailyFilter = r => r.date === selected && matches(plate(r.unit) + ' ' + crew(r).map(pname).join(' ')) && (!filter || (filter === 'Con incidencias' ? hasIssue(r) : filter === 'Sin incidencias' ? !hasIssue(r) : r.status === filter));
const dailyTable = rows => table(['Camión / tripulación', 'Estado', 'Combustible', 'Peajes', 'Adicionales', 'Incidencias', ''], rows.map(r => [who(plate(r.unit), crew(r).map(first).join(', ')), badge(r.status), `<span class="num">${money(r.fuel)}</span>`, `<span class="num">${money(r.toll)}</span>`, `<span class="num">${money(r.extra)}</span>`, hasIssue(r) ? badge('Con incidencia') : '—', `<button class="link" data-action="daily:${r.id}">Ver detalle ↗</button>`]), 'No hay repartos registrados en esta fecha.');
function repartoPage() {
  const all = db.daily.filter(r => r.date === selected);
  return title('Reparto diario', 'Combustible, peajes, gastos, faltantes y desperfectos de cada salida.', dateInput() + btn('↑ Importar', 'importdaily') + btn('↓ Exportar', 'export') + btn('＋ Registrar reparto', 'newdaily', 'primary')) +
    `<div class="stats">${stat('Salidas', all.filter(r => r.status !== 'Cancelada').length, fmt(selected))}${stat('Gasto total', money(all.reduce((a, r) => a + spend(r), 0)), 'Combustible, peajes y adicionales')}${stat('Faltante de dinero', money(sum(all, 'missingMoney')), 'Por conciliar', sum(all, 'missingMoney') ? 'red' : '')}${stat('Mercadería faltante', sum(all, 'missingGoods') + ' <em>bultos</em>', 'Por conciliar', sum(all, 'missingGoods') ? 'warn' : '')}</div>` +
    card('Bitácora de la jornada', 'Un registro por camión y salida.', toolbar('Buscar por placa o trabajador…', ['Programada', 'En ruta', 'Completada', 'Cancelada', 'Con incidencias', 'Sin incidencias']) + `<div id="results">${dailyTable(db.daily.filter(dailyFilter))}</div>`);
}

// ---------- Pagos y asistencia ----------
const attOf = (pid, date) => db.attendance.find(a => a.person === pid && a.date === date);
const attAmount = (a, p) => a.amount !== '' && a.amount != null ? Number(a.amount) : Number(p.rate || 0);
// Asistencia en otra placa: a.unit guarda el camión (o 'cd') solo cuando NO es el asignado al trabajador
const ownPlate = p => (p && unit(p.unit) ? p.unit : 'cd'), otherPlate = (pid, pl) => pl && pl !== ownPlate(person(pid)) ? pl : '';
const attOther = a => a && a.unit ? (a.unit === 'cd' ? 'CD' : plate(a.unit)) : '';
function toggleAtt(pid, date, pl = '') { const a = attOf(pid, date), want = otherPlate(pid, pl); if (a && (!pl || (a.unit || '') === want)) db.attendance = db.attendance.filter(x => x !== a); else if (a) a.unit = want; else db.attendance.push({ id: uid(), person: pid, date, amount: '', note: '', unit: want }); }
function markCrew(r, setPlate) { if (worked(r)) crew(r).forEach(pid => { const a = attOf(pid, r.date), want = otherPlate(pid, r.unit); if (!a) db.attendance.push({ id: uid(), person: pid, date: r.date, amount: '', note: '', unit: want }); else if (setPlate) a.unit = want; }); }
function payRow(p, ws) {
  const we = shift(ws, 6), at = db.attendance.filter(a => a.person === p.id && a.date >= ws && a.date <= we);
  const mv = db.moves.filter(m => m.person === p.id && m.date >= ws && m.date <= we), t = k => sum(mv.filter(m => m.type === k), 'amount');
  const base = at.reduce((s, a) => s + attAmount(a, p), 0), ad = t('Adicional'), de = t('Descuento') + t('Adelanto');
  return { p, at, days: at.length, base, ad, de, mv, net: base + ad - de, paid: db.paid[ws + '|' + p.id] };
}
const roleOrder = p => { const i = ROLES.indexOf(p.role); return i < 0 ? 99 : i; };
function payPeople(ws, all = false) { const we = shift(ws, 6); return db.people.filter(p => (p.status === 'Activo' && !isOwner(p)) || db.attendance.some(a => a.person === p.id && a.date >= ws && a.date <= we)).filter(p => all || matches(p.name + ' ' + plate(p.unit) + ' ' + p.role)).sort((a, b) => (unit(a.unit) ? plate(a.unit) : 'ZZZ').localeCompare(unit(b.unit) ? plate(b.unit) : 'ZZZ') || roleOrder(a) - roleOrder(b) || a.name.localeCompare(b.name)); }
const plateOf = p => unit(p.unit) ? plate(p.unit) : 'CD';
function payTables() {
  const ds = weekDays(payWeek), t = today(), ppl = payPeople(payWeek), rows = ppl.map(p => payRow(p, payWeek));
  const thDays = ds.map((d, i) => `<th><span class="thday">${DOW[i]}<small>${d.slice(8)}</small></span></th>`).join('');
  const grp = (x, i) => i && plateOf(rows[i - 1].p) !== plateOf(x.p) ? 'grp' : '';
  const att = `<div class="tablewrap keep"><table><thead><tr><th>Trabajador</th>${thDays}<th>Asist.</th><th>% semana</th></tr></thead><tbody>${rows.map((x, i) => {
    const pct = Math.min(100, Math.round(x.days / 6 * 100));
    return `<tr class="${grp(x, i)}"><td><button class="link" data-action="person:${x.p.id}">${esc(short(x.p.name))}</button><small>${esc(plateOf(x.p))} · ${esc(x.p.role)}</small></td>${ds.map(d => { const a = attOf(x.p.id, d); const o = attOther(a), mod = a && (a.role || a.amount !== '' || a.note), tip = a ? [o ? 'Asistió en ' + o : '', a.role ? 'Puesto: ' + a.role : '', a.amount !== '' ? 'Monto: ' + money(a.amount) : '', a.note].filter(Boolean).join(' · ') : ''; return `<td class="c"><button class="chk ${a ? 'on' : ''} ${o ? 'other' : ''} ${mod ? 'mod' : ''} ${d === t ? 'today' : ''}" data-action="att:${x.p.id}|${d}" data-hold="payday:${x.p.id}|${d}" aria-pressed="${!!a}" aria-label="${esc(x.p.name)}, ${fmtS(d)}${tip ? ', ' + esc(tip) : ''}" title="${esc(tip || 'Mantén presionado para cambiar placa, puesto o monto')}">${o ? esc(o) : '✓'}</button></td>`; }).join('')}<td class="c"><strong>${x.days}</strong></td><td><span class="pct"><i style="width:${Math.round(pct * .6)}px"></i>${pct}%</span></td></tr>`;
  }).join('') || `<tr><td colspan="10" class="empty">No hay trabajadores para mostrar.</td></tr>`}</tbody></table></div>`;
  const tot = k => sum(rows, k);
  const pay = `<div class="tablewrap keep"><table><thead><tr><th>Nombre</th><th>Placa</th><th>DNI</th><th>Puesto</th><th>Monto diario</th>${thDays}<th>Días trab.</th><th>Pago bruto</th><th>Descuentos</th><th>Adicionales</th><th>Pago final</th><th>Pagado</th></tr></thead><tbody>${rows.map((x, i) => `<tr class="${grp(x, i)}"><td><button class="link" data-action="paydetail:${x.p.id}">${esc(short(x.p.name))}</button></td><td class="c"><strong>${esc(plateOf(x.p))}</strong></td><td>${esc(x.p.dni || '—')}</td><td>${esc(x.p.role)}</td><td class="r">${Number(x.p.rate) ? money(x.p.rate) : '<span class="warn">Sin monto</span>'}</td>${ds.map(d => { const a = attOf(x.p.id, d); return `<td class="c"><button class="daycell ${a ? 'on' : ''}" data-action="payday:${x.p.id}|${d}" title="${esc(a?.note || 'Editar monto y comentario')}">${a ? money(attAmount(a, x.p)) : '—'}${attOther(a) ? `<small class="oplate">${esc(attOther(a))}</small>` : ''}${a?.note ? `<small>${esc(a.note)}</small>` : ''}</button></td>`; }).join('')}<td class="c"><strong>${x.days}</strong></td><td class="r">${money(x.base)}</td><td class="r ${x.de ? 'red' : ''}">${money(x.de)}</td><td class="r">${money(x.ad)}</td><td class="r"><strong>${money(x.net)}</strong></td><td class="c"><button class="chk ${x.paid ? 'on' : ''}" data-action="paytoggle:${x.p.id}" aria-pressed="${!!x.paid}" aria-label="Pagado ${esc(x.p.name)}">✓</button></td></tr>`).join('')}
    <tr class="total"><td>TOTALES</td><td colspan="4"></td>${ds.map(d => `<td class="c">${money(rows.reduce((s, x) => { const a = attOf(x.p.id, d); return s + (a ? attAmount(a, x.p) : 0); }, 0))}</td>`).join('')}<td class="c">${tot('days')}</td><td class="r">${money(tot('base'))}</td><td class="r">${money(tot('de'))}</td><td class="r">${money(tot('ad'))}</td><td class="r">${money(tot('net'))}</td><td class="c">${rows.filter(x => x.paid).length}/${rows.length}</td></tr></tbody></table></div>`;
  return { att, pay, rows };
}
function asistenciaPage() {
  const { att, rows } = payTables(), t = today(), staff = db.people.filter(p => p.status === 'Activo' && !isOwner(p)).length, hoy = db.attendance.filter(a => a.date === t).length;
  return title('Asistencia', 'Marca con un toque quién vino cada día. Al sacar un camión a ruta, su tripulación se marca sola.', weekNav(payWeek) + btn('Ver pagos de la semana →', 'go:pagos')) +
    `<div class="stats">${stat('Presentes hoy', hoy + ' <em>/ ' + staff + '</em>', fmtLong(t), 'up')}${stat('Asistencias de la semana', sum(rows, 'days'), fmtS(payWeek) + ' – ' + fmtS(shift(payWeek, 6)))}${stat('Con al menos un día', rows.filter(x => x.days).length, 'Trabajadores')}${stat('Sin asistencia', rows.filter(x => !x.days).length, 'En esta semana', rows.some(x => !x.days) ? 'warn' : '')}</div>` +
    card('Control de asistencia', 'Cada casilla es un día. El monto diario de cada día marcado pasa solo a Pagos.', toolbar('Buscar por nombre, placa o puesto…', [], `<select id="attPlate" aria-label="Placa con la que se marca la asistencia"><option value="">Marcar en su placa asignada</option>${db.trucks.map(u => `<option value="${u.id}" ${attPlate === u.id ? 'selected' : ''}>Marcar en otra placa: ${esc(u.plate)}</option>`).join('')}<option value="cd" ${attPlate === 'cd' ? 'selected' : ''}>Marcar en CD</option></select><span class="legend"><span><i class="lg ok"></i>En su placa</span><span><i class="lg other"></i>En otra placa</span></span>`) + `<p class="atthelp">¿Alguien trabajó en un camión que no es el suyo? Elige esa placa en la lista y toca su casilla: queda en naranja con la placa escrita. Vuelve a “su placa asignada” para seguir marcando normal. <b>Mantén presionada una casilla</b> (o clic derecho) para abrir el cuadro del día y cambiar la placa, el puesto o el monto de esa persona.</p><div id="results">${att}</div>`);
}
const movesTable = () => { const we = shift(payWeek, 6), mv = db.moves.filter(m => m.date >= payWeek && m.date <= we && person(m.person)).sort((a, b) => a.date.localeCompare(b.date)); return table(['Fecha', 'Trabajador', 'Tipo', 'Monto', 'Motivo', ''], mv.map(m => [fmtS(m.date), who(short(pname(m.person)), plateOf(person(m.person))), badge(m.type), `<span class="num ${m.type === 'Adicional' ? '' : 'red'}">${m.type === 'Adicional' ? '' : '− '}${money(m.amount)}</span>`, esc(m.note || '—'), `<button class="link" data-action="move:${m.id}">Editar / eliminar ↗</button>`]), 'Sin descuentos ni adicionales en esta semana.'); };
function pagosPage() {
  const { pay, rows } = payTables(), ds = weekDays(payWeek), total = sum(rows, 'net'), paid = sum(rows.filter(x => x.paid), 'net'), noRate = rows.filter(x => !Number(x.p.rate)).length;
  return title('Pagos', `Semana de lunes a domingo. Se paga el martes ${fmtS(shift(payWeek, 8))}.`, weekNav(payWeek) + btn('＋ Descuento / adicional', 'newmove', 'primary')) +
    `<div class="stats" id="paystats">${stat('Pago bruto', money(sum(rows, 'base')), sum(rows, 'days') + ' días trabajados')}${stat('Descuentos', money(sum(rows, 'de')), money(sum(rows, 'ad')) + ' en adicionales', sum(rows, 'de') ? 'red' : '')}${stat('Pago final', money(total), 'Bruto + adicionales − descuentos')}${stat('Pendiente de pagar', money(total - paid), money(paid) + ' ya pagado', total - paid > 0 ? 'warn' : 'up')}</div>` +
    card('Planilla de pagos', 'Toca un nombre para ver su constancia semanal. Toca el monto de un día para cambiarlo o poner un comentario.' + (noRate ? ` <b class="warn">${noRate} trabajadores no tienen monto diario: complétalo en Personal.</b>` : ''), toolbar('Buscar por nombre, placa o puesto…') + `<div id="results2">${pay}</div>`, btn('↓ Exportar planilla', 'exportpay', 'sm')) +
    card('Descuentos y adicionales de la semana', 'Todo lo registrado esta semana. Se puede corregir o eliminar en cualquier momento.', movesTable(), btn('＋ Agregar', 'newmove', 'sm')) +
    card('Quién salió en cada camión', 'Tripulación según los repartos registrados en la semana.', table(['Camión', ...ds.map((d, i) => DOW[i] + ' ' + d.slice(8))], db.trucks.map(u => [`<strong>${esc(u.plate)}</strong>`, ...ds.map(d => { const r = db.daily.filter(x => x.unit === u.id && x.date === d && worked(x)); return r.length ? `<span class="crewcell">${esc([...new Set(r.flatMap(crew))].map(first).join(', '))}</span>` : '—'; })])));
}
// Constancia de pago semanal por persona (se ve en pantalla y se imprime igual)
const fmtD = d => d.slice(8) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4), DIAS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const CONST_CSS = `.const{font-family:Inter,Arial,sans-serif;color:#0B2A5B;font-size:12.5px}.const .chead{text-align:center;margin-bottom:14px}.const .chead h2{font-size:19px;margin:0 0 4px;letter-spacing:.5px;font-family:Inter,Arial,sans-serif;font-weight:800}.const .chead p{margin:0;color:#5B6B7F;font-size:12px}.cgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}.ct{width:100%;border-collapse:collapse;margin-bottom:14px;table-layout:auto}.ct th{background:#0B2A5B;color:#fff;font-size:11.5px;letter-spacing:.6px;padding:7px 8px;text-align:center;text-transform:none}.ct th.g{background:#DDEEDD;color:#0B2A5B}.ct th.rd{background:#C00000}.ct td{border:1px solid #C9D3E3;padding:6px 8px;font-size:12.5px;white-space:normal;color:#0B2A5B}.ct .sub td{background:#DDEBF7;font-weight:700;text-align:center;font-size:11.5px}.ct .subr td{background:#FBE5E1;color:#C00000;font-weight:700;text-align:center;font-size:11.5px}.ct .tot td{background:#DDEBF7;font-weight:700}.ct .totr td{background:#FBE5E1;color:#C00000;font-weight:700}.ct .fin td{background:#FFF2CC;font-weight:800}.ct .r{text-align:right;font-variant-numeric:tabular-nums}.ct .c{text-align:center}.ct .pos{color:#17855B;font-weight:700}.ct .neg{color:#C00000;font-weight:700}.ct .lbl{font-weight:600;width:46%}.firma{display:flex;gap:40px;margin-top:46px}.firma span{flex:1;border-top:1px solid #0B2A5B;padding-top:6px;text-align:center;font-size:11.5px}@media(max-width:700px){.cgrid{grid-template-columns:1fr}}@media print{body{margin:14mm}.cgrid{grid-template-columns:1fr 1fr}}`;
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CONST_CSS }));
function constBody(p, ws, edit) {
  const x = payRow(p, ws), ds = weekDays(ws), dis = x.mv.filter(m => m.type !== 'Adicional'), n = edit ? 4 : 3;
  const mvRows = (list, neg) => (list.length ? list : [null, null]).map(m => m ? `<tr><td class="c">${fmtD(m.date)}</td><td>${esc((m.type === 'Adelanto' ? 'Adelanto · ' : '') + (m.note || '—'))}</td><td class="r ${neg ? 'neg' : 'pos'}">${neg ? '−' : ''}${money(m.amount)}</td>${edit ? `<td class="c"><button class="link" data-action="move:${m.id}">Editar</button></td>` : ''}</tr>` : `<tr><td>&nbsp;</td><td></td><td></td>${edit ? '<td></td>' : ''}</tr>`).join('');
  const resumen = `<tr><td class="lbl">Total por días trabajados</td><td class="r">${money(x.base)}</td></tr>${x.ad ? `<tr><td class="lbl">Adicionales registrados en Pagos</td><td class="r pos">${money(x.ad)}</td></tr>` : ''}<tr><td class="lbl">Total descuentos</td><td class="r neg">${x.de ? '−' : ''}${money(x.de)}</td></tr><tr class="fin"><td>MONTO FINAL A PAGAR</td><td class="r">${money(x.net)}</td></tr>`;
  return `<div class="const"><div class="chead"><h2>CONSTANCIA DE PAGO SEMANAL</h2><p>Transportes Blue CJ · Semana del <b>${fmtD(ws)}</b> al <b>${fmtD(shift(ws, 6))}</b> · Fecha de emisión: ${fmtD(today())}</p></div><div class="cgrid">
    <div><table class="ct"><tr><th colspan="2">DATOS DEL PERSONAL</th></tr><tr><td class="lbl">Nombre</td><td>${esc(p.name.toUpperCase())}</td></tr><tr><td class="lbl">DNI</td><td>${esc(p.dni || '—')}</td></tr><tr><td class="lbl">Puesto</td><td>${esc(p.role.toUpperCase())}</td></tr><tr><td class="lbl">Unidad / Placa</td><td>${esc(plateOf(p))}</td></tr><tr><td class="lbl">Monto diario</td><td>${money(p.rate)}</td></tr></table>
    <table class="ct"><tr><th colspan="4">1. RESUMEN DE PAGOS DIARIOS</th></tr><tr class="sub"><td>DÍA</td><td>SALIDA</td><td>MONTO</td><td>COMENTARIO</td></tr>${ds.map((d, i) => { const a = attOf(p.id, d); return `<tr><td>${DIAS[i]} ${d.slice(8)}</td><td class="c ${a ? 'pos' : ''}">${a ? '✓' : '✗'}</td><td class="r">${money(a ? attAmount(a, p) : 0)}</td><td>${esc([attOther(a) ? 'En placa ' + attOther(a) : '', a?.role ? 'Como ' + a.role : '', a?.note].filter(Boolean).join(' · '))}</td></tr>`; }).join('')}<tr class="tot"><td>TOTAL DÍAS TRABAJADOS</td><td class="c">${x.days}</td><td class="r">${money(x.base)}</td><td></td></tr></table></div>
    <div><table class="ct"><tr><th colspan="${n}" class="rd">2. DESCUENTOS</th></tr><tr class="subr"><td>FECHA</td><td>MOTIVO</td><td>MONTO</td>${edit ? '<td></td>' : ''}</tr>${mvRows(dis, true)}<tr class="totr"><td colspan="2">TOTAL DESCUENTOS</td><td class="r">${x.de ? '−' : ''}${money(x.de)}</td>${edit ? '<td></td>' : ''}</tr></table>
    <table class="ct"><tr><th colspan="2">3. RESUMEN FINAL</th></tr>${resumen}</table></div></div>${edit ? '' : '<div class="firma"><span>Entregado por</span><span>Recibí conforme · ' + esc(p.name) + '</span></div>'}</div>`;
}
function payDetail(id) {
  const p = person(id); if (!p) return; const paid = db.paid[payWeek + '|' + id];
  modal('Constancia de pago semanal', `<div class="formgrid" style="margin-bottom:16px"><label class="field wide">Trabajador<select id="constSel">${payPeople(payWeek, true).concat(payPeople(payWeek, true).includes(p) ? [] : [p]).map(q => `<option value="${q.id}" ${q.id === id ? 'selected' : ''}>${esc(q.name)} · ${esc(plateOf(q))}</option>`).join('')}</select></label></div>${constBody(p, payWeek, true)}
    <div class="formactions"><span class="badge ${paid ? '' : 'amber'}">${paid ? 'Pagado el ' + fmt(paid) : 'Pendiente de pago'}</span><span class="spacer"></span>${btn('＋ Descuento', 'newmove:' + id + '|Descuento')}${btn(paid ? 'Quitar pagado' : '✓ Marcar pagado', 'paytoggle:' + id + '|detail')}${btn('Imprimir / PDF', 'printconst:' + id, 'primary')}</div>`);
}
function printConst(id) {
  const p = person(id), w = window.open('', '_blank'); if (!w) return toast('Permite las ventanas emergentes para poder imprimir.');
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Constancia · ${esc(p.name)} · ${payWeek}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>${CONST_CSS}</style></head><body>${constBody(p, payWeek, false)}<script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`); w.document.close();
}
function payDayForm(pid, date) {
  const p = person(pid), a = attOf(pid, date); if (!p) return;
  form(short(p.name) + ' · ' + DOW[(D(date).getUTCDay() + 6) % 7] + ' ' + fmtS(date), selectField('came', '¿Asistió?', [['si', 'Sí, asistió'], ['no', 'No asistió']], a ? 'si' : 'si') + field('amount', `Monto del día (S/) · normal: ${money(p.rate)}`, a && a.amount !== '' ? a.amount : '', 'number', false, `min="0" step="0.01" inputmode="decimal" placeholder="${Number(p.rate) || 0}"`) + selectField('unit', 'Placa en la que trabajó', [['', 'Su placa asignada (' + plateOf(p) + ')'], ...db.trucks.filter(u => u.id !== p.unit).map(u => [u.id, u.plate]), ...(unit(p.unit) ? [['cd', 'CD']] : [])], a?.unit || '', false) + selectField('role', 'Puesto de ese día', [['', 'Su puesto (' + p.role + ')'], ...ROLES.filter(r => r !== p.role && !/^Dueñ|Sin definir/.test(r))], a?.role || '', false) + textField('note', 'Comentario', a?.note),
    data => { db.attendance = db.attendance.filter(x => x !== a); if (data.came === 'si') db.attendance.push({ id: a?.id || uid(), person: pid, date, amount: data.amount === '' ? '' : Number(data.amount), note: data.note.trim(), unit: otherPlate(pid, data.unit), role: data.role || '' }); save(); });
}

// ---------- Personal ----------
const peopleFilter = p => matches(p.name + ' ' + p.dni + ' ' + p.role + ' ' + plate(p.unit)) && (!fRole || p.role === fRole) && (!fState || p.status === fState) && (!fUnit || (fUnit === 'cd' ? !unit(p.unit) : p.unit === fUnit));
function personCards() {
  const t = today(), list = db.people.filter(peopleFilter).sort((a, b) => a.name.localeCompare(b.name));
  return list.map((p, i) => { const b = bdayIn(p); return `<button class="pcard ${p.id === selPerson ? 'active' : ''}" style="animation-delay:${Math.min(i, 20) * 15}ms" data-action="psel:${p.id}" data-person="${p.id}">${avatar(p)}${b && b.in <= 7 ? `<span class="cake" title="Cumpleaños ${b.in ? 'en ' + b.in + ' días' : 'hoy'}">🎂</span>` : ''}${p.status !== 'Activo' ? badge('Inactivo') : attOf(p.id, t) ? '<span class="badge">Presente</span>' : ''}<span class="inf"><b>${esc(short(p.name))}</b><small>${esc(p.role)}</small><span class="pl">${esc(plateOf(p))}</span></span></button>`; }).join('') || '<div class="empty" style="grid-column:1/-1">Ningún trabajador coincide con la búsqueda.</div>';
}
function personPanel() {
  const p = person(selPerson);
  if (!p) return `<div class="hint">${ico('users')}<h3 style="margin:12px 0 6px">Elige un trabajador</h3><p>Toca una tarjeta para ver su perfil, su asistencia, sus pagos y su historial. Desde ahí también puedes ponerle foto.</p></div>`;
  const t = today(), b = bdayIn(p);
  let body = '';
  if (ptab === 'perfil') {
    body = kv('Celular', p.phone ? `<a href="tel:${esc(p.phone.replace(/\s/g, ''))}">${esc(p.phone)}</a>` : '—') + kv('Documento', esc(p.dni || '—')) + kv('Nacimiento', p.birth ? fmt(p.birth) + ' · ' + (b.age - (b.in ? 1 : 0)) + ' años' : 'Sin registrar') + (b ? kv('Próximo cumpleaños', b.in === 0 ? '🎂 ¡Hoy!' : fmtS(b.date) + ' · en ' + b.in + ' días') : '') + kv('Camión asignado', unit(p.unit) ? `<button class="link" data-action="unit:${p.unit}">${esc(plate(p.unit))} ↗</button>` : 'CD / sin camión') + kv('Monto diario', Number(p.rate) ? money(p.rate) : 'Sin registrar', Number(p.rate) ? '' : 'warn') + kv('Ingreso', p.start ? fmt(p.start) : 'Sin registrar') + kv('Antigüedad', tenure(p.start)) + (p.license ? kv('Licencia', esc(p.license) + (p.licenseExpiry ? ' · vence ' + fmtS(p.licenseExpiry) : '')) : '') + kv('Estado', badge(p.status));
  } else if (ptab === 'asistencia') {
    const n = db.attendance.filter(a => a.person === p.id && a.date.slice(0, 7) === pMonth).length, cur = pMonth === t.slice(0, 7), base = cur ? +t.slice(8) : monthLen(pMonth);
    body = monthNav(pMonth, 'pmonth') + monthGrid(pMonth, (d, n2) => `<button class="mday ${attOf(p.id, d) ? 'on' : ''} ${d === t ? 'today' : ''} ${d > t ? 'future' : ''}" data-action="patt:${p.id}|${d}" aria-pressed="${!!attOf(p.id, d)}" aria-label="${fmtS(d)}">${n2}</button>`) + `<div class="sumrow"><span>Asistencias: <b>${n}</b></span><span>Del mes${cur ? ' a la fecha' : ''}: <b>${pMonth > t.slice(0, 7) ? 0 : Math.round(n / base * 100)}%</b></span></div><p style="margin-top:8px">Toca un día para marcar o quitar la asistencia.</p>`;
  } else if (ptab === 'pagos') {
    const weeks = [0, -7, -14, -21].map(n => weekStart(shift(t, n))), cur = payRow(p, weeks[0]);
    body = `<div class="paybox"><span><small>Próximo pago · martes ${fmtS(shift(weeks[0], 8))}</small><b>${money(cur.net)}</b></span><span>${cur.days} días<small>esta semana</small></span></div>` + table(['Semana', 'Días', 'Pago final', ''], weeks.map(w => { const x = payRow(p, w); return [fmtS(w) + ' – ' + fmtS(shift(w, 6)), x.days, `<span class="num">${money(x.net)}</span>`, x.paid ? badge('Pagado') : x.net > 0 ? badge('Pendiente') : '—']; })) + `<div class="actions" style="margin-top:12px">${btn('＋ Descuento / adicional', 'newmove:' + p.id, 'sm')}</div>`;
  } else {
    const notes = db.notes.filter(n => n.person === p.id).sort((a, b2) => b2.date.localeCompare(a.date)), trips = db.daily.filter(r => worked(r) && crew(r).includes(p.id)), miss = trips.filter(r => r.driver === p.id && hasIssue(r));
    body = `<div class="sumrow" style="margin:0 0 12px"><span>Salidas registradas: <b>${trips.length}</b></span><span>Con incidencia (como conductor): <b>${miss.length}</b></span></div><div class="timeline">${notes.length ? notes.map(n => `<div class="timelineitem"><strong>${esc(n.type)}</strong> · ${esc(n.note)}<small>${fmt(n.date)} · <button class="link" data-action="del:notes|${n.id}">Eliminar</button></small></div>`).join('') : 'Sin notas ni incidencias registradas.'}</div><div class="actions">${btn('＋ Añadir nota o incidencia', 'note:' + p.id, 'sm')}</div>`;
  }
  return `<div class="pphead"><button class="photo" data-action="photoperson:${p.id}" title="Cambiar foto" aria-label="Cambiar foto de ${esc(p.name)}">${avatar(p)}<span class="cam">${ico('camera')}</span></button><div><h2>${esc(p.name)}</h2><small style="margin:0 0 6px">${esc(p.role)} · ${esc(plateOf(p))}</small>${attOf(p.id, t) ? '<span class="badge">Presente hoy</span>' : badge('Sin asistencia hoy')}</div></div>
    ${tabsBar([['perfil', 'Perfil'], ['asistencia', 'Asistencia'], ['pagos', 'Pagos'], ['historial', 'Historial']], ptab, 'ptab')}${body}
    <div class="actions" style="margin-top:16px">${btn('Editar ficha', 'editperson:' + p.id, 'primary')}${p.photo ? btn('Quitar foto', 'rmphotoperson:' + p.id) : ''}</div>`;
}
function showPerson() { if (NARROW() && person(selPerson)) { modal(person(selPerson).name, personPanel()); personModal = true; } else { const el = $('#ppanel'); if (el) el.innerHTML = personPanel(); } $$('.pcard').forEach(c => c.classList.toggle('active', c.dataset.person === selPerson)); hydrate(); }
function peoplePage() {
  const act = db.people.filter(p => p.status === 'Activo'), staff = act.filter(p => !isOwner(p)), pres = db.attendance.filter(a => a.date === today()).length, bd = act.filter(p => { const b = bdayIn(p); return b && b.in <= 30; }).length;
  const sel = (id, val, opts, all) => `<select id="${id}" aria-label="${all}"><option value="">${all}</option>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${val === v ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  return title('Personal', 'Toca una tarjeta para ver toda la información del trabajador y ponerle foto.', btn('↓ Exportar', 'exportpeople') + btn('＋ Nuevo trabajador', 'newperson', 'primary')) +
    `<div class="stats">${stat('Trabajadores activos', act.length, db.people.length + ' registrados')}${stat('Asistencia de hoy', (staff.length ? Math.round(pres / staff.length * 100) : 0) + '%', pres + ' de ' + staff.length + ' marcados', 'up')}${stat('Cumpleaños próximos', bd, 'En los siguientes 30 días')}${stat('Sin foto', act.filter(p => !p.photo).length, 'Agrégala desde su ficha')}</div>` +
    `<div class="pgrid"><div><div class="filters"><input id="search" class="search" placeholder="Buscar trabajador…" aria-label="Buscar trabajador" value="${esc(query)}">${sel('fRole', fRole, [...new Set(db.people.map(p => p.role))].sort(), 'Todos los puestos')}${sel('fState', fState, ['Activo', 'Inactivo'], 'Todos los estados')}${sel('fUnit', fUnit, [...db.trucks.map(u => [u.id, u.plate]), ['cd', 'CD / sin camión']], 'Todos los camiones')}</div><div class="cards" id="cards">${personCards()}</div></div><aside class="sidepanel" id="ppanel">${personPanel()}</aside></div>`;
}

// ---------- Camiones ----------
const fleetFilter = u => matches(u.plate + ' ' + u.brand + ' ' + u.model + ' ' + (u.socio || '')) && (!filter || (filter === 'Con alerta' ? unitAlerts(u.id).length > 0 : filter === 'Operativa' ? u.status === 'Operativa' : u.status === filter));
const fleetScene = () => { const l = db.trucks.filter(fleetFilter); return l.length ? Patio.lot(sceneList(l), selUnit) : '<div class="empty">Ningún camión coincide con la búsqueda.</div>'; };
const docRow = d => `<button class="rowbtn" data-action="doc:${d.id}"><span><strong>${esc(d.type)}</strong><small>${esc(d.number || 'Sin número')}${d.expiry ? ' · vence ' + fmt(d.expiry) : ''}</small></span>${thumbs(d.photos, 2)}${badge(docStatus(d))}</button>`;
function unitPanel() {
  const u = unit(selUnit);
  if (!u) return `<div class="hint">${ico('truck')}<h3 style="margin:12px 0 6px">Elige un camión</h3><p>Toca una unidad para ver su ficha, sus documentos con fotos, su historial de taller y sus gastos.</p></div>`;
  const docs = db.docs.filter(d => d.unit === u.id), mt = db.maint.filter(m => m.unit === u.id).sort((a, b) => b.date.localeCompare(a.date)), al = unitAlerts(u.id);
  let body = '';
  if (utab === 'ficha') {
    const team = db.people.filter(p => p.unit === u.id && p.status === 'Activo').sort((a, b) => roleOrder(a) - roleOrder(b));
    body = kv('Tipo', esc(u.tipo || '—')) + kv('Marca', esc(u.brand || '—')) + kv('Modelo', esc(u.model || '—')) + kv('Año', esc(u.year || '—')) + kv('Modalidad', u.modalidad === 'T1' ? 'T1 · Mayorista' : u.modalidad === 'T2' ? 'T2 · Minorista' : '—') + kv('Socio', esc(u.socio || '—')) + kv('Propietario', esc(u.owner || '—')) + kv('N.º de serie', esc(u.serie || '—')) + kv('Tonelaje bruto / neto', (u.tonBruto || '—') + ' / ' + (u.tonNeto || '—')) + kv('Kilometraje', kms(u.km) + ' km') + kv('Próximo aceite', Number(u.nextOil) ? kms(u.nextOil) + ' km' : 'Sin programar') + kv('Papeletas', Number(u.papeletas) || 0, Number(u.papeletas) ? 'red' : '') +
      `<h3>Personal asignado</h3>${team.map(p => `<button class="rowbtn" data-action="person:${p.id}"><span><strong>${esc(short(p.name))}</strong><small>${esc(p.role)}</small></span><span class="link">Ver ↗</span></button>`).join('') || '<p>Sin personal asignado.</p>'}` + (al.length ? `<h3>Alertas</h3>${al.map(a => kv(esc(a.title.split(' · ')[0]), `<span class="badge ${a.danger ? 'red' : 'amber'}">${esc(a.tag)}</span>`)).join('')}` : '') + `<div class="actions">${btn('Editar camión', 'editunit:' + u.id, 'primary')}</div>`;
  } else if (utab === 'docs') body = (docs.map(docRow).join('') || '<p>Sin documentos registrados.</p>') + `<div class="actions">${btn('＋ Documento', 'unitdoc:' + u.id, 'primary')}</div><p style="margin-top:10px">Toca un documento para ponerle fecha de vencimiento y fotos.</p>`;
  else if (utab === 'historial') {
    const inc = db.daily.filter(r => r.unit === u.id && hasIssue(r)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    body = `<h3 style="margin-top:4px">Taller</h3>${mt.map(m => `<button class="rowbtn" data-action="maint:${m.id}"><span><strong>${esc(m.type)}</strong><small>${fmt(m.date)} · ${money(m.cost)}${m.note ? ' · ' + esc(m.note.slice(0, 50)) : ''}</small></span>${thumbs(m.photos, 2)}</button>`).join('') || '<p>Sin servicios registrados.</p>'}<h3>Incidencias de reparto</h3>${inc.map(r => `<div class="ditem">${esc(issueText(r))}<small>${fmt(r.date)} · ${esc(pname(r.driver))}</small></div>`).join('') || '<p>Sin incidencias registradas.</p>'}<div class="actions">${btn('＋ Servicio de taller', 'unitmaint:' + u.id, 'primary')}</div>`;
  } else {
    const m = today().slice(0, 7), r = db.daily.filter(x => x.unit === u.id && worked(x) && x.date.slice(0, 7) === m), taller = sum(mt.filter(x => x.date.slice(0, 7) === m), 'cost');
    body = `<p style="text-transform:capitalize;margin-bottom:6px">${monthName(m)}</p>` + kv('Salidas', r.length) + kv('Combustible', money(sum(r, 'fuel'))) + kv('Peajes', money(sum(r, 'toll'))) + kv('Adicionales', money(sum(r, 'extra'))) + kv('Taller', money(taller)) + kv('Total del mes', `<strong>${money(r.reduce((a, x) => a + spend(x), 0) + taller)}</strong>`) + `<h3>Últimas salidas</h3>${db.daily.filter(x => x.unit === u.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(x => `<button class="rowbtn" data-action="daily:${x.id}"><span><strong>${fmtS(x.date)}</strong><small>${esc(crew(x).map(first).join(', '))}</small></span><span class="num">${money(spend(x))}</span></button>`).join('') || '<p>Sin salidas registradas.</p>'}`;
  }
  return `<div class="tphead"><div><h2>${esc(u.plate)}</h2><small>${esc(u.brand + ' ' + u.model)} · ${esc(u.year)}</small></div>${badge(unitState(u) === 'En patio' ? 'Operativa' : unitState(u))}</div>${tabsBar([['ficha', 'Ficha'], ['docs', 'Documentos'], ['historial', 'Historial'], ['gastos', 'Gastos']], utab, 'utab')}${body}`;
}
function showUnit(scroll) { const p = $('#upanel'); if (!p) return; p.innerHTML = unitPanel(); $$('#flotascene .trk').forEach(g => g.classList.toggle('sel', g.dataset.truck === selUnit)); hydrate(); if (scroll && selUnit && NARROW()) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
function fleetPage() {
  const al = allAlerts(), chip = (i, l, v) => `<div class="chip"><span class="ci">${ico(i)}</span><span>${l}<b>${v}</b></span></div>`;
  return title('Camiones', 'Toca un camión para ver su ficha, documentos, historial y gastos.', btn('↓ Exportar', 'exportfleet') + btn('＋ Nuevo camión', 'newunit', 'primary')) +
    `<div class="live"><div class="scenecard"><div class="chips">${chip('truck', 'Unidades', db.trucks.length)}${chip('box', 'Operativas', db.trucks.filter(u => u.status === 'Operativa').length)}${chip('bell', 'Con alerta', db.trucks.filter(u => unitAlerts(u.id, al).length).length)}${chip('wrench', 'En taller / inactivas', db.trucks.filter(u => u.status !== 'Operativa').length)}</div>
    <div class="toolbar" style="border:0;position:relative;z-index:2">${`<input id="search" class="search" placeholder="Buscar por placa, marca o socio…" aria-label="Buscar camión" value="${esc(query)}"><select id="filter" aria-label="Filtrar"><option value="">Todos</option>${['Operativa', 'En taller', 'Inactiva', 'Con alerta'].map(o => `<option ${filter === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`}</div>
    <div class="scenewrap" id="flotascene">${fleetScene()}</div>
    <div class="scenefoot"><div class="legend"><span><i class="sdot"></i>Operativa</span><span><i class="sdot ruta"></i>En ruta</span><span><i class="sdot taller"></i>En taller</span><span><i class="sdot inactiva"></i>Inactiva</span><span>Borde ámbar: con alerta</span></div></div></div>
    <aside class="sidepanel" id="upanel">${unitPanel()}</aside></div>`;
}

// ---------- Documentos y mantenimiento ----------
const docsFilter = d => unit(d.unit) && matches(plate(d.unit) + ' ' + d.type + ' ' + d.number) && (!filter || docStatus(d) === filter) && (!fType || d.type === fType);
const docsTable = rows => table(['Camión', 'Documento', 'Número', 'Vencimiento', 'Fotos', 'Estado', ''], [...rows].sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999') || plate(a.unit).localeCompare(plate(b.unit))).map(d => [`<strong>${esc(plate(d.unit))}</strong>`, esc(d.type), esc(d.number || '—'), d.expiry ? `${fmt(d.expiry)}<small>${due(d.expiry) < 0 ? Math.abs(due(d.expiry)) + ' días vencido' : due(d.expiry) + ' días restantes'}</small>` : '—', thumbs(d.photos), badge(docStatus(d)), `<button class="link" data-action="doc:${d.id}">Editar / fotos ↗</button>`]), 'Sin documentos registrados.');
function docsPage() {
  const ds = db.docs.filter(d => unit(d.unit)), st = s => ds.filter(d => docStatus(d) === s).length;
  return title('Documentos y vencimientos', 'SOAT, CITV, TUC, tarjeta de identificación vehicular, seguros y permisos, con fotos. Aviso 30 días antes del vencimiento.', btn('↓ Exportar', 'exportdocs') + btn('＋ Registrar documento', 'newdoc', 'primary')) +
    `<div class="stats">${stat('Documentos', ds.length, ds.filter(d => (d.photos || []).length).length + ' con foto')}${stat('Vigentes', st('Vigente'), 'Más de 30 días', 'up')}${stat('Por vencer o vencidos', st('Por vencer') + st('Vencido'), st('Vencido') + ' vencidos', st('Vencido') ? 'red' : 'warn')}${stat('Falta fecha', st('Falta fecha'), 'Completa el vencimiento', st('Falta fecha') ? 'warn' : '')}</div>` +
    card('Control documental', 'Abre un documento para poner su fecha de vencimiento y sus fotos. Toca una foto para verla en grande.', toolbar('Buscar por placa, tipo o número…', ['Vigente', 'Por vencer', 'Vencido', 'Falta fecha', 'Sin vencimiento'], `<select id="fType" aria-label="Filtrar por tipo de documento"><option value="">Todos los tipos</option>${[...new Set([...DOC_TYPES.slice(0, -1), ...ds.map(d => d.type)])].map(o => `<option ${fType === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`) + `<div id="results">${docsTable(db.docs.filter(docsFilter))}</div>`);
}
const maintFilter = m => matches(plate(m.unit) + ' ' + m.type + ' ' + m.shop + ' ' + m.note);
const maintTable = rows => table(['Fecha / camión', 'Servicio', 'Taller', 'Kilometraje', 'Costo', 'Fotos', ''], [...rows].sort((a, b) => b.date.localeCompare(a.date)).map(m => [who(fmt(m.date), plate(m.unit)), who(m.type, (m.note || '').slice(0, 60)), esc(m.shop || '—'), `<span class="num">${Number(m.km) ? kms(m.km) + ' km' : '—'}</span>`, `<span class="num">${money(m.cost)}</span>`, thumbs(m.photos), `<button class="link" data-action="maint:${m.id}">Editar / fotos ↗</button>`]), 'Sin servicios registrados.');
function maintPage() {
  const m30 = db.maint.filter(m => days(today(), m.date) <= 30);
  return title('Mantenimiento', 'Fallos, visitas al taller y cambios de aceite, con fotos como constancia.', btn('↑ Importar', 'importmaint') + btn('↓ Exportar', 'exportmaint') + btn('＋ Registrar servicio', 'newmaint', 'primary')) +
    `<div class="stats">${stat('Servicios', db.maint.length, 'En el historial')}${stat('Últimos 30 días', m30.length, money(sum(m30, 'cost')) + ' en taller')}${stat('Cambios de aceite pendientes', db.trucks.filter(u => Number(u.nextOil) > 0 && Number(u.km) >= Number(u.nextOil)).length, 'Por kilometraje', 'warn')}${stat('Camiones en taller', db.trucks.filter(u => u.status === 'En taller').length, 'Ahora mismo')}</div>` +
    card('Historial de taller', 'El costo de taller se lleva aparte del gasto de reparto.', toolbar('Buscar por placa, servicio o taller…') + `<div id="results">${maintTable(db.maint.filter(maintFilter))}</div>`);
}

// ---------- Reportes ----------
function reportesPage() {
  const inM = d => d.slice(0, 7) === repMonth, rows = db.daily.filter(r => inM(r.date)), done = rows.filter(worked), mt = db.maint.filter(m => inM(m.date)), att = db.attendance.filter(a => inM(a.date));
  const per = db.trucks.map(u => { const r = done.filter(x => x.unit === u.id), taller = sum(mt.filter(m => m.unit === u.id), 'cost'); return { u, n: r.length, fuel: sum(r, 'fuel'), toll: sum(r, 'toll'), extra: sum(r, 'extra'), taller, total: r.reduce((a, x) => a + spend(x), 0) + taller }; });
  const max = Math.max(...per.map(x => x.total), 1);
  const ppl = db.people.map(p => ({ p, d: att.filter(a => a.person === p.id).length, s: done.filter(r => crew(r).includes(p.id)).length, mm: sum(done.filter(r => r.driver === p.id), 'missingMoney'), mg: sum(done.filter(r => r.driver === p.id), 'missingGoods') })).filter(x => x.d || x.s).sort((a, b) => b.d - a.d);
  const lw = weekStart(shift(today(), -7)), unpaid = db.people.map(p => payRow(p, lw)).filter(x => !x.paid && x.net > 0), al = allAlerts();
  return title('Reportes', 'Indicadores del mes, gasto por camión, desempeño y pendientes.', `<input aria-label="Mes" class="date" type="month" id="repMonth" value="${repMonth}">` + btn('↓ Exportar mes', 'exportmonth')) +
    `<div class="stats">${stat('Salidas realizadas', done.length, rows.filter(r => r.status === 'Cancelada').length + ' canceladas')}${stat('Gasto operativo', money(done.reduce((a, r) => a + spend(r), 0)), 'Combustible, peajes y adicionales')}${stat('Gasto en taller', money(sum(mt, 'cost')), mt.length + ' servicios')}${stat('Faltantes', money(sum(done, 'missingMoney')), sum(done, 'missingGoods') + ' bultos de mercadería', sum(done, 'missingMoney') ? 'red' : '')}</div>` +
    card('Gasto por camión', 'Reparto y taller en el mes.', table(['Camión', 'Salidas', 'Combustible', 'Peajes', 'Adicionales', 'Taller', 'Total'], per.map(x => [`<strong>${esc(x.u.plate)}</strong>`, x.n, `<span class="num">${money(x.fuel)}</span>`, `<span class="num">${money(x.toll)}</span>`, `<span class="num">${money(x.extra)}</span>`, `<span class="num">${money(x.taller)}</span>`, `<span class="barcell"><i style="width:${Math.round(x.total / max * 90)}px"></i><strong class="num">${money(x.total)}</strong></span>`]))) +
    `<div class="grid2">${card('Personal en el mes', 'Días asistidos, salidas y faltantes como conductor.', table(['Trabajador', 'Días', 'Salidas', 'Faltante S/', 'Bultos'], ppl.map(x => [who(short(x.p.name), x.p.role), x.d, x.s || '—', x.mm ? `<span class="num red">${money(x.mm)}</span>` : '—', x.mg || '—']), 'Sin actividad registrada en el mes.'))}${card('Pendientes', 'Lo que requiere atención hoy.', (unpaid.length ? `<div class="alertrow"><span class="alerticon">S/</span><div><button class="link" data-action="go:pagos">Pagos de la semana anterior</button><small>${unpaid.length} trabajadores · ${money(sum(unpaid, 'net'))}</small></div><span class="badge amber">Pendiente</span></div>` : '') + (al.length || !unpaid.length ? alertRows(al) : ''))}</div>`;
}

// ---------- Calendario ----------
function dayInfo(d) { const recs = db.daily.filter(r => r.date === d && r.status !== 'Cancelada'); return { bdays: db.people.filter(p => p.status === 'Activo' && p.birth && p.birth.slice(5) === d.slice(5)), recs, inc: recs.filter(hasIssue), maint: db.maint.filter(m => m.date === d), docs: db.docs.filter(x => x.expiry === d && unit(x.unit)), att: db.attendance.filter(a => a.date === d).length, notes: db.notes.filter(n => n.date === d), events: db.events.filter(e => e.date === d) }; }
function eventForm(id, date) { const e = db.events.find(x => x.id === id) || {}; form(e.id ? 'Editar recordatorio' : 'Nuevo recordatorio o evento', field('title', 'Título', e.title, 'text', true, 'maxlength="80" placeholder="Ej.: Renovar SOAT de ABR892"') + field('date', 'Fecha', e.date || date || calDay, 'date') + textField('note', 'Detalle (opcional)', e.note), data => { data.title = data.title.trim(); calDay = data.date; calMonth = data.date.slice(0, 7); upsert('events', id, data); }, e.id ? 'events|' + e.id : null); }
function daySummary() {
  const d = calDay, i = dayInfo(d), sec = (t, items, empty) => `<h3 class="dsec">${t}</h3>${items.length ? items.join('') : `<p>${empty}</p>`}`;
  return `<div class="pad"><div class="stats" style="grid-template-columns:1fr 1fr;margin-bottom:6px">${stat('Asistencias', i.att, 'Marcadas ese día')}${stat('Salidas', i.recs.length, money(i.recs.reduce((a, r) => a + spend(r), 0)) + ' en gastos')}</div>` +
    `<h3 class="dsec" style="display:flex;justify-content:space-between;align-items:center">Recordatorios y eventos ${btn('＋ Agregar', 'newevent:' + d, 'sm primary')}</h3>${i.events.map(e => `<button class="rowbtn" data-action="event:${e.id}"><span><strong>${esc(e.title)}</strong>${e.note ? `<small>${esc(e.note)}</small>` : ''}</span><span class="link">Editar</span></button>`).join('') || '<p>Sin recordatorios para este día.</p>'}` +
    sec('🎂 Cumpleaños', i.bdays.map(p => `<div class="ditem"><button class="link" data-action="person:${p.id}">${esc(p.name)}</button><small>Cumple ${+d.slice(0, 4) - +p.birth.slice(0, 4)} años · ${esc(p.role)} · ${esc(plateOf(p))}</small></div>`), 'Nadie cumple años este día.') +
    sec('Incidencias de camiones', [...i.inc.map(r => `<div class="ditem"><button class="link" data-action="daily:${r.id}">${esc(plate(r.unit))}</button> · ${esc(issueText(r))}<small>${esc(pname(r.driver))}${r.note ? ' · ' + esc(r.note) : ''}</small></div>`), ...i.maint.map(m => `<div class="ditem"><button class="link" data-action="maint:${m.id}">${esc(plate(m.unit))}</button> · Taller: ${esc(m.type)} · ${money(m.cost)}<small>${esc(m.note || m.shop || '')}</small> ${thumbs(m.photos, 4) === '—' ? '' : thumbs(m.photos, 4)}</div>`)], 'Sin incidencias ni servicios de taller.') +
    sec('Salidas del día', i.recs.map(r => `<div class="ditem"><button class="link" data-action="daily:${r.id}">${esc(plate(r.unit))}</button> · ${esc(r.status)} · ${money(spend(r))}<small>${esc(crew(r).map(first).join(', '))}</small></div>`), 'Sin salidas registradas.') +
    (i.docs.length ? sec('Vencimientos', i.docs.map(x => `<div class="ditem"><button class="link" data-action="doc:${x.id}">${esc(x.type)} · ${esc(plate(x.unit))}</button></div>`), '') : '') +
    (i.notes.length ? sec('Notas del personal', i.notes.map(n => `<div class="ditem"><strong>${esc(n.type)}</strong> · ${esc(pname(n.person))}<small>${esc(n.note)}</small></div>`), '') : '') + '</div>';
}
function calendarPage() {
  const t = today();
  const cell = (d, n) => { const i = dayInfo(d); return `<button class="cday ${d === t ? 'today' : ''} ${d === calDay ? 'sel' : ''}" data-action="calday:${d}" aria-label="${fmtLong(d)}"><b>${n}</b><span class="marks">${i.events.length ? `<span class="e" title="${esc(i.events.map(e => e.title).join(' · '))}">${i.events.length === 1 ? esc(i.events[0].title.slice(0, 14)) : i.events.length + ' record.'}</span>` : ''}${i.bdays.length ? `<span class="b">🎂${i.bdays.length > 1 ? ' ' + i.bdays.length : ''}</span>` : ''}${i.recs.length ? `<span>${i.recs.length} sal.</span>` : ''}${i.inc.length + i.maint.length ? `<span class="w">${i.inc.length + i.maint.length} inc.</span>` : ''}${i.docs.length ? `<span class="d">${i.docs.length} venc.</span>` : ''}</span></button>`; };
  return title('Calendario', 'Recordatorios, cumpleaños, incidencias de los camiones y resumen de cada día.', btn('Hoy', 'caltoday') + btn('＋ Recordatorio', 'newevent:' + calDay, 'primary')) +
    `<div class="calwrap"><section class="card"><div class="bigcal">${monthNav(calMonth, 'calmonth')}${monthGrid(calMonth, cell)}</div><div class="callegend"><span><b style="color:#5B3FD6">■</b> Recordatorios</span><span>🎂 Cumpleaños</span><span><b style="color:var(--blue)">sal.</b> Salidas</span><span><b class="warn">inc.</b> Incidencias y taller</span><span><b class="red">venc.</b> Vencimientos</span></div></section>${card('Resumen del día', `<span style="text-transform:capitalize">${fmtLong(calDay)}</span>`, daySummary())}</div>`;
}

// ---------- Configuración ----------
function configPage() {
  return title('Configuración', 'Respaldo de la información y estado de la sincronización.') +
    card('Dónde están tus datos', '', `<div class="pad"><div class="note"><b>Por ahora los datos y las fotos se guardan solo en este dispositivo y navegador.</b> Para que todos vean lo mismo desde el celular y la computadora falta conectar la página a una base de datos en la nube con usuarios y contraseñas. Mientras tanto, descarga un respaldo con frecuencia: incluye las fotos y sirve para pasar todo a otro equipo.</div><div class="actions">${btn('↓ Descargar respaldo', 'backup', 'primary')}${btn('↑ Restaurar respaldo', 'restore')}</div><input id="backupfile" type="file" accept="application/json,.json" hidden></div>`) +
    card('Datos iniciales', '', `<div class="pad"><p>La página arrancó con el personal y los camiones de tu Excel (Libro1.xlsx). Puedes volver a ese punto de partida o dejar todo vacío.</p><div class="actions" style="margin-top:14px">${btn('Volver a los datos del Excel', 'reset')}${btn('Vaciar todo', 'clear', 'danger')}</div><p style="margin-top:18px">Moneda: soles (PEN) · Zona horaria: Lima · Aviso de documentos: 30 días · Aviso de cumpleaños: 7 días · Semana de pago: lunes a domingo, pago el martes siguiente.</p></div>`);
}

// ---------- Render ----------
const VIEWS = { patio: patioPage, reparto: repartoPage, asistencia: asistenciaPage, pagos: pagosPage, personal: peoplePage, flota: fleetPage, documentos: docsPage, mantenimiento: maintPage, reportes: reportesPage, calendario: calendarPage, config: configPage };
function render() {
  const a = allAlerts(), nd = a.filter(x => x.doc).length, navBtn = (r, n) => `<button class="${page === r[0] ? 'active' : ''}" data-action="go:${r[0]}">${ico(r[1])}<span>${n || r[2]}</span>${r[0] === 'documentos' && nd ? `<span class="num">${nd}</span>` : ''}</button>`;
  const keepScroll = $('#main').dataset.page === page ? $$('#main .tablewrap').map(e => e.scrollLeft) : [];
  $('#nav').innerHTML = PAGES.map(r => navBtn(r)).join('');
  $('#tabs').innerHTML = PAGES.slice(0, 4).map((r, i) => navBtn(r, ['Patio', 'Reparto', 'Asistencia', 'Pagos'][i])).join('') + `<button class="${PAGES.findIndex(r => r[0] === page) > 3 ? 'active' : ''}" data-action="more">${ico('more')}<span>Más</span></button>`;
  $('#crumb').textContent = PAGES.find(r => r[0] === page)?.[2] || '';
  $('#todaylabel').textContent = fmtLong(today());
  $('#alertCount').textContent = a.length || '';
  $('#main').innerHTML = (VIEWS[page] || patioPage)(); $('#main').dataset.page = page;
  $$('#main .tablewrap').forEach((e, i) => { if (keepScroll[i]) e.scrollLeft = keepScroll[i]; });
  const pz = window.patioScroll; $$('.scenewrap').forEach(w => { if (w.id !== 'scenewrap') w.scrollLeft = (w.scrollWidth - w.clientWidth) / 2; });
  applyZoom(false); const sw = $('#scenewrap'); if (sw) { if (pz) { sw.scrollLeft = pz.x * sw.scrollWidth; sw.scrollTop = pz.y * sw.scrollHeight; } else { sw.scrollLeft = Patio.focus.x * sw.scrollWidth - sw.clientWidth / 2; sw.scrollTop = Patio.focus.y * sw.scrollHeight - sw.clientHeight / 2; } sw.onscroll = () => window.patioScroll = { x: sw.scrollLeft / sw.scrollWidth, y: sw.scrollTop / sw.scrollHeight }; }
  hydrate();
}
function go(p) { page = p; query = ''; filter = ''; if (location.hash.slice(1) !== p) history.replaceState(null, '', '#' + p); render(); scrollTo(0, 0); }
function updateResults() {
  if (page === 'personal') { $('#cards').innerHTML = personCards(); return hydrate(); }
  if (page === 'flota') { $('#flotascene').innerHTML = fleetScene(); return; }
  if (page === 'asistencia') { $('#results').innerHTML = payTables().att; return; }
  if (page === 'pagos') { $('#results2').innerHTML = payTables().pay; return; }
  const el = $('#results'); if (!el) return;
  const f = { documentos: () => docsTable(db.docs.filter(docsFilter)), mantenimiento: () => maintTable(db.maint.filter(maintFilter)), reparto: () => dailyTable(db.daily.filter(dailyFilter)) }[page];
  if (f) { el.innerHTML = f(); hydrate(); }
}

// ---------- Modal y formularios ----------
function modal(t, body) { personModal = false; $('#modalbody').innerHTML = `<div class="modalhead"><h2>${esc(t)}</h2><button class="close" aria-label="Cerrar" data-action="close">×</button></div><div class="modalcontent">${body}</div>`; const m = $('#modal'); if (!m.open) m.showModal(); m.scrollTop = 0; hydrate(); }
function closeModal() { personModal = false; backTo = null; if ($('#modal').open) $('#modal').close(); }
const field = (name, label, value = '', type = 'text', required = true, extra = '') => `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required ? 'required' : ''} ${extra}></label>`;
const numField = (name, label, value, step = '0.01') => field(name, label, Number(value) ? value : '', 'number', false, `min="0" step="${step}" inputmode="decimal" placeholder="0"`);
const selectField = (name, label, options, value = '', required = true) => `<label class="field">${label}<select name="${name}" ${required ? 'required' : ''}>${options.map(o => { const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return `<option value="${esc(v)}" ${String(value ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></label>`;
const textField = (name, label, value = '') => `<label class="field wide">${label}<textarea name="${name}" rows="3" maxlength="4000">${esc(value)}</textarea></label>`;
const sec = t => `<h3 class="formsec wide">${t}</h3>`;
const photoThumbs = () => formPhotos.map(id => `<span class="thumb"><img src="${PX}" data-foto="${id}" data-action="view:${id}" alt="Foto"><button type="button" class="rm" data-action="rmphoto:${id}" aria-label="Quitar foto">×</button></span>`).join('') + `<button type="button" class="addphoto" data-action="addphotos">${ico('camera')}<span>Agregar foto</span></button>`;
const photoBox = label => `<div class="wide"><div class="flabel">${label}</div><div class="photos" id="fphotos">${photoThumbs()}</div></div>`;
function form(t, fields, onSubmit, del, ok = 'Guardar') {
  modal(t, `<form id="editor"><div class="formgrid">${fields}</div><div class="formactions">${del ? btn('Eliminar', 'del:' + del, 'danger') + '<span class="spacer"></span>' : ''}${btn('Cancelar', 'close')}<button type="submit" class="btn primary">${ok}</button></div></form>`);
  $('#editor').onsubmit = e => { e.preventDefault(); onSubmit(Object.fromEntries(new FormData(e.target))); };
}
function upsert(list, id, data, msg) { const i = db[list].findIndex(r => r.id === id); if (i >= 0) db[list][i] = { ...db[list][i], ...data }; else db[list].push({ id: uid(), ...data }); save(msg); }
const detailGrid = items => `<div class="details">${items.map(([l, v]) => `<div><small>${esc(l)}</small><b>${esc(v === 0 ? '0' : v || 'Sin registrar')}</b></div>`).join('')}</div>`;
const confirmAction = (t, body, action, label = 'Confirmar') => modal(t, `<p>${body}</p><div class="formactions">${btn('Cancelar', 'close')}${btn(label, action, 'primary')}</div>`);
const activePeople = (keep = []) => db.people.filter(p => p.status === 'Activo' || keep.includes(p.id)).sort((a, b) => a.name.localeCompare(b.name)).map(p => [p.id, p.name + ' · ' + p.role]);
const unitOptions = () => [['', 'CD / sin camión'], ...db.trucks.map(u => [u.id, u.plate])];

function personForm(id) {
  const p = person(id) || {};
  form(p.id ? 'Editar trabajador' : 'Nuevo trabajador', field('name', 'Nombre completo', p.name) + field('dni', 'DNI / CE', p.dni, 'text', false) + selectField('role', 'Puesto', ROLES, p.role || 'Auxiliar') + selectField('unit', 'Camión asignado', unitOptions(), p.unit, false) + numField('rate', 'Monto diario (S/)', p.rate) + field('phone', 'Celular', p.phone, 'tel', false) + field('birth', 'Fecha de nacimiento', p.birth, 'date', false) + field('start', 'Fecha de ingreso', p.start, 'date', false) + field('license', 'Licencia / categoría', p.license, 'text', false) + field('licenseExpiry', 'Vencimiento de licencia', p.licenseExpiry, 'date', false) + selectField('status', 'Estado', ['Activo', 'Inactivo'], p.status),
    data => { data.name = data.name.trim(); if (data.dni && db.people.some(x => x.dni === data.dni && x.id !== id)) return toast('Ya existe un trabajador con ese documento'); data.rate = Number(data.rate); if (!id) { data.photo = ''; } upsert('people', id, data); });
}
function noteForm(id) { form('Nota · ' + short(pname(id)), field('date', 'Fecha', today(), 'date') + selectField('type', 'Tipo', ['Nota', 'Incidencia', 'Reconocimiento', 'Sanción', 'Capacitación']) + textField('note', 'Detalle'), data => { if (!data.note.trim()) return toast('Escribe el detalle de la nota'); upsert('notes', null, { person: id, ...data }); }); }
function unitForm(id) {
  const u = unit(id) || {};
  form(u.id ? 'Editar camión ' + u.plate : 'Nuevo camión', field('plate', 'Placa', u.plate) + selectField('modalidad', 'Modalidad', [['T2', 'T2 · Minorista'], ['T1', 'T1 · Mayorista']], u.modalidad) + selectField('tipo', 'Tipo de camión', TIPOS, u.tipo || '4 t') + field('brand', 'Marca', u.brand) + field('model', 'Modelo', u.model) + field('year', 'Año', u.year || new Date().getFullYear(), 'number', true, 'min="1950" max="2100"') + field('serie', 'N.º de serie', u.serie, 'text', false) + field('socio', 'Socio', u.socio, 'text', false) + field('owner', 'Propietario', u.owner, 'text', false) + numField('tonBruto', 'Tonelaje bruto', u.tonBruto) + numField('tonNeto', 'Tonelaje neto (Gloria)', u.tonNeto) + numField('km', 'Kilometraje actual', u.km, '1') + numField('nextOil', 'Próximo cambio de aceite (km)', u.nextOil, '1') + numField('papeletas', 'Papeletas pendientes', u.papeletas, '1') + selectField('driver', 'Conductor', [['', '— Sin asignar —'], ...activePeople([u.driver])], u.driver, false) + selectField('status', 'Estado', ['Operativa', 'En taller', 'Inactiva'], u.status),
    data => { data.plate = data.plate.trim().toUpperCase(); if (db.trucks.some(x => x.plate === data.plate && x.id !== id)) return toast('Esa placa ya está registrada'); ['km', 'nextOil', 'year', 'papeletas'].forEach(k => data[k] = Number(data[k])); upsert('trucks', id, data); });
}
function docForm(id, unitId) {
  if (!db.trucks.length) return toast('Primero registra un camión');
  const d = db.docs.find(x => x.id === id) || {}; formPhotos = [...(d.photos || [])];
  form(d.id ? d.type + ' · ' + plate(d.unit) : 'Registrar documento', selectField('unit', 'Camión', db.trucks.map(u => [u.id, u.plate]), d.unit || unitId) + selectField('type', 'Tipo', [...new Set([...DOC_TYPES, d.type].filter(Boolean))], d.type) + field('number', 'Número de documento', d.number, 'text', false) + field('expiry', 'Fecha de vencimiento', d.expiry, 'date', false) + photoBox('Fotos del documento'),
    data => upsert('docs', id, { ...data, photos: [...formPhotos] }), d.id ? 'docs|' + d.id : null);
}
function maintForm(id, unitId) {
  if (!db.trucks.length) return toast('Primero registra un camión');
  const m = db.maint.find(x => x.id === id) || {}, u = unit(m.unit || unitId) || db.trucks[0]; formPhotos = [...(m.photos || [])];
  form(m.id ? 'Servicio · ' + plate(m.unit) : 'Registrar servicio de taller', selectField('unit', 'Camión', db.trucks.map(x => [x.id, x.plate]), m.unit || unitId) + field('date', 'Fecha', m.date || today(), 'date') + selectField('type', 'Tipo', ['Cambio de aceite', 'Reparación', 'Incidente / desperfecto', 'Mantenimiento preventivo', 'Neumáticos', 'Frenos', 'Inspección', 'Otro'], m.type) + field('shop', 'Taller / proveedor', m.shop, 'text', false) + numField('km', 'Kilometraje', m.km || u.km, '1') + numField('cost', 'Costo (S/)', m.cost) + numField('nextKm', 'Próximo servicio (km)', m.nextKm, '1') + field('nextDate', 'Próxima revisión (fecha)', m.nextDate, 'date', false) + textField('note', 'Qué pasó / trabajo realizado', m.note) + photoBox('Fotos de constancia'),
    data => { ['km', 'cost'].forEach(k => data[k] = Number(data[k])); const t = unit(data.unit); if (data.km) t.km = Math.max(Number(t.km), data.km); if (data.type === 'Cambio de aceite' && Number(data.nextKm)) t.nextOil = Number(data.nextKm); upsert('maint', id, { ...data, photos: [...formPhotos] }); }, m.id ? 'maint|' + m.id : null);
}
function moveForm(id, pid, type) {
  if (!db.people.length) return toast('Primero registra un trabajador');
  const m = db.moves.find(x => x.id === id) || {}, t = today(), inWeek = t >= payWeek && t <= shift(payWeek, 6), back = $('#constSel')?.value || null;
  setTimeout(() => backTo = back);
  form(m.id ? 'Editar ' + m.type.toLowerCase() : 'Descuento, adelanto o adicional', selectField('person', 'Trabajador', activePeople([m.person, pid]), m.person || pid) + selectField('type', 'Tipo', ['Descuento', 'Adelanto', 'Adicional'], m.type || type) + field('amount', 'Monto (S/)', m.amount, 'number', true, 'min="0.01" step="0.01" inputmode="decimal"') + field('date', 'Fecha (define la semana de pago)', m.date || (inWeek ? t : shift(payWeek, 6)), 'date') + textField('note', 'Motivo', m.note), data => { data.amount = Number(data.amount); upsert('moves', id, data); }, m.id ? 'moves|' + m.id : null);
}
function dailyForm(id, pre = {}) {
  if (!db.trucks.length || !db.people.length) return toast('Primero registra un camión y un trabajador');
  const old = db.daily.find(x => x.id === id), r = { date: selected, status: 'Programada', ...(old || {}), ...pre }, ppl = [['', '— Sin asignar —'], ...activePeople(crew(r))];
  form(old ? 'Reparto · ' + plate(r.unit) : 'Registrar reparto',
    sec('Salida') + field('date', 'Fecha', r.date, 'date') + selectField('unit', 'Camión', db.trucks.filter(u => u.status !== 'Inactiva' || u.id === r.unit).map(u => [u.id, u.plate + ' · ' + u.brand]), r.unit) + selectField('status', 'Estado', ['Programada', 'En ruta', 'Completada', 'Cancelada'], r.status) + selectField('driver', 'Conductor', ppl, r.driver) + selectField('helper1', 'Auxiliar 1', ppl, r.helper1, false) + selectField('helper2', 'Auxiliar 2', ppl, r.helper2, false) + selectField('helper3', 'Auxiliar 3', ppl, r.helper3, false) + selectField('helper4', 'Auxiliar 4 (camión de 8 t)', ppl, r.helper4, false) +
    sec('Gastos') + numField('fuel', 'Combustible (S/)', r.fuel) + numField('gallons', 'Galones', r.gallons) + numField('toll', 'Peajes (S/)', r.toll) + numField('extra', 'Gastos adicionales (S/)', r.extra) + field('extraNote', 'Motivo del gasto adicional', r.extraNote, 'text', false) + numField('km', 'Kilometraje al retorno', r.km, '1') +
    sec('Incidencias') + numField('missingGoods', 'Mercadería faltante (bultos)', r.missingGoods, '1') + numField('missingMoney', 'Faltante de dinero (S/)', r.missingMoney) + field('fault', 'Desperfecto del camión', r.fault, 'text', false) + textField('note', 'Notas', r.note),
    data => {
      const c = crew(data); if (new Set(c).size !== c.length) return toast('Un trabajador está repetido en la tripulación');
      ['fuel', 'gallons', 'toll', 'extra', 'missingGoods', 'missingMoney'].forEach(k => data[k] = Number(data[k]));
      const u = unit(data.unit); if (Number(data.km)) { data.km = Number(data.km); u.km = Math.max(Number(u.km), data.km); }
      if (data.status === 'En ruta' && u.status === 'En taller') return toast('Ese camión figura en taller. Cambia su estado antes de sacarlo a ruta.');
      markCrew(data, !old); upsert('daily', id, data);
    }, old ? 'daily|' + old.id : null);
  if (!old) {
    const f = $('#editor').elements, sync = () => {
      const u = unit(f.unit.value), ids = u ? unitCrew(u) : [];
      f.driver.value = ids[0] || ''; HELPERS.forEach((k, i) => f[k].value = ids[i + 1] || '');
    };
    f.unit.onchange = sync; sync();
  }
}
function dailyDetail(id) {
  const r = db.daily.find(x => x.id === id); if (!r) return;
  modal('Reparto · ' + plate(r.unit), detailGrid([['Fecha', fmt(r.date)], ['Estado', r.status], ['Conductor', pname(r.driver)], ['Auxiliares', [r.helper1, r.helper2, r.helper3, r.helper4].filter(Boolean).map(pname).join(', ') || '—'], ['Combustible', money(r.fuel) + (Number(r.gallons) ? ' · ' + r.gallons + ' gal' : '')], ['Peajes', money(r.toll)], ['Adicionales', money(r.extra) + (r.extraNote ? ' · ' + r.extraNote : '')], ['Gasto total', money(spend(r))], ['Mercadería faltante', (r.missingGoods || 0) + ' bultos'], ['Faltante de dinero', money(r.missingMoney)], ['Km al retorno', Number(r.km) ? kms(r.km) : '—']]) +
    `<h3 class="sectiontitle">Desperfectos y notas</h3><div class="note">${esc(r.fault || 'Sin desperfectos reportados.')}${r.note ? '<br>' + esc(r.note) : ''}</div><div class="actions">${r.status === 'Programada' ? btn('Marcar salida', 'depart:' + id, 'primary') : r.status === 'En ruta' ? btn('Registrar retorno', 'return:' + id, 'primary') : ''}${btn('Editar', 'editdaily:' + id)}</div>`);
}

// ---------- Exportar y respaldo ----------
function download(name, content, type) { const a = document.createElement('a'), url = URL.createObjectURL(new Blob([content], { type })); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function csv(name, cols, data) { const cell = v => { let s = String(v ?? ''); if (/^[=+@\-\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }; download(name, '﻿' + [cols, ...data].map(r => r.map(cell).join(';')).join('\r\n'), 'text/csv;charset=utf-8'); toast('Archivo descargado (se abre con Excel)'); }
function exportDaily(rows, name) { csv(name, DAILY_HEAD, [...rows].sort((a, b) => a.date.localeCompare(b.date)).map(r => [r.date, plate(r.unit), r.status, r.driver ? pname(r.driver) : '', ...HELPERS.map(k => r[k] ? pname(r[k]) : ''), r.fuel, r.gallons, r.toll, r.extra, r.extraNote, r.missingGoods, r.missingMoney, r.fault, r.note])); }
function exportPay() { const ds = weekDays(payWeek), rows = payPeople(payWeek).map(p => payRow(p, payWeek)); csv('planilla-' + payWeek + '.csv', ['Placa', 'Nombre', 'DNI', 'Puesto', 'Monto diario', ...ds.flatMap((d, i) => [DOW[i] + ' comentario', DOW[i] + ' monto']), 'Días trab.', 'Pago bruto', 'Descuentos', 'Adicionales', 'Pago final', 'Pagado'], rows.map(x => [plateOf(x.p), x.p.name, x.p.dni, x.p.role, x.p.rate, ...ds.flatMap(d => { const a = attOf(x.p.id, d); return [[attOther(a) ? 'En placa ' + attOther(a) : '', a?.note].filter(Boolean).join(' · '), a ? attAmount(a, x.p) : 0]; }), x.days, x.base, x.de, x.ad, x.net, x.paid ? 'Sí' : 'No'])); }
function exportPeople() { csv('personal-' + today() + '.csv', ['Nombre', 'DNI / CE', 'Puesto', 'Placa', 'Monto diario', 'Celular', 'Nacimiento', 'Ingreso', 'Licencia', 'Vence licencia', 'Estado'], [...db.people].sort((a, b) => plateOf(a).localeCompare(plateOf(b)) || a.name.localeCompare(b.name)).map(p => [p.name, p.dni, p.role, plateOf(p), p.rate, p.phone, p.birth, p.start, p.license, p.licenseExpiry, p.status])); }
function exportFleet() { const ex = (u, t) => db.docs.find(d => d.unit === u.id && d.type.startsWith(t)); csv('camiones-' + today() + '.csv', ['Placa', 'Tipo', 'Modalidad', 'Socio', 'Propietario', 'Marca', 'Modelo', 'Año', 'N. serie', 'Tonelaje bruto', 'Tonelaje neto', 'Kilometraje', 'Próximo aceite km', 'Papeletas', 'Estado', 'Conductor', 'Personal asignado', 'SOAT vence', 'CITV vence', 'TUC'], db.trucks.map(u => [u.plate, u.tipo, u.modalidad, u.socio, u.owner, u.brand, u.model, u.year, u.serie, u.tonBruto, u.tonNeto, u.km, u.nextOil, u.papeletas, u.status, u.driver ? pname(u.driver) : '', db.people.filter(p => p.unit === u.id && p.status === 'Activo').map(p => p.name).join(', '), ex(u, 'SOAT')?.expiry || '', ex(u, 'CITV')?.expiry || '', ex(u, 'TUC')?.number || ''])); }
function exportMaint() { csv('mantenimiento-' + today() + '.csv', ['Fecha', 'Placa', 'Tipo', 'Taller', 'Kilometraje', 'Costo S/', 'Próximo km', 'Próxima fecha', 'Detalle', 'Fotos'], [...db.maint].sort((a, b) => a.date.localeCompare(b.date)).map(m => [m.date, plate(m.unit), m.type, m.shop, m.km, m.cost, m.nextKm, m.nextDate, m.note, (m.photos || []).length])); }
function exportDocs() { csv('documentos-' + today() + '.csv', ['Placa', 'Documento', 'Número', 'Vencimiento', 'Días restantes', 'Estado', 'Fotos', 'Marca', 'Modelo', 'Propietario'], db.docs.filter(d => unit(d.unit)).sort((a, b) => plate(a.unit).localeCompare(plate(b.unit)) || a.type.localeCompare(b.type)).map(d => { const u = unit(d.unit); return [u.plate, d.type, d.number, d.expiry, d.expiry ? due(d.expiry) : '', docStatus(d), (d.photos || []).length, u.brand, u.model, u.owner]; })); }

// ---------- Importar mantenimiento (pegado desde Excel, CSV o .xlsx) ----------
const IMP_HEAD = ['Fecha', 'Placa', 'Tipo', 'Taller', 'Kilometraje', 'Costo S/', 'Próximo km', 'Próxima fecha', 'Detalle'];
const IMP_KEYS = ['date', 'unit', 'type', 'shop', 'km', 'cost', 'nextKm', 'nextDate', 'note'];
const IMP_MATCH = [['nextKm', /pr[oó]xim\w*\s.*(km|kilom)/i], ['nextDate', /pr[oó]xim/i], ['date', /^fecha/i], ['unit', /placa|cami[oó]n|unidad/i], ['type', /tipo|servicio/i], ['shop', /taller|proveedor/i], ['km', /^(km|kilom)/i], ['cost', /costo|monto|precio|importe/i], ['note', /detalle|nota|observ|trabajo|descrip|qu[eé] pas/i]];
const MAINT_TYPES = ['Cambio de aceite', 'Reparación', 'Incidente / desperfecto', 'Mantenimiento preventivo', 'Neumáticos', 'Frenos', 'Inspección', 'Otro'];
const plain = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function parseDate(v) {
  v = String(v ?? '').trim(); let m, iso = '';
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(v)) { m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); iso = m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0'); }
  else if ((m = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/))) iso = (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  else if (/^\d{5}(\.\d+)?$/.test(v)) iso = new Date(Date.UTC(1899, 11, 30) + Math.floor(+v) * 86400000).toISOString().slice(0, 10);   // número de fecha de Excel
  const d = new Date(iso + 'T12:00:00Z'); return iso && !isNaN(d) && d.toISOString().slice(0, 10) === iso ? iso : '';
}
function parseNum(v) {
  let s = String(v ?? '').replace(/[^\d.,-]/g, ''); if (!s) return 0;
  const c = s.lastIndexOf(','), p = s.lastIndexOf('.');
  if (c >= 0 && p >= 0) s = c > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c >= 0) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  return Number(s) || 0;
}
// Texto con filas → matriz. Acepta tabulaciones (copiado desde Excel), punto y coma o coma, y comillas
function parseTable(text) {
  text = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n'); const head = text.split('\n')[0] || '';
  const sep = head.includes('\t') ? '\t' : (head.split(';').length >= head.split(',').length ? ';' : ',');
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"' && cell === '') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell); rows.push(row);
  return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c));
}
// Lee la primera hoja de un .xlsx sin librerías (el archivo es un ZIP con XML dentro)
async function readXlsx(buf) {
  const u = new Uint8Array(buf), dv = new DataView(buf), td = new TextDecoder();
  let e = u.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true), files = {}; let o = dv.getUint32(e + 16, true);
  for (let i = 0; i < n; i++) { const nl = dv.getUint16(o + 28, true); files[td.decode(u.subarray(o + 46, o + 46 + nl))] = { method: dv.getUint16(o + 10, true), size: dv.getUint32(o + 20, true), at: dv.getUint32(o + 42, true) }; o += 46 + nl + dv.getUint16(o + 30, true) + dv.getUint16(o + 32, true); }
  const get = async name => { const f = files[name]; if (!f) return ''; const s = f.at + 30 + dv.getUint16(f.at + 26, true) + dv.getUint16(f.at + 28, true), data = u.subarray(s, s + f.size); return f.method === 0 ? td.decode(data) : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text(); };
  const xml = s => new DOMParser().parseFromString(s, 'application/xml'), sst = await get('xl/sharedStrings.xml');
  const ss = sst ? [...xml(sst).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].filter(t => t.parentNode.localName !== 'rPh').map(t => t.textContent).join('')) : [];
  const sheet = Object.keys(files).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))[0]; if (!sheet) throw new Error('hoja');
  return [...xml(await get(sheet)).getElementsByTagName('row')].map(r => { const out = []; [...r.getElementsByTagName('c')].forEach((c, k) => { const L = (c.getAttribute('r') || '').replace(/\d/g, ''), col = L ? [...L].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1 : k, t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent ?? ''; out[col] = t === 's' ? ss[+v] ?? '' : t === 'inlineStr' ? c.textContent : v; }); return Array.from(out, x => String(x ?? '').trim()); }).filter(r => r.some(c => c));
}
// Relaciona cada fila con sus campos: por posición o, si la primera fila trae títulos, por el nombre de cada columna
function mapRows(rows, keys, match) {
  let map = keys.map((k, i) => [k, i]); const h = rows[0].map(plain);
  if (h.some(c => /^fecha|placa/.test(c)) && !parseDate(rows[0][0])) { const used = new Set(); map = []; h.forEach((c, i) => { const m = match.find(([k, re]) => !used.has(k) && re.test(c)); if (m) { used.add(m[0]); map.push([m[0], i]); } }); rows = rows.slice(1); }
  return rows.map(r => Object.fromEntries(map.map(([k, i]) => [k, r[i] ?? ''])));
}
const plateKey = s => String(s || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
const byPlate = () => Object.fromEntries(db.trucks.map(u => [plateKey(u.plate), u]));
// Busca a un trabajador por nombre completo, DNI o por nombre y apellido si solo coincide uno
function findPerson(name) {
  const q = plain(name); if (!q) return null;
  const ex = db.people.find(p => plain(p.name) === q || (p.dni && String(p.dni) === String(name).trim())); if (ex) return ex;
  const w = q.split(/\s+/), part = db.people.filter(p => { const n = plain(p.name).split(/\s+/); return w.every(x => n.includes(x)); });
  return part.length === 1 ? part[0] : null;
}
// Convierte las filas en servicios listos para guardar y separa las que tienen errores
function readMaintRows(rows) {
  const trucks = byPlate(), ok = [], bad = []; let dup = 0;
  mapRows(rows, IMP_KEYS, IMP_MATCH).forEach((v, n) => {
    const u = trucks[plateKey(v.unit)], date = parseDate(v.date), why = [];
    if (!date) why.push('fecha no válida (“' + (v.date || 'vacía') + '”)'); if (!u) why.push('placa no registrada (“' + (v.unit || 'vacía') + '”)');
    if (why.length) return bad.push('Fila ' + (n + 1) + ': ' + why.join(' y '));
    const type = MAINT_TYPES.find(t => plain(t) === plain(v.type)) || (v.type || 'Otro'), m = { unit: u.id, date, type, shop: v.shop || '', km: parseNum(v.km), cost: parseNum(v.cost), nextKm: parseNum(v.nextKm) || '', nextDate: parseDate(v.nextDate), note: v.note || '', photos: [] };
    if ([...db.maint, ...ok].some(x => x.unit === m.unit && x.date === m.date && x.type === m.type && Number(x.cost) === m.cost && (x.note || '') === m.note)) return dup++;
    ok.push(m);
  });
  return { ok, bad, dup, upd: 0 };
}
const DAILY_HEAD = ['Fecha', 'Placa', 'Estado', 'Conductor', 'Auxiliar 1', 'Auxiliar 2', 'Auxiliar 3', 'Auxiliar 4', 'Combustible S/', 'Galones', 'Peajes S/', 'Adicionales S/', 'Motivo adicional', 'Bultos faltantes', 'Faltante dinero S/', 'Desperfecto', 'Notas'];
const DAILY_KEYS = ['date', 'unit', 'status', 'driver', 'helper1', 'helper2', 'helper3', 'helper4', 'fuel', 'gallons', 'toll', 'extra', 'extraNote', 'missingGoods', 'missingMoney', 'fault', 'note'];
const DAILY_MATCH = [['extraNote', /motivo/], ['date', /^fecha/], ['unit', /placa|camion|unidad/], ['status', /estado/], ['driver', /conductor|chofer/], ['helper1', /aux\w*\.?\s*1/], ['helper2', /aux\w*\.?\s*2/], ['helper3', /aux\w*\.?\s*3/], ['helper4', /aux\w*\.?\s*4/], ['fuel', /combust/], ['gallons', /galon/], ['toll', /peaje/], ['extra', /adicional|otros gastos/], ['missingGoods', /bulto|mercader/], ['missingMoney', /faltante|dinero/], ['fault', /desperfecto|falla/], ['note', /nota|observ/]];
const DAILY_STATES = ['Programada', 'En ruta', 'Completada', 'Cancelada'];
// Repartos: una fila por camión y día. Si ese camión ya tiene reparto en esa fecha, la fila lo actualiza
function readDailyRows(rows) {
  const trucks = byPlate(), ok = [], bad = []; let upd = 0;
  mapRows(rows, DAILY_KEYS, DAILY_MATCH).forEach((v, n) => {
    const u = trucks[plateKey(v.unit)], date = parseDate(v.date), why = [], ppl = {};
    if (!date) why.push('fecha no válida (“' + (v.date || 'vacía') + '”)'); if (!u) why.push('placa no registrada (“' + (v.unit || 'vacía') + '”)');
    ['driver', ...HELPERS].forEach(k => { const p = findPerson(v[k]); if (String(v[k] || '').trim() && !p) why.push('no encuentro al trabajador “' + v[k] + '”'); ppl[k] = p ? p.id : ''; });
    const c = Object.values(ppl).filter(Boolean); if (new Set(c).size !== c.length) why.push('un trabajador está repetido');
    if (why.length) return bad.push('Fila ' + (n + 1) + ': ' + why.join(' y '));
    const m = { date, unit: u.id, status: DAILY_STATES.find(s => plain(s) === plain(v.status)) || '', ...ppl, fuel: parseNum(v.fuel), gallons: parseNum(v.gallons), toll: parseNum(v.toll), extra: parseNum(v.extra), extraNote: v.extraNote || '', missingGoods: parseNum(v.missingGoods), missingMoney: parseNum(v.missingMoney), fault: v.fault || '', note: v.note || '' };
    if (db.daily.some(x => x.unit === m.unit && x.date === m.date)) upd++;
    ok.push(m);
  });
  return { ok, bad, dup: 0, upd };
}
const IMPORTS = {
  maint: {
    title: 'Importar servicios de mantenimiento', one: 'servicio', many: 'servicios', head: IMP_HEAD, read: readMaintRows, extra: '',
    sample: '15/10/2026\tBZA739\tCambio de aceite\tTaller Ate\t85000\t180\t90000\t\tAceite y filtro',
    total: ok => ' · costo total ' + money(sum(ok, 'cost')), cols: ['Fecha', 'Placa', 'Tipo', 'Taller', 'Km', 'Costo'],
    row: m => [fmtS(m.date), esc(plate(m.unit)), esc(m.type), esc(m.shop || '—'), m.km ? kms(m.km) : '—', money(m.cost)],
    apply: list => list.forEach(m => { const t = unit(m.unit); if (m.km) t.km = Math.max(Number(t.km) || 0, m.km); if (m.type === 'Cambio de aceite' && Number(m.nextKm)) t.nextOil = Number(m.nextKm); db.maint.push({ id: uid(), ...m }); })
  },
  daily: {
    title: 'Importar repartos', one: 'reparto', many: 'repartos', head: DAILY_HEAD, read: readDailyRows,
    extra: ' Los trabajadores se escriben con su nombre como figura en Personal (o su DNI). Si no pones estado, queda como Completada. Si ese camión ya tiene un reparto en esa fecha, la fila lo actualiza y las celdas vacías no borran nada. La asistencia de cada tripulación se marca sola.',
    sample: '11/11/2026\tBZA739\tCompletada\tJuan Pérez\tLuis Soto\t\t\t\t120\t8\t15\t0\t\t0\t0\t\tSin novedades',
    total: ok => ' · gasto total ' + money(ok.reduce((a, r) => a + spend(r), 0)), cols: ['Fecha', 'Placa', 'Estado', 'Tripulación', 'Gasto'],
    row: m => [fmtS(m.date), esc(plate(m.unit)), esc(m.status || db.daily.find(x => x.unit === m.unit && x.date === m.date)?.status || 'Completada'), esc(crew(m).map(first).join(', ') || '—'), money(spend(m))],
    apply: list => { list.forEach(m => { let r = db.daily.find(x => x.unit === m.unit && x.date === m.date); if (r) Object.assign(r, Object.fromEntries(Object.entries(m).filter(([, v]) => v !== '' && v !== 0))); else { r = { id: uid(), km: '', ...m, status: m.status || 'Completada' }; db.daily.push(r); } markCrew(r, true); }); if (!list.some(m => m.date === selected)) selected = list[list.length - 1].date; }
  }
};
let impKind = 'maint';
function importPreview() {
  const I = IMPORTS[impKind], txt = $('#imptext').value, res = txt.trim() ? I.read(parseTable(txt)) : { ok: [], bad: [], dup: 0, upd: 0 }, box = $('#imppreview'), b = $('#impgo'), n = res.ok.length, s = k => k === 1 ? '' : 's';
  window.impReady = res.ok; b.disabled = !n; b.textContent = n ? `Importar ${n} ${n > 1 ? I.many : I.one}` : 'Importar';
  if (!txt.trim()) return box.innerHTML = '';
  box.innerHTML = `<div class="note"><b>${n}</b> fila${s(n)} lista${s(n)} para importar${n ? I.total(res.ok) : ''}${res.upd ? ` · ${res.upd} actualiza${res.upd > 1 ? 'n' : ''} un registro que ya existía` : ''}${res.dup ? ` · ${res.dup} repetida${s(res.dup)} (ya registrada${s(res.dup)}, se omite${res.dup > 1 ? 'n' : ''})` : ''}${res.bad.length ? `<br><span class="red">${res.bad.length} con error, no se importará${res.bad.length > 1 ? 'n' : ''}:</span><br>${res.bad.slice(0, 8).map(esc).join('<br>')}${res.bad.length > 8 ? '<br>…' : ''}` : ''}</div>` +
    (n ? table(I.cols, res.ok.slice(0, 6).map(I.row)) + (n > 6 ? `<p style="margin:6px 0 0">…y ${n - 6} más.</p>` : '') : '');
}
function importForm(kind) {
  if (!db.trucks.length) return toast('Primero registra un camión');
  impKind = kind; const I = IMPORTS[kind];
  modal(I.title, `<p style="margin-top:0">Para cargar muchos ${I.many} de una vez: <b>copia las filas en Excel y pégalas aquí</b>, o elige un archivo de Excel (.xlsx) o CSV.</p>
    <div class="note">Columnas, en este orden: <b>${I.head.join(' · ')}</b>. Solo Fecha y Placa son obligatorias. Si la primera fila trae los títulos, el orden puede ser cualquiera.${I.extra}</div>
    <div class="actions" style="margin:12px 0">${btn('Elegir archivo Excel o CSV', 'impfile')}${btn('↓ Descargar plantilla', 'imptemplate')}<input type="file" id="impfile" accept=".xlsx,.csv,.txt" hidden></div>
    <label class="field wide">Filas a importar<textarea id="imptext" rows="7" placeholder="${esc(I.sample)}" style="font-family:ui-monospace,Consolas,monospace;font-size:12px;white-space:pre;overflow:auto"></textarea></label>
    <div id="imppreview" style="margin-top:12px"></div>
    <div class="formactions">${btn('Cancelar', 'close')}<button type="button" class="btn primary" id="impgo" data-action="doimport" disabled>Importar</button></div>`);
  $('#imptext').oninput = importPreview;
  $('#impfile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const buf = await f.arrayBuffer(); let rows;
      if (/\.xlsx$/i.test(f.name)) rows = await readXlsx(buf);
      else { let txt; try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { txt = new TextDecoder('windows-1252').decode(buf); } rows = parseTable(txt); }
      $('#imptext').value = rows.map(r => r.map(c => String(c).replace(/[\t\n]+/g, ' ')).join('\t')).join('\n'); importPreview();
    } catch { toast('No se pudo leer ese archivo. Prueba copiando y pegando las filas desde Excel.'); }
    e.target.value = '';
  };
}
function doImport() {
  const list = window.impReady || [], I = IMPORTS[impKind]; if (!list.length) return; window.impReady = null;
  I.apply(list); save(list.length + ' ' + (list.length > 1 ? I.many + ' importados' : I.one + ' importado'));
}
function validBackup(d) { return d && d.version === 2 && Array.isArray(d.people) && Array.isArray(d.trucks) && LISTS.every(k => d[k] === undefined || (Array.isArray(d[k]) && d[k].every(r => r && typeof r.id === 'string'))); }

// ---------- Acciones ----------
async function action(a) {
  const i = a.indexOf(':'), cmd = i < 0 ? a : a.slice(0, i), id = i < 0 ? '' : a.slice(i + 1), [x, y] = id.split('|');
  switch (cmd) {
    case 'go': closeModal(); go(id); break;
    case 'close': closeModal(); break;
    case 'closeviewer': $('#viewer').close(); break;
    case 'more': modal('Más secciones', `<div class="morelist">${PAGES.slice(4).map(r => `<button data-action="go:${r[0]}">${ico(r[1])}${r[2]}</button>`).join('')}</div>`); break;
    case 'alerts': modal('Alertas', `<div class="note">Calculadas hoy, ${fmt(today())}: documentos a 30 días, cumpleaños a 7 días, cambios de aceite, papeletas y revisiones.</div><div style="margin:0 -20px">${alertRows(allAlerts())}</div>`); break;
    case 'sel': selectTruck(id); break;
    case 'usel': case 'unit': closeModal(); selUnit = cmd === 'usel' && selUnit === id ? null : id; if (cmd === 'unit') utab = 'ficha'; if (page !== 'flota') go('flota'); showUnit(true); break;
    case 'utab': utab = id; showUnit(); break;
    case 'psel': case 'person': closeModal(); selPerson = id; if (cmd === 'person') ptab = 'perfil'; if (page !== 'personal') { fState = ''; go('personal'); } showPerson(); break;
    case 'ptab': ptab = id; showPerson(); break;
    case 'pmonth': pMonth = addMonth(pMonth, Number(id)); showPerson(); break;
    case 'patt': toggleAtt(x, y); persist(); showPerson(); break;
    case 'photoperson': { const [f] = await pick(false); if (!f) break; try { const p = person(id), nid = uid(); await Fotos.put(nid, await shrink(f, 480, true)); if (p.photo) Fotos.del(p.photo); p.photo = nid; persist(); const m = personModal; render(); if (m) showPerson(); toast('Foto actualizada'); } catch { toast('No se pudo leer esa imagen'); } break; }
    case 'rmphotoperson': { const p = person(id); if (p.photo) Fotos.del(p.photo); p.photo = ''; persist(); const m = personModal; render(); if (m) showPerson(); break; }
    case 'addphotos': { const files = await pick(true); for (const f of files) { try { const nid = uid(); await Fotos.put(nid, await shrink(f, 1500)); formPhotos.push(nid); } catch { toast('No se pudo leer una de las imágenes'); } } const b = $('#fphotos'); if (b) { b.innerHTML = photoThumbs(); hydrate(); } break; }
    case 'rmphoto': formPhotos = formPhotos.filter(p => p !== id); $('#fphotos').innerHTML = photoThumbs(); hydrate(); break;
    case 'view': { const v = await Fotos.get(id); if (!v) break; const d = $('#viewer'); d.querySelector('img').src = v; if (!d.open) d.showModal(); break; }
    case 'newperson': personForm(); break; case 'editperson': personForm(id); break; case 'note': noteForm(id); break;
    case 'att': toggleAtt(x, y, attPlate); persist(); render(); break;
    case 'payday': payDayForm(x, y); break;
    case 'newunit': unitForm(); break; case 'editunit': unitForm(id); break;
    case 'newdoc': docForm(); break; case 'doc': docForm(id); break; case 'unitdoc': docForm(null, id); break;
    case 'newmaint': maintForm(); break; case 'maint': maintForm(id); break; case 'unitmaint': maintForm(null, id); break;
    case 'newdaily': dailyForm(); break; case 'newdailyunit': dailyForm(null, { unit: id, date: today() }); break;
    case 'daily': dailyDetail(id); break; case 'editdaily': dailyForm(id); break;
    case 'depart': { const r = db.daily.find(q => q.id === id); if (!r) break; if (r.date !== today()) { r.status = 'En ruta'; markCrew(r, true); save(plate(r.unit) + ' salió a ruta'); } else departUnit(r.unit); break; }
    case 'return': dailyForm(id, { status: 'Completada' }); break;
    case 'week': payWeek = shift(payWeek, Number(id)); render(); break;
    case 'paydetail': payDetail(id); break;
    case 'paytoggle': { const k = payWeek + '|' + x; if (db.paid[k]) delete db.paid[k]; else db.paid[k] = today(); persist(); render(); if (y) payDetail(x); break; }
    case 'printconst': printConst(id); break;
    case 'newmove': moveForm(null, x, y); break; case 'move': moveForm(id); break;
    case 'departnow': departUnit(id); break;
    case 'zoom': { const i = ZOOMS.indexOf(patioZoom), n = Number(id); patioZoom = n === 0 ? 1 : ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + n))]; applyZoom(); break; }
    case 'newevent': eventForm(null, id); break;
    case 'event': { const e = db.events.find(q => q.id === id); if (!e) break; closeModal(); if (page !== 'calendario') { calDay = e.date; calMonth = e.date.slice(0, 7); go('calendario'); } eventForm(id); break; }
    case 'exportdocs': exportDocs(); break;
    case 'importmaint': importForm('maint'); break;
    case 'importdaily': importForm('daily'); break;
    case 'crew': crewForm(id); break;
    case 'impfile': $('#impfile').click(); break;
    case 'imptemplate': csv(impKind === 'daily' ? 'plantilla-reparto.csv' : 'plantilla-mantenimiento.csv', IMPORTS[impKind].head, []); break;
    case 'doimport': doImport(); break;
    case 'exportpeople': exportPeople(); break; case 'exportfleet': exportFleet(); break; case 'exportmaint': exportMaint(); break;
    case 'calmonth': calMonth = addMonth(calMonth, Number(id)); if (calDay.slice(0, 7) !== calMonth) calDay = calMonth + '-01'; render(); break;
    case 'calday': calDay = id; render(); if (NARROW()) $('.calwrap .card:last-child')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'caltoday': calDay = today(); calMonth = calDay.slice(0, 7); render(); break;
    case 'del': confirmAction('Eliminar registro', 'Este registro se eliminará de forma permanente.', 'dodel:' + id, 'Eliminar'); break;
    case 'dodel': db[x] = db[x].filter(r => r.id !== y); save('Registro eliminado'); cleanPhotos(); break;
    case 'export': exportDaily(db.daily.filter(r => r.date === selected), 'reparto-' + selected + '.csv'); break;
    case 'exportmonth': exportDaily(db.daily.filter(r => r.date.slice(0, 7) === repMonth), 'reparto-' + repMonth + '.csv'); break;
    case 'exportpay': exportPay(); break;
    case 'backup': download('bluecj-respaldo-' + today() + '.json', JSON.stringify({ ...db, fotos: await Fotos.all() }), 'application/json'); toast('Respaldo descargado'); break;
    case 'restore': $('#backupfile').click(); break;
    case 'clear': confirmAction('Vaciar todo', 'Se eliminarán todos los datos y fotos guardados en este dispositivo. Descarga un respaldo antes de continuar.', 'doclear', 'Vaciar'); break;
    case 'doclear': db = blank(); selTruck = selUnit = selPerson = null; await Fotos.clear(); save('Registros vaciados'); break;
    case 'reset': confirmAction('Volver a los datos del Excel', 'Se reemplazará todo lo registrado (asistencias, repartos, pagos, fotos) por el personal y los camiones del Excel.', 'doreset', 'Reemplazar'); break;
    case 'doreset': db = normalize(initialData()); selTruck = selUnit = selPerson = null; await Fotos.clear(); save('Datos del Excel restaurados'); break;
    case 'dorestore': { const d = window.pendingBackup; window.pendingBackup = null; await Fotos.clear(); for (const [k, v] of Object.entries(d.fotos || {})) await Fotos.put(k, v); delete d.fotos; db = normalize(d); selTruck = selUnit = selPerson = null; save('Respaldo restaurado'); break; }
  }
}
// Arrastrar camiones en el patio: soltarlo en la pista lo saca a ruta; traer uno de la pista al recinto registra su retorno
const svgPoint = (svg, e) => { const m = svg.getScreenCTM().inverse(); return { x: e.clientX * m.a + m.e, y: e.clientY * m.d + m.f }; };
function endDrag(e, drop) {
  const d = drag; drag = null; if (!d) return;
  d.svg.classList.remove('dragging', 'dragging-back'); d.g.classList.remove('grabbed');
  if (!d.moved) return;
  suppressClick = true; setTimeout(() => suppressClick = false, 80);
  const p = svgPoint(d.svg, e), z = drop ? Patio.zone(p.x, p.y) : 'none', id = d.g.dataset.truck;
  d.g.setAttribute('transform', d.base);
  if (d.parked && z === 'out') departUnit(id);
  else if (!d.parked && z === 'in') { const r = db.daily.find(q => q.unit === id && q.date === today() && q.status === 'En ruta'); if (r) dailyForm(r.id, { status: 'Completada' }); }
}
// Mantener presionada una casilla (o clic derecho) abre su cuadro de detalle en vez de marcarla
let hold = null;
const endHold = () => { if (hold) { clearTimeout(hold.t); hold = null; } };
const fireHold = el => { suppressClick = true; setTimeout(() => suppressClick = false, 700); action(el.dataset.hold); };
document.addEventListener('pointerdown', e => { const el = e.target.closest?.('[data-hold]'); if (!el || e.button) return; endHold(); hold = { x: e.clientX, y: e.clientY, t: setTimeout(() => { hold = null; fireHold(el); }, 500) }; });
document.addEventListener('pointermove', e => { if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 10) endHold(); });
document.addEventListener('pointerup', endHold); document.addEventListener('pointercancel', endHold);
document.addEventListener('contextmenu', e => { const el = e.target.closest?.('[data-hold]'); if (!el) return; e.preventDefault(); endHold(); if (!$('#modal').open) fireHold(el); });
document.addEventListener('pointerdown', e => {
  if (e.button) return; const w = e.target.closest?.('#scenewrap'), g = e.target.closest?.('#scenewrap .trk'), parked = g?.classList.contains('patio');
  if (g && (parked || g.classList.contains('ruta'))) drag = { g, svg: g.ownerSVGElement, x: e.clientX, y: e.clientY, moved: false, base: g.getAttribute('transform'), parked };
  else if (w && e.pointerType === 'mouse') pan = { w, x: e.clientX, y: e.clientY, l: w.scrollLeft, t: w.scrollTop, moved: false };   // con el dedo, el navegador ya desplaza solo
});
function endPan() { const p = pan; pan = null; if (!p) return; p.w.classList.remove('panning'); if (p.moved) { suppressClick = true; setTimeout(() => suppressClick = false, 80); } }
document.addEventListener('pointermove', e => {
  if (pan) { const dx = e.clientX - pan.x, dy = e.clientY - pan.y; if (!pan.moved) { if (Math.hypot(dx, dy) < 5) return; pan.moved = true; pan.w.classList.add('panning'); } pan.w.scrollLeft = pan.l - dx; pan.w.scrollTop = pan.t - dy; return; }
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved) { if (Math.hypot(dx, dy) < 8) return; drag.moved = true; drag.g.classList.add('grabbed'); drag.svg.classList.add(drag.parked ? 'dragging' : 'dragging-back'); drag.svg.appendChild(drag.g); }
  const m = drag.svg.getScreenCTM(); drag.g.setAttribute('transform', `${drag.base} translate(${(dx / m.a).toFixed(1)},${(dy / m.d).toFixed(1)})`);
});
document.addEventListener('pointerup', e => { endPan(); endDrag(e, true); });
document.addEventListener('pointercancel', e => { endPan(); endDrag(e, false); });
document.addEventListener('click', e => { if (suppressClick) return; const b = e.target.closest('[data-action]'); if (b) { e.preventDefault(); action(b.dataset.action); } else if (e.target.id === 'modal') closeModal(); else if (e.target.id === 'viewer' || e.target.closest('#viewer')) $('#viewer').close(); });
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('trk')) { e.preventDefault(); action(e.target.dataset.action); } });
document.addEventListener('input', e => { if (e.target.id === 'search') { query = e.target.value; updateResults(); } });
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'selectedDate' && t.value) { selected = t.value; render(); }
  if (t.id === 'repMonth' && t.value) { repMonth = t.value; render(); }
  if (t.id === 'filter') { filter = t.value; updateResults(); }
  if (t.id === 'fType') { fType = t.value; updateResults(); }
  if (t.id === 'attPlate') attPlate = t.value;
  if (t.id === 'constSel') payDetail(t.value);
  if (t.id === 'fRole') { fRole = t.value; updateResults(); }
  if (t.id === 'fState') { fState = t.value; updateResults(); }
  if (t.id === 'fUnit') { fUnit = t.value; updateResults(); }
  if (t.id === 'backupfile') {
    const file = t.files[0]; if (!file) return;
    try { const data = JSON.parse(await file.text()); if (!validBackup(data)) throw 0; window.pendingBackup = data; confirmAction('Restaurar respaldo', `Se reemplazarán los registros actuales por ${data.people.length} trabajadores, ${data.trucks.length} camiones y ${Object.keys(data.fotos || {}).length} fotos.`, 'dorestore', 'Restaurar'); }
    catch { toast('Archivo inválido. Usa un respaldo descargado desde esta página.'); }
    t.value = '';
  }
});
window.addEventListener('hashchange', () => { const p = location.hash.slice(1); if (VIEWS[p] && p !== page) go(p); });
if (VIEWS[location.hash.slice(1)]) page = location.hash.slice(1);
localStorage.removeItem('bluecj-v1');   // datos de ejemplo de la primera versión
persist(); render(); cleanPhotos();
