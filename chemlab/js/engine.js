// ChemLab — the simulation of one beaker.
import { AQ, SOLIDS, METALS, DISPLACE, indicatorColor } from './data.js';
import { RULES, RX, HINTS, dispLog, CACO3_CO2 } from './rules.js';

export const EPS = 1e-10;
export const MAX_V = 0.25; // L
const KW = 1e-14;
const isS = k => k.startsWith('s:');

export class Vessel {
  constructor(index) {
    this.index = index;
    this.name = 'ABC'[index];
    this.burner = false;
    this.ice = false;
    this.tube = null;   // Vessel that receives gas
    this.onLog = null;
    this.emptied = 0;
    this.reset();
  }
  reset() {
    this.aq = {}; this.s = {}; this.sInit = {};
    this.V = 0; this.T = 25;
    this.gasRecent = {}; this.gasOut = []; this.gasIn = [];
    this.logged = new Set();
    this.boiling = false;
    this.emptied++;
  }

  get(k) { return this.aq[k] || 0; }
  getS(k) { return this.s[k] || 0; }
  c(k) { return this.V > 1e-7 ? this.get(k) / this.V : 0; }
  amt(k) { return isS(k) ? this.getS(k.slice(2)) : this.get(k); }
  chg(k, d) {
    let m = this.aq;
    if (isS(k)) { m = this.s; k = k.slice(2); }
    const n = (m[k] || 0) + d;
    if (n <= EPS) delete m[k]; else m[k] = n;
    if (m === this.s && d > 0) this.sInit[k] = Math.max(this.sInit[k] || 0, m[k] || 0);
  }
  heatCap() { return this.V * 4180 + 120; } // J/K (water + glass)
  heat(kJ) { if (this.V < 1e-6) return; this.T = Math.min(100, this.T + (kJ * 1000) / this.heatCap()); }

  react(r, p, limit = Infinity, from = 'liquid') {
    let ext = limit;
    for (const k in r) ext = Math.min(ext, this.amt(k) / r[k]);
    if (!(ext > EPS)) return 0;
    for (const k in r) this.chg(k, -ext * r[k]);
    for (const k in p) {
      if (k.startsWith('g:')) this.emitGas(k.slice(2), ext * p[k], from);
      else this.chg(k, ext * p[k]);
    }
    return ext;
  }

  emitGas(g, mol, from = 'liquid') {
    if (!(mol > 0)) return;
    this.gasOut.push({ g, mol, from });
    if (this.tube && this.tube !== this) this.tube.receiveGas(g, mol);
    else this.gasRecent[g] = (this.gasRecent[g] || 0) + mol;
  }
  receiveGas(g, mol) {
    this.gasIn.push({ g, mol });
    if (this.V < 1e-6) { this.gasRecent[g] = (this.gasRecent[g] || 0) + mol; return; }
    if (g === 'CO2') this.chg('CO2', mol);
    else if (g === 'NH3') this.chg('NH3', mol);
    else if (g === 'H2S') { this.chg('S2-', mol); this.chg('H+', 2 * mol); }
    else if (g === 'NO2') { this.chg('H+', mol); this.chg('NO3', mol); }
    else this.gasRecent[g] = (this.gasRecent[g] || 0) + mol; // H2, O2 just bubble through
  }

  noteRule(R) {
    if (!R || !R.log || this.logged.has(R.id)) return;
    this.logged.add(R.id);
    this.onLog && this.onLog(this, R.log, false);
  }
  hint(R) {
    if (!R || this.logged.has(R.id)) return;
    this.logged.add(R.id);
    this.onLog && this.onLog(this, R.log, true);
  }

