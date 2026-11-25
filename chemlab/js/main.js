// ChemLab — UI wiring.
import { STOCK, STOCK_BY_ID, GROUPS, AQ, SOLIDS, uiColor } from './data.js';
import { Vessel, EPS } from './engine.js';
import { Lab } from './lab.js';
import { Bench } from './render.js';
import { EXPERIMENTS } from './experiments.js';
import { SPECIES_MOL } from './molecules.js';
import { openViewer } from './viewer.js';

const $ = s => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rgb = c => `rgb(${c.map(x => x | 0).join(',')})`;

const lab = new Lab();
const bench = new Bench($('#bench'), lab);
let sel = 0;
let amount = 10;

// ---------- stock bottle colours ----------
for (const st of STOCK) {
  if (st.kind === 'solid') { bench.stockColor[st.id] = SOLIDS[st.solid].color; continue; }
  const v = new Vessel(0);
  v.addLiquid(st.kind === 'ind' ? { ions: Object.fromEntries(Object.entries(st.ions).map(([k, c]) => [k, c * 0.02])) } : st, 50);
  const ind = { phth: [235, 60, 160], MO: [240, 120, 40], UI: [80, 170, 70], starch: [235, 235, 225] }[st.id];
  bench.stockColor[st.id] = ind || v.color().rgb;
}

// ---------- shelf ----------
const shelf = $('#shelf');
for (const grp of GROUPS) {
  shelf.appendChild(el('h3', 'shelf-h', esc(grp)));
  const wrap = el('div', 'shelf-grid');
  for (const st of STOCK.filter(s => s.group === grp)) {
    const b = el('button', 'reagent');
    const c = bench.stockColor[st.id];
    const icon = st.kind === 'solid'
      ? `<span class="jar"><span class="lump" style="background:${rgb(c)}"></span></span>`
      : `<span class="vial"><span class="liq" style="background:${rgb(c)};opacity:${st.id === 'H2O' ? 0.25 : 0.9}"></span></span>`;
    b.innerHTML = `${icon}<span class="rl"><b>${esc(st.f)}</b><small>${esc(st.name)}${st.conc ? ' · ' + esc(st.conc) : ''}</small></span>`;
    b.title = `${st.name}${st.conc ? ' (' + st.conc + ')' : ''}\n${st.info}`;
    b.addEventListener('click', () => {
      lab.pour(sel, st.id, amount);
      b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
    });
    wrap.appendChild(b);
  }
  shelf.appendChild(wrap);
}
document.querySelectorAll('#amount button').forEach(b => b.addEventListener('click', () => {
  amount = +b.dataset.ml;
  document.querySelectorAll('#amount button').forEach(x => x.classList.toggle('on', x === b));
}));

// ---------- beaker selection & tools ----------
function select(i) {
  sel = i; bench.sel = i;
  document.querySelectorAll('#beakerSel button').forEach((b, k) => b.classList.toggle('on', k === i));
  refreshTools(); refreshInfo();
}
document.querySelectorAll('#beakerSel button').forEach((b, k) => b.addEventListener('click', () => select(k)));
$('#bench').addEventListener('click', e => {
  const r = e.currentTarget.getBoundingClientRect();
  const h = bench.hit(e.clientX - r.left, e.clientY - r.top);
  if (!h) return;
  if (h.part === 'burner') { select(h.i); toggleHeat(); } else select(h.i);
});
$('#bench').addEventListener('mousemove', e => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.cursor = bench.hit(e.clientX - r.left, e.clientY - r.top) ? 'pointer' : 'default';
});
function toggleHeat() { const v = lab.vessels[sel]; v.burner = !v.burner; if (v.burner) v.ice = false; refreshTools(); }
function toggleIce() { const v = lab.vessels[sel]; v.ice = !v.ice; if (v.ice) v.burner = false; refreshTools(); }
$('#heatBtn').addEventListener('click', toggleHeat);
$('#iceBtn').addEventListener('click', toggleIce);
$('#emptyBtn').addEventListener('click', () => { stopExperiment(); lab.empty(sel); refreshTools(); });
$('#tubeSel').addEventListener('change', e => { const val = e.target.value; lab.setTube(sel, val === '' ? null : +val); refreshTools(); });
document.querySelectorAll('[data-test]').forEach(b => b.addEventListener('click', () => { lab.test(sel, b.dataset.test); showTab('log'); }));
$('#resetBtn').addEventListener('click', () => { stopExperiment(); for (let i = 0; i < 3; i++) { lab.setTube(i, null); lab.empty(i); } logList.innerHTML = ''; welcome(); refreshTools(); });

