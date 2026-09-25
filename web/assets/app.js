/* =========================================================
   Guía de Limited MTG · app
   - Datos: window.__DATA__ (versión de un solo archivo) o data/<set>.json (sitio)
   - Cada sección se dibuja recién cuando se acerca a la pantalla
   - Filtros globales en la URL (?c=WU&r=common,uncommon&q=flying) para compartir vistas
   ========================================================= */
(() => {
'use strict';

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SYM = 'https://svgs.scryfall.io/card-symbols/';
const COLORS = ['W','U','B','R','G','M','C'];
const RARITIES = ['common','uncommon','rare','mythic'];
const COLOR_NAME = {W:'Blanco',U:'Azul',B:'Negro',R:'Rojo',G:'Verde',M:'Multicolor',C:'Incolora'};
const RARITY_NAME = {common:'Común',uncommon:'Infrecuente',rare:'Rara',mythic:'Mítica'};
const INTER = {removal:['Removal','var(--B)'],masivo:['Masivo','var(--mythic)'],'daño':['Daño','var(--R)'],pelea:['Pelea','var(--G)'],
  contra:['Contrahechizo','var(--U)'],'rebote/tap':['Rebote / tapeo','var(--U)'],truco:['Truco','var(--W)'],
  'criatura con flash':['Criatura con flash','var(--C)'],preparado:['Hechizo preparado','var(--U)'],otro:['Otro','var(--C)']};
const KILL = ['removal','masivo','daño','pelea'];
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
                set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmt = v => typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '')) : esc(v);

const pip = k => k === 'M' ? '<span class="multi" aria-label="multicolor"></span>'
  : `<img class="ms" src="${SYM}${COLORS.includes(k) && k !== 'M' ? k : 'C'}.svg" alt="{${k}}" width="16" height="16" loading="lazy">`;
const symbols = text => esc(text).replace(/\{([^}]+)\}/g, (m, s) =>
  `<img class="ms" src="${SYM}${s.replace('/', '')}.svg" alt="${m}" width="16" height="16" loading="lazy">`);
const mana = cost => cost ? `<span class="mcost">${symbols(cost)}</span>` : '';
const colorCell = k => `<span class="col">${pip(k)}${COLOR_NAME[k] || esc(k)}</span>`;
const pairPips = p => [...p].map(pip).join('');
const rar = r => `<span class="rar" style="--rc:var(--${r})">${RARITY_NAME[r] || esc(r)}</span>`;
const tag = t => t ? `<span class="tag" style="--tc:${(INTER[t] || [t, 'var(--accent)'])[1]}">${(INTER[t] || [esc(t)])[0]}</span>` : '';
const imgSize = (u, size) => u ? u.replace('/normal/', `/${size}/`) : '';
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const ICONS = {
  pool:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  resumen:'<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  colores:'<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1.4"/><circle cx="15" cy="9" r="1.4"/><circle cx="8" cy="14" r="1.4"/><path d="M13 20a3 3 0 0 1 2-5h2a3 3 0 0 0 3-3"/>',
  arquetipos:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  removal:'<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="2"/>',
  trucos:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  combate:'<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5 21 18v3h-3L6.5 9.5M5 14l-2 2 3 3 2-2"/>',
  construccion:'<rect x="3" y="14" width="8" height="6" rx="1"/><rect x="13" y="14" width="8" height="6" rx="1"/><rect x="8" y="6" width="8" height="6" rx="1"/>',
  mecanicas:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  bombas:'<path d="m3 8 4 4 5-7 5 7 4-4-2 11H5z"/>',
  probabilidades:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="16" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="8" cy="16" r="1.2"/>',
  stat:'<path d="M4 20V11M10 20V4M16 20v-6"/><path d="M2 20h20"/>',
  tag:'<path d="M6 3h12v18l-6-4-6 4z"/>',
};

/* ---------- estado ---------- */
let D, CARDS, BY_NAME;
const state = { k: new Set(COLORS), r: new Set(RARITIES), q: '' };
const local = {};                  // estado de chips por sección
const rendered = new Set();        // secciones ya dibujadas

function readURL() {
  const p = new URLSearchParams(location.search);
  if (p.get('c')) state.k = new Set(p.get('c').split('').filter(c => COLORS.includes(c)));
  if (p.get('r')) state.r = new Set(p.get('r').split(',').filter(r => RARITIES.includes(r)));
  if (p.get('q')) state.q = p.get('q').toLowerCase();
}
function writeURL() {
  const p = new URLSearchParams(location.search);
  state.k.size === COLORS.length ? p.delete('c') : p.set('c', [...state.k].join(''));
  state.r.size === RARITIES.length ? p.delete('r') : p.set('r', [...state.r].join(','));
  state.q ? p.set('q', state.q) : p.delete('q');
  const qs = p.toString();
  history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
}
const passes = c => state.k.has(c.k) && state.r.has(c.r) && (!state.q || c._q.includes(state.q));
const passColor = k => !k || !COLORS.includes(k) || state.k.has(k);

/* ---------- componentes ---------- */
function table(cols, rows, o = {}) {
  const heat = new Set(o.heat || []), bars = new Set(o.bars || []);
  const max = {};
  [...heat, ...bars].forEach(k => { max[k] = Math.max(...rows.map(r => +r[k] || 0)) || 1; });
  const shown = rows.filter(r => r._total || passColor(o.colorKey ? r[o.colorKey] : null)
                                 && (!o.cardKey || passes(BY_NAME[r[o.cardKey]] || {k: 'C', r: 'common', _q: ''})));
  if (!shown.filter(r => !r._total).length) return '<p class="empty">Nada que mostrar con los filtros actuales.</p>';
  const th = cols.map((c, i) => `<th class="${c.num ? 'n' : ''}"${c.tip ? ` data-tip="${esc(c.tip)}"` : ''}>` +
    `<button type="button" data-sort="${i}"><span class="lbl">${esc(c.label)}</span><span class="ar">↕</span></button></th>`).join('');
  const tr = shown.map(r => '<tr' + (r._total ? ' class="total"' : '') + '>' + cols.map(c => {
    const v = r[c.key];
    const empty = v === null || v === undefined || v === '';
    let html = empty ? '<span style="color:var(--text-3)">—</span>' : c.render ? c.render(v, r) : fmt(v);
    const cls = [], st = [];
    if (c.num) cls.push('n');
    if (c.txt) cls.push('txt');
    if (heat.has(c.key) && !empty && !r._total) {
      cls.push('heat'); st.push(`background:color-mix(in oklab,var(--accent) ${Math.round(6 + 50 * v / max[c.key])}%,var(--surface))`);
    }
    if (bars.has(c.key) && !empty && !r._total)
      html = `<span class="bar-in"><i style="width:${Math.round(56 * v / max[c.key])}px;--bc:${c.barColor ? c.barColor(r) : 'var(--accent)'}"></i>${html}</span>`;
    return `<td class="${cls.join(' ')}" data-v="${esc(typeof v === 'number' ? v : (c.sortVal ? c.sortVal(r) : v))}"${st.length ? ` style="${st.join(';')}"` : ''}>${html}</td>`;
  }).join('') + '</tr>').join('');
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}
const colDefs = {
  color: {key: 'color', label: 'Color', render: v => v === 'Total' ? '<b>Total</b>' : colorCell(v), sortVal: r => COLORS.indexOf(r.color)},
  name: (key = 'nombre', label = 'Carta') => ({key, label, render: v => `<button class="cn" data-card="${esc(v)}">${esc(v)}</button>`}),
  cost: (key = 'costo', label = 'Maná') => ({key, label, render: v => mana(v)}),
  rarity: (key = 'rareza') => ({key, label: 'Rareza', render: v => rar(v), sortVal: r => RARITIES.indexOf(r[key])}),
};

