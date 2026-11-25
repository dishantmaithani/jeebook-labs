// ChemLab — reaction rules.
// Instant rules (RULES) run to completion every time a beaker changes (ionic reactions are fast).
// Rate-based reactions (metals, marble, catalysis...) live in Vessel.tick and log via RX.
import { AQ, SOLIDS, PPT, KSP, NH3_HYD, METALS, DISPLACE } from './data.js';

const L = (t, eq, obs, note) => ({ t, eq, obs, note });
const cap = s => s[0].toUpperCase() + s.slice(1);
export const RULES = [];
const add = (id, r, p, log, o = {}) => RULES.push({ id, r, p, log, ...o });

// ---------- acid–base (strong) ----------
add('neut', { 'H+': 1, 'OH-': 1 }, {}, L('Neutralisation', 'H⁺ + OH⁻ → H₂O',
  'The mixture warms up: neutralisation is exothermic.',
  'ΔH(neutralisation) ≈ −57.1 kJ mol⁻¹ for any strong acid + strong base.'), { dH: -57.1 });
add('nh3_acid', { 'H+': 1, 'NH3': 1 }, { 'NH4+': 1 }, L('Ammonia neutralised', 'NH₃ + H⁺ → NH₄⁺',
  'The solution warms slightly.',
  'NH₃ is a weak base (K_b = 1.8×10⁻⁵). ΔH ≈ −52 kJ mol⁻¹, less than −57 because some energy is used ionising the weak base.'), { dH: -52 });

// ---------- precipitation ----------
for (const [cat, an, cN, aN, key, eq, note] of PPT) {
  const S = SOLIDS[key];
  add('ppt_' + key, { [cat]: cN, [an]: aN }, { ['s:' + key]: 1 },
    L(`${cap(S.name)} precipitates`, eq, `A ${S.desc} precipitate of ${S.f} forms.`, note));
}

// temperature-dependent solubility (PbI2 golden rain, PbCl2)
for (const K of KSP) {
  const S = SOLIDS[K.key];
  const pptLog = { id: 'ppt_' + K.key, log: L(`${cap(S.name)} precipitates`, K.eq, `A ${S.desc} precipitate of ${S.f} forms.`, K.note) };
  const hotLog = { id: 'hot_' + K.key, log: L(`${S.f} dissolves on heating`, `${S.f}(s) ⇌ ${AQ[K.cat].f} + ${K.aN}${AQ[K.an].f}`,
    `The ${S.desc} solid disappears as the water gets hot.`, K.note) };
  RULES.push({
    id: 'ksp_' + K.key,
    run(v) {
      const V = v.V; if (V < 1e-6) return 0;
      const s = K.s25 * Math.pow(K.s100 / K.s25, (v.T - 25) / 75);
      const ksp = Math.pow(K.cN, K.cN) * Math.pow(K.aN, K.aN) * Math.pow(s, K.cN + K.aN);
      const P = v.get(K.cat) / V, A = v.get(K.an) / V, solid = v.getS(K.key) / V;
      const Q = x => Math.pow(Math.max(0, P - K.cN * x), K.cN) * Math.pow(Math.max(0, A - K.aN * x), K.aN);
      let lo, hi;
      if (Q(0) > ksp) { lo = 0; hi = Math.min(P / K.cN, A / K.aN); }
      else {
        if (solid <= 0) return 0;
        if (Q(-solid) <= ksp) { lo = hi = -solid; }
        else { lo = -solid; hi = 0; }
      }
      for (let i = 0; i < 60 && hi - lo > 1e-12; i++) { const m = (lo + hi) / 2; if (Q(m) > ksp) lo = m; else hi = m; }
      const x = ((lo + hi) / 2) * V;
      if (Math.abs(x) < 2e-9) return 0;
      v.chg(K.cat, -K.cN * x); v.chg(K.an, -K.aN * x); v.chg('s:' + K.key, x);
      v.noteRule(x > 0 ? pptLog : hotLog);
      return Math.abs(x);
    },
  });
}

// hydroxides from ammonia (weak base supplies OH⁻)
for (const [M, n, key, a] of NH3_HYD) {
  const S = SOLIDS[key];
  const eq = key === 'Ag2O' ? '2Ag⁺ + 2NH₃ + H₂O → Ag₂O↓ + 2NH₄⁺'
    : `${AQ[M].f} + ${n}NH₃ + ${n}H₂O → ${S.f}↓ + ${n}NH₄⁺`;
  add('nh3ppt_' + key, { [M]: a, 'NH3': n }, { ['s:' + key]: 1, 'NH4+': n },
    L(`${cap(S.name)} (from ammonia)`, eq, `A ${S.desc} precipitate forms.`,
      'NH₃(aq) is a weak base: NH₃ + H₂O ⇌ NH₄⁺ + OH⁻ supplies the hydroxide ions.'));
}

