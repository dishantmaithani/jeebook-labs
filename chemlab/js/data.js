// ChemLab — chemical data: dissolved species, solids, stock reagents, reaction tables.
// Colours are "what a 1 cm layer looks like at concentration cref" — the engine mixes them
// with Beer–Lambert absorbance, so dilution and mixing behave like the real thing.

export const AQ = {
  'H+':    { f: 'H⁺', name: 'hydrogen ion (acid)' },
  'OH-':   { f: 'OH⁻', name: 'hydroxide (alkali)' },
  'Na+':   { f: 'Na⁺', name: 'sodium' },
  'K+':    { f: 'K⁺', name: 'potassium' },
  'Cl-':   { f: 'Cl⁻', name: 'chloride' },
  'SO4':   { f: 'SO₄²⁻', name: 'sulfate' },
  'NO3':   { f: 'NO₃⁻', name: 'nitrate' },
  'Ag+':   { f: 'Ag⁺', name: 'silver' },
  'Ba2+':  { f: 'Ba²⁺', name: 'barium' },
  'Pb2+':  { f: 'Pb²⁺', name: 'lead(II)' },
  'Cu2+':  { f: 'Cu²⁺', name: 'copper(II)', color: [150, 200, 250], cref: 0.2 },
  'Fe3+':  { f: 'Fe³⁺', name: 'iron(III)', color: [235, 185, 75], cref: 0.15 },
  'Fe2+':  { f: 'Fe²⁺', name: 'iron(II)', color: [205, 235, 190], cref: 0.15 },
  'Zn2+':  { f: 'Zn²⁺', name: 'zinc' },
  'Mg2+':  { f: 'Mg²⁺', name: 'magnesium' },
  'Ca2+':  { f: 'Ca²⁺', name: 'calcium' },
  'Mn2+':  { f: 'Mn²⁺', name: 'manganese(II)', color: [255, 236, 242], cref: 0.1 },
  'Cr3+':  { f: 'Cr³⁺', name: 'chromium(III)', color: [70, 145, 95], cref: 0.05 },
  'MnO4-': { f: 'MnO₄⁻', name: 'permanganate', color: [125, 0, 145], cref: 0.002 },
  'Cr2O7': { f: 'Cr₂O₇²⁻', name: 'dichromate', color: [245, 135, 20], cref: 0.04 },
  'CO3':   { f: 'CO₃²⁻', name: 'carbonate' },
  'HCO3':  { f: 'HCO₃⁻', name: 'hydrogencarbonate' },
  'CO2':   { f: 'CO₂(aq)', name: 'dissolved carbon dioxide' },
  'NH3':   { f: 'NH₃', name: 'ammonia' },
  'NH4+':  { f: 'NH₄⁺', name: 'ammonium' },
  'SCN-':  { f: 'SCN⁻', name: 'thiocyanate' },
  'FeCN6': { f: '[Fe(CN)₆]⁴⁻', name: 'ferrocyanide', color: [248, 242, 170], cref: 0.2 },
  'S2-':   { f: 'S²⁻', name: 'sulfide' },
  'I-':    { f: 'I⁻', name: 'iodide' },
  'H2O2':  { f: 'H₂O₂', name: 'hydrogen peroxide' },
  'I2':    { f: 'I₂', name: 'iodine (as I₃⁻)', color: [160, 75, 10], cref: 0.004 },
  'starch':{ f: 'starch', name: 'starch' },
  'CuNH3': { f: '[Cu(NH₃)₄]²⁺', name: 'tetraamminecopper(II)', color: [30, 50, 210], cref: 0.05 },
  'AgNH3': { f: '[Ag(NH₃)₂]⁺', name: 'diamminesilver(I)' },
  'ZnNH3': { f: '[Zn(NH₃)₄]²⁺', name: 'tetraamminezinc(II)' },
  'ZnOH4': { f: '[Zn(OH)₄]²⁻', name: 'zincate' },
  'PbOH4': { f: '[Pb(OH)₄]²⁻', name: 'plumbite' },
  'FeSCN': { f: '[Fe(SCN)]²⁺', name: 'thiocyanatoiron(III)', color: [140, 0, 12], cref: 0.004 },
  'phth':  { f: 'HPh', name: 'phenolphthalein', ind: true, cref: 1.2e-3 },
  'MO':    { f: 'MeO', name: 'methyl orange', ind: true, cref: 1.2e-3 },
  'UI':    { f: 'UI', name: 'universal indicator', ind: true, cref: 1.5e-3 },
};