function bars(items, {suffix = '', max} = {}) {
  const m = max || Math.max(...items.map(i => i.v)) || 1;
  return '<div class="bars">' + items.map(i =>
    `<span class="lab">${i.label}</span><div class="track" data-tip="${esc(i.tip || `${fmt(i.v)}${suffix}`)}">` +
    `<div class="fill" style="width:${(100 * i.v / m).toFixed(1)}%;--bc:${i.color || 'var(--accent)'}"></div></div>` +
    `<span class="val">${fmt(i.v)}${suffix}</span>`).join('') + '</div>';
}

function tile(c, extra) {
  const small = imgSize(c.img, 'small'), normal = c.img;
  const img = c.img ? `<img src="${esc(small)}" srcset="${esc(small)} 146w, ${esc(normal)} 488w" sizes="(max-width:600px) 34vw, 160px"
      width="146" height="204" loading="lazy" decoding="async" alt="" onerror="this.remove()">` : '';
  return `<button class="card" type="button" data-card="${esc(c.n)}" style="--cc:var(--${c.k})" aria-label="${esc(c.n)}">` +
    `<div class="frame"><div class="ph"><b>${esc(c.n)}</b>${mana(c.c)}<span>${esc(c.t)}</span><span>${esc(c.x.slice(0, 180))}</span></div>${img}</div>` +
    `<div class="cap"><span><b>${esc(c.n)}</b>${extra ? extra(c) : `${rar(c.r)} · coste ${c.cmc}`}</span></div></button>`;
}
function grid(cards, extra, {limit = 36, id} = {}) {
  const list = cards.filter(passes);
  if (!list.length) return '<p class="empty">Ninguna carta con los filtros actuales.</p>';
  const lim = id && local[id + ':all'] ? Infinity : limit;
  const html = list.slice(0, lim).map(c => tile(c, extra)).join('');
  const more = list.length > lim ? `<button class="show-more" data-more="${id}">Mostrar ${list.length - lim} más</button>` : '';
  return `<div class="cards" data-list="${esc(list.map(c => c.n).join('|'))}">${html}</div>${more}`;
}
function chips(id, options) {
  const cur = local[id] ?? '*';
  return `<div class="chips" role="group">${options.map(o =>
    `<button class="chip" type="button" data-chip="${id}" data-v="${esc(o.v)}" aria-pressed="${cur === o.v}">${o.label}${o.n != null ? ` <span class="n">${o.n}</span>` : ''}</button>`).join('')}</div>`;
}
const howto = html => `<details class="howto"><summary>Cómo leer esta sección</summary><div class="in">${html}</div></details>`;

