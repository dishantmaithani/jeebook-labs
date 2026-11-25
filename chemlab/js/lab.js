// ChemLab — the whole bench: three beakers, pouring queue, gas tests, event log.
import { Vessel } from './engine.js';
import { STOCK_BY_ID } from './data.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fmtMl = x => (x < 1 ? x.toFixed(1) : Math.round(x * 10) / 10).toString();

export class Lab {
  constructor() {
    this.vessels = [0, 1, 2].map(i => new Vessel(i));
    this.queue = [[], [], []];
    this.cur = [null, null, null];
    this.listeners = new Set();
    this.fx = [];
    this.onPieces = null;
    for (const v of this.vessels) {
      v.onLog = (vv, log, hint) => this.emit({ kind: hint ? 'hint' : 'rx', vi: vv.index, ...log });
    }
  }
  emit(e) { for (const l of this.listeners) l(e); }

  pour(vi, id, mL) {
    const st = STOCK_BY_ID[id];
    if (!st) return;
    this.queue[vi].push({ st, mL: st.kind === 'ind' ? 0.5 : mL });
  }
  busy(vi) { return !!this.cur[vi] || this.queue[vi].length > 0; }
  pourOf(vi) { return this.cur[vi]; }

  update(dt) {
    for (let i = 0; i < 3; i++) {
      const v = this.vessels[i];
      let p = this.cur[i];
      if (!p && this.queue[i].length) p = this.cur[i] = this.start(i, this.queue[i].shift());
      if (p) {
        p.t += dt;
        if (p.kind === 'liq') {
          const a = clamp((p.t - p.dur * 0.2) / (p.dur * 0.6), 0, 1);
          const d = p.mL * a - p.added;
          if (d > 1e-6) {
            const got = v.addLiquid(p.st, d);
            p.added += d;
            if (got < d - 1e-6 && !p.full) {
              p.full = true;
              this.emit({ kind: 'hint', vi: i, t: 'Beaker full', obs: 'The beaker holds 250 mL. Empty it or use another one.' });
            }
          }
        } else if (p.kind === 'ind') {
          if (!p.done && p.t > p.dur * 0.55) { v.addLiquid(p.st, p.mL); p.done = true; }
        } else if (p.kind === 'solid') {
          if (!p.done && p.t > 0.45) { v.addSolid(p.st.solid, p.st.mol); p.done = true; }
        }
        if (p.t >= p.dur) this.cur[i] = null;
      }
      v.tick(dt);
    }
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter(f => f.t < 2.6);
  }

  start(i, { st, mL }) {
    const kind = st.kind;
    const dur = kind === 'liq' ? 0.6 + mL / 28 : kind === 'ind' ? 1.1 : 0.9;
    const p = { st, mL, kind, t: 0, dur, added: 0 };
    if (kind === 'solid') { this.onPieces && this.onPieces(i, st.solid); }
    let text;
    if (kind === 'solid') text = `Added ${st.dose}`;
    else if (kind === 'ind') text = `Added 3 drops of ${st.name.toLowerCase()}`;
    else text = `Poured ${fmtMl(mL)} mL of ${st.conc ? st.conc + ' ' : ''}${st.name.toLowerCase()}`;
    this.emit({ kind: 'add', vi: i, t: text });
    return p;
  }

  empty(vi) {
    this.queue[vi] = []; this.cur[vi] = null;
    const v = this.vessels[vi];
    v.reset(); v.burner = false; v.ice = false;
    this.emit({ kind: 'sys', vi, t: `Beaker ${v.name} emptied and rinsed` });
  }
  setTube(vi, target) {
    const v = this.vessels[vi];
    if (target == null || target === vi) { v.tube = null; return true; }
    const t = this.vessels[target];
    if (t.tube === v) t.tube = null; // no loops
    for (const o of this.vessels) if (o !== v && o.tube === t) o.tube = null;
    v.tube = t;
    this.emit({ kind: 'sys', vi, t: `Delivery tube fitted: gas from beaker ${v.name} now bubbles into beaker ${t.name}` });
    return true;
  }