  // returns mL actually added
  addLiquid(stock, mL) {
    const L = mL / 1000;
    const add = Math.min(L, MAX_V - this.V);
    if (add <= 1e-7) return 0;
    const C0 = this.heatCap();
    this.T = (this.T * C0 + 25 * add * 4180) / (C0 + add * 4180);
    this.V += add;
    for (const [k, c] of Object.entries(stock.ions)) this.chg(k, c * add);
    this.equilibrate();
    return add * 1000;
  }
  addSolid(key, mol) {
    this.chg('s:' + key, mol);
    this.equilibrate();
  }

  equilibrate() {
    for (let pass = 0; pass < 40; pass++) {
      let any = false;
      for (const R of RULES) {
        let ext;
        if (R.run) ext = R.run(this);
        else {
          ext = this.react(R.r, R.p);
          if (ext > EPS) {
            if (R.dH) this.heat(-R.dH * ext);
            this.noteRule(R);
          }
        }
        if (ext > EPS) any = true;
      }
      if (!any) break;
    }
  }

  // ---------- rate-based chemistry ----------
  tick(dt) {
    const fT = Math.pow(2, (this.T - 25) / 10);
    if (this.V > 1e-6) {
      for (const key of Object.keys(this.s)) {
        const sp = SOLIDS[key];
        if (sp && sp.metal) this.metalStep(key, sp, dt, fT);
      }
      const H = this.c('H+');
      // marble chips + acid
      const m = this.getS('marble');
      if (m > EPS && H > 1e-4) {
        const r = Math.min(m, 0.0025 * Math.pow(m, 2 / 3) * H * fT * dt, this.get('H+') / 2);
        if (r > 0) {
          this.chg('s:marble', -r); this.chg('H+', -2 * r); this.chg('Ca2+', r);
          this.emitGas('CO2', r, 'marble'); this.noteRule(RX.marble);
        }
      }
      // catalytic decomposition of H2O2
      const p = this.get('H2O2');
      if (p > EPS) {
        let k = 0;
        const mno2 = this.getS('MnO2') > EPS;
        if (mno2) k += 0.25;
        if (H < 1e-3) k += 0.5 * this.c('I-');
        k += 0.3 * this.c('Fe3+');
        if (this.T > 60) k += 0.002;
        if (k > 0) {
          const r = Math.min(p, k * p * fT * dt);
          this.chg('H2O2', -r); this.emitGas('O2', r / 2, mno2 ? 'MnO2' : 'liquid'); this.heat(98 * r);
          if (r > 1e-8) this.noteRule(RX.h2o2);
        }
      }
      // H2O2 + I- in acid → I2
      const p2 = this.get('H2O2'), I = this.get('I-');
      if (p2 > EPS && I > EPS && H > 1e-3) {
        const r = Math.min(p2, I / 2, this.get('H+') / 2, 0.3 * this.c('H2O2') * this.c('I-') * H * this.V * fT * dt);
        if (r > 0) {
          this.chg('H2O2', -r); this.chg('I-', -2 * r); this.chg('H+', -2 * r); this.chg('I2', r);
          this.noteRule(RX.h2o2_I);
        }
      }
      // Fe(OH)2 slowly oxidised by air
      const f2 = this.getS('Fe(OH)2');
      if (f2 > EPS) {
        const r = f2 * (1 - Math.exp(-0.04 * dt));
        this.chg('s:Fe(OH)2', -r); this.chg('s:Fe(OH)3', r);
        if (f2 > 1e-6) this.noteRule(RX.feair);
      }
      // excess CO2 slowly redissolves CaCO3 (limewater clearing)
      const cc = this.getS('CaCO3'), dco2 = this.get('CO2');
      if (cc > EPS && dco2 > EPS && this.get('OH-') < EPS && this.get('CO3') < EPS) {
        const r = Math.min(cc, dco2, 3 * this.c('CO2') * cc * dt);
        this.chg('s:CaCO3', -r); this.chg('CO2', -r); this.chg('Ca2+', r); this.chg('HCO3', 2 * r);
        if (r > 1e-8) this.noteRule(CACO3_CO2);
      }
      // ammonia driven off by heat
      const nh3 = this.get('NH3');
      if (nh3 > EPS && this.T > 45) {
        const r = nh3 * (1 - Math.exp(-0.02 * ((this.T - 45) / 10) * dt));
        this.chg('NH3', -r); this.emitGas('NH3', r);
        if (r > 1e-7) this.noteRule(RX.nh3gas);
      }
      // dissolved CO2 slowly escapes
      const co2 = this.get('CO2');
      if (co2 > EPS) {
        const kk = (0.03 + (this.T >= 99 ? 0.5 : 0)) * fT;
        const r = co2 * (1 - Math.exp(-kk * dt));
        this.chg('CO2', -r); this.emitGas('CO2', r);
      }
      // oxidiser without acid
      if ((this.get('MnO4-') > EPS || this.get('Cr2O7') > EPS) &&
        (this.get('Fe2+') > EPS || this.get('I-') > EPS || this.get('H2O2') > EPS) && H < 1e-3) this.hint(HINTS.ox_noacid);
    }

    // ---------- heat ----------
    if (this.burner && this.V > 1e-6) this.T += (1500 * dt) / this.heatCap();
    if (this.ice) this.T += (0 - this.T) * (1 - Math.exp(-0.08 * dt));
    else this.T += (25 - this.T) * (1 - Math.exp(-0.012 * dt));
    this.boiling = false;
    if (this.T >= 100) {
      this.T = 100;
      if (this.burner && this.V > 0) {
        this.boiling = true;
        this.V = Math.max(0, this.V - 0.0006 * dt);
        if (this.V < 0.003) { this.burner = false; this.hint(HINTS.dry); }
      }
    }
    for (const g in this.gasRecent) {
      this.gasRecent[g] *= Math.exp(-dt / 10);
      if (this.gasRecent[g] < 1e-7) delete this.gasRecent[g];
    }
    this.equilibrate();
  }