// kind: ppt (fine particles), metal (pieces), deposit (grows on metals), chip (lumps)
export const SOLIDS = {
  'AgCl':     { f: 'AgCl', name: 'silver chloride', color: [246, 246, 246], mm: 143.3, kind: 'ppt', desc: 'curdy white' },
  'AgI':      { f: 'AgI', name: 'silver iodide', color: [240, 226, 125], mm: 234.8, kind: 'ppt', desc: 'pale yellow' },
  'Ag2O':     { f: 'Ag₂O', name: 'silver oxide', color: [98, 66, 44], mm: 231.7, kind: 'ppt', desc: 'brown' },
  'Ag2S':     { f: 'Ag₂S', name: 'silver sulfide', color: [26, 26, 28], mm: 247.8, kind: 'ppt', desc: 'black' },
  'AgSCN':    { f: 'AgSCN', name: 'silver thiocyanate', color: [244, 244, 240], mm: 165.9, kind: 'ppt', desc: 'white' },
  'Ag2CO3':   { f: 'Ag₂CO₃', name: 'silver carbonate', color: [242, 236, 192], mm: 275.7, kind: 'ppt', desc: 'pale yellow' },
  'BaSO4':    { f: 'BaSO₄', name: 'barium sulfate', color: [250, 250, 250], mm: 233.4, kind: 'ppt', desc: 'dense white' },
  'BaCO3':    { f: 'BaCO₃', name: 'barium carbonate', color: [248, 248, 248], mm: 197.3, kind: 'ppt', desc: 'white' },
  'PbI2':     { f: 'PbI₂', name: 'lead(II) iodide', color: [255, 208, 20], mm: 461.0, kind: 'ppt', desc: 'bright yellow', sparkle: true },
  'PbCl2':    { f: 'PbCl₂', name: 'lead(II) chloride', color: [245, 245, 245], mm: 278.1, kind: 'ppt', desc: 'white' },
  'PbSO4':    { f: 'PbSO₄', name: 'lead(II) sulfate', color: [248, 248, 248], mm: 303.3, kind: 'ppt', desc: 'white' },
  'PbS':      { f: 'PbS', name: 'lead(II) sulfide', color: [28, 28, 30], mm: 239.3, kind: 'ppt', desc: 'black' },
  'Pb(OH)2':  { f: 'Pb(OH)₂', name: 'lead(II) hydroxide', color: [242, 242, 238], mm: 241.2, kind: 'ppt', desc: 'white' },
  'PbCO3':    { f: 'PbCO₃', name: 'lead(II) carbonate', color: [246, 246, 246], mm: 267.2, kind: 'ppt', desc: 'white' },
  'Cu(OH)2':  { f: 'Cu(OH)₂', name: 'copper(II) hydroxide', color: [100, 165, 235], mm: 97.6, kind: 'ppt', desc: 'pale blue', settle: 0.7 },
  'CuS':      { f: 'CuS', name: 'copper(II) sulfide', color: [30, 30, 36], mm: 95.6, kind: 'ppt', desc: 'black' },
  'CuCO3':    { f: 'CuCO₃', name: 'basic copper carbonate', color: [90, 172, 150], mm: 123.6, kind: 'ppt', desc: 'blue-green' },
  'CuI':      { f: 'CuI', name: 'copper(I) iodide', color: [236, 228, 210], mm: 190.4, kind: 'ppt', desc: 'off-white' },
  'CuFeCN':   { f: 'Cu₂[Fe(CN)₆]', name: 'copper ferrocyanide', color: [122, 56, 30], mm: 339.0, kind: 'ppt', desc: 'chocolate-brown' },
  'Fe(OH)3':  { f: 'Fe(OH)₃', name: 'iron(III) hydroxide', color: [158, 76, 30], mm: 106.9, kind: 'ppt', desc: 'reddish-brown', settle: 0.6 },
  'Fe(OH)2':  { f: 'Fe(OH)₂', name: 'iron(II) hydroxide', color: [100, 132, 90], mm: 89.9, kind: 'ppt', desc: 'dirty green', settle: 0.6 },
  'FeS':      { f: 'FeS', name: 'iron(II) sulfide', color: [32, 30, 30], mm: 87.9, kind: 'ppt', desc: 'black' },
  'Fe2S3':    { f: 'Fe₂S₃', name: 'iron(III) sulfide', color: [34, 30, 28], mm: 207.9, kind: 'ppt', desc: 'black' },
  'FeCO3':    { f: 'FeCO₃', name: 'iron(II) carbonate', color: [182, 192, 162], mm: 115.9, kind: 'ppt', desc: 'greenish-white' },
  'PB':       { f: 'Fe₄[Fe(CN)₆]₃', name: 'Prussian blue', color: [18, 44, 152], mm: 859.2, kind: 'ppt', desc: 'deep Prussian-blue', settle: 0.35 },
  'FeFeCN':   { f: 'Fe₂[Fe(CN)₆]', name: 'iron(II) ferrocyanide', color: [182, 202, 236], mm: 323.6, kind: 'ppt', desc: 'pale bluish-white' },
  'Zn(OH)2':  { f: 'Zn(OH)₂', name: 'zinc hydroxide', color: [244, 244, 244], mm: 99.4, kind: 'ppt', desc: 'gelatinous white', settle: 0.6 },
  'ZnS':      { f: 'ZnS', name: 'zinc sulfide', color: [248, 248, 246], mm: 97.5, kind: 'ppt', desc: 'white' },
  'ZnCO3':    { f: 'ZnCO₃', name: 'zinc carbonate', color: [248, 248, 248], mm: 125.4, kind: 'ppt', desc: 'white' },
  'ZnFeCN':   { f: 'Zn₂[Fe(CN)₆]', name: 'zinc ferrocyanide', color: [236, 242, 246], mm: 342.7, kind: 'ppt', desc: 'bluish-white' },
  'Mg(OH)2':  { f: 'Mg(OH)₂', name: 'magnesium hydroxide', color: [246, 246, 246], mm: 58.3, kind: 'ppt', desc: 'white' },
  'MgCO3':    { f: 'MgCO₃', name: 'magnesium carbonate', color: [248, 248, 248], mm: 84.3, kind: 'ppt', desc: 'white' },
  'CaCO3':    { f: 'CaCO₃', name: 'calcium carbonate', color: [250, 250, 250], mm: 100.1, kind: 'ppt', desc: 'milky white', settle: 0.25 },
  'Mn(OH)2':  { f: 'Mn(OH)₂', name: 'manganese(II) hydroxide', color: [236, 222, 206], mm: 88.9, kind: 'ppt', desc: 'off-white' },
  'Cr(OH)3':  { f: 'Cr(OH)₃', name: 'chromium(III) hydroxide', color: [112, 142, 112], mm: 103.0, kind: 'ppt', desc: 'grey-green' },
  'MnO2':     { f: 'MnO₂', name: 'manganese dioxide (catalyst)', color: [34, 30, 26], mm: 86.9, kind: 'ppt', desc: 'black' },
  // metals added from the shelf
  'Zn':       { f: 'Zn', name: 'zinc granules', color: [156, 162, 172], mm: 65.4, kind: 'metal', metal: 'Zn' },
  'Mg':       { f: 'Mg', name: 'magnesium ribbon', color: [205, 210, 218], mm: 24.3, kind: 'metal', metal: 'Mg' },
  'Cu':       { f: 'Cu', name: 'copper turnings', color: [200, 116, 58], mm: 63.5, kind: 'metal', metal: 'Cu' },
  'Fe':       { f: 'Fe', name: 'iron filings', color: [78, 80, 86], mm: 55.8, kind: 'metal', metal: 'Fe' },
  'Na':       { f: 'Na', name: 'sodium metal', color: [196, 200, 206], mm: 23.0, kind: 'metal', metal: 'Na' },
  // metals deposited by displacement reactions
  'Cu*':      { f: 'Cu', name: 'deposited copper', color: [150, 78, 40], mm: 63.5, kind: 'deposit', metal: 'Cu', style: 'crust' },
  'Ag*':      { f: 'Ag', name: 'silver crystals', color: [214, 218, 226], mm: 107.9, kind: 'deposit', metal: 'Ag', style: 'needle' },
  'Pb*':      { f: 'Pb', name: 'lead crystals', color: [150, 156, 168], mm: 207.2, kind: 'deposit', metal: 'Pb', style: 'needle' },
  'Fe*':      { f: 'Fe', name: 'deposited iron', color: [60, 60, 64], mm: 55.8, kind: 'deposit', metal: 'Fe', style: 'crust' },
  'Zn*':      { f: 'Zn', name: 'deposited zinc', color: [120, 124, 132], mm: 65.4, kind: 'deposit', metal: 'Zn', style: 'crust' },
  'marble':   { f: 'CaCO₃', name: 'marble chips', color: [234, 232, 224], mm: 100.1, kind: 'chip' },
};