function refreshTools() {
  const v = lab.vessels[sel];
  $('#heatBtn').classList.toggle('on', v.burner);
  $('#heatBtn').querySelector('span').textContent = v.burner ? 'Burner on' : 'Heat';
  $('#iceBtn').classList.toggle('on', v.ice);
  const ts = $('#tubeSel');
  ts.innerHTML = '<option value="">Gas tube: off</option>' + lab.vessels.filter(o => o !== v).map(o => `<option value="${o.index}">Gas tube → ${o.name}</option>`).join('');
  ts.value = v.tube ? String(v.tube.index) : '';
  ts.classList.toggle('on', !!v.tube);
  $('#selName').textContent = v.name;
}
document.addEventListener('keydown', e => {
  if (e.target.matches('input,select,textarea')) return;
  if (e.key >= '1' && e.key <= '3') select(+e.key - 1);
  else if (e.key.toLowerCase() === 'h') toggleHeat();
});

// ---------- tabs ----------
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('on', p.id === 'tab-' + name));
}
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

// ---------- notebook ----------
const logList = $('#logList');
let unread = 0;
lab.listeners.add(e => {
  const item = el('div', 'entry ' + e.kind);
  const badge = e.vi != null ? `<span class="badge b${e.vi}">${'ABC'[e.vi]}</span>` : '';
  if (e.kind === 'add' || e.kind === 'sys') item.innerHTML = `${badge}<span class="small">${esc(e.t)}</span>`;
  else {
    const tag = e.kind === 'hint' ? '<span class="tag hint">Note</span>' : e.kind === 'test' ? '<span class="tag test">Test</span>' : e.kind === 'exp' ? '<span class="tag exp">Experiment</span>' : '<span class="tag rx">Reaction</span>';
    item.innerHTML = `<div class="eh">${badge}${tag}<b>${esc(e.t)}</b></div>` +
      (e.eq && e.eq !== '—' ? `<div class="eq">${esc(e.eq)}</div>` : '') +
      (e.obs ? `<div class="obs">👁 ${esc(e.obs)}</div>` : '') +
      (e.note ? `<div class="note"><span>JEE</span>${esc(e.note)}</div>` : '');
  }
  logList.prepend(item);
  while (logList.children.length > 250) logList.lastChild.remove();
  if (!$('#tab-log').classList.contains('on') && e.kind !== 'add' && e.kind !== 'sys') { unread++; $('#unread').textContent = unread; $('#unread').hidden = false; }
});
document.querySelector('[data-tab="log"]').addEventListener('click', () => { unread = 0; $('#unread').hidden = true; });
function welcome() {
  lab.emit({ kind: 'exp', t: 'Welcome to ChemLab', obs: 'Click a beaker to select it, then click reagents on the shelf to pour them in. Heat with the burner, pipe gases between beakers and test gases with splints and litmus. Or try a guided experiment.', note: 'Every reaction you discover is written here with its balanced equation and the concept behind it.' });
}
welcome();