  metalStep(key, sp, dt, fT) {
    const M = METALS[sp.metal];
    const n = this.getS(key);
    if (n < EPS) return;
    const surf = Math.pow(n, 2 / 3) * (sp.kind === 'deposit' ? 0.6 : 1);
    const Hc = this.c('H+'), NO3c = this.c('NO3');
    const z = M.z;

    if (sp.metal === 'Na') {
      const r = Math.min(n, 0.06 * surf * fT * dt);
      this.chg('s:' + key, -r); this.chg('Na+', r); this.chg('OH-', r);
      this.emitGas('H2', r / 2, key); this.heat(184 * r);
      this.noteRule(RX.na);
      return;
    }
    if (Hc >= 1.5 && NO3c >= 1.5 && M.kN > 0) {
      const r = Math.min(n, M.kN * surf * Hc * fT * dt, this.get('H+') / (2 * z), this.get('NO3') / z);
      if (r > 0) {
        this.chg('s:' + key, -r); this.chg('H+', -2 * z * r); this.chg('NO3', -z * r); this.chg(M.cation, r);
        this.emitGas('NO2', z * r, key); this.heat(120 * r);
        this.noteRule(RX['hno3_' + sp.metal]);
      }
    } else if (Hc >= 1.5 && NO3c >= 1.5 && sp.metal === 'Fe') {
      this.hint(HINTS.fe_passive);
    } else if (Hc > 1e-4 && M.E < 0 && M.kA > 0) {
      const r = Math.min(n, M.kA * surf * Hc * fT * dt, this.get('H+') / z);
      if (r > 0) {
        this.chg('s:' + key, -r); this.chg('H+', -z * r); this.chg(M.cation, r);
        this.emitGas('H2', (z * r) / 2, key); this.heat(96.5 * z * -M.E * r);
        this.noteRule(RX['acid_' + sp.metal]);
      }
    } else if (Hc > 1e-3 && M.E > 0 && sp.kind === 'metal') {
      this.hint(HINTS['noacid_' + sp.metal]);
    }

    // displacement of less reactive metals
    for (const cat in DISPLACE) {
      const D = DISPLACE[cat];
      const cn = this.get(cat);
      if (cn < EPS) continue;
      const dE = D.E - M.E;
      if (dE < 0.05) continue;
      const nn = this.getS(key);
      if (nn < EPS) break;
      const re = Math.min(nn * z, cn * D.e, 0.06 * Math.pow(nn, 2 / 3) * (cn / this.V) * dE * fT * dt);
      if (!(re > 0)) continue;
      this.chg('s:' + key, -re / z); this.chg(M.cation, re / z); this.chg(cat, -re / D.e);
      if (D.dep) this.chg('s:' + D.dep, re / D.e); else this.chg(D.toAq, re / D.e);
      this.heat(96.5 * dE * re);
      this.noteRule(dispLog(sp.metal, cat));
    }
  }