  // gas & solution tests
  test(vi, tool) {
    const v = this.vessels[vi];
    const gases = Object.entries(v.gasRecent).filter(([, m]) => m > 2e-5).sort((a, b) => b[1] - a[1]);
    const g = gases.length ? gases[0][0] : null;
    const tubeNote = v.tube ? ` The delivery tube is sending the gas to beaker ${v.tube.name}, so test there instead.` : '';
    let res = 'none', t = '', obs = '', note = '';
    const has = x => gases.some(([k]) => k === x);
    if (tool === 'burning') {
      t = 'Burning splint test';
      if (has('H2')) { res = 'pop'; obs = 'Squeaky POP! The gas is hydrogen.'; note = '2H₂ + O₂ → 2H₂O. Hydrogen burns explosively in air.'; }
      else if (g === 'CO2' || g === 'NH3' || g === 'NO2') { res = 'out'; obs = `The flame goes out. ${g === 'CO2' ? 'Probably carbon dioxide (confirm with limewater).' : g === 'NH3' ? 'Ammonia does not support combustion.' : 'NO₂ does not support burning.'}`; note = 'CO₂ does not burn or support combustion, which is why it is used in fire extinguishers.'; }
      else if (g === 'O2') { res = 'bright'; obs = 'The splint burns more brightly: the gas supports combustion (oxygen).'; }
      else { obs = 'The splint keeps burning normally. No gas is being given off.' + tubeNote; }
    } else if (tool === 'glowing') {
      t = 'Glowing splint test';
      if (g === 'O2' || has('O2')) { res = 'relight'; obs = 'The glowing splint RELIGHTS! The gas is oxygen.'; note = 'Only oxygen (or N₂O) relights a glowing splint.'; }
      else if (g) { res = 'out'; obs = 'The glowing splint goes out. The gas is not oxygen.'; }
      else { obs = 'Nothing happens. No gas is being given off.' + tubeNote; }
    } else if (tool === 'litmus') {
      t = 'Damp litmus paper (held over the beaker)';
      if (has('NH3')) { res = 'blue'; obs = 'Red litmus turns BLUE. The gas is basic: ammonia.'; note = 'NH₃ is the only common alkaline gas.'; }
      else if (has('NO2') || has('H2S')) { res = 'red'; obs = 'Blue litmus turns RED. An acidic gas (' + (has('NO2') ? 'NO₂' : 'H₂S') + ').'; }
      else if (has('CO2')) { res = 'pink'; obs = 'Blue litmus turns faintly red. CO₂ is weakly acidic (carbonic acid).'; }
      else { obs = 'No change in red or blue litmus.' + tubeNote; }
    } else if (tool === 'ph') {
      t = 'pH paper (dipped in the solution)';
      const pH = v.pH();
      if (pH == null) { obs = 'The beaker is empty.'; }
      else {
        res = 'ph';
        const name = pH < 3 ? 'red' : pH < 5 ? 'orange' : pH < 6.5 ? 'yellow' : pH < 7.5 ? 'green' : pH < 10 ? 'blue' : 'violet';
        const kind = pH < 6.5 ? 'acidic' : pH <= 7.5 ? 'neutral' : 'alkaline';
        obs = `The paper turns ${name}: pH ≈ ${clamp(pH, 0, 14).toFixed(1)} (${kind}).`;
        note = 'pH = −log₁₀[H⁺]. pH 7 is neutral at 25 °C.';
      }
    } else if (tool === 'smell') {
      t = 'Wafting the vapours';
      if (has('H2S')) obs = 'A smell of rotten eggs: hydrogen sulfide. (Toxic!)';
      else if (has('NH3')) obs = 'A sharp, pungent smell that makes your eyes water: ammonia.';
      else if (has('NO2')) obs = 'A choking, acrid smell: nitrogen dioxide. Toxic, so use a fume hood!';
      else if (g) obs = 'No smell. The gas is odourless (H₂, O₂ and CO₂ have no smell).';
      else obs = 'No noticeable smell.';
      note = 'In a real lab, always waft vapours towards your nose with your hand. Never sniff directly.';
    }
    this.fx.push({ type: tool, vi, res, t: 0, pH: v.pH() });
    this.emit({ kind: 'test', vi, t, obs, note });
  }
}