/* ---------- secciones ---------- */
const SECTIONS = [
{ id: 'pool', nav: 'Tu pool', title: 'Tu pool', sub: 'Qué par de colores tiene más material en lo que abriste', color: 'var(--gold)',
  when: () => !!D.pool,
  render() {
    const P = D.pool;
    let h = howto(`<p>Para cada par de colores se toman tus <b>23 mejores cartas jugables</b> de esos colores (más incoloras) y se suma su <b>peso</b>:</p>
<ul><li><b>1</b> por ser jugable; <b>+2.5</b> removal duro, <b>+2</b> daño, <b>+1.5</b> pelea, <b>+0.75</b> contrahechizo o rebote.</li>
<li><b>+0.5</b> criatura evasiva, <b>+0.5</b> roba cartas, hasta <b>+2</b> raras/míticas según su puntaje.</li></ul>
<p>Quédate con 2–3 candidatos y decide mirando la curva y el número de criaturas (idealmente 14–17). <b>Faltan para 23</b> es lo que tendrías que rellenar con cartas flojas o un tercer color.</p>`);
    h += '<h3>Pares recomendados</h3>' + table([
      {key: 'par', label: 'Colores', render: v => pairPips(v)}, {key: 'gremio', label: 'Gremio'},
      {key: 'puntaje', label: 'Puntaje', num: true, tip: 'Suma del peso de tus 23 mejores cartas en ese par'},
      {key: 'jugables', label: 'Jugables', num: true}, {key: 'criaturas', label: 'Criaturas', num: true},
      {key: 'removal', label: 'Removal', num: true}, {key: 'raras', label: 'Raras/míticas', num: true},
      {key: 'curva', label: 'Curva 1-2 / 3 / 4 / 5+', tip: 'Criaturas por coste entre tus 23 mejores'},
      {key: 'faltan', label: 'Faltan para 23', num: true}], P.pares.slice(0, 5), {heat: ['puntaje'], bars: ['removal']});
    if (P.splash.length) h += `<h3>Candidatas a splash</h3><p class="empty">Cartas fuertes que piden un solo símbolo de un tercer color. Con 2–3 fuentes (duales, landcycling) suelen valer la pena.</p>` +
      table([{key: 'para', label: 'Para', render: v => pairPips(v)}, {key: 'splash', label: 'Color extra', render: v => colorCell(v)},
             colDefs.name(), colDefs.cost(), {key: 'peso', label: 'Peso', num: true}], P.splash, {cardKey: 'nombre'});
    h += `<div class="callout">Mana fixing en tu pool: ${P.fixing.length ? P.fixing.map(n => `<button class="cn" data-card="${esc(n)}">${esc(n)}</button>`).join(', ') : 'ninguno'}</div>`;
    const cnt = Object.fromEntries(P.cartas.map(x => [x.id, x]));
    const cards = P.cartas.map(x => CARDS[x.id]).sort((a, b) => cnt[b.id].peso - cnt[a.id].peso);
    for (const k of COLORS) {
      const cs = cards.filter(c => c.k === k); if (!cs.length) continue;
      h += `<h3>${pip(k)} ${COLOR_NAME[k]} <span class="count">${cs.reduce((s, c) => s + cnt[c.id].cant, 0)} cartas</span></h3>` +
        grid(cs, c => `${cnt[c.id].cant > 1 ? `<b style="display:inline">×${cnt[c.id].cant}</b> · ` : ''}peso ${cnt[c.id].peso} ${tag(c.inter)}`, {id: 'pool-' + k});
    }
    return h;
  }},
{ id: 'resumen', nav: 'Resumen', title: 'Lo esencial en 60 segundos', sub: 'Conclusiones calculadas desde los datos del set · C/U = comunes e infrecuentes', color: 'var(--gold)',
  render: () => howto(`<p>Todo el reporte mira sobre todo <b>comunes e infrecuentes (C/U)</b>: en 6 sobres abres ~40 comunes y ~20 infrecuentes, pero solo 6–7 raras. Tu mazo se construye con C/U.</p>
<p>Usa los <b>filtros</b> (color, rareza, búsqueda; tecla <b>/</b>) para enfocar todo el reporte, y <b>haz clic en cualquier carta o nombre</b> para ver su ficha. Con ← → recorres las cartas de esa lista.</p>`) +
    (D.novedades?.length ? `<div class="callout novedades"><div>` +
      `<p><b>Novedades de ${esc(D.set.name)}:</b> mecánicas nuevas, no vistas antes en Magic — ${D.novedades.map(n => `<b>${esc(n.nombre)}</b> (${esc(n.texto)})`).join(' · ')}</p>` +
      (D.reutilizadas?.length ? `<p class="sub">También reutiliza mecánicas ya existentes en Magic (para tener el panorama completo): ${D.reutilizadas.map(esc).join(', ')} — ver el glosario completo en <a href="#mecanicas">Mecánicas</a>.</p>` : '') +
      `</div></div>` : '') +
    `<div class="insights">${D.insights.map(i => `<div class="ins"><span class="ii">${i.iconos.length ? i.iconos.map(pip).join('') : icon('stat')}</span><div><b>${esc(i.titulo)}</b><span>${esc(i.texto)}</span></div></div>`).join('')}</div>` },
{ id: 'colores', nav: 'Colores', title: 'Perfil de colores', sub: 'Qué ofrece cada color en comunes e infrecuentes', color: 'var(--U)',
  render() {
    const T = D.tablas;
    const perfil = T.perfil;
    return howto(`<p>Cada fila es un color y cuenta cuántas cartas <b>comunes e infrecuentes</b> cumplen cada rol. Más intenso = más cartas.</p>
<ul><li><b>Removal duro</b> mata cualquier criatura; <b>daño / pelea</b> depende del tamaño (ver Combate).</li>
<li><b>Contra / rebote</b> gana tiempo, no elimina para siempre.</li>
<li>Los encabezados subrayados explican la columna al pasar el cursor. Clic en un encabezado para ordenar.</li></ul>
<p>Las etiquetas salen de leer el texto de las cartas automáticamente: tómalo como guía, no como verdad absoluta.</p>`) +
    '<h3>Removal (duro + daño/pelea) por color</h3>' +
    bars(perfil.filter(r => r.color !== 'C' && passColor(r.color)).map(r => ({label: colorCell(r.color), v: r.removal_duro + r.dano_pelea, color: `var(--${r.color})`,
      tip: `${COLOR_NAME[r.color]}: ${r.removal_duro} removal duro + ${r.dano_pelea} daño/pelea`}))) +
    '<h3>Perfil por color</h3>' + table([
      colDefs.color, {key: 'criaturas', label: 'Criaturas', num: true},
      {key: 'removal_duro', label: 'Removal duro', num: true, tip: 'Destruye, exilia, -X/-X, el rival sacrifica o aura que anula: mata sin importar el tamaño'},
      {key: 'dano_pelea', label: 'Daño / pelea', num: true, tip: 'Daño directo o pelea: depende de la resistencia del objetivo'},
      {key: 'otra', label: 'Contra / rebote', num: true, tip: 'Contrahechizos, devolver a la mano o tapear'},
      {key: 'trucos', label: 'Trucos combate', num: true, tip: 'Instantáneos que potencian o protegen a una criatura en combate'},
      {key: 'evasivas', label: 'Evasivas', num: true, tip: 'Criaturas con vuelo, amenaza, arrollar o imbloqueables'},
      {key: 'robo', label: 'Roba cartas', num: true}, {key: 'fixing', label: 'Mana fixing', num: true, tip: 'Cartas que ayudan a conseguir maná de otro color: tierras duales, landcycling, tokens que producen maná'},
      {key: 'cmc_medio', label: 'Coste medio criaturas', num: true, tip: 'Valor de maná medio de las criaturas'},
      {key: 'cartas', label: 'Cartas C/U', num: true}], perfil,
      {colorKey: 'color', heat: ['criaturas', 'removal_duro', 'dano_pelea', 'otra', 'trucos', 'evasivas', 'robo', 'fixing']}) +
    '<h3>Cartas por rareza</h3>' + table([colDefs.color,
      {key: 'common', label: 'Comunes', num: true}, {key: 'uncommon', label: 'Infrecuentes', num: true},
      {key: 'rare', label: 'Raras', num: true}, {key: 'mythic', label: 'Míticas', num: true}, {key: 'total', label: 'Total', num: true}],
      T.composicion, {colorKey: 'color'});
  }},
{ id: 'arquetipos', nav: 'Arquetipos', title: 'Arquetipos y cartas señal', sub: 'Los 10 pares de colores y qué quiere cada uno', color: 'var(--B)',
  render() {
    const A = D.tablas.arquetipos, cur = local.arq ?? '*';
    const signs = CARDS.filter(c => c.par && c.r === 'uncommon').map(c => ({c, key: A.find(a => [...a.par].sort().join() === [...c.par].sort().join())}))
      .filter(x => x.key).sort((a, b) => A.indexOf(a.key) - A.indexOf(b.key));
    const sel = signs.filter(x => cur === '*' || x.key.par === cur).map(x => x.c);
    return howto(`<p>Cada par de colores tiene un plan. Las <b>doradas infrecuentes</b> («cartas señal») muestran qué premia ese par: si abres una y tienes profundidad en esos colores, es buena dirección.</p>
<p>Los temas vienen de la guía oficial de prerelease. <b>Removal en el par</b> suma el removal C/U de ambos colores más las doradas.</p>`) +
      table([{key: 'par', label: 'Colores', render: v => pairPips(v)}, {key: 'gremio', label: 'Gremio'}, {key: 'tema', label: 'Plan de juego'},
             {key: 'doradas', label: 'Doradas', num: true}, {key: 'disponibles', label: 'Cartas C/U', num: true, tip: 'Comunes e infrecuentes de esos dos colores más las doradas del par'},
             {key: 'removal', label: 'Removal en el par', num: true}], A, {bars: ['removal']}) +
      '<h3>Cartas señal</h3>' + chips('arq', [{v: '*', label: 'Todas'}, ...A.map(a => ({v: a.par, label: `${pairPips(a.par)} ${a.gremio}`}))]) +
      grid(sel, c => { const a = A.find(x => [...x.par].sort().join() === [...c.par].sort().join()); return `${pairPips(a.par)} ${esc(a.gremio)}`; }, {id: 'arq'});
  }},
{ id: 'removal', nav: 'Removal', title: 'Removal e interacción', sub: 'Todo lo que elimina o frena criaturas en C/U', color: 'var(--R)',
  render() {
    const cur = local.rem ?? '*';
    const all = CARDS.filter(c => c.inter && (c.r === 'common' || c.r === 'uncommon'));
    const types = ['removal', 'daño', 'pelea', 'contra', 'rebote/tap', 'masivo'].filter(t => all.some(c => c.inter === t));
    const sel = all.filter(c => cur === '*' || c.inter === cur);
    let h = howto(`<ul><li><b>Removal</b>: destruye, exilia, -X/-X, el rival sacrifica o un aura que anula.</li>
<li><b>Daño</b>: el número gris es cuánto hace. Cruza con «¿Cuántas criaturas mueren a N de daño?» en Combate.</li>
<li><b>Pelea</b>: tu criatura hace daño a la otra; necesitas una criatura grande en mesa.</li>
<li><b>Contrahechizo / rebote / tapeo</b>: ganan tiempo, no eliminan para siempre.</li></ul>
<p>Úsalo antes del torneo para <b>memorizar qué puede tener el rival</b> según sus colores, y al abrir para priorizar.</p>`);
    h += chips('rem', [{v: '*', label: 'Todo', n: all.filter(passes).length}, ...types.map(t => ({v: t, label: INTER[t][0], n: all.filter(c => c.inter === t && passes(c)).length}))]);
    let any = false;
    for (const k of COLORS) {
      const cs = sel.filter(c => c.k === k && passes(c)).sort((a, b) => a.cmc - b.cmc); if (!cs.length) continue; any = true;
      h += `<h3>${pip(k)} ${COLOR_NAME[k]} <span class="count">${cs.length}</span></h3>` +
        grid(cs, c => `${rar(c.r)} ${tag(c.inter)}${c.dmg && c.dmg !== '∞' ? `<span class="tag" style="--tc:var(--text-2)">${esc(c.dmg)}</span>` : ''}`, {id: 'rem-' + k});
    }
    if (!any) h += '<p class="empty">Ninguna carta con los filtros actuales.</p>';
    const rares = CARDS.filter(c => c.inter && (c.r === 'rare' || c.r === 'mythic'));
    h += `<details class="more"><summary>Removal en raras y míticas (${rares.length})</summary><div style="margin-top:10px">` + table([
      colDefs.color, colDefs.rarity(), colDefs.name(), colDefs.cost(), {key: 'inter', label: 'Tipo', render: v => tag(v)},
      {key: 'dmg', label: 'Daño / -X', num: true}, {key: 'mata', label: '% criaturas que mata', num: true, tip: 'Qué % de criaturas C/U tiene resistencia ≤ al daño de la carta'}],
      rares.map(c => ({color: c.k, rareza: c.r, nombre: c.n, costo: c.c, inter: c.inter, dmg: c.dmg === '∞' ? null : c.dmg, mata: c.mata})), {cardKey: 'nombre'}) + '</div></details>';
    return h;
  }},
{ id: 'trucos', nav: 'Trucos combate', title: 'Trucos de combate', sub: 'Qué puede tener el rival con maná abierto', color: 'var(--W)',
  render() {
    const cur = local.tr ?? '*';
    const all = CARDS.filter(c => (c.instant || c.prep) && (c.r === 'common' || c.r === 'uncommon'));
    const bucket = c => c.cmc >= 4 ? '4' : String(c.cmc);
    const sel = all.filter(c => cur === '*' || bucket(c) === cur).sort((a, b) => COLORS.indexOf(a.k) - COLORS.indexOf(b.k) || a.cmc - b.cmc);
    return howto(`<p>Todo lo que se puede jugar <b>a velocidad de instantáneo</b> en comunes e infrecuentes: trucos de combate, removal instantáneo, contrahechizos y criaturas con flash.</p>
<p>Las cartas <b>Prepare</b> aparecen si su hechizo es instantáneo: mientras la criatura esté preparada, el rival puede lanzarlo.</p><p><b>En la mesa:</b> si el rival ataca raro y deja maná abierto, filtra por <b>maná abierto</b> y por sus colores para ver qué puede tener.</p>`) +
      chips('tr', [{v: '*', label: 'Cualquier coste'}, {v: '1', label: '1 maná'}, {v: '2', label: '2 maná'}, {v: '3', label: '3 maná'}, {v: '4', label: '4+ maná'}]) +
      table([colDefs.color, {key: 'cmc', label: 'Coste', num: true, tip: 'Tierras que necesita abiertas'}, colDefs.cost(), colDefs.name(), colDefs.rarity(),
             {key: 'rol', label: 'Tipo', render: v => tag(v)}, {key: 'texto', label: 'Qué hace', txt: true}],
            sel.map(c => ({color: c.k, cmc: c.cmc, costo: c.c, nombre: c.n, rareza: c.r, rol: c.inter || (c.truco ? 'truco' : !c.instant && c.prep ? 'preparado' : c.tb === 'Creature' ? 'criatura con flash' : 'otro'), texto: c.xs})),
            {cardKey: 'nombre'});
  }},
{ id: 'combate', nav: 'Combate', title: 'Combate y curva', sub: 'Tamaños, resistencias y curva del formato', color: 'var(--mythic)',
  render() {
    const T = D.tablas;
    return howto(`<ul><li><b>Mueren a N de daño</b>: % de criaturas C/U con resistencia ≤ N. Un removal de 3 de daño mata ~ese % de lo que verás.</li>
<li><b>Criatura típica por coste</b>: fuerza y resistencia medias. Úsalo para juzgar si algo es grande o pequeño «para este formato».</li>
<li><b>Curva por color</b>: criaturas C/U por coste. Muchas de coste 2 favorecen mazos agresivos.</li></ul>`) +
      '<div class="grid2"><div><h3>¿Cuántas criaturas C/U mueren a N de daño?</h3>' +
      bars(T.dureza.map(d => ({label: `${d.dano} de daño`, v: d.pct, tip: `${d.pct}% de las criaturas C/U tienen resistencia ≤ ${d.dano}`})), {suffix: '%', max: 100}) +
      '</div><div><h3>Criatura típica por coste</h3>' + table([
        {key: 'coste', label: 'Coste', num: true, render: v => v >= 6 ? '6+' : v}, {key: 'criaturas', label: 'Criaturas', num: true},
        {key: 'fuerza', label: 'Fuerza media', num: true}, {key: 'resistencia', label: 'Resistencia media', num: true},
        {key: 'pct_evasivas', label: '% evasivas', num: true}], T.tamano, {bars: ['criaturas']}) + '</div></div>' +
      '<h3>Curva de criaturas C/U por color</h3><div class="minis">' + T.curva.filter(r => passColor(r.color)).map(r => {
        const ks = ['1', '2', '3', '4', '5', '6+'], top = Math.max(...T.curva.flatMap(x => ks.map(k => x[k] || 0))) || 1;
        const tot = ks.reduce((s, k) => s + (r[k] || 0), 0);
        return `<div class="mini" style="--c:var(--${r.color})"><h4>${pip(r.color)}${COLOR_NAME[r.color]}<small>${tot} criaturas</small></h4>
          <div class="cols-v">${ks.map(k => `<span>${r[k] || 0}</span>`).join('')}</div>
          <div class="cols">${ks.map(k => `<i style="height:${Math.round(100 * (r[k] || 0) / top)}%" data-tip="${COLOR_NAME[r.color]} · coste ${k}: ${r[k] || 0} criaturas"></i>`).join('')}</div>
          <div class="cols-x">${ks.map(k => `<span>${k}</span>`).join('')}</div></div>`;
      }).join('') + '</div>';
  }},
{ id: 'construccion', nav: 'Construcción', title: 'Construcción recomendada', sub: 'Proporciones de tierras, hechizos y curva para un mazo de 40', color: 'var(--G)',
  render() {
    const T = D.tablas;
    const totalCriaturas = T.tamano.reduce((s, r) => s + r.criaturas, 0);
    const sumaCmc = T.tamano.reduce((s, r) => s + r.criaturas * r.coste, 0);
    const cmcMedio = (sumaCmc / (totalCriaturas || 1)).toFixed(1);
    const tope = T.tamano[T.tamano.length - 1];
    const fixingTotal = D.kpis.find(k => k.label === 'Mana fixing')?.valor ?? '?';
    const removalTotal = D.kpis.find(k => k.label === 'Removal C/U')?.valor ?? '?';
    const disp = T.arquetipos.map(a => a.disponibles), dispMin = Math.min(...disp), dispMax = Math.max(...disp);
    const doradas = T.perfil.find(r => r.color === 'M');
    return howto(`<p>Esto no sale de una fórmula fija: es la base clásica de Limited (17 tierras / 23 hechizos en 40 cartas) ajustada con los números reales de este set — su curva de criaturas, cuánto <i>fixing</i> hay y cuántas cartas jugables tiene cada par de colores.</p>`) +
      '<h3>Mazo de 2 colores (la apuesta segura)</h3>' +
      `<p>Cada par de colores tiene entre <b>${dispMin} y ${dispMax}</b> cartas C/U jugables disponibles (ver <a href="#arquetipos">Arquetipos</a>) — de sobra para tus 23 hechizos. Elegí el par por poder y plan de juego, no por miedo a quedarte corto de cartas.</p>` +
      table([{key: 'parte', label: 'Parte del mazo'}, {key: 'cant', label: 'Cantidad'}, {key: 'nota', label: 'Nota', txt: true}], [
        {parte: 'Tierras', cant: '17', nota: '8–9 de tu color principal y el resto del secundario; ajustá según cuántos símbolos dobles tenga cada uno'},
        {parte: 'Hechizos totales', cant: '23', nota: ''},
        {parte: '— Criaturas', cant: '15–17', nota: 'la base del mazo'},
        {parte: '— Removal / trucos / otros', cant: '6–8', nota: 'priorizá removal duro sobre trucos de combate'},
      ]) +
      '<h3>Curva de maná recomendada</h3>' +
      `<p>La criatura C/U promedio de este set cuesta <b>${cmcMedio}</b>, concentrada en 2 y 3 de coste (ver <a href="#combate">Combate y curva</a>). Una curva de 2 colores razonable:</p>` +
      table([{key: 'coste', label: 'Coste'}, {key: 'cant', label: 'Criaturas'}, {key: 'nota', label: 'Nota', txt: true}], [
        {coste: '1', cant: '0–2', nota: 'opcional: este set no tiene muchos 1-drops relevantes'},
        {coste: '2', cant: '5–7', nota: 'tu turno más consistente'},
        {coste: '3', cant: '5–6', nota: 'junto con 2, el pico de la curva'},
        {coste: '4', cant: '3–5', nota: ''},
        {coste: '5', cant: '2–3', nota: ''},
        {coste: '6+', cant: '1–2', nota: `${tope.pct_evasivas}% de las criaturas de 6+ tienen evasión — son tus finishers`},
      ]) +
      '<h3>¿Tres colores?</h3>' +
      `<p>El set tiene <b>${fixingTotal} cartas</b> de mana fixing (duales, landcycling, tokens Heartwood). Alcanza para un <b>splash liviano de 1–2 cartas fuertes</b> con 2–3 fuentes, pero armar un mazo de tres colores parejo (23 hechizos repartidos entre los tres) es arriesgado salvo que tu pool de fixing sea excepcional. Si vas a splashear, priorizá tierras duales comunes o landcycling antes que forzar un tercer color a la par de los otros dos.</p>` +
      '<h3>¿Y monocolor?</h3>' +
      `<p>No es la apuesta por defecto en este set: hay ${doradas?.cartas ?? 'varias'} cartas doradas que concentran buena parte del removal y la evasión, y cualquier par de dos colores ya tiene de sobra para 23 hechizos. Quedate en un solo color solo si abriste una cantidad excepcional de bombas y removal de ese color.</p>` +
      '<h3>Tips generales</h3><ul>' +
      `<li>Priorizá removal duro sobre trucos: hay ${removalTotal} cartas de removal C/U en el set, concentradas en negro y rojo (ver <a href="#colores">Colores</a>).</li>` +
      '<li>No bajes de 15 criaturas salvo que tu mazo sea muy controlador, con mucho removal para compensar.</li>' +
      '<li>Dejá 1–2 espacios para trucos de combate o removal instantáneo barato: ganan combates que parecían perdidos (ver <a href="#trucos">Trucos combate</a>).</li>' +
      '<li>Si vas a splashear, contá tus fuentes de maná de ese color por separado: menos de 3 fuentes para una sola carta rara vez vale la pena.</li>' +
      '</ul>';
  }},
{ id: 'mecanicas', nav: 'Mecánicas', title: 'Mecánicas', sub: 'Glosario y en qué colores aparece cada tema', color: 'var(--U)',
  render() {
    const T = D.tablas, cols = COLORS.filter(k => T.mecanicas.some(r => r[k]));
    return howto(`<p>El glosario explica las mecánicas del set con el texto recordatorio de las propias cartas. La tabla cuenta en cuántas cartas aparece cada tema por color: te dice qué color empuja cada estrategia.</p>`) +
      `<h3>Glosario</h3><div class="gloss">${D.glosario.map(g => `<div class="gl"><b>${icon('tag')}${esc(g.nombre)}${g.cartas ? `<small>${g.cartas} cartas</small>` : ''}</b><p>${symbols(g.texto)}</p></div>`).join('')}</div>` +
      '<h3>Mecánicas por color</h3>' + table([{key: 'mecanica', label: 'Mecánica / tema'}, ...cols.map(k => ({key: k, label: COLOR_NAME[k], num: true})),
        {key: 'total', label: 'Total', num: true}], T.mecanicas, {heat: cols, bars: ['total']}) +
      `<details class="more"><summary>Keywords reconocidas por Scryfall (${T.keywords.length})</summary><div style="margin-top:10px">` +
      table([{key: 'keyword', label: 'Keyword'}, {key: 'cartas', label: 'Cartas', num: true}], T.keywords, {bars: ['cartas']}) + '</div></details>';
  }},
{ id: 'bombas', nav: 'Bombas', title: 'Raras y míticas a vigilar', sub: 'Las que más impacto pueden tener en Limited', color: 'var(--rare)',
  render() {
    const list = CARDS.filter(c => (c.r === 'rare' || c.r === 'mythic') && c.tb !== 'Land').sort((a, b) => b.score - a.score).slice(0, 36);
    return howto(`<p>Raras y míticas ordenadas por una <b>heurística simple</b>: planeswalker (+4), removal (+2 a +4), roba cartas (+1), evasión (+1), estadísticas eficientes para su coste (hasta +2), efectos que se repiten (+1) y crear criaturas (+1).</p>
<p>No es un rating de expertos: sirve para <b>no pasar por alto</b> ninguna carta que gane partidas sola.</p>`) +
      grid(list, c => `${rar(c.r)} · puntaje ${c.score}`, {id: 'bomb', limit: 24});
  }},
{ id: 'probabilidades', nav: 'Probabilidades', title: 'Qué esperar de 6 sobres', sub: 'Probabilidades aproximadas del prerelease', color: 'var(--good)',
  render() {
    const P = D.tablas.probabilidades;
    return howto(`<p>Aproximación con la composición típica de un <b>Play Booster</b> (≈7 comunes, 3 infrecuentes, 1 rara/mítica y 2 comodines) y ${P.sobres} sobres. Tómalo como orden de magnitud.</p>
<p><b>Lectura práctica:</b> no cuentes con abrir una carta concreta; cuenta con <b>~2–3 removals</b> de los colores con más removal.</p>`) +
      `<div class="stats">${P.rareza.map(r => `<div class="stat">${rar(r.r)}<b>${r.prob}</b><small>de abrir una carta concreta · ${r.distintas} distintas</small></div>`).join('')}</div>` +
      '<h3>Removal que puedes esperar en tu pool, por color</h3>' +
      bars(P.removal.filter(r => passColor(r.color)).map(r => ({label: colorCell(r.color), v: r.esperado, color: `var(--${r.color})`})));
  }},
];