// E° (V) for M^z+/M, rate constants for dilute acid (kA) and conc. HNO3 (kN)
export const METALS = {
  Na: { z: 1, E: -2.71, cation: 'Na+' },
  Mg: { z: 2, E: -2.37, cation: 'Mg2+', kA: 0.02, kN: 0.004 },
  Zn: { z: 2, E: -0.76, cation: 'Zn2+', kA: 0.004, kN: 0.003 },
  Fe: { z: 2, E: -0.44, cation: 'Fe2+', kA: 0.0015, kN: 0 },
  Pb: { z: 2, E: -0.13, cation: 'Pb2+', kA: 0.0002, kN: 0.002 },
  Cu: { z: 2, E: 0.34, cation: 'Cu2+', kA: 0, kN: 0.0015 },
  Ag: { z: 1, E: 0.80, cation: 'Ag+', kA: 0, kN: 0.0015 },
};

// cations a more reactive metal can reduce. e = electrons taken per ion
export const DISPLACE = {
  'Ag+':  { E: 0.80, e: 1, dep: 'Ag*', sym: 'Ag' },
  'Fe3+': { E: 0.77, e: 1, toAq: 'Fe2+', sym: 'Fe²⁺' },
  'Cu2+': { E: 0.34, e: 2, dep: 'Cu*', sym: 'Cu' },
  'Pb2+': { E: -0.13, e: 2, dep: 'Pb*', sym: 'Pb' },
  'Fe2+': { E: -0.44, e: 2, dep: 'Fe*', sym: 'Fe' },
  'Zn2+': { E: -0.76, e: 2, dep: 'Zn*', sym: 'Zn' },
};

