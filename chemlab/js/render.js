// ChemLab — canvas renderer for the lab bench.
import { SOLIDS, uiColor } from './data.js';
import { EPS, MAX_V } from './engine.js';

const NB = 56;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

export class Bench {
  constructor(canvas, lab) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.lab = lab;
    this.sel = 0;
    this.t = 0;
    this.vis = lab.vessels.map(() => this.freshVis());
    this.stockColor = {};
    lab.onPieces = (i, key) => this.addPieces(i, key);
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }
  freshVis() {
    return { parts: [], bubbles: [], pieces: [], deps: [], fumes: [], pile: new Float32Array(NB), acc: {}, fumeAcc: 0, ripple: 0, emptied: -1 };
  }
  resize() {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(300, r.width); this.H = Math.max(320, r.height);
    this.c.width = Math.round(this.W * dpr); this.c.height = Math.round(this.H * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout();
  }
  layout() {
    const W = this.W, H = this.H;
    this.benchY = H - 58;
    const bw = Math.min(200, W / 4.1);
    const bh = Math.max(110, Math.min(bw * 1.25, this.benchY - 92 - 105));
    this.geo = [0, 1, 2].map(i => {
      const cx = (W * (i + 0.5)) / 3;
      const yb = this.benchY - 92;
      const g = { cx, bw, bh, x0: cx - bw / 2, x1: cx + bw / 2, yb, y0: yb - bh };
      g.ix0 = g.x0 + 4; g.ix1 = g.x1 - 4; g.iw = g.ix1 - g.ix0; g.ibot = yb - 4; g.innerH = bh - 8;
      return g;
    });
  }
  liqH(g, V) { return (Math.min(1, V / MAX_V) * 0.86) * g.innerH; }
  X(g, u) { return g.ix0 + u * g.iw; }
  Y(g, h) { return g.ibot - h; }

  hit(x, y) {
    for (let i = 0; i < 3; i++) {
      const g = this.geo[i];
      if (Math.abs(x - g.cx) < 26 && y > this.benchY - 75 && y < this.benchY + 4) return { i, part: 'burner' };
      if (x > g.x0 - 20 && x < g.x1 + 20 && y > g.y0 - 40 && y < this.benchY + 50) return { i, part: 'beaker' };
    }
    return null;
  }

  // ---------- solids poured in ----------
  addPieces(i, key) {
    const vis = this.vis[i], g = this.geo[i];
    const S = SOLIDS[key];
    if (S.kind === 'ppt') return; // MnO2 powder appears as precipitate particles
    const spec = { Zn: [5, 6, 8], Mg: [1, 34, 40], Cu: [4, 9, 12], Fe: [26, 1.4, 2.6], Na: [1, 7, 8], marble: [4, 9, 13] }[key] || [3, 6, 9];
    for (let n = 0; n < spec[0]; n++) {
      const size = rand(spec[1], spec[2]);
      const pts = [];
      const np = 7 + (Math.random() * 3) | 0;
      for (let k = 0; k < np; k++) pts.push([Math.cos((k / np) * 6.283), Math.sin((k / np) * 6.283), rand(0.7, 1.15)]);
      vis.pieces.push({
        k: key, u: rand(0.14, 0.86), size, pts, ang: rand(0, 6.28),
        h: g.innerH + 50 + n * 6, vy: 0, falling: true,
        tgt: key === 'Na' ? null : (key === 'Mg' ? 3 : key === 'Fe' ? rand(1, 2.5) : size * 0.42),
        vx: rand(-0.25, 0.25), seed: Math.random() * 100,
      });
    }
  }

  // ---------- simulation of visual particles ----------
  updateVisuals(i, dt) {
    const v = this.lab.vessels[i], vis = this.vis[i], g = this.geo[i];
    if (vis.emptied !== v.emptied) { Object.assign(vis, this.freshVis()); vis.emptied = v.emptied; }
    const lh = this.liqH(g, v.V);

    // precipitates
    const targets = {}, counts = {};
    for (const k in v.s) {
      const S = SOLIDS[k];
      if (S && S.kind === 'ppt') { const n = v.s[k]; targets[k] = n > 2e-6 ? Math.min(320, Math.max(6, Math.round(Math.sqrt(n) * 4000))) : 0; }
    }
    for (const p of vis.parts) if (!p.dying) counts[p.k] = (counts[p.k] || 0) + 1;
    const keys = new Set([...Object.keys(targets), ...Object.keys(counts)]);
    for (const k of keys) {
      const want = targets[k] || 0, have = counts[k] || 0;
      if (have < want) {
        const S = SOLIDS[k];
        for (let n = 0; n < Math.min(30, want - have); n++) {
          vis.parts.push({ k, u: rand(0.03, 0.97), h: rand(1, Math.max(2, lh - 3)), vh: rand(1.2, 4.5) * (S.settle || 1), r: rand(1.2, 2.8), a: 0, settled: false, ph: Math.random() * 6 });
        }
      } else if (have > want) {
        let excess = have - want;
        const live = vis.parts.filter(p => p.k === k && !p.dying).sort((a, b) => (a.settled - b.settled) || (b.h - a.h));
        for (const p of live) {
          if (excess-- <= 0) break;
          p.dying = true;
          if (p.settled) { const b = clamp((p.u * NB) | 0, 0, NB - 1); vis.pile[b] = Math.max(0, vis.pile[b] - p.r * 0.5); }
        }
      }
    }
    for (const p of vis.parts) {
      p.a = p.dying ? p.a - dt * 2.5 : Math.min(1, p.a + dt * 2.5);
      if (!p.settled && !p.dying) {
        p.h -= p.vh * dt;
        p.u = clamp(p.u + (Math.random() - 0.5) * 0.004, 0.01, 0.99);
        const b = clamp((p.u * NB) | 0, 0, NB - 1);
        if (p.h <= vis.pile[b]) { p.h = vis.pile[b]; p.settled = true; vis.pile[b] += p.r * 0.5; }
      }
      if (lh > 2 && p.h > lh - 2) p.h = lh - 2;
    }
    vis.parts = vis.parts.filter(p => p.a > 0 || !p.dying);

    // pieces
    for (const pc of vis.pieces) {
      const n = v.getS(pc.k), n0 = v.sInit[pc.k] || n;
      pc.scale = n > EPS ? Math.cbrt(n / Math.max(n0, EPS)) : 0;
      if (pc.falling) {
        pc.vy += 600 * dt; pc.h -= pc.vy * dt;
        const floor = pc.tgt == null ? Math.max(lh - 2, 3) : pc.tgt;
        if (pc.h <= floor) { pc.h = floor; pc.falling = false; vis.ripple = Math.min(3, vis.ripple + 1.2); }
      } else if (pc.k === 'Na') {
        pc.h = Math.max(lh - 2, 3);
        pc.vx += (Math.random() - 0.5) * dt * 3; pc.vx = clamp(pc.vx, -0.5, 0.5);
        pc.u += pc.vx * dt;
        if (pc.u < 0.12 || pc.u > 0.88) { pc.vx *= -1; pc.u = clamp(pc.u, 0.12, 0.88); }
        vis.ripple = Math.min(2, vis.ripple + dt * 2);
      }
    }
    vis.pieces = vis.pieces.filter(pc => pc.falling || pc.scale > 0.02);

    // metal deposits
    const dcount = {};
    for (const d of vis.deps) if (!d.dying) dcount[d.k] = (dcount[d.k] || 0) + 1;
    for (const k in v.s) {
      const S = SOLIDS[k];
      if (!S || S.kind !== 'deposit') continue;
      const want = Math.min(380, Math.round(Math.sqrt(v.s[k]) * 5200));
      let have = dcount[k] || 0;
      const anchors = vis.pieces.filter(p => !p.falling && p.k !== 'Na' && SOLIDS[p.k].kind === 'metal');
      for (let n = 0; n < 4 && have < want; n++, have++) {
        const same = vis.deps.filter(d => d.k === k && !d.dying);
        let u, h;
        if (S.style === 'needle' && same.length && Math.random() < 0.75) {
          const par = same[(Math.random() * same.length) | 0]; u = par.u2; h = par.h2;
        } else if (anchors.length) {
          const a = anchors[(Math.random() * anchors.length) | 0];
          const s = a.size * (a.scale || 1);
          u = a.u + (rand(-1, 1) * s) / g.iw; h = a.h + rand(-0.6, 1) * s * 0.8;
        } else { u = rand(0.1, 0.9); h = rand(0, 3); }
        const ang = -Math.PI / 2 + rand(-1.1, 1.1), len = S.style === 'needle' ? rand(3, 7) : 0;
        const u2 = clamp(u + (Math.cos(ang) * len) / g.iw, 0.01, 0.99), h2 = clamp(h - Math.sin(ang) * len, 0, Math.max(3, lh - 3));
        vis.deps.push({ k, u: clamp(u, 0.01, 0.99), h: Math.max(0, h), u2, h2, r: rand(1.1, 2.3), a: 0 });
      }
      if (have > want + 3) {
        let ex = have - want;
        for (let j = vis.deps.length - 1; j >= 0 && ex > 0; j--) if (vis.deps[j].k === k && !vis.deps[j].dying) { vis.deps[j].dying = true; ex--; }
      }
    }
    for (const d of vis.deps) {
      if (!(v.getS(d.k) > EPS)) d.dying = true;
      d.a = d.dying ? d.a - dt * 2 : Math.min(1, d.a + dt * 3);
    }
    vis.deps = vis.deps.filter(d => d.a > 0 || !d.dying);

    // bubbles from gas production
    const spawn = (from, count, gas) => {
      for (let n = 0; n < count && vis.bubbles.length < 450; n++) {
        let u = rand(0.05, 0.95), h = rand(0, lh * 0.8);
        const src = vis.pieces.filter(p => p.k === from && !p.falling);
        if (src.length) { const p = src[(Math.random() * src.length) | 0]; u = p.u + rand(-1, 1) * p.size / g.iw; h = p.h + rand(-2, 4); }
        else if (from === 'tube') { u = (g.cx - g.bw * 0.25 - g.ix0) / g.iw; h = 16; }
        else if (from === 'boil') { h = rand(0, 4); }
        vis.bubbles.push({ u: clamp(u, 0.03, 0.97), h: Math.max(0, h), r: from === 'boil' ? rand(2, 4.5) : rand(1, 3), vy: rand(35, 85), ph: Math.random() * 6, brown: gas === 'NO2' });
      }
    };
    if (lh > 3) {
      for (const e of v.gasOut) {
        vis.acc[e.from] = Math.min(80, (vis.acc[e.from] || 0) + e.mol * 2.5e5);
        const n = vis.acc[e.from] | 0; vis.acc[e.from] -= n; spawn(e.from, n, e.g);
      }
      for (const e of v.gasIn) {
        vis.acc.tube = Math.min(60, (vis.acc.tube || 0) + e.mol * 2.5e5);
        const n = vis.acc.tube | 0; vis.acc.tube -= n; spawn('tube', n, e.g);
      }
      if (v.boiling) { vis.acc.boil = (vis.acc.boil || 0) + dt * 45; const n = vis.acc.boil | 0; vis.acc.boil -= n; spawn('boil', n); }
    }
    for (const e of v.gasOut) if (e.g === 'NO2' && !v.tube) vis.fumeAcc += e.mol * 6e4;
    v.gasOut.length = 0; v.gasIn.length = 0;
    for (const b of vis.bubbles) {
      b.h += b.vy * dt; b.u += Math.sin(this.t * 6 + b.ph) * 0.0012;
      if (b.h >= lh) { b.pop = true; vis.ripple = Math.min(3, vis.ripple + 0.06); }
    }
    vis.bubbles = vis.bubbles.filter(b => !b.pop);
    vis.ripple *= Math.exp(-dt * 1.6);

    // fumes (NO2 brown, steam white)
    const fumeSpawn = (n, col, a) => {
      for (let k = 0; k < n && vis.fumes.length < 160; k++) vis.fumes.push({ x: rand(-0.3, 0.3) * g.bw, y: rand(0, 10) - (g.innerH - lh), r: rand(6, 12), vy: rand(14, 28), life: 0, max: rand(2.5, 4.5), col, a });
    };
    vis.fumeAcc = Math.min(40, vis.fumeAcc);
    if (vis.fumeAcc >= 1) { const n = vis.fumeAcc | 0; vis.fumeAcc -= n; fumeSpawn(n, [150, 70, 25], 0.45); }
    if (v.boiling || v.T > 85) { vis.steamAcc = (vis.steamAcc || 0) + dt * (v.boiling ? 9 : 2); const n = vis.steamAcc | 0; vis.steamAcc -= n; fumeSpawn(n, [235, 240, 245], 0.22); }
    for (const f of vis.fumes) { f.life += dt; f.y += f.vy * dt; f.x += Math.sin(this.t + f.r) * 6 * dt; f.r += dt * 7; }
    vis.fumes = vis.fumes.filter(f => f.life < f.max);
  }

  // ---------- drawing ----------
  frame(dt) {
    this.t += dt;
    for (let i = 0; i < 3; i++) this.updateVisuals(i, dt);
    const ctx = this.ctx;
    this.drawRoom();
    for (let i = 0; i < 3; i++) this.drawStation(i);
    this.drawTubes();
    for (let i = 0; i < 3; i++) this.drawPour(i);
    for (const f of this.lab.fx) this.drawFx(f);
    ctx.globalAlpha = 1;
  }

  drawRoom() {
    const ctx = this.ctx, W = this.W, H = this.H, by = this.benchY;
    const wall = ctx.createLinearGradient(0, 0, 0, by);
    wall.addColorStop(0, '#0f1b24'); wall.addColorStop(1, '#152633');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, by);
    ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1;
    for (let y = by - 34; y > 0; y -= 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let r = 0, y = by; y > 0; y -= 34, r++) for (let x = (r % 2) * 34; x < W; x += 68) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 34); ctx.stroke(); }
    const glow = ctx.createRadialGradient(W / 2, by - 140, 20, W / 2, by - 140, W * 0.6);
    glow.addColorStop(0, 'rgba(90,209,230,0.08)'); glow.addColorStop(1, 'rgba(90,209,230,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, by);
    const bench = ctx.createLinearGradient(0, by, 0, H);
    bench.addColorStop(0, '#2b3239'); bench.addColorStop(0.08, '#20262c'); bench.addColorStop(1, '#14181c');
    ctx.fillStyle = bench; ctx.fillRect(0, by, W, H - by);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, by, W, 1.5);
  }

  beakerPath(g) {
    const ctx = this.ctx, r = 12;
    ctx.beginPath();
    ctx.moveTo(g.x0 - 5, g.y0 - 3);
    ctx.quadraticCurveTo(g.x0, g.y0, g.x0, g.y0 + 6);
    ctx.lineTo(g.x0, g.yb - r);
    ctx.quadraticCurveTo(g.x0, g.yb, g.x0 + r, g.yb);
    ctx.lineTo(g.x1 - r, g.yb);
    ctx.quadraticCurveTo(g.x1, g.yb, g.x1, g.yb - r);
    ctx.lineTo(g.x1, g.y0 + 2);
    ctx.lineTo(g.x1 + 2, g.y0 - 1);
  }
  innerPath(g, top) {
    const ctx = this.ctx, r = 9;
    ctx.beginPath();
    ctx.moveTo(g.ix0, top);
    ctx.lineTo(g.ix1, top);
    ctx.lineTo(g.ix1, g.ibot - r);
    ctx.quadraticCurveTo(g.ix1, g.ibot, g.ix1 - r, g.ibot);
    ctx.lineTo(g.ix0 + r, g.ibot);
    ctx.quadraticCurveTo(g.ix0, g.ibot, g.ix0, g.ibot - r);
    ctx.closePath();
  }

  drawStation(i) {
    const ctx = this.ctx, g = this.geo[i], v = this.lab.vessels[i], vis = this.vis[i];
    const by = this.benchY, t = this.t;
    const sel = i === this.sel;

    // tripod + gauze
    ctx.strokeStyle = '#5b636c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(g.x0 - 4, g.yb + 3); ctx.lineTo(g.x0 - 20, by); ctx.moveTo(g.x1 + 4, g.yb + 3); ctx.lineTo(g.x1 + 20, by); ctx.stroke();
    ctx.strokeStyle = '#3e454c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.cx + 10, g.yb + 3); ctx.lineTo(g.cx + 14, by); ctx.stroke();
    ctx.fillStyle = '#7c848c'; ctx.fillRect(g.x0 - 16, g.yb, g.bw + 32, 4);
    if (v.burner) {
      const hg = ctx.createRadialGradient(g.cx, g.yb + 2, 2, g.cx, g.yb + 2, 40);
      hg.addColorStop(0, 'rgba(255,140,50,0.9)'); hg.addColorStop(1, 'rgba(255,90,20,0)');
      ctx.fillStyle = hg; ctx.fillRect(g.cx - 40, g.yb - 2, 80, 8);
    }
    // Bunsen burner
    const bt = by - 58;
    ctx.fillStyle = '#2a2f35'; ctx.beginPath(); ctx.ellipse(g.cx, by - 3, 24, 5, 0, 0, Math.PI * 2); ctx.fill();
    const barrel = ctx.createLinearGradient(g.cx - 6, 0, g.cx + 6, 0);
    barrel.addColorStop(0, '#6f7780'); barrel.addColorStop(0.5, '#b8c0c8'); barrel.addColorStop(1, '#5c636b');
    ctx.fillStyle = barrel; ctx.fillRect(g.cx - 6, bt, 12, 55);
    ctx.fillStyle = '#4a5158'; ctx.fillRect(g.cx - 8, by - 22, 16, 6);
    if (v.burner) {
      const fl = 26 + Math.sin(t * 23) * 2 + Math.sin(t * 37) * 1.5;
      ctx.fillStyle = 'rgba(120,170,255,0.35)';
      ctx.beginPath(); ctx.moveTo(g.cx - 8, bt); ctx.quadraticCurveTo(g.cx - 7, bt - fl * 0.7, g.cx, bt - fl - 4); ctx.quadraticCurveTo(g.cx + 7, bt - fl * 0.7, g.cx + 8, bt); ctx.fill();
      ctx.fillStyle = 'rgba(70,120,255,0.9)';
      ctx.beginPath(); ctx.moveTo(g.cx - 5, bt); ctx.quadraticCurveTo(g.cx - 4, bt - fl * 0.4, g.cx, bt - fl * 0.6); ctx.quadraticCurveTo(g.cx + 4, bt - fl * 0.4, g.cx + 5, bt); ctx.fill();
    }
    // ice bath
    if (v.ice) {
      ctx.fillStyle = 'rgba(160,210,255,0.18)';
      ctx.fillRect(g.x0 - 14, g.yb - g.bh * 0.35, g.bw + 28, g.bh * 0.35 + 4);
      ctx.fillStyle = 'rgba(225,245,255,0.55)';
      for (let k = 0; k < 9; k++) { const x = g.x0 - 12 + (k % 2 ? g.bw + 14 : 0) + (k % 3) * 3; const y = g.yb - 8 - k * 7; ctx.fillRect(x, y, 9, 7); }
    }

    // glass back
    this.beakerPath(g);
    ctx.fillStyle = 'rgba(180,215,255,0.05)'; ctx.fill();

    // liquid
    const lh = this.liqH(g, v.V);
    const col = v.color();
    if (lh > 0.5 && col) {
      const top = this.Y(g, lh);
      ctx.save();
      this.innerPath(g, g.y0 - 10); ctx.clip();
      ctx.beginPath();
      const amp = vis.ripple * 1.1;
      ctx.moveTo(g.ix0, top + Math.sin(g.ix0 * 0.09 + t * 5) * amp);
      for (let x = g.ix0; x <= g.ix1 + 4; x += 4) ctx.lineTo(x, top + Math.sin(x * 0.09 + t * 5) * amp + Math.sin(x * 0.05 - t * 3) * amp * 0.7);
      ctx.lineTo(g.ix1 + 4, g.ibot + 4); ctx.lineTo(g.ix0 - 4, g.ibot + 4); ctx.closePath();
      const lg = ctx.createLinearGradient(0, top, 0, g.ibot);
      lg.addColorStop(0, rgba(mix(col.rgb, [255, 255, 255], 0.12), col.opacity * 0.9));
      lg.addColorStop(1, rgba(mix(col.rgb, [0, 0, 0], 0.15), Math.min(1, col.opacity + 0.05)));
      ctx.fillStyle = lg; ctx.fill();
      ctx.clip();
      // haze of suspended particles
      let sus = 0; const sc = [0, 0, 0];
      for (const p of vis.parts) if (!p.settled) { sus++; const c = SOLIDS[p.k].color; sc[0] += c[0]; sc[1] += c[1]; sc[2] += c[2]; }
      if (sus > 4) { ctx.fillStyle = rgba(sc.map(x => x / sus), Math.min(0.6, sus / 240)); ctx.fillRect(g.ix0, top - 4, g.iw, lh + 8); }
      // deposits
      for (const d of vis.deps) {
        const S = SOLIDS[d.k]; ctx.globalAlpha = d.a;
        if (S.style === 'needle') {
          ctx.strokeStyle = rgba(S.color, 0.95); ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(this.X(g, d.u), this.Y(g, d.h)); ctx.lineTo(this.X(g, d.u2), this.Y(g, d.h2)); ctx.stroke();
          if (Math.sin(t * 3 + d.r * 9) > 0.96) { ctx.fillStyle = '#fff'; ctx.fillRect(this.X(g, d.u2) - 1, this.Y(g, d.h2) - 1, 2, 2); }
        } else {
          ctx.fillStyle = rgba(S.color, 0.95); ctx.beginPath(); ctx.arc(this.X(g, d.u), this.Y(g, d.h), d.r, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // precipitate particles
      for (const p of vis.parts) {
        const S = SOLIDS[p.k];
        let c = S.color;
        if (S.sparkle) c = mix(c, [255, 255, 220], Math.max(0, Math.sin(t * 4 + p.ph * 7)) * 0.6);
        ctx.fillStyle = rgba(c, 0.9 * clamp(p.a, 0, 1));
        ctx.beginPath(); ctx.arc(this.X(g, p.u), this.Y(g, p.h), p.r, 0, 6.283); ctx.fill();
      }
      // bubbles
      ctx.lineWidth = 1;
      for (const b of vis.bubbles) {
        ctx.strokeStyle = b.brown ? 'rgba(200,120,60,0.8)' : 'rgba(255,255,255,0.75)';
        ctx.fillStyle = b.brown ? 'rgba(170,90,40,0.25)' : 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(this.X(g, b.u), this.Y(g, b.h), b.r, 0, 6.283); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      // meniscus
      ctx.strokeStyle = rgba(mix(col.rgb, [255, 255, 255], 0.5), 0.55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(g.ix0, top); ctx.lineTo(g.ix1, top); ctx.stroke();
    } else {
      // dry beaker: precipitates/powder on the bottom still visible
      for (const p of vis.parts) { ctx.fillStyle = rgba(SOLIDS[p.k].color, 0.9 * clamp(p.a, 0, 1)); ctx.beginPath(); ctx.arc(this.X(g, p.u), this.Y(g, p.h), p.r, 0, 6.283); ctx.fill(); }
    }

    // solid pieces (drawn unclipped so they can fall in from above)
    for (const pc of vis.pieces) this.drawPiece(g, pc);

    // glass front
    this.beakerPath(g);
    if (sel) { ctx.save(); ctx.shadowColor = 'rgba(90,209,230,0.9)'; ctx.shadowBlur = 16; ctx.strokeStyle = 'rgba(90,209,230,0.85)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore(); }
    else { ctx.strokeStyle = 'rgba(220,238,255,0.6)'; ctx.lineWidth = 2; ctx.stroke(); }
    const hl = ctx.createLinearGradient(g.x0 + 5, 0, g.x0 + 16, 0);
    hl.addColorStop(0, 'rgba(255,255,255,0.18)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.fillRect(g.x0 + 5, g.y0 + 10, 11, g.bh - 26);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '9px Inter, system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    for (let mL = 50; mL <= 200; mL += 50) {
      const y = this.Y(g, this.liqH(g, mL / 1000));
      ctx.beginPath(); ctx.moveTo(g.ix1 - 12, y); ctx.lineTo(g.ix1 - 2, y); ctx.stroke();
      ctx.fillText(mL, g.ix1 - 14, y + 3);
    }
    if (v.tube) { ctx.fillStyle = '#3b302b'; ctx.fillRect(g.x0 - 3, g.y0 - 8, g.bw + 6, 12); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(g.x0 - 3, g.y0 - 8, g.bw + 6, 3); }

    // fumes
    for (const f of vis.fumes) {
      const a = f.a * (1 - f.life / f.max);
      ctx.fillStyle = rgba(f.col, a);
      ctx.beginPath(); ctx.arc(g.cx + f.x, g.y0 - f.y, f.r, 0, 6.283); ctx.fill();
    }

    // label
    const pH = v.pH();
    ctx.textAlign = 'center';
    ctx.fillStyle = sel ? '#5ad1e6' : 'rgba(255,255,255,0.85)';
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    ctx.fillText(`Beaker ${v.name}`, g.cx, by + 22);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '11px Inter, system-ui, sans-serif';
    const parts = [`${Math.round(v.V * 1000)} mL`, `${v.T.toFixed(0)} °C`];
    if (pH != null) parts.push(`pH ${clamp(pH, -1, 15).toFixed(1)}`);
    ctx.fillText(parts.join('  ·  '), g.cx, by + 39);
    if (pH != null) { ctx.fillStyle = rgba(uiColor(pH), 1); ctx.beginPath(); ctx.arc(g.cx + ctx.measureText(parts.join('  ·  ')).width / 2 + 9, by + 35, 4, 0, 6.283); ctx.fill(); }
  }

  drawPiece(g, pc) {
    const ctx = this.ctx, S = SOLIDS[pc.k];
    const s = pc.size * (pc.falling ? 1 : Math.max(0.15, pc.scale || 0));
    const x = this.X(g, pc.u), y = this.Y(g, pc.h);
    ctx.save(); ctx.translate(x, y);
    if (pc.k === 'Mg') {
      ctx.rotate(-0.08 + Math.sin(pc.seed) * 0.08);
      ctx.strokeStyle = rgba(S.color, 1); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-s / 2, 0); ctx.quadraticCurveTo(0, -6, s / 2, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    } else if (pc.k === 'Cu') {
      ctx.rotate(pc.ang); ctx.strokeStyle = rgba(S.color, 1); ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(k * s * 0.3 - s * 0.3, 0, s * 0.35, s * 0.22, 0, 0, Math.PI * 1.7); ctx.stroke(); }
    } else if (pc.k === 'Fe') {
      ctx.rotate(pc.ang); ctx.fillStyle = rgba(S.color, 1); ctx.fillRect(-s, -s * 0.4, s * 2, s * 0.8);
    } else if (pc.k === 'Na') {
      ctx.fillStyle = rgba(S.color, 1); ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.75, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.3, s * 0.25, 0, 6.283); ctx.fill();
    } else {
      ctx.rotate(pc.ang);
      ctx.beginPath();
      pc.pts.forEach(([cx, cy, r], k) => { const px = cx * r * s * 0.6, py = cy * r * s * 0.5; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.closePath();
      const gr = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
      gr.addColorStop(0, rgba(mix(S.color, [255, 255, 255], 0.3), 1)); gr.addColorStop(1, rgba(mix(S.color, [0, 0, 0], 0.3), 1));
      ctx.fillStyle = gr; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    ctx.restore();
  }

  drawTubes() {
    const ctx = this.ctx;
    for (let i = 0; i < 3; i++) {
      const v = this.lab.vessels[i];
      if (!v.tube) continue;
      const a = this.geo[i], b = this.geo[v.tube.index];
      const lift = Math.abs(v.tube.index - i) > 1 ? 120 : 70;
      const sx = a.cx + (b.cx > a.cx ? 1 : -1) * a.bw * 0.2, ex = b.cx + (b.cx > a.cx ? -1 : 1) * b.bw * 0.25;
      const top = Math.min(a.y0, b.y0) - lift;
      ctx.lineCap = 'round';
      const path = () => { ctx.beginPath(); ctx.moveTo(sx, a.y0 - 4); ctx.lineTo(sx, top + 20); ctx.quadraticCurveTo(sx, top, sx + (ex - sx) * 0.15, top); ctx.lineTo(ex - (ex - sx) * 0.15, top); ctx.quadraticCurveTo(ex, top, ex, top + 20); ctx.lineTo(ex, b.yb - 16); };
      path(); ctx.strokeStyle = 'rgba(210,235,255,0.55)'; ctx.lineWidth = 7; ctx.stroke();
      path(); ctx.strokeStyle = 'rgba(20,35,48,0.9)'; ctx.lineWidth = 3.5; ctx.stroke();
    }
  }

  stockRGB(st) { return this.stockColor[st.id] || [200, 225, 255]; }

  drawPour(i) {
    const p = this.lab.pourOf(i);
    if (!p) return;
    const ctx = this.ctx, g = this.geo[i], v = this.lab.vessels[i];
    const k = p.t / p.dur;
    const tilt = k < 0.2 ? k / 0.2 : k > 0.8 ? (1 - k) / 0.2 : 1;
    const col = this.stockRGB(p.st);
    const surfY = this.Y(g, this.liqH(g, v.V));
    if (p.kind === 'liq') {
      const px = g.x1 + 26, py = g.y0 - 46;
      const ang = -tilt * 1.9;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(220,240,255,0.18)'; ctx.strokeStyle = 'rgba(230,245,255,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-13, -18, 26, 36, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rgba(col, 0.85); ctx.beginPath(); ctx.roundRect(-11, -2, 22, 18, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(-11, -12, 22, 8);
      ctx.fillStyle = '#123'; ctx.font = '600 6px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.st.f.slice(0, 8), 0, -6);
      ctx.fillStyle = 'rgba(220,240,255,0.25)'; ctx.fillRect(-4, -26, 8, 8); ctx.strokeRect(-4, -26, 8, 8);
      ctx.restore();
      if (k > 0.18 && k < 0.82) {
        const mx = px + Math.sin(ang) * 26, my = py - Math.cos(ang) * 26;
        ctx.strokeStyle = rgba(col, 0.8); ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.quadraticCurveTo(mx - 14, my + 4, g.cx + g.bw * 0.22 + Math.sin(this.t * 30) * 0.8, surfY); ctx.stroke();
      }
    } else if (p.kind === 'ind') {
      const x = g.cx + 10, y = g.y0 - 60;
      ctx.fillStyle = 'rgba(220,240,255,0.25)'; ctx.strokeStyle = 'rgba(230,245,255,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(x - 3, y, 6, 38, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.roundRect(x - 5, y - 14, 10, 15, 4); ctx.fill();
      for (let d = 0; d < 3; d++) {
        const dk = (k * 3 - d * 0.6) % 3;
        if (dk > 0 && dk < 1) { ctx.fillStyle = 'rgba(230,240,255,0.9)'; ctx.beginPath(); ctx.arc(x, y + 40 + dk * (surfY - y - 40), 2.2, 0, 6.283); ctx.fill(); }
      }
    } else if (p.kind === 'solid') {
      const x = g.cx + g.bw * 0.15, y = g.y0 - 30;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.2 - tilt * 0.6);
      ctx.fillStyle = '#9aa3ad'; ctx.fillRect(-2, -2, 46, 4);
      ctx.beginPath(); ctx.ellipse(-6, 0, 10, 5, 0, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  }

  drawFx(f) {
    const ctx = this.ctx, g = this.geo[f.vi], t = f.t;
    const a = t < 0.4 ? t / 0.4 : t > 2.1 ? (2.6 - t) / 0.5 : 1;
    ctx.globalAlpha = clamp(a, 0, 1);
    const tipX = g.cx + 4, tipY = g.y0 - 6 - (1 - Math.min(1, t / 0.5)) * 40;
    if (f.type === 'burning' || f.type === 'glowing') {
      ctx.strokeStyle = '#c9a26a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tipX + 70, tipY - 70); ctx.lineTo(tipX, tipY); ctx.stroke();
      const after = t > 0.6;
      let flame = f.type === 'burning' ? 1 : 0, ember = f.type === 'glowing';
      if (after) {
        if (f.res === 'out') { flame = 0; ember = false; }
        if (f.res === 'bright') flame = 1.8;
        if (f.res === 'relight') { flame = 1.5; ember = false; }
      }
      if (ember) { ctx.fillStyle = `rgba(255,${100 + Math.sin(this.t * 20) * 40},30,1)`; ctx.beginPath(); ctx.arc(tipX, tipY, 3.5, 0, 6.283); ctx.fill(); }
      if (flame > 0) {
        const fh = (12 + Math.sin(this.t * 25) * 2) * flame;
        ctx.fillStyle = 'rgba(255,170,40,0.85)';
        ctx.beginPath(); ctx.moveTo(tipX - 5, tipY); ctx.quadraticCurveTo(tipX - 3, tipY - fh, tipX + 2, tipY - fh * 1.3); ctx.quadraticCurveTo(tipX + 6, tipY - fh * 0.5, tipX + 5, tipY); ctx.fill();
      }
      if (after && f.res === 'out') { ctx.fillStyle = 'rgba(180,180,180,0.4)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(tipX + Math.sin(t * 3 + k) * 4, tipY - 8 - k * 9 - (t - 0.6) * 12, 4 + k, 0, 6.283); ctx.fill(); } }
      if (after && f.res === 'pop' && t < 1.4) {
        const r = (t - 0.6) * 90;
        ctx.fillStyle = `rgba(255,240,180,${Math.max(0, 0.9 - (t - 0.6) * 1.2)})`;
        ctx.beginPath(); ctx.arc(tipX, tipY, r, 0, 6.283); ctx.fill();
      }
      if (after && (f.res === 'pop' || f.res === 'relight')) {
        ctx.fillStyle = '#ffe27a'; ctx.font = '800 22px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(f.res === 'pop' ? 'POP!' : 'Relit!', tipX, tipY - 40 - (t - 0.6) * 10);
      }
    } else if (f.type === 'litmus' || f.type === 'ph') {
      const dip = f.type === 'ph';
      const x = g.cx - 6, y = dip ? g.y0 + 10 : g.y0 - 50;
      let c = [235, 235, 225];
      if (t > 0.7) {
        if (f.type === 'ph' && f.pH != null) c = uiColor(f.pH);
        else if (f.res === 'blue') c = [60, 90, 210];
        else if (f.res === 'red') c = [210, 50, 50];
        else if (f.res === 'pink') c = [220, 120, 140];
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, y - 60, 12, 30);
      ctx.fillStyle = rgba(c, 1); ctx.fillRect(x, y - 30, 12, dip ? 60 : 30);
    } else if (f.type === 'smell') {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let s = 0; s < 30; s++) { const yy = g.y0 - 10 - s * 2 - t * 20; const xx = g.cx - 20 + k * 20 + Math.sin(s * 0.5 + this.t * 4) * 5; s ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
}