/* ---------- montaje ---------- */
function mountShell() {
  const S = D.set;
  document.title = `${S.name} · Guía de Limited`;
  $('#set-name').textContent = S.name;
  $('#set-sub').textContent = `Guía de Limited · ${S.code.toUpperCase()}`;
  $('#set-icon').src = S.icon;
  const n = CARDS.length, cu = CARDS.filter(c => c.r === 'common' || c.r === 'uncommon');
  const K = D.kpis;
  $('#hero').innerHTML = `<div class="hero-top"><img src="${esc(S.icon)}" alt="" width="60" height="60">
    <div><h1>${esc(S.name)} <span>· Guía de Limited</span></h1>
    <p>Sale el ${esc(S.released_at || '¿?')} · ${n} cartas · datos de Scryfall del ${esc(D.generado)}</p>
    <div class="pips">${['W','U','B','R','G'].map(pip).join('')}</div></div></div>
    <div class="kpis">${K.map(k => `<div class="kpi"><span>${esc(k.label)}</span><b>${esc(k.valor)}</b><small>${esc(k.nota)}</small></div>`).join('')}</div>`;

  const secs = SECTIONS.filter(s => !s.when || s.when());
  $('#toc').innerHTML = secs.map(s => `<a href="#${s.id}" style="--ic:${s.color}">${icon(s.id)}${esc(s.nav)}</a>`).join('');
  $('#mtoc').innerHTML = secs.map(s => `<a href="#${s.id}">${esc(s.nav)}</a>`).join('');
  $('#sections').innerHTML = secs.map(s => `<section class="sec" id="${s.id}" aria-labelledby="${s.id}-t">
    <div class="sec-h"><span class="sec-ic" style="--ic:${s.color}">${icon(s.id)}</span>
      <div><h2 id="${s.id}-t">${esc(s.title)}</h2><p>${esc(s.sub)}</p></div>
      <button class="icon-btn sec-toggle" type="button" aria-expanded="true" aria-controls="${s.id}-b" aria-label="Plegar sección"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button></div>
    <div class="sec-b pending" id="${s.id}-b"></div></section>`).join('');
  $('#foot').innerHTML = `Datos e imágenes: <a href="https://scryfall.com" target="_blank" rel="noopener">Scryfall</a>. Magic: The Gathering © Wizards of the Coast. Contenido no oficial.
    Las etiquetas (removal, trucos de combate, mecánicas) se calculan leyendo el texto de las cartas y pueden fallar con redacciones poco comunes.` +
    (D.fuentes?.length ? `<br>Contexto: ${D.fuentes.map(f => `<a href="${esc(f.u)}" target="_blank" rel="noopener">${esc(f.t)}</a>`).join(' · ')}` : '');

  // filtros
  $('#f-color').innerHTML = COLORS.map(k => `<button class="tog sq" type="button" data-fk="${k}" aria-pressed="${state.k.has(k)}" aria-label="${COLOR_NAME[k]}" data-tip="${COLOR_NAME[k]}">${pip(k)}</button>`).join('');
  $('#f-rarity').innerHTML = RARITIES.map(r => `<button class="tog" type="button" data-fr="${r}" aria-pressed="${state.r.has(r)}">${rar(r)}</button>`).join('');
  $('#q').value = $('#q2').value = state.q;
  return secs;
}

