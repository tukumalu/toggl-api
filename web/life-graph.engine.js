// ---------- setup ----------
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let W = 0, H = 0, DPR = 1;
function resize() {
  const was = W;
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth || cv.clientWidth; H = innerHeight || cv.clientHeight;
  if (!W || !H) return;                       // tab not laid out yet; retry on the next resize
  const narrow = W < 820;
  if (typeof sim !== 'undefined' && narrow !== SPREAD.narrow) {
    SPREAD.narrow = narrow;                   // a portrait screen needs a squarer layout
    SPREAD.x = narrow ? 620 : 1320;
    SPREAD.y = narrow ? 235 : 330;
    applyForces();
    sim.alpha(0.6).restart();
  }
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!userMoved) recenter();                 // keep the whole decade framed until the user takes over
  draw();
}
function recenter() {
  const ns = nodes.filter(n => n.x != null && visible(n));
  if (!ns.length) {
    d3.select(cv).call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(0.5));
    return;
  }
  const wide = W > 820;
  // the rail sits over the left third on desktop, the cards over the bottom on mobile
  const padL = wide ? 400 : 58, padR = wide ? 60 : 58, padT = wide ? 120 : 120, padB = wide ? 80 : 150;
  const xs = ns.map(n => n.x), ys = ns.map(n => n.y);
  const x0 = Math.min.apply(null, xs) - 40, x1 = Math.max.apply(null, xs) + 40;
  const y0 = Math.min.apply(null, ys) - 40, y1 = Math.max.apply(null, ys) + 40;
  // labels sit outside the node bounding box, and a phone has no room to spare for them
  const slack = wide ? 0.9 : 0.92;
  const k = slack * Math.max(0.15, Math.min(1.6,
    Math.min((W - padL - padR) / (x1 - x0), (H - padT - padB) / (y1 - y0))));
  d3.select(cv).call(zoom.transform, d3.zoomIdentity
    .translate(padL + (W - padL - padR) / 2, padT + (H - padT - padB) / 2)
    .scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
}
let userMoved = false, fitted = false;

const SPREAD = { x: 1320, y: 330, narrow: false };
const YEARS = GRAPH.meta.years;
const Y0 = +YEARS[0], Y1 = +YEARS[YEARS.length - 1];

// centre of mass in time -> colour. cold 2017, warm 2026.
const ramp = d3.interpolateRgbBasis(['#3f8fc4', '#5b8fd0', '#8f7fd6', '#c977b4', '#f09267', '#ffb457']);
function era(n) {
  let s = 0, w = 0;
  for (const y in n.years) { s += +y * n.years[y]; w += n.years[y]; }
  return w ? (s / w - Y0) / (Y1 - Y0) : 0.5;
}
const nodes = GRAPH.nodes.map(n => {
  const e = era(n);
  const active = Object.keys(n.years).filter(y => n.years[y] > 0).map(Number);
  return Object.assign({}, n, {
    e: e, col: ramp(e),
    r: n.kind === 'year' ? 15 : Math.max(2.6, Math.min(17,
        1.55 * Math.pow(n.h, 0.31) + 0.9 * Math.sqrt(n.deg || 1))),
    y0: active.length ? Math.min.apply(null, active) : Y0
  });
});
const byId = new Map(nodes.map(n => [n.id, n]));
const links = GRAPH.edges.map(e => ({ source: e.s, target: e.t, w: e.w, k: e.k }));
const nbr = new Map(nodes.map(n => [n.id, new Set([n.id])]));
for (const l of links) { nbr.get(l.source).add(l.target); nbr.get(l.target).add(l.source); }

// ---------- forces ----------
const sim = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(l => 42 + 26 / l.w).strength(l => 0.045 * l.w))
  .force('charge', d3.forceManyBody().strength(d => -62 - d.r * 9).distanceMax(760))
  .force('collide', d3.forceCollide().radius(d => d.r * 1.4 + 9).strength(0.95).iterations(2))
  .alphaDecay(0.016)
  .on('tick', draw)
  .on('end', () => {
    if (userMoved || focus) return;
    fitted = true; recenter();
    setTimeout(() => { if (!userMoved && !focus) recenter(); }, 500);   // frame the settled layout
  });

// d3 caches positional-force targets when the force initialises, so a spread change
// means installing fresh forces, not mutating SPREAD.
function applyForces() {
  sim.force('x', d3.forceX(d => (d.e - 0.5) * SPREAD.x).strength(d => d.kind === 'year' ? 0.34 : 0.14))
     .force('y', d3.forceY(d => d.kind === 'year' ? 0 : (d.lane || 0) * SPREAD.y)
       .strength(d => d.kind === 'year' ? 0.6 : 0.17));
}
applyForces();