  // ---------- measurements ----------
  pH() {
    const V = this.V;
    if (V < 1e-6) return null;
    const Hs = this.get('H+') / V, OHs = this.get('OH-') / V;
    const mono = []; let added = 0;
    const pair = (acid, base, pKa) => {
      const A = acid ? this.get(acid) : 0, B = base ? this.get(base) : 0;
      if (A + B > EPS) { mono.push([(A + B) / V, Math.pow(10, -pKa)]); added += A / V; }
    };
    pair('NH4+', 'NH3', 9.25); pair('Fe3+', null, 2.2); pair('Cu2+', null, 7.5); pair('Zn2+', null, 9.0);
    pair('Pb2+', null, 7.7); pair('Cr3+', null, 4.0); pair('Fe2+', null, 9.5); pair('FeSCN', null, 3.0);
    const di = [];
    const cT = this.get('CO2') + this.get('HCO3') + this.get('CO3');
    if (cT > EPS) { di.push([cT / V, Math.pow(10, -6.35), Math.pow(10, -10.33)]); added += (2 * this.get('CO2') + this.get('HCO3')) / V; }
    const sT = this.get('S2-');
    if (sT > EPS) di.push([sT / V, 1e-7, Math.pow(10, -12.9)]);
    const target = Hs - OHs + added;
    const f = h => {
      let s = h - KW / h - target;
      for (const [T, Ka] of mono) s += (T * h) / (h + Ka);
      for (const [T, K1, K2] of di) s += (T * (h * K1 + 2 * h * h)) / (h * h + h * K1 + K1 * K2);
      return s;
    };
    let lo = -15.5, hi = 1.5;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (f(Math.pow(10, mid)) > 0) hi = mid; else lo = mid;
    }
    return -(lo + hi) / 2;
  }

  // liquid colour by Beer–Lambert mixing of every coloured species
  color(pH = this.pH()) {
    if (this.V < 1e-6) return null;
    const A = [0, 0, 0];
    const starch = this.get('starch') > EPS;
    for (const k in this.aq) {
      const sp = AQ[k];
      if (!sp) continue;
      let col = sp.color, cref = sp.cref, f = 1;
      if (k === 'I2' && starch) { col = [20, 25, 75]; cref = 0.0012; }
      if (sp.ind) { const ic = indicatorColor(k, pH); if (!ic) continue; col = ic.col; f = ic.f; }
      if (!col) continue;
      const c = (this.aq[k] / this.V) * f;
      for (let ch = 0; ch < 3; ch++) A[ch] += (-Math.log(Math.max(col[ch], 2) / 255) / cref) * c;
    }
    const base = [236, 245, 255];
    const T = A.map(a => Math.exp(-a));
    const rgb = base.map((b, i) => Math.round(b * T[i]));
    const trans = (T[0] + T[1] + T[2]) / 3;
    return { rgb, opacity: Math.min(0.95, 0.2 + 0.75 * Math.min(1, (1 - trans) * 2.6)) };
  }
}