function renderSection(s) {
  const body = document.getElementById(s.id + '-b');
  if (!body) return;
  body.innerHTML = s.render();
  body.classList.remove('pending');
  rendered.add(s.id);
}
function rerender() {
  // Redibuja solo lo ya visible; el resto se dibuja al llegar
  const secs = SECTIONS.filter(s => rendered.has(s.id));
  secs.forEach(renderSection);
  updateBadge();
}
function updateBadge() {
  const n = (COLORS.length - state.k.size) + (RARITIES.length - state.r.size) + (state.q ? 1 : 0);
  const b = $('#filter-badge'); b.hidden = !n; b.textContent = n;
  const visible = CARDS.filter(passes).length;
  $('#f-hint').textContent = n ? `${visible} de ${CARDS.length} cartas visibles.` : 'Los filtros afectan a todas las cartas y tablas del reporte.';
}

function wire(secs) {
  // Dibujo diferido: cada sección se renderiza al acercarse (600px antes)
  const lazy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const s = secs.find(x => x.id === e.target.id);
    if (s && !rendered.has(s.id)) renderSection(s);
    lazy.unobserve(e.target);
  }), {rootMargin: '600px 0px'});
  $$('.sec').forEach(el => lazy.observe(el));

  // Sección activa: solo cambia clases (no mueve la página)
  const links = [...$$('#toc a'), ...$$('#mtoc a')];
  const mtoc = $('#mtoc');
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    const m = mtoc.querySelector('a.on');
    if (m && getComputedStyle(mtoc).display !== 'none') mtoc.scrollTo({left: m.offsetLeft - mtoc.clientWidth / 2 + m.clientWidth / 2});
  }), {rootMargin: '-45% 0px -50% 0px'});
  $$('.sec').forEach(el => spy.observe(el));

  // Navegación: asegura que la sección esté dibujada y abierta antes de saltar
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1), s = secs.find(x => x.id === id);
    if (!s) return;
    e.preventDefault();
    secs.slice(0, secs.indexOf(s) + 1).forEach(x => { if (!rendered.has(x.id)) renderSection(x); });
    const el = document.getElementById(id); el.classList.remove('closed');
    closeSide();
    el.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
    history.replaceState(null, '', location.pathname + location.search + '#' + id);
  });

  // Plegar secciones
  document.addEventListener('click', e => {
    const b = e.target.closest('.sec-toggle'); if (!b) return;
    const s = b.closest('.sec'); s.classList.toggle('closed'); b.setAttribute('aria-expanded', !s.classList.contains('closed'));
  });

  // Filtros
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-fk],[data-fr]'); if (!t) return;
    const on = t.getAttribute('aria-pressed') === 'true';
    t.setAttribute('aria-pressed', !on);
    const set = t.dataset.fk ? state.k : state.r, v = t.dataset.fk || t.dataset.fr;
    on ? set.delete(v) : set.add(v);
    writeURL(); rerender();
  });
  const onQ = debounce(v => { state.q = v.trim().toLowerCase(); $('#q').value = $('#q2').value = v; writeURL(); rerender(); }, 160);
  $('#q').addEventListener('input', e => onQ(e.target.value));
  $('#q2').addEventListener('input', e => onQ(e.target.value));
  $('#btn-reset').addEventListener('click', () => {
    state.k = new Set(COLORS); state.r = new Set(RARITIES); state.q = '';
    $('#q').value = $('#q2').value = '';
    $$('[data-fk],[data-fr]').forEach(b => b.setAttribute('aria-pressed', 'true'));
    writeURL(); rerender();
  });

  // Chips locales y "mostrar más"
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-chip]');
    if (c) { local[c.dataset.chip] = c.dataset.v; renderSection(SECTIONS.find(s => document.getElementById(s.id)?.contains(c))); return; }
    const m = e.target.closest('[data-more]');
    if (m) { local[m.dataset.more + ':all'] = true; renderSection(SECTIONS.find(s => document.getElementById(s.id)?.contains(m))); }
  });

  // Ordenar tablas
  document.addEventListener('click', e => {
    const b = e.target.closest('th button[data-sort]'); if (!b) return;
    const th = b.parentElement, t = th.closest('table'), i = +b.dataset.sort;
    const asc = th.getAttribute('aria-sort') !== 'ascending';
    $$('th', t).forEach(x => x.removeAttribute('aria-sort')); th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
    const tb = t.tBodies[0], rows = [...tb.rows].filter(r => !r.classList.contains('total')), tot = [...tb.rows].filter(r => r.classList.contains('total'));
    const val = r => { const v = r.cells[i]?.dataset.v ?? ''; const n = parseFloat(v); return isNaN(n) ? v.toLowerCase() : n; };
    rows.sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1); });
    tb.append(...rows, ...tot);
  });

  // Panel lateral en móvil
  const side = $('#side'), scrim = $('#scrim');
  const openSide = () => { side.classList.add('open'); scrim.hidden = false; document.documentElement.classList.add('lock');
    $$('#btn-menu,#btn-filters').forEach(b => b.setAttribute('aria-expanded', 'true')); };
  window.closeSide = () => { side.classList.remove('open'); scrim.hidden = true; document.documentElement.classList.remove('lock');
    $$('#btn-menu,#btn-filters').forEach(b => b.setAttribute('aria-expanded', 'false')); };
  $('#btn-menu').addEventListener('click', openSide);
  $('#btn-filters').addEventListener('click', () => {
    if (matchMedia('(max-width:960px)').matches) openSide();
    else { $('#filters').scrollIntoView({block: 'nearest'}); $('#q').focus(); }
  });
  $('#btn-close-side').addEventListener('click', closeSide);
  scrim.addEventListener('click', closeSide);

  // Tema
  $('#btn-theme').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark'; store.set('mtg-theme', root.dataset.theme);
  });

  // Volver arriba (sin listener de scroll: un observador sobre el hero)
  const toTop = $('#to-top');
  new IntersectionObserver(([e]) => { toTop.hidden = e.isIntersecting; }).observe($('#hero'));
  toTop.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));

  // Atajos
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !$('#card-dlg').open) {
      e.preventDefault(); (matchMedia('(max-width:960px)').matches ? (openSide(), $('#q2')) : $('#q')).focus();
    }
    if (e.key === 'Escape') closeSide();
  });

  wireTooltip();
  wireDialog();
}

