'use strict';
/* Patio isométrico: recinto cerrado del CD con portón corredizo, pista, taller y un camión por unidad.
   Uso: Patio.svg(lista, idSeleccionado) · Patio.lot(lista, idSeleccionado) · Patio.zone(x, y)
   Cada item: {id, plate, state:'ruta'|'patio'|'taller'|'inactiva', alert, size:'2'|'4'|'8', crew:[{name, driver}]} */
const Patio = (() => {
  const S = 24, C = 0.866, H = 0.5, K = S / 10;
  const GX = 40, GY = 31.4, G0 = -7;                       // terreno (G0: borde de la ciudad detrás y a la izquierda)
  const EX0 = 1, EX1 = 29.6, EY0 = 1, EY1 = 21;            // recinto del CD
  const GATE0 = 10.5, GATE1 = 19;                          // vano del portón (sobre el muro frontal)
  const ROAD0 = 23, LANE = 2.3, LANES = 3, ROAD_W = LANE * LANES, ROAD_FROM = G0 + 1, ROAD_LEN = GX - G0 - 3;
  const P = (x, y, z = 0) => [(x - y) * C * S, (x + y) * H * S - z * S];
  // Marco del dibujo: abarca el terreno principal y las manzanas de ciudad que lo rodean
  const BOUNDS = [P(-13.5, 20)[0] - 14, P(GX + 7, 4)[0] + 14, P(-3, -13.5)[1] - 6.4 * S - 20, P(34, GY + 6.5)[1] + 26].map((v, i) => i === 0 ? Math.min(v, P(G0, GY)[0] - 12) : i === 1 ? Math.max(v, P(GX, G0)[0] + 12) : i === 3 ? Math.max(v, P(GX, GY)[1] + 24) : v);
  const pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const poly = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;
  const rect = (x, y, dx, dy, fill, extra = '') => poly([P(x, y), P(x + dx, y), P(x + dx, y + dy), P(x, y + dy)], fill, extra);
  const line = (x1, y1, x2, y2, extra) => { const a = P(x1, y1), b = P(x2, y2); return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" ${extra}/>`; };

  // Caja con sus 3 caras visibles (techo, cara izquierda y+dy, cara derecha x+dx)
  function box(x, y, z, dx, dy, dz, top, left, right) {
    return poly([P(x, y + dy, z + dz), P(x + dx, y + dy, z + dz), P(x + dx, y + dy, z), P(x, y + dy, z)], left)
      + poly([P(x + dx, y, z + dz), P(x + dx, y + dy, z + dz), P(x + dx, y + dy, z), P(x + dx, y, z)], right)
      + poly([P(x, y, z + dz), P(x + dx, y, z + dz), P(x + dx, y + dy, z + dz), P(x, y + dy, z + dz)], top);
  }
  // Sistemas de coordenadas pegados a una cara o al piso (unidades = décimas de celda)
  const faceL = (x, y, z) => { const p = P(x, y, z); return `matrix(${C * K},${H * K},0,${K},${p[0].toFixed(1)},${p[1].toFixed(1)})`; };
  const faceR = (x, y, z) => { const p = P(x, y, z); return `matrix(${C * K},${-H * K},0,${K},${p[0].toFixed(1)},${p[1].toFixed(1)})`; };
  const floor = (x, y) => { const p = P(x, y); return `matrix(${C * K},${H * K},${-C * K},${H * K},${p[0].toFixed(1)},${p[1].toFixed(1)})`; };

  // Tamaños: 2 t (furgón chico), 4 t (estándar) y 8 t (largo, con cortina lateral)
  const SIZES = {
    '2': { L: 2.0, H: 1.2, W: 1.3, cab: 1.0, cabH: 1.05, wr: 2.7 },
    '4': { L: 3.1, H: 1.75, W: 1.5, cab: 1.12, cabH: 1.25, wr: 3.2 },
    '8': { L: 4.2, H: 2.05, W: 1.6, cab: 1.2, cabH: 1.4, wr: 3.4, curtain: true }
  };
  const len = z => z.L + .08 + z.cab;

  function truckBody(dim, z) {
    const c = dim
      ? { top: '#F3F5F9', l: '#E6EAF1', r: '#D3D9E4', cab: ['#A9B4C6', '#8F9BB0', '#7C889D'], band: '#8F9BB0', cur: '#E6EAF1', fold: '#C5CCD9' }
      : { top: '#FFFFFF', l: '#F4F7FE', r: '#D9E3F5', cab: ['#3B7BEA', '#1F5FD6', '#184FB8'], band: '#1F5FD6', cur: '#CFE3FA', fold: '#8FB8EA' };
    const T = len(z), W = z.W, hh = z.H * 10, r = Math.min(4.2, hh * .26), cy = (hh - 3.5) / 2, cx = r + 2;
    let s = poly([P(-.25, -.1), P(T + .35, -.1), P(T + .35, W + .3), P(-.25, W + .3)], 'rgba(11,42,91,.13)');
    s += box(.1, .12, .2, T - .2, W - .24, .22, '#22324d', '#1b2940', '#141f33');
    s += box(0, 0, .42, z.L, W, z.H, c.top, z.curtain ? c.cur : c.l, c.r);
    s += `<g transform="${faceL(0, W, .42 + z.H)}">`;
    if (z.curtain) s += Array.from({ length: Math.floor(z.L * 10 / 3.5) }, (_, i) => `<path d="M${3.5 * (i + 1)} 1.5V${hh - 3.5}" stroke="${c.fold}" stroke-width=".55"/>`).join('') + `<rect x="0" y="0" width="${z.L * 10}" height="1.6" fill="#0B2A5B"/>`;
    s += `<rect x="0" y="${hh - 3.5}" width="${z.L * 10}" height="3.5" fill="${c.band}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0B2A5B"/>
      <text x="${cx + r * .17}" y="${cy + r * .52}" font-size="${r * 1.48}" font-weight="800" fill="#fff" text-anchor="middle" font-family="Inter,Arial,sans-serif">B</text>
      <path d="M${cx - r * .74} ${cy - r * .38}h${r * .33}M${cx - r * .88} ${cy}h${r * .48}M${cx - r * .74} ${cy + r * .38}h${r * .33}" stroke="#3FA9F5" stroke-width="${r * .14}" stroke-linecap="round"/>
      ${z.L >= 3 ? `<text x="${2 * r + 5}" y="${cy + 1.5}" font-size="4.1" fill="#0B2A5B" font-family="Marcellus,Georgia,serif" letter-spacing=".3">BLUE CJ</text>` : ''}</g>`;
    s += box(z.L + .08, .04, .42, z.cab, W - .08, z.cabH, c.cab[0], c.cab[1], c.cab[2]);
    s += `<g transform="${faceL(z.L + .08, W - .04, .42 + z.cabH)}"><rect x="3" y="1.5" width="${z.cab * 10 - 4.4}" height="${z.cabH * 4}" rx=".6" fill="#BFE3FB"/></g>`;
    s += `<g transform="${faceR(T, W - .04, .42 + z.cabH)}"><rect x="1.2" y="1.5" width="${(W - .08) * 10 - 2.4}" height="${z.cabH * 4}" rx=".6" fill="#A9D6F7"/><rect x="1.2" y="${z.cabH * 10 - 2.9}" width="2.6" height="1.3" rx=".3" fill="#FDE9A8"/><rect x="${(W - .08) * 10 - 3.8}" y="${z.cabH * 10 - 2.9}" width="2.6" height="1.3" rx=".3" fill="#FDE9A8"/></g>`;
    for (const wx of [.8, ...(z.L > 4 ? [1.75] : []), T - .7]) s += `<g transform="${faceL(wx, W - .02, z.wr / 10)}"><circle r="${z.wr}" fill="#141f33"/><circle r="${z.wr * .4}" fill="#8fa0bb"/></g>`;
    return s;
  }

  // Lugar para una persona de la tripulación: marca en el piso y, si hay alguien, una figura
  function fig(x, y, p) {
    const o = P(x, y), t = `translate(${o[0].toFixed(1)},${o[1].toFixed(1)})`;
    if (!p) return `<ellipse transform="${t}" rx="6" ry="3" fill="none" stroke="#A9B8D4" stroke-width="1.1" stroke-dasharray="3 2.5"/>`;
    const col = p.driver ? '#0B2A5B' : '#1F5FD6';
    return `<g class="fig" transform="${t}"><title>${p.name}${p.driver ? ' (conductor)' : ''}</title><ellipse cx="1" cy=".5" rx="6" ry="3" fill="rgba(11,42,91,.2)"/><rect x="-3.5" y="-13.5" width="7" height="13.5" rx="3.5" fill="${col}"/><path d="M-3.5 -10.5a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v5h-7z" fill="#E5322D"/><path d="M-3.5 -8.4h7M-3.5 -6.6h7" stroke="#FFE08A" stroke-width=".8"/><path d="M0 -13.5v8" stroke="#B3211D" stroke-width=".6"/><circle cy="-17.5" r="4" fill="${col}"/><circle cy="-17.5" r="4" fill="#fff" opacity=".28"/></g>`;
  }

  function truck(t, x, y, sel, act, extra = '') {
    const z = SIZES[t.size] || SIZES['4'], T = len(z), o = P(x, y), tag = P(T / 2, z.W / 2, z.H + 1.5), w = Math.max(58, t.plate.length * 8.2 + 26);
    const ring = poly([P(-.5, -.35), P(T + .6, -.35), P(T + .6, z.W + .55), P(-.5, z.W + .55)], '', 'class="ring"');
    const b = T + .5, spots = t.cap === 5 ? [[b, -.05], [b + .75, -.05], [b, .7], [b + .75, .7], [b + .37, 1.45]] : [[b, .15], [b + .75, .15], [b, .95], [b + .75, .95]];
    const people = t.crew ? spots.map((s, i) => fig(s[0], s[1], t.crew[i])).join('') : '';
    return `<g class="trk ${t.state}${t.alert ? ' alert' : ''}${sel ? ' sel' : ''}" data-action="${act}:${t.id}" data-truck="${t.id}" tabindex="0" role="button" aria-label="Camión ${t.plate}" transform="translate(${o[0].toFixed(1)},${o[1].toFixed(1)})" ${extra}>
      <g class="trk-move">${ring}<g class="trk-body">${truckBody(t.state === 'inactiva', z)}</g>${people}
      <g class="tag" transform="translate(${tag[0].toFixed(1)},${tag[1].toFixed(1)})"><rect x="${-w / 2}" y="-11" width="${w}" height="22" rx="11"/><circle class="dot" cx="${-w / 2 + 12}" cy="0" r="4"/><text x="7" y="4" text-anchor="middle">${t.plate}</text></g></g></g>`;
  }

  function tree(x, y) {
    const p = P(x, y);
    return `<g transform="translate(${p[0].toFixed(1)},${p[1].toFixed(1)})"><ellipse cx="2" cy="1" rx="12" ry="5.5" fill="rgba(11,42,91,.12)"/><rect x="-1.8" y="-14" width="3.6" height="15" rx="1.5" fill="#8A7968"/><g class="leaf"><circle cy="-25" r="13" fill="#6FC3A0"/><circle cx="-4" cy="-29" r="7.5" fill="#93D8BA"/></g></g>`;
  }

  // Edificio de ciudad con ventanas en sus dos caras visibles
  const PAL = [['#EEF2F8', '#DCE3EF', '#C6D0E2', '#A3B5D3'], ['#E3E9F4', '#CCD6E8', '#B5C2DA', '#8FA6CC'], ['#F3EFE8', '#E6DFD3', '#D2CABB', '#AEB9CC'], ['#DDE8F8', '#C3D5F2', '#A9C0E6', '#7EA0D8']];
  function building(x, y, dx, dy, h, i) {
    const p = PAL[i % PAL.length], win = (w) => { const cols = Math.max(1, Math.floor(w * 10 / 7)), rows = Math.max(1, Math.floor((h * 10 - 5) / 7)), off = (w * 10 - cols * 7) / 2 + 1.75; let s = ''; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += `<rect x="${(off + c * 7).toFixed(1)}" y="${3 + r * 7}" width="3.5" height="4.2" rx=".4" fill="${p[3]}"/>`; return s; };
    return box(x, y, 0, dx, dy, h, p[0], p[1], p[2]) + `<g transform="${faceL(x, y + dy, h)}">${win(dx)}</g><g transform="${faceR(x + dx, y + dy, h)}" opacity=".8">${win(dy)}</g>`;
  }
  const WALL = ['#D5DDEC', '#B4C0D6', '#9BAAC4'], COLS = 4, ROWS = 4, CX = 6.4, RY = 3.4, SX = 2.6, SY = 8.4;
  const wall = (x, y, dx, dy) => box(x, y, 0, dx, dy, 1, ...WALL);

  // Todo lo que queda detrás de los camiones estacionados
  // La ciudad sigue más allá del terreno principal en manzanas sueltas, para que el borde no sea un rectángulo
  const slab = (x, y, dx, dy, top = '#EEF3FB') => box(x, y, -.5, dx, dy, .5, top, '#D5DFF2', '#C6D3EC');
  const row = (x, y, widths, depth, heights, along, k = 0) => { let s = '', p = along === 'x' ? x : y; widths.forEach((w, i) => { s += along === 'x' ? building(p, y, w, depth, heights[i], i + k) : building(x, p, depth, w, heights[i], i + k); p += w + .6; }); return s; };
  function cityBack() {
    let s = slab(-3, -13.5, 30, 6.5) + slab(27, -10.5, 9, 3.5) + slab(-13.5, 2, 6.5, 18) + slab(-11, -11, 8, 4);
    s += row(-2.4, -12.8, [4.2, 3.4, 5, 3.6, 4.4, 4], 3.6, [4.2, 6, 3.2, 5, 3.6, 4.6], 'x', 2);
    s += row(27.6, -10, [3.6, 3.8], 2.4, [2.6, 3.8], 'x', 1);
    s += building(-10.4, -10.4, 3, 2.8, 3.4, 3) + building(-6.8, -10.4, 3, 2.8, 2.2, 0);
    s += row(-12.9, 2.6, [4, 3.6, 4.4, 3.4], 3.6, [3.6, 2.4, 4.4, 3], 'y', 0);
    return s;
  }
  // Manzanas del lado derecho (almacenes bajos) y del frente, pasando la pista (parque y casas bajas que no tapan los camiones)
  function cityRight() {
    return slab(GX, 4, 7, 18) + rect(GX, 12.2, 7, 1.8, '#DCE3F0') + building(41, 5, 5, 3, 1.8, 1) + building(41, 8.6, 5, 3, 2.4, 3) + building(41, 14.6, 5, 3.2, 1.6, 0) + building(41, 18.2, 5, 3, 2.2, 2);
  }
  function cityFront() {
    let s = slab(3, GY, 31, 6.5) + slab(34, GY, 5, 3.4) + slab(-6, GY, 6, 2.6);
    s += rect(13.5, GY + .8, 9.5, 4.9, '#CFEBDD') + [[14.6, GY + 1.8], [17, GY + 4.6], [19.4, GY + 1.8], [21.8, GY + 4.6], [16, GY + 3.2], [20.6, GY + 3.2]].map(([x, y]) => tree(x, y)).join('');
    s += row(3.8, GY + 2.2, [2.6, 2.4, 2.8], 3, [1, 1.3, .9], 'x', 0) + row(24.4, GY + 2.2, [2.6, 2.8, 2.4], 3, [1.2, .9, 1.3], 'x', 2);
    s += building(34.8, GY + .8, 3.4, 1.8, 1, 1) + building(-5.2, GY + .6, 4.2, 1.4, .9, 3);
    return s;
  }
  function back() {
    let s = cityBack() + box(G0, G0, -.5, GX - G0, GY - G0, .5, '#EEF3FB', '#D5DFF2', '#C6D3EC');
    // ciudad: calles y edificios detrás y a la izquierda del CD (no tapan el patio)
    s += rect(G0, -1.5, GX - G0, 2.2, '#DCE3F0') + rect(-1.5, -1.5, 2.2, ROAD0 + 1.5, '#DCE3F0');
    let bx = G0 + .5; [4, 3.2, 5, 3.6, 4.4, 3, 4.8, 3.4, 4, 5, 3.2, 4.2].forEach((w, i) => { if (bx + w < GX - .5) s += building(bx, -6.2, w, 4.2, [3.5, 5.6, 2.6, 4.4, 6.2, 3, 4.8, 2.4, 5.2, 3.6, 4.2, 2.8][i], i); bx += w + .7; });
    let by = -.6; [4, 3.4, 4.6, 3.2, 4.2, 3.6].forEach((d, i) => { if (by + d < ROAD0 - 1.2) s += building(-6.2, by, 4.2, d, [3, 4.8, 2.6, 5.2, 3.4, 2.4][i], i + 1); by += d + .7; });
    // pista de tres carriles, vereda y salida del portón
    s += rect(G0, ROAD0, GX - G0, ROAD_W, '#D3DCED') + rect(G0, ROAD0 + ROAD_W, GX - G0, GY - ROAD0 - ROAD_W, '#E6ECF7') + rect(GATE0, EY1, GATE1 - GATE0, ROAD0 - EY1, '#DDE5F3');
    for (let i = 1; i < LANES; i++) s += line(G0, ROAD0 + LANE * i, GX, ROAD0 + LANE * i, 'class="lane" stroke="#fff" stroke-width="2.5" stroke-dasharray="14 12"');
    s += `<g class="roadhint">${rect(G0, ROAD0, GX - G0, ROAD_W, 'rgba(63,169,245,.28)', 'stroke="#3FA9F5" stroke-width="2.5" stroke-dasharray="9 7"')}${rect(GATE0, EY1, GATE1 - GATE0, ROAD0 - EY1, 'rgba(63,169,245,.28)')}<text transform="${floor(2, ROAD0 + LANE + 1.6)}" font-size="11" font-weight="800" fill="#0B2A5B" font-family="Inter,Arial,sans-serif" letter-spacing="1.2">SUELTA AQUÍ · SALE A RUTA</text></g>`;
    // piso del recinto y cajones de estacionamiento (hay más cajones que camiones: espacio para crecer)
    s += rect(EX0, EY0, EX1 - EX0, EY1 - EY0, '#E2E9F6');
    for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS; r++) s += line(SX - .5 + c * CX, SY - .35 + r * RY, SX + 5.3 + c * CX, SY - .35 + r * RY, 'stroke="#fff" stroke-width="2"');
    s += `<g class="inhint">${rect(EX0 + .3, 7.6, EX1 - EX0 - .6, EY1 - 7.9, 'rgba(63,169,245,.2)', 'stroke="#3FA9F5" stroke-width="2.5" stroke-dasharray="9 7"')}</g>`;
    // muros del fondo
    s += wall(EX0, EY0, EX1 - EX0, .3) + wall(EX0, EY0, .3, EY1 - EY0);
    // centro de distribución
    s += box(3, 1.8, 0, 16, 5.3, 3.4, '#3B7BEA', '#1F5FD6', '#184FB8');
    s += `<g transform="${faceL(3, 7.1, 3.4)}"><rect x="0" y="0" width="160" height="3" fill="#0B2A5B" opacity=".35"/>
      <text x="80" y="11.5" font-size="6.4" fill="#fff" text-anchor="middle" font-family="Marcellus,Georgia,serif" letter-spacing="1.6">CD ATE</text>
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${8 + i * 25}" y="16" width="18" height="18" rx="1" fill="#DCE9FC"/><path d="M${8 + i * 25} 22h18M${8 + i * 25} 28h18" stroke="#B5CBEE" stroke-width=".7"/>`).join('')}</g>`;
    return s;
  }
  // Muro derecho, muro frontal y portón corredizo (quedan delante de los camiones estacionados)
  function front() {
    const gw = GATE1 - GATE0;
    let s = wall(EX1 - .3, EY0, .3, EY1 - EY0) + wall(EX0, EY1 - .3, GATE0 - EX0, .3) + wall(GATE1, EY1 - .3, EX1 - GATE1, .3);
    s += line(GATE0, EY1 + .12, GATE1 + gw, EY1 + .12, 'stroke="#7C8BA1" stroke-width="1.5"');
    s += box(GATE0 - .45, EY1 - .45, 0, .5, .6, 1.6, '#3B7BEA', '#1F5FD6', '#184FB8');
    s += `<g class="gate" style="--gx:${(-gw * C * S).toFixed(0)}px;--gy:${(-gw * H * S).toFixed(0)}px">${box(GATE1 + .15, EY1 + .05, 0, gw, .14, 1.25, '#5B8FEF', '#1F5FD6', '#184FB8')}<g transform="${faceL(GATE1 + .15, EY1 + .19, 1.25)}">${Array.from({ length: Math.floor(gw * 10 / 5) }, (_, i) => `<path d="M${5 * i + 2.5} 1V11.5" stroke="#BFD6FB" stroke-width=".8"/>`).join('')}<path d="M0 6.2H${gw * 10}" stroke="#BFD6FB" stroke-width=".8"/></g></g>`;
    s += box(GATE1 - .05, EY1 - .45, 0, .5, .6, 1.6, '#3B7BEA', '#1F5FD6', '#184FB8');
    return s;
  }
  function shop() {
    return box(32.6, 4.6, 0, 5.4, 4.5, 2.6, '#8997AC', '#5B6B7F', '#4C5A6C')
      + `<g transform="${faceL(32.6, 9.1, 2.6)}"><text x="27" y="8.5" font-size="5.2" fill="#fff" text-anchor="middle" font-family="Marcellus,Georgia,serif" letter-spacing="1.2">TALLER</text><rect x="14" y="12" width="26" height="14" rx="1" fill="#2E3A4B"/></g>`;
  }

  function svg(list, selId) {
    const inside = [], outside = [{ d: 37, h: rect(32.3, 10.2, 6.6, 6.2, '#F3EEDF', 'stroke="#D9B45C" stroke-width="1.5" stroke-dasharray="6 5"') + shop() }];
    [[31, 2], [39.2, 2.4], [31, 19.6], [39.2, 20.6], [3, 22.1], [7, 22.1], [22.5, 22.1], [27, 22.1], [GX - .6, 22.1]].forEach(([x, y]) => outside.push({ d: x + y, h: tree(x, y) }));
    const curb = [-4, 3, 10, 17, 24, 31, 38].map(x => tree(x, GY - .7)).join('');
    const parked = list.filter(t => t.state === 'patio' || t.state === 'inactiva'), inShop = list.filter(t => t.state === 'taller'), road = list.filter(t => t.state === 'ruta');
    parked.forEach((t, i) => { const x = SX + (i % COLS) * CX, y = SY + (Math.floor(i / COLS) % ROWS) * RY; inside.push({ d: x + y, h: truck(t, x, y, t.id === selId, 'sel') }); });
    inShop.forEach((t, i) => { const x = 33, y = 10.7 + (i % 2) * 2.7; outside.push({ d: x + y + 5, h: truck(t, x, y, t.id === selId, 'sel') }); });
    const dx = ROAD_LEN * C * S, dy = ROAD_LEN * H * S;
    // Los camiones en ruta se reparten en tres carriles, espaciados dentro de cada uno
    const onRoad = [];
    for (let l = 0; l < LANES; l++) {
      const inLane = road.filter((_, i) => i % LANES === l);
      inLane.forEach((t, j) => { const f = ((j + .5) / inLane.length + l * .09) % 1, zs = SIZES[t.size] || SIZES['4']; onRoad.push(truck({ ...t, crew: null }, ROAD_FROM, ROAD0 + l * LANE + (LANE - zs.W) / 2, t.id === selId, 'sel', `style="--d:${(-f * 40).toFixed(1)}s;--sx:${(dx * f).toFixed(0)}px;--sy:${(dy * f).toFixed(0)}px"`)); });
    }
    const z = a => a.sort((p, q) => p.d - q.d).map(o => o.h).join('');
    const [x0, x1, y0, y1] = BOUNDS;
    return `<svg class="scene patio" viewBox="${x0.toFixed(0)} ${y0.toFixed(0)} ${(x1 - x0).toFixed(0)} ${(y1 - y0).toFixed(0)}" role="group" aria-label="Patio de camiones de Transportes Blue CJ" style="--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px">${back()}${z(inside)}${front()}${z(outside)}${cityRight()}${onRoad.join('')}${curb}${cityFront()}</svg>`;
  }

  // Posición del puntero (coordenadas del SVG) → 'out' si cayó fuera del portón (pista), 'in' si cayó dentro del recinto
  function zone(sx, sy) { const y = (sy / (H * S) - sx / (C * S)) / 2, x = (sy / (H * S) + sx / (C * S)) / 2; return y > EY1 ? 'out' : (x > EX0 && x < EX1 && y > EY0 ? 'in' : 'none'); }

  // Vista de flota: todos los camiones estacionados en una playa, sin animación de ruta
  function lot(list, selId) {
    const cols = 4, RS = 4.3, CS = 6.8, rows = Math.max(1, Math.ceil(list.length / cols)), gx = cols * CS + 2.2, gy = rows * RS + 2.6;
    let s = box(0, 0, -.5, gx, gy, .5, '#EEF3FB', '#D5DFF2', '#C6D3EC') + rect(1.1, 1.1, gx - 2.2, gy - 2.2, '#E2E9F6');
    for (let r = 0; r <= rows; r++) for (let c = 0; c < cols; c++) s += line(1.6 + c * CS, 1.5 + r * RS, 7.5 + c * CS, 1.5 + r * RS, 'stroke="#fff" stroke-width="2"');
    const objs = [[.55, .55], [gx - .55, .55], [.55, gy - .55], [gx - .55, gy - .55]].map(([x, y]) => ({ d: x + y, h: tree(x, y) }));
    list.forEach((t, i) => { const x = 2 + (i % cols) * CS, y = 2.9 + Math.floor(i / cols) * RS; objs.push({ d: x + y, h: truck({ ...t, crew: null, state: t.state === 'ruta' ? 'enruta' : t.state }, x, y, t.id === selId, 'usel') }); });
    objs.sort((a, b) => a.d - b.d);
    const x0 = P(0, gy)[0] - 30, x1 = P(gx, 0)[0] + 30, y1 = P(gx, gy)[1] + 30;
    return `<svg class="scene" viewBox="${x0.toFixed(0)} -95 ${(x1 - x0).toFixed(0)} ${(y1 + 95).toFixed(0)}" role="group" aria-label="Flota de camiones">${s}${objs.map(o => o.h).join('')}</svg>`;
  }
  // Punto del dibujo (fracción 0–1) donde queda el centro del recinto: ahí se enfoca la vista al abrir
  const focus = (() => { const [x0, x1, y0, y1] = BOUNDS, c = P(16.5, 14.5); return { x: (c[0] - x0) / (x1 - x0), y: (c[1] - y0) / (y1 - y0) }; })();
  return { svg, lot, zone, focus };
})();