// ---------- view ----------
let tr = d3.zoomIdentity;
const zoom = d3.zoom().scaleExtent([0.15, 6])
  // let a press that lands on a node fall through to the node-drag gesture
  .filter(ev => {
    if (ev.type === 'wheel') return !ev.ctrlKey || ev.metaKey;
    if (ev.button) return false;
    const t = ev.touches ? ev.touches[0] : ev;
    return !pick(t.clientX, t.clientY);
  })
  .on('zoom', ev => { tr = ev.transform; if (ev.sourceEvent) userMoved = true; draw(); });
let hover = null, pinned = null, cutoff = Y1, focus = null;

const dimmed = id => {
  if (focus) return !focus.has(id);
  const key = pinned || hover;
  if (!key) return false;
  return !nbr.get(key).has(id);
};
const visible = n => n.y0 <= cutoff;

function draw() {
  if (!W) return;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(tr.x, tr.y); ctx.scale(tr.k, tr.k);
  const anyFocus = !!(hover || pinned || focus);

  ctx.lineCap = 'round';
  for (const l of links) {
    const s = l.source, t = l.target;
    if (!s.x || !visible(s) || !visible(t)) continue;
    const lit = anyFocus && !dimmed(s.id) && !dimmed(t.id);
    const anchor = l.k === 'spine' || l.k === 'year' || l.k === 'dom';
    ctx.globalAlpha = anyFocus ? (lit ? 0.62 : 0.03)
      : (l.k === 'spine' ? 0.42 : anchor ? 0.26 : 0.13);
    ctx.strokeStyle = lit ? '#e9f2ff' : anchor ? '#a8bcd8' : '#8fa6c6';
    ctx.lineWidth = (lit ? 1.3 : l.k === 'spine' ? 1.3 : anchor ? 0.85 : 0.6) / tr.k;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
  }

  for (const n of nodes) {
    if (n.x == null || !visible(n)) continue;
    const dim = anyFocus && dimmed(n.id);
    ctx.globalAlpha = dim ? 0.12 : 1;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7);
    ctx.fillStyle = n.col; ctx.fill();
    if (n.kind !== 'theme' && !dim) {
      ctx.lineWidth = 1.6 / tr.k; ctx.strokeStyle = 'rgba(231,237,246,.55)'; ctx.stroke();
    }
    if ((pinned === n.id || hover === n.id) && !dim) {
      ctx.lineWidth = 2.2 / tr.k; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
  }

  ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const key = hover || pinned;
  // priority order: years, then domains, then the biggest threads. A label is only
  // drawn if its box is still free, so the graph never turns into stacked text.
  const rank = n => (n.kind === 'year' ? 0 : n.kind === 'domain' ? 1 : 2);
  const cands = nodes.filter(n => n.x != null && visible(n) && !(anyFocus && dimmed(n.id)))
    .sort((a, b) => rank(a) - rank(b) || b.r - a.r);
  const taken = [];
  const hit = (arr, x0, y0, x1, y1) => {
    for (const b of arr) if (x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]) return true;
    return false;
  };
  // a thread label may not sit on another node's disc, so the dense core reads as texture
  // instead of as stacked words; anchors (years, domains) are exempt.
  const discs = cands.map(n => [n.x - n.r, n.y - n.r, n.x + n.r, n.y + n.r, n.id]);
  for (const n of cands) {
    const near = (key && nbr.get(key).has(n.id)) || (focus && focus.has(n.id));
    const big = n.kind === 'year' || n.kind === 'domain';
    const small = W < 820;
    if (small && !near && n.kind === 'theme' && tr.k < 1.6) continue;
    if (small && !near && n.kind === 'domain' && n.h < 700 && tr.k < 1.2) continue;
    if (!near && !big && !(n.r > 13.5 || tr.k > 1.25)) continue;
    const size = (big ? 12.5 : 11) / tr.k;
    ctx.font = (big ? 500 : 400) + ' ' + size + 'px "IBM Plex Sans", sans-serif';
    const w = ctx.measureText(n.name).width, ly = n.y - n.r - 4 / tr.k;
    const box = [n.x - w / 2 - 2 / tr.k, ly - size, n.x + w / 2 + 2 / tr.k, ly + 2 / tr.k];
    if (!near && hit(taken, box[0], box[1], box[2], box[3])) continue;
    if (!near && !big && discs.some(d => d[4] !== n.id &&
        box[0] < d[2] && box[2] > d[0] && box[1] < d[3] && box[3] > d[1])) continue;
    taken.push(box);
    ctx.lineWidth = 3.6 / tr.k; ctx.strokeStyle = 'rgba(10,13,18,.94)'; ctx.lineJoin = 'round';
    ctx.strokeText(n.name, n.x, ly);
    ctx.fillStyle = big ? '#eef4fc' : 'rgba(206,220,238,.8)';
    ctx.fillText(n.name, n.x, ly);
  }
  ctx.restore();
}