/* ---------- tooltip (un solo nodo, posicionado con rAF) ---------- */
function wireTooltip() {
  const tip = $('#tip'); let raf = 0, x = 0, y = 0, cur = null;
  const place = () => { raf = 0; const w = tip.offsetWidth; tip.style.left = Math.min(x + 14, innerWidth - w - 8) + 'px'; tip.style.top = (y + 16) + 'px'; };
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest('[data-tip]'); if (el === cur) return; cur = el;
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip; tip.hidden = false;
  });
  document.addEventListener('pointermove', e => { if (tip.hidden) return; x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(place); }, {passive: true});
  document.addEventListener('scroll', () => { if (!tip.hidden) { tip.hidden = true; cur = null; } }, {passive: true});
}

/* ---------- ficha de carta ---------- */
function wireDialog() {
  const dlg = $('#card-dlg');
  let list = [], idx = 0;
  const show = () => {
    const c = BY_NAME[list[idx]]; if (!c) return;
    const txt = esc(c.x).replace(/\(([^)]*)\)/g, '<i>($1)</i>').replace(/\{([^}]+)\}/g, m => symbols(m));
    const tags = [c.inter && INTER[c.inter]?.[0], c.truco && 'Truco', c.ev && c.tb === 'Creature' && 'Evasiva', ...(c.mec || [])].filter(Boolean);
    const big = imgSize(c.img, 'large');
    $('#dlg-body').innerHTML = `${c.img ? `<div class="dlg-img"><img src="${esc(c.img)}" srcset="${esc(c.img)} 488w, ${esc(big)} 672w" sizes="320px" alt="${esc(c.n)}" width="488" height="680"></div>` : ''}
      <div class="dlg-info"><h2>${esc(c.n)}</h2>${mana(c.c)}<div class="dlg-type">${esc(c.t)}</div><div class="dlg-text">${txt || '—'}</div>
      <div class="dlg-meta">${colorCell(c.k)} ${rar(c.r)}${c.pt ? `<span class="tag" style="--tc:var(--text-2)">${esc(c.pt)}</span>` : ''}${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      <p style="margin-top:14px"><a href="${esc(c.u)}" target="_blank" rel="noopener">Ver en Scryfall ↗</a></p></div>`;
    $('#dlg-pos').textContent = list.length > 1 ? `${idx + 1} / ${list.length}` : '';
    $$('[data-nav]', dlg).forEach(b => { b.disabled = list.length < 2; });
    // precarga la siguiente
    const nxt = BY_NAME[list[(idx + 1) % list.length]]; if (nxt?.img) { const i = new Image(); i.src = nxt.img; }
  };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-card]'); if (!t || dlg.contains(t)) return;
    e.preventDefault();
    const scope = t.closest('[data-list]');
    list = scope ? scope.dataset.list.split('|')
      : [...(t.closest('table, .callout') || document).querySelectorAll('[data-card]')].map(x => x.dataset.card);
    idx = Math.max(0, list.indexOf(t.dataset.card));
    show();
    if (!dlg.open) { dlg.showModal(); document.documentElement.classList.add('lock'); }
  });
  const nav = d => { idx = (idx + d + list.length) % list.length; show(); };
  $$('[data-nav]', dlg).forEach(b => b.addEventListener('click', () => nav(+b.dataset.nav)));
  $('#dlg-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => document.documentElement.classList.remove('lock'));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') nav(1); if (e.key === 'ArrowLeft') nav(-1); });
  // gesto de deslizar en móvil
  let sx = null;
  dlg.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, {passive: true});
  dlg.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60) nav(dx < 0 ? 1 : -1); sx = null; }, {passive: true});
}

/* ---------- arranque ---------- */
async function load() {
  if (window.__DATA__) return window.__DATA__;
  const p = new URLSearchParams(location.search);
  let set = p.get('set');
  if (!set) { const idx = await fetch('data/sets.json').then(r => r.json()); set = idx.default || idx.sets[0].code; }
  return fetch(`data/${encodeURIComponent(set)}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
}
load().then(data => {
  D = data;
  CARDS = D.cards.map((c, i) => ({...c, id: i, _q: (c.n + ' ' + c.x).toLowerCase()}));
  BY_NAME = Object.fromEntries(CARDS.map(c => [c.n, c]));
  readURL();
  const secs = mountShell();
  wire(secs);
  updateBadge();
  if (location.hash) { const a = document.querySelector(`#toc a[href="${CSS.escape(location.hash)}"]`); a?.click(); }
}).catch(err => {
  $('#sections').innerHTML = `<div class="sec" style="padding:20px"><h2>No se pudieron cargar los datos</h2>
    <p>${esc(err.message)}. Si abriste el archivo localmente, usa la versión de un solo archivo (<code>reportes/*.html</code>) o sirve la carpeta con <code>python -m http.server</code>.</p></div>`;
});
})();