// ---------- complexes in excess ammonia / alkali ----------
add('cu_ammine', { 's:Cu(OH)2': 1, 'NH3': 4 }, { 'CuNH3': 1, 'OH-': 2 }, L('Deep blue tetraammine complex',
  'Cu(OH)₂ + 4NH₃ → [Cu(NH₃)₄]²⁺ + 2OH⁻',
  'The pale blue precipitate dissolves in excess ammonia, giving a deep inky-blue solution.',
  'Confirmatory test for Cu²⁺. [Cu(NH₃)₄]²⁺ is square planar (dsp²).'));
add('zn_ammine', { 's:Zn(OH)2': 1, 'NH3': 4 }, { 'ZnNH3': 1, 'OH-': 2 }, L('Zn(OH)₂ dissolves in ammonia',
  'Zn(OH)₂ + 4NH₃ → [Zn(NH₃)₄]²⁺ + 2OH⁻', 'The white precipitate dissolves, leaving a colourless solution.',
  '[Zn(NH₃)₄]²⁺ is tetrahedral (sp³) and colourless (d¹⁰).'));
add('agcl_nh3', { 's:AgCl': 1, 'NH3': 2 }, { 'AgNH3': 1, 'Cl-': 1 }, L('AgCl dissolves in ammonia',
  'AgCl + 2NH₃ → [Ag(NH₃)₂]⁺ + Cl⁻', 'The white precipitate dissolves and the solution turns clear.',
  'AgCl dissolves in dilute NH₃, AgBr only in conc. NH₃, AgI not at all. This is how the halides are told apart.'));
add('ag2o_nh3', { 's:Ag2O': 1, 'NH3': 4 }, { 'AgNH3': 2, 'OH-': 2 }, L('Tollens’ reagent forms',
  'Ag₂O + 4NH₃ + H₂O → 2[Ag(NH₃)₂]⁺ + 2OH⁻', 'The brown precipitate dissolves. This clear solution is Tollens’ reagent.',
  'Tollens’ reagent oxidises aldehydes and deposits a silver mirror.'));
add('agNH3_I', { 'AgNH3': 1, 'I-': 1 }, { 's:AgI': 1, 'NH3': 2 }, null);
add('zincate', { 's:Zn(OH)2': 1, 'OH-': 2 }, { 'ZnOH4': 1 }, L('Zn(OH)₂ is amphoteric',
  'Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻', 'The white precipitate dissolves in excess NaOH.',
  'Amphoteric hydroxides (Zn, Al, Pb, Sn, Cr) dissolve in both acids and excess alkali.'));
add('plumbite', { 's:Pb(OH)2': 1, 'OH-': 2 }, { 'PbOH4': 1 }, L('Pb(OH)₂ is amphoteric',
  'Pb(OH)₂ + 2OH⁻ → [Pb(OH)₄]²⁻', 'The white precipitate dissolves in excess NaOH.',
  'Like Zn(OH)₂, lead hydroxide dissolves in excess alkali.'));
add('zincate_back', { 'Zn2+': 1, 'ZnOH4': 1 }, { 's:Zn(OH)2': 2 }, null);
add('plumbite_back', { 'Pb2+': 1, 'PbOH4': 1 }, { 's:Pb(OH)2': 2 }, null);

add('nh4_oh', { 'NH4+': 1, 'OH-': 1 }, { 'NH3': 1 }, L('Ammonium + alkali',
  'NH₄⁺ + OH⁻ → NH₃ + H₂O', 'Nothing visible in the cold. Heat it to drive off ammonia gas.',
  'Test for NH₄⁺: warm with NaOH, and the NH₃ given off turns damp red litmus blue.'));

// ---------- carbonate / CO2 ----------
add('co2_oh', { 'CO2': 1, 'OH-': 1 }, { 'HCO3': 1 }, null);
add('hco3_oh', { 'HCO3': 1, 'OH-': 1 }, { 'CO3': 1 }, null);
add('co2_co3', { 'CO2': 1, 'CO3': 1 }, { 'HCO3': 2 }, null);
// (slow: handled in Vessel.tick)
export const CACO3_CO2 = { id: 'caco3_co2', log: L('The milkiness disappears',
  'CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂',
  'With excess CO₂ the milky precipitate redissolves as soluble calcium hydrogencarbonate.',
  'This is how temporary hardness forms, and why limewater clears with too much CO₂.') };