// Insoluble salts, in priority order (least soluble first).
// [cation, anion, cation coeff, anion coeff, solid key, equation, JEE note]
export const PPT = [
  ['Ag+', 'S2-', 2, 1, 'Ag2S', '2Ag⁺ + S²⁻ → Ag₂S↓', 'Most metal sulfides are black.'],
  ['Cu2+', 'S2-', 1, 1, 'CuS', 'Cu²⁺ + S²⁻ → CuS↓', 'Group II sulfide: black, precipitated by H₂S even in acidic solution.'],
  ['Pb2+', 'S2-', 1, 1, 'PbS', 'Pb²⁺ + S²⁻ → PbS↓', 'Group II sulfide (black). Lead acetate paper turns black with H₂S.'],
  ['Fe2+', 'S2-', 1, 1, 'FeS', 'Fe²⁺ + S²⁻ → FeS↓', 'Black FeS dissolves in dilute acid, giving H₂S.'],
  ['Fe3+', 'S2-', 2, 3, 'Fe2S3', '2Fe³⁺ + 3S²⁻ → Fe₂S₃↓', 'Black precipitate.'],
  ['Zn2+', 'S2-', 1, 1, 'ZnS', 'Zn²⁺ + S²⁻ → ZnS↓', 'ZnS is the only common WHITE sulfide (Group IV).'],
  ['Fe3+', 'FeCN6', 4, 3, 'PB', '4Fe³⁺ + 3[Fe(CN)₆]⁴⁻ → Fe₄[Fe(CN)₆]₃↓', 'Prussian blue: confirmatory test for Fe³⁺.'],
  ['Cu2+', 'FeCN6', 2, 1, 'CuFeCN', '2Cu²⁺ + [Fe(CN)₆]⁴⁻ → Cu₂[Fe(CN)₆]↓', 'Chocolate-brown precipitate: confirmatory test for Cu²⁺.'],
  ['Fe2+', 'FeCN6', 2, 1, 'FeFeCN', '2Fe²⁺ + [Fe(CN)₆]⁴⁻ → Fe₂[Fe(CN)₆]↓', 'Fe²⁺ gives only a pale bluish-white precipitate; Fe³⁺ gives deep blue.'],
  ['Zn2+', 'FeCN6', 2, 1, 'ZnFeCN', '2Zn²⁺ + [Fe(CN)₆]⁴⁻ → Zn₂[Fe(CN)₆]↓', 'Bluish-white precipitate: test for Zn²⁺.'],
  ['Ag+', 'I-', 1, 1, 'AgI', 'Ag⁺ + I⁻ → AgI↓', 'Yellow, insoluble even in NH₃: test for iodide.'],
  ['Ag+', 'SCN-', 1, 1, 'AgSCN', 'Ag⁺ + SCN⁻ → AgSCN↓', 'Basis of Volhard’s titration.'],
  ['Ag+', 'Cl-', 1, 1, 'AgCl', 'Ag⁺ + Cl⁻ → AgCl↓', 'Curdy white, soluble in NH₃(aq): test for chloride.'],
  ['Ba2+', 'SO4', 1, 1, 'BaSO4', 'Ba²⁺ + SO₄²⁻ → BaSO₄↓', 'White, insoluble in HCl: test for sulfate.'],
  ['Pb2+', 'SO4', 1, 1, 'PbSO4', 'Pb²⁺ + SO₄²⁻ → PbSO₄↓', 'White precipitate.'],
  ['Fe3+', 'OH-', 1, 3, 'Fe(OH)3', 'Fe³⁺ + 3OH⁻ → Fe(OH)₃↓', 'Reddish-brown gelatinous precipitate (Group III).'],
  ['Cu2+', 'OH-', 1, 2, 'Cu(OH)2', 'Cu²⁺ + 2OH⁻ → Cu(OH)₂↓', 'Pale blue precipitate. Turns black (CuO) on boiling.'],
  ['Fe2+', 'OH-', 1, 2, 'Fe(OH)2', 'Fe²⁺ + 2OH⁻ → Fe(OH)₂↓', 'Dirty-green; slowly turns brown as air oxidises it to Fe(OH)₃.'],
  ['Zn2+', 'OH-', 1, 2, 'Zn(OH)2', 'Zn²⁺ + 2OH⁻ → Zn(OH)₂↓', 'White; dissolves in excess NaOH because Zn(OH)₂ is amphoteric.'],
  ['Pb2+', 'OH-', 1, 2, 'Pb(OH)2', 'Pb²⁺ + 2OH⁻ → Pb(OH)₂↓', 'White and amphoteric: dissolves in excess NaOH.'],
  ['Mg2+', 'OH-', 1, 2, 'Mg(OH)2', 'Mg²⁺ + 2OH⁻ → Mg(OH)₂↓', 'White (milk of magnesia).'],
  ['Mn2+', 'OH-', 1, 2, 'Mn(OH)2', 'Mn²⁺ + 2OH⁻ → Mn(OH)₂↓', 'Off-white, darkens in air.'],
  ['Cr3+', 'OH-', 1, 3, 'Cr(OH)3', 'Cr³⁺ + 3OH⁻ → Cr(OH)₃↓', 'Grey-green, amphoteric.'],
  ['Ag+', 'OH-', 2, 2, 'Ag2O', '2Ag⁺ + 2OH⁻ → Ag₂O↓ + H₂O', 'Brown: AgOH is unstable and loses water.'],
  ['Ba2+', 'CO3', 1, 1, 'BaCO3', 'Ba²⁺ + CO₃²⁻ → BaCO₃↓', 'White; dissolves in acid with fizzing.'],
  ['Ca2+', 'CO3', 1, 1, 'CaCO3', 'Ca²⁺ + CO₃²⁻ → CaCO₃↓', 'This is why limewater turns milky with CO₂.'],
  ['Cu2+', 'CO3', 1, 1, 'CuCO3', 'Cu²⁺ + CO₃²⁻ → CuCO₃↓', 'Blue-green basic copper carbonate (malachite colour).'],
  ['Zn2+', 'CO3', 1, 1, 'ZnCO3', 'Zn²⁺ + CO₃²⁻ → ZnCO₃↓', 'White precipitate.'],
  ['Pb2+', 'CO3', 1, 1, 'PbCO3', 'Pb²⁺ + CO₃²⁻ → PbCO₃↓', 'White precipitate.'],
  ['Mg2+', 'CO3', 1, 1, 'MgCO3', 'Mg²⁺ + CO₃²⁻ → MgCO₃↓', 'White precipitate.'],
  ['Fe2+', 'CO3', 1, 1, 'FeCO3', 'Fe²⁺ + CO₃²⁻ → FeCO₃↓', 'Greenish-white precipitate.'],
  ['Ag+', 'CO3', 2, 1, 'Ag2CO3', '2Ag⁺ + CO₃²⁻ → Ag₂CO₃↓', 'Pale yellow precipitate.'],
];