// ---------- picking ----------
function pick(mx, my) {
  const p = tr.invert([mx, my]);
  let best = null, bd = Infinity;
  for (const n of nodes) {
    if (n.x == null || !visible(n)) continue;
    const d = Math.hypot(n.x - p[0], n.y - p[1]);
    if (d < n.r + 7 / tr.k && d < bd) { bd = d; best = n; }
  }
  return best;
}
cv.addEventListener('mousemove', ev => {
  const n = pick(ev.clientX, ev.clientY);
  const id = n ? n.id : null;
  if (id !== hover) { hover = id; cv.style.cursor = id ? 'pointer' : 'grab'; draw(); }
});
cv.addEventListener('mouseleave', () => { hover = null; draw(); });
cv.addEventListener('click', ev => {
  const n = pick(ev.clientX, ev.clientY);
  if (!n) { pinned = null; clearFocus(); return; }
  pinned = n.id; focus = null; railClear(); showDetail(n); draw();
});

// ---------- detail panel ----------
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const fmt = n => n >= 1000 ? d3.format(',.0f')(n) : d3.format('.1f')(n);
function showDetail(n) {
  $('detail').classList.add('on');
  $('d-name').textContent = n.name;
  $('d-kind').textContent = n.kind === 'theme' ? 'recurring thread' : n.kind === 'domain' ? 'life domain' : 'year';
  $('d-h').textContent = fmt(n.h) + ' h';
  $('d-n').textContent = d3.format(',')(n.n);
  $('d-first').textContent = n.first; $('d-last').textContent = n.last;
  $('d-dom').textContent = n.doms ? n.doms.slice(0, 3).map(d => d[0]).join(' \u00b7 ') : '\u2014';
  const vals = YEARS.map(y => n.years[y] || 0), mx = Math.max.apply(null, vals.concat([1]));
  const x = i => 2 + i * (256 / (YEARS.length - 1)), yy = v => 50 - (v / mx) * 36;   // headroom for the peak-year label
  const area = d3.area().x((v, i) => x(i)).y0(50).y1(v => yy(v)).curve(d3.curveMonotoneX)(vals);
  const line = d3.line().x((v, i) => x(i)).y(v => yy(v)).curve(d3.curveMonotoneX)(vals);
  const peak = vals.indexOf(mx);
  $('spark').innerHTML =
    '<path d="' + area + '" fill="' + n.col + '" opacity=".18"></path>' +
    '<path d="' + line + '" fill="none" stroke="' + n.col + '" stroke-width="1.6"></path>' +
    '<circle cx="' + x(peak) + '" cy="' + yy(mx) + '" r="2.8" fill="' + n.col + '"></circle>' +
    '<text x="' + x(peak) + '" y="' + Math.max(10, yy(mx) - 5) + '" fill="#93a3b8" font-size="9" text-anchor="middle" font-family="IBM Plex Mono">' + YEARS[peak] + '</text>';
  $('ex').innerHTML = (n.ex || []).slice(0, 4)
    .map(e => '<li><span class="d mono">' + e.d + ' \u00b7 ' + e.h + 'h</span><br>' + esc(e.t) + '</li>').join('');
}
function hideDetail() { $('detail').classList.remove('on'); }