add('h_co3', { 'H+': 1, 'CO3': 1 }, { 'HCO3': 1 }, null);
add('h_hco3', { 'H+': 1, 'HCO3': 1 }, { 'CO2': 1 }, L('Effervescence (CO₂)',
  'CO₃²⁻ + 2H⁺ → CO₂↑ + H₂O', 'Brisk fizzing of a colourless, odourless gas.',
  'Test for carbonate: the gas turns limewater milky.'));
add('h_s2', { 'H+': 2, 'S2-': 1 }, { 'g:H2S': 1 }, L('Hydrogen sulfide gas',
  'S²⁻ + 2H⁺ → H₂S↑', 'A colourless gas that smells of rotten eggs. (Toxic!)',
  'H₂S is the group reagent for Group II (in acid) and Group IV (in alkali) cations.'));
add('fe_co3', { 'Fe3+': 2, 'CO3': 3 }, { 's:Fe(OH)3': 2, 'CO2': 3 }, L('Fe³⁺ + carbonate',
  '2Fe³⁺ + 3CO₃²⁻ + 3H₂O → 2Fe(OH)₃↓ + 3CO₂↑', 'A brown precipitate forms with fizzing.',
  'Fe³⁺ is so strongly hydrolysed that iron(III) carbonate does not exist.'));

// ---------- precipitates dissolving in acid ----------
const HYD = [['Fe(OH)3', 'Fe3+', 3], ['Cu(OH)2', 'Cu2+', 2], ['Fe(OH)2', 'Fe2+', 2], ['Zn(OH)2', 'Zn2+', 2],
  ['Pb(OH)2', 'Pb2+', 2], ['Mg(OH)2', 'Mg2+', 2], ['Mn(OH)2', 'Mn2+', 2], ['Cr(OH)3', 'Cr3+', 3]];
for (const [key, M, n] of HYD) {
  add('acid_' + key, { ['s:' + key]: 1, 'H+': n }, { [M]: 1 }, L(`${SOLIDS[key].f} dissolves in acid`,
    `${SOLIDS[key].f} + ${n}H⁺ → ${AQ[M].f} + ${n}H₂O`, 'The precipitate dissolves.',
    'Metal hydroxides are bases, so they dissolve in acids.'), { dH: -25 });
}
add('acid_Ag2O', { 's:Ag2O': 1, 'H+': 2 }, { 'Ag+': 2 }, null);
const CARB = [['CaCO3', 'Ca2+', 1], ['BaCO3', 'Ba2+', 1], ['CuCO3', 'Cu2+', 1], ['ZnCO3', 'Zn2+', 1],
  ['PbCO3', 'Pb2+', 1], ['MgCO3', 'Mg2+', 1], ['FeCO3', 'Fe2+', 1], ['Ag2CO3', 'Ag+', 2]];
for (const [key, M, a] of CARB) {
  add('acid_' + key, { ['s:' + key]: 1, 'H+': 2 }, { [M]: a, 'CO2': 1 }, L(`${SOLIDS[key].f} dissolves with fizzing`,
    `${SOLIDS[key].f} + 2H⁺ → ${a > 1 ? a : ''}${AQ[M].f} + CO₂↑ + H₂O`, 'The precipitate fizzes and dissolves.',
    'All carbonates release CO₂ with acids.'));
}
add('acid_ZnS', { 's:ZnS': 1, 'H+': 2 }, { 'Zn2+': 1, 'g:H2S': 1 }, null);
add('acid_FeS', { 's:FeS': 1, 'H+': 2 }, { 'Fe2+': 1, 'g:H2S': 1 }, L('FeS dissolves in acid',
  'FeS + 2H⁺ → Fe²⁺ + H₂S↑', 'The black solid dissolves and gives off rotten-egg-smelling gas.',
  'FeS + dil. H₂SO₄ is the lab (Kipp) preparation of H₂S.'));

// complexes broken by acid
add('cuNH3_acid', { 'CuNH3': 1, 'H+': 4 }, { 'Cu2+': 1, 'NH4+': 4 }, L('Complex destroyed by acid',
  '[Cu(NH₃)₄]²⁺ + 4H⁺ → Cu²⁺ + 4NH₄⁺', 'The deep blue fades back to pale blue.',
  'Acid protonates the NH₃ ligands, so they can no longer bind to Cu²⁺.'));