// Sparingly soluble salts handled with a temperature-dependent Ksp
export const KSP = [
  { cat: 'Pb2+', an: 'I-', cN: 1, aN: 2, key: 'PbI2', s25: 0.0013, s100: 0.009,
    eq: 'Pb²⁺ + 2I⁻ → PbI₂↓', note: 'PbI₂ dissolves in hot water and recrystallises as glittering golden plates on cooling ("golden rain").' },
  { cat: 'Pb2+', an: 'Cl-', cN: 1, aN: 2, key: 'PbCl2', s25: 0.035, s100: 0.12,
    eq: 'Pb²⁺ + 2Cl⁻ → PbCl₂↓', note: 'PbCl₂ is soluble in hot water, so Pb²⁺ is only partly precipitated in Group I.' },
];

// Hydroxides formed when NH3(aq) is the base: [cation, NH3 needed, hydroxide, cation coeff]
export const NH3_HYD = [
  ['Fe3+', 3, 'Fe(OH)3', 1], ['Cu2+', 2, 'Cu(OH)2', 1], ['Fe2+', 2, 'Fe(OH)2', 1],
  ['Zn2+', 2, 'Zn(OH)2', 1], ['Pb2+', 2, 'Pb(OH)2', 1], ['Mg2+', 2, 'Mg(OH)2', 1],
  ['Mn2+', 2, 'Mn(OH)2', 1], ['Cr3+', 3, 'Cr(OH)3', 1], ['Ag+', 2, 'Ag2O', 2],
];