// ---------- findings rail ----------
const rail = $('rail');
FINDINGS.forEach((f, i) => {
  const el = document.createElement('article');
  el.className = 'card'; el.tabIndex = 0;
  el.style.setProperty('--edge', ramp(f.e != null ? f.e : 0.5));
  el.innerHTML = '<div class="n mono">FINDING ' + String(i + 1).padStart(2, '0') + '</div>' +
    '<h3>' + f.title + '</h3><p>' + f.body + '</p>';
  const open = () => {
    const was = el.classList.contains('on');
    railClear(); hideDetail();
    if (was) { focus = null; history.replaceState(null, '', location.pathname); draw(); return; }
    el.classList.add('on');
    history.replaceState(null, '', location.pathname + '?f=' + (i + 1));
    const ids = (f.nodes || []).filter(id => byId.has(id));
    if (ids.length) { focus = new Set(ids); pinned = null; frame(ids); showDetail(byId.get(ids[0])); }
    draw();
  };
  el.addEventListener('click', open);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  rail.appendChild(el);
});
const cards = [].slice.call(rail.querySelectorAll('.card'));
const deep = +(new URLSearchParams(location.search).get('f') || 0);
if (deep >= 1 && deep <= cards.length) {
  sim.tick(220);                       // settle first so the camera frames real positions
  cards[deep - 1].click();
}
function railClear() { rail.querySelectorAll('.card.on').forEach(c => c.classList.remove('on')); }
function clearFocus() { focus = null; railClear(); hideDetail(); draw(); }
function frame(ids) {
  const ns = ids.map(i => byId.get(i)).filter(n => n.x != null);
  if (!ns.length) return;
  const xs = ns.map(n => n.x), ys = ns.map(n => n.y);
  const minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs);
  const miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
  const pad = 240, w = maxx - minx + pad, h = maxy - miny + pad;
  const k = Math.max(0.25, Math.min(2.2, 0.82 * Math.min(W / w, H / h)));
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  const wide = W > 820;
  // keep the framed nodes clear of the rail (left) and the detail panel (right)
  const cxPix = wide ? (370 + (W - 340)) / 2 - 40 : W / 2;
  const cyPix = wide ? H / 2 : H / 2 - 90;
  d3.select(cv).transition().duration(reduce ? 0 : 780).ease(d3.easeCubicInOut)
    .call(zoom.transform, d3.zoomIdentity.translate(cxPix, cyPix).scale(k).translate(-cx, -cy));
}

// ---------- timeline ----------
const range = $('range'), ticks = $('ticks');
YEARS.forEach(y => { const s = document.createElement('span'); s.textContent = "'" + String(y).slice(2); ticks.appendChild(s); });
ticks.appendChild(document.createElement('span'));
function setYear(v) {
  const all = v >= YEARS.length;
  cutoff = all ? Y1 : +YEARS[v];
  $('hud-y').textContent = all ? 'all years' : 'through ' + cutoff;
  const shown = nodes.filter(visible).length;
  const hrs = nodes.filter(n => n.kind === 'domain' && visible(n))
    .reduce((s, n) => s + YEARS.filter(y => +y <= cutoff).reduce((a, y) => a + (n.years[y] || 0), 0), 0);
  $('hud-h').textContent = '\u00b7 ' + shown + ' nodes \u00b7 ' + d3.format(',.0f')(hrs) + ' h';
  $('fill').style.width = (v / YEARS.length * 100) + '%';
  [].forEach.call(ticks.children, (s, i) => s.classList.toggle('on', i === v));
  draw();
}
range.max = YEARS.length; range.value = YEARS.length;
range.addEventListener('input', () => setYear(+range.value));
let timer = null;
$('play').addEventListener('click', () => {
  if (timer) { clearInterval(timer); timer = null; $('play').innerHTML = '&#9654;'; return; }
  $('play').innerHTML = '&#10073;&#10073;';
  range.value = 0; setYear(0);
  timer = setInterval(() => {
    if (+range.value >= YEARS.length) { clearInterval(timer); timer = null; $('play').innerHTML = '&#9654;'; return; }
    range.value = +range.value + 1; setYear(+range.value);
  }, reduce ? 10 : 900);
});
addEventListener('keydown', e => { if (e.key === 'Escape') { pinned = null; clearFocus(); } });

d3.select(cv).call(zoom);
resize();
addEventListener('resize', resize);
new ResizeObserver(resize).observe(document.documentElement);
d3.select(cv).on('dblclick.zoom', null);
d3.select(cv).call(d3.drag()
  .container(cv)
  .subject(ev => pick(ev.x, ev.y))
  .on('start', ev => { if (!ev.subject) return; if (!ev.active) sim.alphaTarget(0.22).restart(); const p = tr.invert([ev.x, ev.y]); ev.subject.fx = p[0]; ev.subject.fy = p[1]; })
  .on('drag', ev => { if (!ev.subject) return; const p = tr.invert([ev.x, ev.y]); ev.subject.fx = p[0]; ev.subject.fy = p[1]; })
  .on('end', ev => { if (!ev.subject) return; if (!ev.active) sim.alphaTarget(0); ev.subject.fx = null; ev.subject.fy = null; }));
setYear(YEARS.length);
sim.alpha(1).restart();