add('agNH3_acid', { 'AgNH3': 1, 'H+': 2 }, { 'Ag+': 1, 'NH4+': 2 }, L('Silver complex broken by acid',
  '[Ag(NH₃)₂]⁺ + 2H⁺ → Ag⁺ + 2NH₄⁺', 'If chloride is present, white AgCl reappears.',
  'Confirms Cl⁻: AgCl dissolves in NH₃ and re-precipitates when HNO₃ is added.'));
add('znNH3_acid', { 'ZnNH3': 1, 'H+': 4 }, { 'Zn2+': 1, 'NH4+': 4 }, null);
add('zincate_acid', { 'ZnOH4': 1, 'H+': 2 }, { 's:Zn(OH)2': 1 }, null);
add('plumbite_acid', { 'PbOH4': 1, 'H+': 2 }, { 's:Pb(OH)2': 1 }, null);

// ---------- complex colours ----------
add('fescn', { 'Fe3+': 1, 'SCN-': 1 }, { 'FeSCN': 1 }, L('Blood-red colour',
  'Fe³⁺ + SCN⁻ → [Fe(SCN)]²⁺', 'The solution turns an intense blood-red.',
  'A very sensitive test for Fe³⁺. Fe²⁺ gives no colour.'));
add('fescn_oh', { 'FeSCN': 1, 'OH-': 3 }, { 's:Fe(OH)3': 1, 'SCN-': 1 }, null);

// ---------- redox ----------
add('mno4_fe', { 'MnO4-': 1, 'Fe2+': 5, 'H+': 8 }, { 'Mn2+': 1, 'Fe3+': 5 }, L('KMnO₄ oxidises Fe²⁺',
  'MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O', 'The purple colour vanishes as soon as each drop goes in.',
  'KMnO₄ is a self-indicator: the first permanent pink marks the end point. n-factor = 5 in acid.'));
add('cr2o7_fe', { 'Cr2O7': 1, 'Fe2+': 6, 'H+': 14 }, { 'Cr3+': 2, 'Fe3+': 6 }, L('Dichromate oxidises Fe²⁺',
  'Cr₂O₇²⁻ + 6Fe²⁺ + 14H⁺ → 2Cr³⁺ + 6Fe³⁺ + 7H₂O', 'The orange colour turns green (Cr³⁺).',
  'n-factor of K₂Cr₂O₇ = 6. The same colour change was used in the old breathalyser test.'));
add('mno4_i', { 'MnO4-': 2, 'I-': 10, 'H+': 16 }, { 'Mn2+': 2, 'I2': 5 }, L('KMnO₄ oxidises iodide',
  '2MnO₄⁻ + 10I⁻ + 16H⁺ → 2Mn²⁺ + 5I₂ + 8H₂O', 'The purple disappears and brown iodine appears.',
  'Iodide is a good reducing agent.'));
add('cr2o7_i', { 'Cr2O7': 1, 'I-': 6, 'H+': 14 }, { 'Cr3+': 2, 'I2': 3 }, L('Dichromate oxidises iodide',
  'Cr₂O₇²⁻ + 6I⁻ + 14H⁺ → 2Cr³⁺ + 3I₂ + 7H₂O', 'The orange solution turns dark brown with iodine.',
  'Basis of iodometric titrations with K₂Cr₂O₇.'));
add('mno4_h2o2', { 'MnO4-': 2, 'H2O2': 5, 'H+': 6 }, { 'Mn2+': 2, 'g:O2': 5 }, L('KMnO₄ oxidises H₂O₂',
  '2MnO₄⁻ + 5H₂O₂ + 6H⁺ → 2Mn²⁺ + 5O₂↑ + 8H₂O', 'The purple colour disappears with fizzing (oxygen).',
  'Here H₂O₂ acts as a reducing agent.'));
add('cr2o7_h2o2', { 'Cr2O7': 1, 'H2O2': 3, 'H+': 8 }, { 'Cr3+': 2, 'g:O2': 3 }, L('Dichromate + H₂O₂',
  'Cr₂O₇²⁻ + 3H₂O₂ + 8H⁺ → 2Cr³⁺ + 3O₂↑ + 7H₂O', 'Orange turns green with fizzing.',
  'The reaction goes through deep-blue CrO₅ (chromium peroxide), which is unstable in water.'));