export const STOCK = [
  // Acids
  { id: 'HCl', f: 'HCl', name: 'Hydrochloric acid', conc: '2 M', group: 'Acids', kind: 'liq', ions: { 'H+': 2, 'Cl-': 2 }, info: 'Strong acid. Dissolves reactive metals and carbonates.' },
  { id: 'H2SO4', f: 'H₂SO₄', name: 'Sulfuric acid (dil.)', conc: '1 M', group: 'Acids', kind: 'liq', ions: { 'H+': 2, 'SO4': 1 }, info: 'Strong diprotic acid. Used to acidify KMnO₄ and K₂Cr₂O₇.' },
  { id: 'HNO3', f: 'HNO₃', name: 'Nitric acid (conc.)', conc: '8 M', group: 'Acids', kind: 'liq', ions: { 'H+': 8, 'NO3': 8 }, info: 'Oxidising acid. Dissolves copper, giving brown NO₂. Corrosive!' },
  // Bases
  { id: 'NaOH', f: 'NaOH', name: 'Sodium hydroxide', conc: '2 M', group: 'Bases', kind: 'liq', ions: { 'Na+': 2, 'OH-': 2 }, info: 'Strong alkali. Group reagent for metal hydroxides.' },
  { id: 'NH3', f: 'NH₃(aq)', name: 'Ammonia solution', conc: '2 M', group: 'Bases', kind: 'liq', ions: { 'NH3': 2 }, info: 'Weak base and complexing agent (Cu²⁺, Ag⁺, Zn²⁺).' },
  { id: 'CaOH2', f: 'Ca(OH)₂', name: 'Limewater', conc: '0.02 M', group: 'Bases', kind: 'liq', ions: { 'Ca2+': 0.02, 'OH-': 0.04 }, info: 'Turns milky with CO₂: the classic test for carbon dioxide.' },
  { id: 'Na2CO3', f: 'Na₂CO₃', name: 'Sodium carbonate', conc: '1 M', group: 'Bases', kind: 'liq', ions: { 'Na+': 2, 'CO3': 1 }, info: 'Basic salt. Fizzes with acids.' },
  // Salts
  { id: 'NaCl', f: 'NaCl', name: 'Sodium chloride', conc: '1 M', group: 'Salt solutions', kind: 'liq', ions: { 'Na+': 1, 'Cl-': 1 }, info: 'Source of Cl⁻ ions.' },
  { id: 'KI', f: 'KI', name: 'Potassium iodide', conc: '0.5 M', group: 'Salt solutions', kind: 'liq', ions: { 'K+': 0.5, 'I-': 0.5 }, info: 'Source of I⁻. Reducing agent, gives I₂ with oxidisers.' },
  { id: 'AgNO3', f: 'AgNO₃', name: 'Silver nitrate', conc: '0.1 M', group: 'Salt solutions', kind: 'liq', ions: { 'Ag+': 0.1, 'NO3': 0.1 }, info: 'Test for halides (Cl⁻ white, I⁻ yellow).' },
  { id: 'BaCl2', f: 'BaCl₂', name: 'Barium chloride', conc: '0.5 M', group: 'Salt solutions', kind: 'liq', ions: { 'Ba2+': 0.5, 'Cl-': 1 }, info: 'Test for sulfate (white BaSO₄). Toxic.' },
  { id: 'PbNO3', f: 'Pb(NO₃)₂', name: 'Lead nitrate', conc: '0.5 M', group: 'Salt solutions', kind: 'liq', ions: { 'Pb2+': 0.5, 'NO3': 1 }, info: 'Gives yellow PbI₂ with iodide. Toxic.' },
  { id: 'CuSO4', f: 'CuSO₄', name: 'Copper(II) sulfate', conc: '0.5 M', group: 'Salt solutions', kind: 'liq', ions: { 'Cu2+': 0.5, 'SO4': 0.5 }, info: 'Blue solution of hydrated Cu²⁺ ions.' },
  { id: 'FeCl3', f: 'FeCl₃', name: 'Iron(III) chloride', conc: '0.5 M', group: 'Salt solutions', kind: 'liq', ions: { 'Fe3+': 0.5, 'Cl-': 1.5 }, info: 'Yellow-brown, acidic due to hydrolysis.' },
  { id: 'FeSO4', f: 'FeSO₄', name: 'Iron(II) sulfate', conc: '0.5 M', group: 'Salt solutions', kind: 'liq', ions: { 'Fe2+': 0.5, 'SO4': 0.5 }, info: 'Pale green. Reducing agent (Fe²⁺ → Fe³⁺).' },
  { id: 'ZnSO4', f: 'ZnSO₄', name: 'Zinc sulfate', conc: '0.5 M', group: 'Salt solutions', kind: 'liq', ions: { 'Zn2+': 0.5, 'SO4': 0.5 }, info: 'Colourless (Zn²⁺ is d¹⁰).' },
  { id: 'NH4Cl', f: 'NH₄Cl', name: 'Ammonium chloride', conc: '1 M', group: 'Salt solutions', kind: 'liq', ions: { 'NH4+': 1, 'Cl-': 1 }, info: 'Warm with NaOH to release NH₃.' },
  { id: 'KSCN', f: 'KSCN', name: 'Potassium thiocyanate', conc: '0.5 M', group: 'Salt solutions', kind: 'liq', ions: { 'K+': 0.5, 'SCN-': 0.5 }, info: 'Blood-red with Fe³⁺.' },
  { id: 'K4FeCN6', f: 'K₄[Fe(CN)₆]', name: 'Potassium ferrocyanide', conc: '0.2 M', group: 'Salt solutions', kind: 'liq', ions: { 'K+': 0.8, 'FeCN6': 0.2 }, info: 'Prussian blue with Fe³⁺, brown with Cu²⁺.' },
  { id: 'Na2S', f: 'Na₂S', name: 'Sodium sulfide', conc: '0.5 M', group: 'Salt solutions', kind: 'liq', ions: { 'Na+': 1, 'S2-': 0.5 }, info: 'Precipitates black metal sulfides. Gives H₂S with acid.' },
  // Redox
  { id: 'KMnO4', f: 'KMnO₄', name: 'Potassium permanganate', conc: '0.02 M', group: 'Redox reagents', kind: 'liq', ions: { 'K+': 0.02, 'MnO4-': 0.02 }, info: 'Strong oxidiser (purple → colourless in acid). Self-indicator.' },
  { id: 'K2Cr2O7', f: 'K₂Cr₂O₇', name: 'Potassium dichromate', conc: '0.1 M', group: 'Redox reagents', kind: 'liq', ions: { 'K+': 0.2, 'Cr2O7': 0.1 }, info: 'Oxidiser (orange → green Cr³⁺ in acid).' },
  { id: 'H2O2', f: 'H₂O₂', name: 'Hydrogen peroxide (3%)', conc: '0.9 M', group: 'Redox reagents', kind: 'liq', ions: { 'H2O2': 0.9 }, info: 'Oxidiser or reducer. Decomposes to O₂ with MnO₂.' },
  // Indicators & water
  { id: 'H2O', f: 'H₂O', name: 'Distilled water', conc: '', group: 'Water & indicators', kind: 'liq', ions: {}, info: 'For dilution.' },
  { id: 'phth', f: 'Phth', name: 'Phenolphthalein', conc: '', group: 'Water & indicators', kind: 'ind', ions: { 'phth': 0.05 }, info: 'Colourless in acid, pink above pH ≈ 8.2.' },
  { id: 'MO', f: 'MeO', name: 'Methyl orange', conc: '', group: 'Water & indicators', kind: 'ind', ions: { 'MO': 0.05 }, info: 'Red below pH 3.1, yellow above 4.4.' },
  { id: 'UI', f: 'UI', name: 'Universal indicator', conc: '', group: 'Water & indicators', kind: 'ind', ions: { 'UI': 0.08 }, info: 'Rainbow of colours across pH 1–14.' },
  { id: 'starch', f: 'Starch', name: 'Starch solution', conc: '', group: 'Water & indicators', kind: 'ind', ions: { 'starch': 0.01 }, info: 'Turns blue-black with iodine.' },
  // Solids
  { id: 'Zn', f: 'Zn', name: 'Zinc granules', group: 'Metals & solids', kind: 'solid', solid: 'Zn', mol: 0.005, dose: 'zinc granules (0.33 g)', info: 'Reactive metal: H₂ with dilute acid, displaces Cu.' },
  { id: 'Mg', f: 'Mg', name: 'Magnesium ribbon', group: 'Metals & solids', kind: 'solid', solid: 'Mg', mol: 0.004, dose: 'a strip of magnesium ribbon (0.10 g)', info: 'Very reactive with acid.' },
  { id: 'Cu', f: 'Cu', name: 'Copper turnings', group: 'Metals & solids', kind: 'solid', solid: 'Cu', mol: 0.006, dose: 'copper turnings (0.38 g)', info: 'Below H in the activity series. Displaces Ag.' },
  { id: 'Fe', f: 'Fe', name: 'Iron filings', group: 'Metals & solids', kind: 'solid', solid: 'Fe', mol: 0.005, dose: 'iron filings (0.28 g)', info: 'Displaces Cu from CuSO₄. Passive in conc. HNO₃.' },
  { id: 'Na', f: 'Na', name: 'Sodium (small piece)', group: 'Metals & solids', kind: 'solid', solid: 'Na', mol: 0.004, dose: 'a small piece of sodium (0.09 g)', info: 'Reacts violently with water. Handle with care!' },
  { id: 'marble', f: 'CaCO₃', name: 'Marble chips', group: 'Metals & solids', kind: 'solid', solid: 'marble', mol: 0.01, dose: 'marble chips (1.0 g)', info: 'Calcium carbonate. Gives CO₂ with acid.' },
  { id: 'MnO2', f: 'MnO₂', name: 'Manganese dioxide', group: 'Metals & solids', kind: 'solid', solid: 'MnO2', mol: 0.0005, dose: 'a pinch of MnO₂ (0.04 g)', info: 'Catalyst for H₂O₂ decomposition.' },
];
export const STOCK_BY_ID = Object.fromEntries(STOCK.map(s => [s.id, s]));
export const GROUPS = ['Acids', 'Bases', 'Salt solutions', 'Redox reagents', 'Water & indicators', 'Metals & solids'];

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp3 = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const UI_STOPS = [[0, [205, 10, 20]], [3, [240, 80, 30]], [5, [250, 170, 20]], [6, [238, 228, 40]], [7, [70, 180, 60]], [8, [30, 150, 125]], [10, [40, 80, 205]], [12, [90, 40, 170]], [14, [112, 20, 140]]];
export function uiColor(pH) {
  pH = clamp(pH, 0, 14);
  for (let i = 1; i < UI_STOPS.length; i++) {
    const [p1, c1] = UI_STOPS[i];
    const [p0, c0] = UI_STOPS[i - 1];
    if (pH <= p1) return lerp3(c0, c1, (pH - p0) / (p1 - p0));
  }
  return UI_STOPS[UI_STOPS.length - 1][1];
}
// returns {col, f} where f scales absorbance (0 = colourless)
export function indicatorColor(k, pH) {
  if (pH == null) return null;
  if (k === 'phth') { const f = clamp((pH - 8.2) / 1.8, 0, 1); return f > 0.01 ? { col: [235, 40, 160], f } : null; }
  if (k === 'MO') return { col: lerp3([225, 35, 45], [245, 185, 35], clamp((pH - 3.1) / 1.3, 0, 1)), f: 1 };
  if (k === 'UI') return { col: uiColor(pH), f: 1 };
  return null;
}