// ---------- contents panel & readout ----------
const fmtC = c => c >= 0.1 ? c.toFixed(2) : c >= 0.001 ? c.toFixed(3) : c.toExponential(1);
function refreshInfo() {
  const v = lab.vessels[sel];
  const pH = v.pH();
  $('#rVol').textContent = Math.round(v.V * 1000);
  $('#rTemp').textContent = v.T.toFixed(1);
  $('#rPH').textContent = pH == null ? '—' : Math.max(-1, Math.min(15, pH)).toFixed(2);
  $('#rPHdot').style.background = pH == null ? 'transparent' : rgb(uiColor(pH));
  const gases = Object.entries(v.gasRecent).filter(([, m]) => m > 2e-5).map(([g]) => ({ H2: 'H₂', O2: 'O₂', CO2: 'CO₂', NO2: 'NO₂', NH3: 'NH₃', H2S: 'H₂S' }[g] || g));
  $('#rGas').textContent = gases.length ? gases.join(', ') : 'none';
  if (!$('#tab-contents').classList.contains('on')) return;
  const rows = [];
  const skip = new Set(['H+', 'OH-']);
  if (v.V > 1e-6) {
    const ions = Object.entries(v.aq).filter(([k, n]) => !skip.has(k) && n / v.V > 1e-6).sort((a, b) => b[1] - a[1]);
    rows.push(`<h4>Dissolved (${Math.round(v.V * 1000)} mL)</h4>`);
    if (!ions.length) rows.push('<p class="muted">Pure water</p>');
    for (const [k, n] of ions) {
      const sp = AQ[k] || { f: k, name: '' };
      const dot = sp.color ? `<i style="background:${rgb(sp.color)}"></i>` : '<i class="clear"></i>';
      const mol = SPECIES_MOL[k];
      rows.push(`<div class="row">${dot}<b>${esc(sp.f)}</b><span>${esc(sp.name)}${mol ? ` <button class="mol3d" data-mol="${mol}" title="View in 3D">3D</button>` : ''}</span><em>${fmtC(n / v.V)} M</em></div>`);
    }
  }
  const sol = Object.entries(v.s).filter(([, n]) => n > EPS * 100);
  if (sol.length) {
    rows.push('<h4>Solids</h4>');
    for (const [k, n] of sol) {
      const S = SOLIDS[k];
      const g = n * S.mm;
      rows.push(`<div class="row"><i style="background:${rgb(S.color)}"></i><b>${esc(S.f)}</b><span>${esc(S.name)}</span><em>${g >= 0.01 ? g.toFixed(2) + ' g' : (g * 1000).toFixed(1) + ' mg'}</em></div>`);
    }
  }
  if (!rows.length) rows.push('<p class="muted">This beaker is empty. Pour something in from the shelf.</p>');
  $('#contents').innerHTML = rows.join('');
}
setInterval(refreshInfo, 250);
// pointerdown, because the contents list is re-rendered 4×/s and a click could straddle a re-render
$('#contents').addEventListener('pointerdown', e => { const b = e.target.closest('.mol3d'); if (b) openViewer(b.dataset.mol); });
$('#molBtn').addEventListener('click', () => openViewer());
document.querySelector('[data-tab="contents"]').addEventListener('click', () => setTimeout(refreshInfo));

// ---------- guided experiments ----------
const expList = $('#expList');
let running = null;
for (const ex of EXPERIMENTS) {
  const card = el('div', 'exp');
  card.innerHTML = `<div class="ex-t">${esc(ex.title)}</div><div class="ex-tag">${esc(ex.tag)}</div><p>${esc(ex.blurb)}</p><button>▶ Run in beaker <span class="bn"></span></button>`;
  card.querySelector('button').addEventListener('click', () => runExperiment(ex, card));
  expList.appendChild(card);
}
setInterval(() => document.querySelectorAll('.exp .bn').forEach(s => (s.textContent = 'ABC'[sel])), 300);
function stopExperiment() { if (running) running.cancel = true; running = null; document.querySelectorAll('.exp').forEach(c => c.classList.remove('running')); }
const sleep = s => new Promise(r => setTimeout(r, s * 1000));
async function idle(b, tok) { while (lab.busy(b) && !tok.cancel) await sleep(0.1); }
async function runExperiment(ex, card) {
  stopExperiment();
  const tok = { cancel: false }; running = tok;
  card.classList.add('running');
  const base = sel;
  const B = k => (base + k) % 3;
  lab.emit({ kind: 'exp', vi: base, t: ex.title, obs: ex.blurb });
  showTab('log');
  for (const [op, b, a1, a2] of ex.steps) {
    if (tok.cancel) return;
    if (op === 'say') { lab.emit({ kind: 'exp', t: b }); continue; }
    if (op === 'wait') { for (let i = 0; i < 3; i++) await idle(i, tok); await sleep(b); continue; }
    const vi = B(b), v = lab.vessels[vi];
    if (op === 'empty') { for (let i = 0; i < 3; i++) if (lab.vessels[i].tube === v || i === vi) lab.setTube(i, null); lab.empty(vi); }
    else if (op === 'pour' || op === 'drops') { lab.pour(vi, a1, a2); await idle(vi, tok); await sleep(0.35); }
    else if (op === 'solid') { lab.pour(vi, a1, 0); await idle(vi, tok); await sleep(0.4); }
    else if (op === 'heat') { v.burner = a1; if (a1) v.ice = false; }
    else if (op === 'ice') { v.ice = a1; if (a1) v.burner = false; }
    else if (op === 'tube') lab.setTube(vi, a1 == null ? null : B(a1));
    else if (op === 'test') { await idle(vi, tok); lab.test(vi, a1); await sleep(2.6); }
    else if (op === 'until') { const t0 = performance.now(); while (!tok.cancel && !a1(v) && performance.now() - t0 < a2 * 1000) await sleep(0.2); }
    refreshTools();
  }
  if (running === tok) { running = null; card.classList.remove('running'); }
}

// ---------- main loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  lab.update(dt);
  bench.frame(dt);
  requestAnimationFrame(loop);
}
select(0);
requestAnimationFrame(loop);
window.chemlab = { lab, bench }; // handy for debugging in the console