add('fe3_i', { 'Fe3+': 2, 'I-': 2 }, { 'Fe2+': 2, 'I2': 1 }, L('Fe³⁺ oxidises iodide',
  '2Fe³⁺ + 2I⁻ → 2Fe²⁺ + I₂', 'The solution turns brown (iodine).',
  'E°(Fe³⁺/Fe²⁺) = +0.77 V is greater than E°(I₂/I⁻) = +0.54 V, so Fe³⁺ can oxidise I⁻.'));
add('cu_i', { 'Cu2+': 2, 'I-': 4 }, { 's:CuI': 2, 'I2': 1 }, L('Cu²⁺ oxidises iodide',
  '2Cu²⁺ + 4I⁻ → 2CuI↓ + I₂', 'An off-white precipitate of CuI forms in brown iodine solution.',
  'Basis of the iodometric estimation of copper.'));
add('h2o2_fe', { 'H2O2': 1, 'Fe2+': 2, 'H+': 2 }, { 'Fe3+': 2 }, L('H₂O₂ oxidises Fe²⁺',
  'H₂O₂ + 2Fe²⁺ + 2H⁺ → 2Fe³⁺ + 2H₂O', 'Pale green turns yellow-brown.',
  'H₂O₂ acting as an oxidising agent.'));

// excess CO2 bubbles out of solution
RULES.push({
  id: 'co2_degas',
  run(v) {
    const ex = v.get('CO2') - 0.034 * v.V;
    if (ex > 1e-9) { v.chg('CO2', -ex); v.emitGas('CO2', ex); return ex; }
    return 0;
  },
});

// ---------- logs for rate-based reactions (used from Vessel.tick) ----------
const mk = o => Object.fromEntries(Object.entries(o).map(([id, log]) => [id, { id, log }]));
export const RX = mk({
  marble: L('Marble chips + acid', 'CaCO₃ + 2H⁺ → Ca²⁺ + CO₂↑ + H₂O', 'Steady fizzing from the marble chips.',
    'Lab preparation of CO₂. Test: it turns limewater milky.'),
  h2o2: L('H₂O₂ decomposes', '2H₂O₂ → 2H₂O + O₂↑', 'Vigorous fizzing of a colourless gas, and the beaker gets warm.',
    'MnO₂ is a catalyst: it speeds up the reaction but is not used up. Test: O₂ relights a glowing splint.'),
  h2o2_I: L('Iodide oxidised by H₂O₂', 'H₂O₂ + 2I⁻ + 2H⁺ → I₂ + 2H₂O', 'The solution slowly turns yellow, then brown (or blue-black with starch).',
    'Starch + I₂ forms an intense blue-black complex, a very sensitive test for iodine.'),
  feair: L('Fe(OH)₂ oxidised by air', '4Fe(OH)₂ + O₂ + 2H₂O → 4Fe(OH)₃', 'The dirty-green precipitate slowly turns reddish-brown.',
    'Fe²⁺ is easily oxidised to the more stable Fe³⁺ (half-filled 3d⁵).'),
  nh3gas: L('Ammonia gas given off', 'NH₄⁺ + OH⁻ →(heat)→ NH₃↑ + H₂O', 'A pungent gas comes off. Test it with damp red litmus.',
    'Confirmatory test for NH₄⁺ ions.'),
  na: L('Sodium reacts with water', '2Na + 2H₂O → 2NaOH + H₂↑', 'The sodium fizzes, melts into a ball and skates on the surface. The solution becomes alkaline.',
    'Alkali metals are strong reducing agents (E° Na⁺/Na = −2.71 V). The reaction is very exothermic.'),
  acid_Mg: L('Magnesium + acid', 'Mg + 2H⁺ → Mg²⁺ + H₂↑', 'Vigorous fizzing. The ribbon dissolves and the beaker gets hot.',
    'Metals above hydrogen in the activity series release H₂ from dilute acids. Test: squeaky pop.'),
  acid_Zn: L('Zinc + acid', 'Zn + 2H⁺ → Zn²⁺ + H₂↑', 'Steady fizzing of hydrogen at the granules.',
    'Lab preparation of H₂ (Kipp’s apparatus). Test: burning splint gives a squeaky pop.'),
  acid_Fe: L('Iron + acid', 'Fe + 2H⁺ → Fe²⁺ + H₂↑', 'Slow fizzing. The solution turns pale green (Fe²⁺).',
    'Non-oxidising acids give Fe²⁺, not Fe³⁺.'),
  acid_Pb: L('Lead + acid', 'Pb + 2H⁺ → Pb²⁺ + H₂↑', 'Very slow fizzing.', 'Pb is only just above hydrogen (E° = −0.13 V).'),
  hno3_Cu: L('Copper + conc. nitric acid', 'Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O', 'Choking brown fumes of NO₂. The solution turns blue-green.',
    'Conc. HNO₃ is an oxidising acid: it gives NO₂, not H₂. Dilute HNO₃ gives NO. (Use a fume hood!)'),
  hno3_Zn: L('Zinc + conc. nitric acid', 'Zn + 4HNO₃ → Zn(NO₃)₂ + 2NO₂↑ + 2H₂O', 'Brown NO₂ fumes.', 'Oxidising acid: the nitrate is reduced, not H⁺.'),
  hno3_Mg: L('Magnesium + conc. nitric acid', 'Mg + 4HNO₃ → Mg(NO₃)₂ + 2NO₂↑ + 2H₂O', 'Brown NO₂ fumes.', 'Only very dilute HNO₃ gives H₂ with Mg/Mn.'),
  hno3_Ag: L('Silver + nitric acid', 'Ag + 2HNO₃ → AgNO₃ + NO₂↑ + H₂O', 'The silver dissolves with brown fumes.', 'Nitric acid dissolves silver but not gold.'),
  hno3_Pb: L('Lead + nitric acid', 'Pb + 4HNO₃ → Pb(NO₃)₂ + 2NO₂↑ + 2H₂O', 'Brown fumes.', ''),
});
export const HINTS = mk({
  noacid_Cu: L('No reaction: Cu + dilute acid', 'Cu + H⁺ ✗', 'Nothing happens.',
    'Copper is below hydrogen in the activity series (E° = +0.34 V), so it cannot release H₂ from dilute HCl or H₂SO₄. Try conc. HNO₃.'),
  noacid_Ag: L('No reaction: Ag + dilute acid', 'Ag + H⁺ ✗', 'Nothing happens.', 'Silver is below hydrogen (E° = +0.80 V).'),
  fe_passive: L('Iron is passive in conc. HNO₃', 'Fe + conc. HNO₃ → thin Fe₃O₄ layer', 'The iron stops reacting.',
    'A thin protective oxide layer forms on the surface (passivity). Al and Cr behave the same way.'),
  ox_noacid: L('Needs acid!', '—', 'The oxidiser does not react properly in neutral solution.',
    'KMnO₄ and K₂Cr₂O₇ oxidise best in acidic medium. Add dilute H₂SO₄ (not HCl, which KMnO₄ would oxidise).'),
  dry: L('Beaker nearly dry', '—', 'Most of the water has boiled off, so the burner was switched off.', ''),
});

// displacement logs, built on demand
const dispCache = {};
const sub = n => (n > 1 ? n : '');
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export function dispLog(metal, cat) {
  const id = `disp_${metal}_${cat}`;
  if (dispCache[id]) return dispCache[id];
  const M = METALS[metal], D = DISPLACE[cat];
  const l = (M.z * D.e) / gcd(M.z, D.e), a = l / M.z, b = l / D.e;
  const prod = D.dep ? `${sub(b)}${D.sym}↓` : `${sub(b)}${D.sym}`;
  const eq = `${sub(a)}${metal} + ${sub(b)}${AQ[cat].f} → ${sub(a)}${AQ[M.cation].f} + ${prod}`;
  const obs = {
    'Cu2+': 'Reddish-brown copper coats the metal and the blue colour slowly fades.',
    'Ag+': 'Shiny grey silver crystals grow like a tree' + (metal === 'Cu' ? ', and the solution slowly turns blue (Cu²⁺).' : '.'),
    'Pb2+': 'Feathery grey crystals of lead grow (a "lead tree").',
    'Fe2+': 'A dark iron deposit forms and the pale green colour fades.',
    'Zn2+': 'Grey zinc deposits on the metal.',
    'Fe3+': 'Yellow-brown Fe³⁺ is reduced to pale green Fe²⁺' + (metal === 'Cu' ? '. Copper dissolves, which is how circuit boards are etched.' : '.'),
  }[cat];
  const note = `A more reactive metal (lower E°) displaces a less reactive one. E°: ${metal} ${M.E.toFixed(2)} V vs ${D.sym.replace('↓', '')} ${D.E.toFixed(2)} V, so E°cell = ${(D.E - M.E).toFixed(2)} V > 0 and the reaction is spontaneous.`;
  return (dispCache[id] = { id, log: L(`Displacement: ${metal} + ${AQ[cat].f}`, eq, obs, note) });
}
