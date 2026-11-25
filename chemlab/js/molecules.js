// ChemLab — molecule library and VSEPR geometry builder.
// Molecules are written as atom trees: A(el, opts, ...children). The builder places every
// atom using electron-domain geometry (bonds + lone pairs), so shapes come out right by
// construction: SF4 is a see-saw, XeF4 square planar, [Cu(NH3)4]2+ square planar, etc.
import * as THREE from 'three';

export const ELEMENTS = {
  H: { name: 'Hydrogen', c: 0xf2f2f2, r: 0.31, vdw: 1.20 },
  Be: { name: 'Beryllium', c: 0xc2ff00, r: 0.96, vdw: 1.53 },
  B: { name: 'Boron', c: 0xffb5b5, r: 0.84, vdw: 1.92 },
  C: { name: 'Carbon', c: 0x4a4a4a, r: 0.76, vdw: 1.70 },
  N: { name: 'Nitrogen', c: 0x3a5cff, r: 0.71, vdw: 1.55 },
  O: { name: 'Oxygen', c: 0xff2a1a, r: 0.66, vdw: 1.52 },
  F: { name: 'Fluorine', c: 0x90e050, r: 0.57, vdw: 1.47 },
  Na: { name: 'Sodium', c: 0xab5cf2, r: 1.66, vdw: 2.27 },
  Mg: { name: 'Magnesium', c: 0x8aff00, r: 1.41, vdw: 1.73 },
  Al: { name: 'Aluminium', c: 0xbfa6a6, r: 1.21, vdw: 1.84 },
  Si: { name: 'Silicon', c: 0xf0c8a0, r: 1.11, vdw: 2.10 },
  P: { name: 'Phosphorus', c: 0xff8000, r: 1.07, vdw: 1.80 },
  S: { name: 'Sulfur', c: 0xffd21f, r: 1.05, vdw: 1.80 },
  Cl: { name: 'Chlorine', c: 0x1ff01f, r: 1.02, vdw: 1.75 },
  K: { name: 'Potassium', c: 0x8f40d4, r: 2.03, vdw: 2.75 },
  Ca: { name: 'Calcium', c: 0x3dff00, r: 1.76, vdw: 2.31 },
  Cr: { name: 'Chromium', c: 0x8a99c7, r: 1.39, vdw: 1.89, metal: true },
  Mn: { name: 'Manganese', c: 0x9c7ac7, r: 1.39, vdw: 1.97, metal: true },
  Fe: { name: 'Iron', c: 0xe06633, r: 1.32, vdw: 1.94, metal: true },
  Co: { name: 'Cobalt', c: 0xf090a0, r: 1.26, vdw: 1.92, metal: true },
  Ni: { name: 'Nickel', c: 0x50d050, r: 1.24, vdw: 1.63, metal: true },
  Cu: { name: 'Copper', c: 0xc88033, r: 1.32, vdw: 1.40, metal: true },
  Zn: { name: 'Zinc', c: 0x7d80b0, r: 1.22, vdw: 1.39, metal: true },
  Br: { name: 'Bromine', c: 0xa62929, r: 1.20, vdw: 1.85 },
  Ag: { name: 'Silver', c: 0xc0c0c0, r: 1.45, vdw: 1.72, metal: true },
  I: { name: 'Iodine', c: 0x940094, r: 1.39, vdw: 1.98 },
  Xe: { name: 'Xenon', c: 0x429eb0, r: 1.40, vdw: 2.16 },
  Pt: { name: 'Platinum', c: 0xd0d0e0, r: 1.36, vdw: 1.75, metal: true },
  Pb: { name: 'Lead', c: 0x575961, r: 1.46, vdw: 2.02, metal: true },
};
export const el = s => ELEMENTS[s] || { name: s, c: 0xff66cc, r: 1.0, vdw: 1.8 };

// ---------- tree notation ----------
export const A = (el, o = {}, ...ch) => ({ el, o, ch });
const H = () => A('H');
const X = (e, bo = 1, o = {}) => A(e, { bo, ...o });      // terminal atom
const lig = {
  H2O: () => A('O', { lp: 1 }, H(), H()),
  NH3: () => A('N', {}, H(), H(), H()),
  OH: () => A('O', { lp: 2 }, H()),
  CN: () => A('C', {}, X('N', 3)),                     // C-bound cyanide
  NCS: () => A('N', {}, A('C', { bo: 2 }, X('S', 2))), // N-bound thiocyanate
  CO: () => A('C', {}, X('O', 3)),
  Cl: () => A('Cl'),
};

// ---------- electron-domain directions ----------
const v = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
function domainSet(n) {
  const s3 = Math.sqrt(3) / 2;
  switch (n) {
    case 1: return { all: [v(1, 0, 0)], lpOrder: [0] };
    case 2: return { all: [v(1, 0, 0), v(-1, 0, 0)], lpOrder: [0, 1] };
    case 3: return { all: [v(1, 0, 0), v(-0.5, s3, 0), v(-0.5, -s3, 0)], lpOrder: [0, 1, 2] };
    case 4: return { all: [v(1, 1, 1), v(1, -1, -1), v(-1, 1, -1), v(-1, -1, 1)], lpOrder: [0, 1, 2, 3] };
    case 5: return { all: [v(1, 0, 0), v(-0.5, s3, 0), v(-0.5, -s3, 0), v(0, 0, 1), v(0, 0, -1)], lpOrder: [0, 1, 2, 3, 4] }; // lone pairs equatorial
    case 6: return { all: [v(0, 0, 1), v(0, 0, -1), v(1, 0, 0), v(-1, 0, 0), v(0, 1, 0), v(0, -1, 0)], lpOrder: [0, 1, 2, 3, 4, 5] }; // trans
    case 7: {
      const all = [v(0, 0, 1), v(0, 0, -1)];
      for (let k = 0; k < 5; k++) all.push(v(Math.cos((k * 2 * Math.PI) / 5), Math.sin((k * 2 * Math.PI) / 5), 0));
      return { all, lpOrder: [0, 1, 2, 3, 4, 5, 6] };
    }
    default: { // fibonacci sphere for big coordination numbers
      const all = [];
      for (let k = 0; k < n; k++) { const y = 1 - (2 * (k + 0.5)) / n, r = Math.sqrt(1 - y * y), t = k * 2.39996; all.push(v(Math.cos(t) * r, y, Math.sin(t) * r)); }
      return { all, lpOrder: all.map((_, i) => i) };
    }
  }
}
// split n domains into lone pairs (+ghost slots) and bonds
function domains(nBond, nLp, nGhost = 0) {
  const n = nBond + nLp + nGhost;
  if (n === 0) return { lp: [], ghost: [], bond: [] };
  const { all, lpOrder } = domainSet(n);
  const taken = lpOrder.slice(0, nLp + nGhost);
  return {
    lp: taken.slice(0, nLp).map(i => all[i].clone()),
    ghost: taken.slice(nLp).map(i => all[i].clone()),
    bond: all.filter((_, i) => !taken.includes(i)).map(d => d.clone()),
  };
}
// bent / pyramidal roots with a real bond angle (lone-pair repulsion squeezes the angle)
function squeezed(nb, nlp, angle) {
  const a = (angle * Math.PI) / 180;
  if (nb === 2 && (nlp === 1 || nlp === 2)) {
    const bond = [v(Math.sin(a / 2), 0, -Math.cos(a / 2)), v(-Math.sin(a / 2), 0, -Math.cos(a / 2))];
    const lp = nlp === 1 ? [v(0, 0, 1)] : [v(0, Math.sin(0.955), Math.cos(0.955)), v(0, -Math.sin(0.955), Math.cos(0.955))];
    return { bond, lp, ghost: [] };
  }
  if (nb === 3 && nlp === 1) {
    const th = Math.asin(Math.sqrt((1 - Math.cos(a)) / 1.5));
    const bond = [0, 1, 2].map(k => v(Math.sin(th) * Math.cos((k * 2 * Math.PI) / 3), Math.sin(th) * Math.sin((k * 2 * Math.PI) / 3), -Math.cos(th)));
    return { bond, lp: [v(0, 0, 1)], ghost: [] };
  }
  return null;
}

const bondLen = (a, b, bo) => {
  const f = bo >= 2.9 ? 0.79 : bo >= 2 ? 0.87 : bo > 1.2 ? 0.92 : 1;
  return (el(a).r + el(b).r) * f;
};

// Build atoms/bonds/lone pairs from a tree
export function buildTree(root) {
  const atoms = [], bonds = [], lps = [];
  function place(node, pos, parentIdx, toParent, sibling) {
    const idx = atoms.length;
    atoms.push({ el: node.el, pos: pos.clone(), charge: node.o.charge });
    const nb = node.ch.length + (parentIdx >= 0 ? 1 : 0);
    const nlp = node.o.lp || 0;
    let D = parentIdx < 0 && node.o.angle ? squeezed(nb, nlp, node.o.angle) : null;
    if (!D) D = domains(nb, nlp, node.o.ghost || 0);
    let bondDirs = D.bond, lpDirs = D.lp;
    if (parentIdx >= 0) {
      // rotate the domain set so bond[0] points back to the parent and bond[1] sits
      // anti to a sibling of the parent (gives staggered / planar conformations)
      const d0 = bondDirs[0], d1 = bondDirs[1] || lpDirs[0];
      const f1 = toParent.clone();
      let ref = sibling ? sibling.clone().negate() : new THREE.Vector3(0, 0, 1);
      ref.sub(f1.clone().multiplyScalar(ref.dot(f1)));
      if (ref.lengthSq() < 1e-6) { ref = new THREE.Vector3(1, 0, 0).sub(f1.clone().multiplyScalar(f1.x)); if (ref.lengthSq() < 1e-6) ref = new THREE.Vector3(0, 1, 0); }
      ref.normalize();
      const R = new THREE.Matrix4();
      if (d1) {
        const e1 = d0.clone(), e2 = d1.clone().sub(e1.clone().multiplyScalar(d1.dot(e1))).normalize(), e3 = e1.clone().cross(e2);
        const f2 = ref, f3 = f1.clone().cross(f2);
        const E = new THREE.Matrix4().makeBasis(e1, e2, e3), F = new THREE.Matrix4().makeBasis(f1, f2, f3);
        R.multiplyMatrices(F, E.clone().transpose());
      } else {
        R.makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(d0, f1));
      }
      if (node.o.twist) R.premultiply(new THREE.Matrix4().makeRotationAxis(f1, (node.o.twist * Math.PI) / 180));
      bondDirs = bondDirs.map(d => d.clone().applyMatrix4(R).normalize());
      lpDirs = lpDirs.map(d => d.clone().applyMatrix4(R).normalize());
      bondDirs.shift(); // slot used by the parent bond
    }
    for (const d of lpDirs) lps.push({ atom: idx, dir: d });
    node.ch.forEach((ch, k) => {
      const dir = bondDirs[k];
      const bo = ch.o.bo || 1;
      const cpos = pos.clone().add(dir.clone().multiplyScalar(bondLen(node.el, ch.el, bo)));
      // direction from this atom to one of its other neighbours: the child orients itself anti to it
      const sib = parentIdx >= 0 ? toParent : (bondDirs[k === 0 ? 1 : 0] || null);
      const childIdx = place(ch, cpos, idx, dir.clone().negate(), sib ? sib.clone() : null);
      bonds.push({ a: idx, b: childIdx, order: bo });
    });
    return idx;
  }
  place(root, new THREE.Vector3(), -1, null, null);
  return { atoms, bonds, lps };
}

export function buildCoords(spec) {
  return {
    atoms: spec.atoms.map(([e, x, y, z]) => ({ el: e, pos: new THREE.Vector3(x, y, z) })),
    bonds: spec.bonds.map(([a, b, order = 1]) => ({ a, b, order })),
    lps: [],
  };
}

// ---------- hand-built rings ----------
function benzene() {
  const atoms = [], bonds = [];
  for (let i = 0; i < 6; i++) { const t = (i * Math.PI) / 3; atoms.push(['C', 1.39 * Math.cos(t), 1.39 * Math.sin(t), 0]); }
  for (let i = 0; i < 6; i++) { const t = (i * Math.PI) / 3; atoms.push(['H', 2.48 * Math.cos(t), 2.48 * Math.sin(t), 0]); }
  for (let i = 0; i < 6; i++) { bonds.push([i, (i + 1) % 6, 1.5]); bonds.push([i, i + 6, 1]); }
  return { atoms, bonds };
}
function cyclohexane() {
  const atoms = [], bonds = [], r = 1.44, h = 0.25;
  for (let i = 0; i < 6; i++) { const t = (i * Math.PI) / 3; atoms.push(['C', r * Math.cos(t), r * Math.sin(t), i % 2 ? h : -h]); }
  for (let i = 0; i < 6; i++) {
    const t = (i * Math.PI) / 3, s = i % 2 ? 1 : -1;
    const [_, cx, cy, cz] = atoms[i];
    atoms.push(['H', cx, cy, cz + s * 1.09]);                                 // axial
    const d = new THREE.Vector3(Math.cos(t), Math.sin(t), -s * 0.33).normalize().multiplyScalar(1.09);
    atoms.push(['H', cx + d.x, cy + d.y, cz + d.z]);                          // equatorial
    bonds.push([i, (i + 1) % 6, 1], [i, 6 + 2 * i, 1], [i, 7 + 2 * i, 1]);
  }
  return { atoms, bonds };
}

// ---------- the library ----------
// hyb/shape are computed automatically from the central atom unless given.
export const LIBRARY = [
  // VSEPR
  { id: 'becl2', name: 'Beryllium chloride', formula: 'BeCl₂', group: 'VSEPR shapes', tree: A('Be', {}, X('Cl'), X('Cl')), note: 'Electron-deficient: only 4 electrons around Be. Polymerises in the solid state.' },
  { id: 'co2', name: 'Carbon dioxide', formula: 'CO₂', group: 'VSEPR shapes', tree: A('C', {}, X('O', 2, { lp: 2 }), X('O', 2, { lp: 2 })), note: 'Linear, so the two C=O dipoles cancel: μ = 0.' },
  { id: 'bf3', name: 'Boron trifluoride', formula: 'BF₃', group: 'VSEPR shapes', tree: A('B', {}, X('F'), X('F'), X('F')), note: 'Lewis acid (incomplete octet). Back-bonding pπ–pπ from F to B. μ = 0.' },
  { id: 'so2', name: 'Sulfur dioxide', formula: 'SO₂', group: 'VSEPR shapes', tree: A('S', { lp: 1, angle: 119 }, X('O', 2), X('O', 2)), note: 'Bent because of one lone pair on S. Polar molecule.' },
  { id: 'ch4', name: 'Methane', formula: 'CH₄', group: 'VSEPR shapes', tree: A('C', {}, H(), H(), H(), H()), note: 'The perfect tetrahedron: four bond pairs, no lone pairs.' },
  { id: 'nh3', name: 'Ammonia', formula: 'NH₃', group: 'VSEPR shapes', tree: A('N', { lp: 1, angle: 107 }, H(), H(), H()), note: 'lp–bp repulsion > bp–bp repulsion squeezes the angle from 109.5° to 107°.' },
  { id: 'h2o', name: 'Water', formula: 'H₂O', group: 'VSEPR shapes', tree: A('O', { lp: 2, angle: 104.5 }, H(), H()), note: 'Two lone pairs squeeze the angle further, to 104.5°. lp–lp > lp–bp > bp–bp.' },
  { id: 'h2s', name: 'Hydrogen sulfide', formula: 'H₂S', group: 'VSEPR shapes', tree: A('S', { lp: 2, angle: 92 }, H(), H()), note: 'Angle ≈ 92°: S uses almost pure p orbitals (Drago’s rule), unlike O in water.' },
  { id: 'pcl5', name: 'Phosphorus pentachloride', formula: 'PCl₅', group: 'VSEPR shapes', tree: A('P', {}, X('Cl'), X('Cl'), X('Cl'), X('Cl'), X('Cl')), note: 'Axial bonds (219 pm) are longer than equatorial ones (204 pm), so PCl₅ is reactive.' },
  { id: 'sf4', name: 'Sulfur tetrafluoride', formula: 'SF₄', group: 'VSEPR shapes', tree: A('S', { lp: 1 }, X('F'), X('F'), X('F'), X('F')), note: 'The lone pair takes an equatorial position (less repulsion), giving a see-saw shape.' },
  { id: 'clf3', name: 'Chlorine trifluoride', formula: 'ClF₃', group: 'VSEPR shapes', tree: A('Cl', { lp: 2 }, X('F'), X('F'), X('F')), note: 'Two equatorial lone pairs give a T-shape (F–Cl–F ≈ 87.5°).' },
  { id: 'xef2', name: 'Xenon difluoride', formula: 'XeF₂', group: 'VSEPR shapes', tree: A('Xe', { lp: 3 }, X('F'), X('F')), note: 'Three equatorial lone pairs leave the F atoms axial, so the molecule is linear.' },
  { id: 'i3', name: 'Triiodide ion', formula: 'I₃⁻', group: 'VSEPR shapes', tree: A('I', { lp: 3, charge: -1 }, X('I'), X('I')), note: 'Same shape as XeF₂ (sp³d, linear). This is the brown "iodine" in KI solution.' },
  { id: 'sf6', name: 'Sulfur hexafluoride', formula: 'SF₆', group: 'VSEPR shapes', tree: A('S', {}, X('F'), X('F'), X('F'), X('F'), X('F'), X('F')), note: 'Octahedral, all angles 90°. Very inert gas, used as an electrical insulator.' },
  { id: 'brf5', name: 'Bromine pentafluoride', formula: 'BrF₅', group: 'VSEPR shapes', tree: A('Br', { lp: 1 }, X('F'), X('F'), X('F'), X('F'), X('F')), note: 'One lone pair gives a square pyramid.' },
  { id: 'xef4', name: 'Xenon tetrafluoride', formula: 'XeF₄', group: 'VSEPR shapes', tree: A('Xe', { lp: 2 }, X('F'), X('F'), X('F'), X('F')), note: 'Two lone pairs sit trans (180° apart), leaving a square planar molecule.' },
  { id: 'xeo3', name: 'Xenon trioxide', formula: 'XeO₃', group: 'VSEPR shapes', tree: A('Xe', { lp: 1, angle: 103 }, X('O', 2), X('O', 2), X('O', 2)), note: 'Pyramidal, like NH₃. Explosive.' },
  { id: 'if7', name: 'Iodine heptafluoride', formula: 'IF₇', group: 'VSEPR shapes', tree: A('I', {}, X('F'), X('F'), X('F'), X('F'), X('F'), X('F'), X('F')), note: 'The only common pentagonal bipyramidal molecule (sp³d³).' },

  // ions in the lab
  { id: 'h3o', name: 'Hydronium ion', formula: 'H₃O⁺', group: 'Ions in the lab', tree: A('O', { lp: 1, angle: 112, charge: 1 }, H(), H(), H()), note: 'What "H⁺(aq)" really is: a proton bonded to a water molecule.' },
  { id: 'oh', name: 'Hydroxide ion', formula: 'OH⁻', group: 'Ions in the lab', tree: A('O', { lp: 3, charge: -1 }, H()), note: 'The ion that makes solutions alkaline.' },
  { id: 'nh4', name: 'Ammonium ion', formula: 'NH₄⁺', group: 'Ions in the lab', tree: A('N', { charge: 1 }, H(), H(), H(), H()), note: 'NH₃ + H⁺: the lone pair becomes the 4th N–H bond, so the shape is a perfect tetrahedron.' },
  { id: 'no3', name: 'Nitrate ion', formula: 'NO₃⁻', group: 'Ions in the lab', tree: A('N', { charge: -1 }, X('O', 1.33), X('O', 1.33), X('O', 1.33)), note: 'Resonance: each N–O bond has order 1⅓.' },
  { id: 'co3', name: 'Carbonate ion', formula: 'CO₃²⁻', group: 'Ions in the lab', tree: A('C', { charge: -2 }, X('O', 1.33), X('O', 1.33), X('O', 1.33)), note: 'Resonance-stabilised: three equal C–O bonds of order 1⅓.' },
  { id: 'so4', name: 'Sulfate ion', formula: 'SO₄²⁻', group: 'Ions in the lab', tree: A('S', { charge: -2 }, X('O', 1.5), X('O', 1.5), X('O', 1.5), X('O', 1.5)), note: 'Tetrahedral. Bond order 1.5 from resonance (pπ–dπ bonding in older models).' },
  { id: 'mno4', name: 'Permanganate ion', formula: 'MnO₄⁻', group: 'Ions in the lab', tree: A('Mn', { charge: -1 }, X('O', 1.75), X('O', 1.75), X('O', 1.75), X('O', 1.75)), note: 'Mn in +7 (d⁰). The intense purple comes from charge transfer (O → Mn), not d–d transitions.' },
  { id: 'cr2o7', name: 'Dichromate ion', formula: 'Cr₂O₇²⁻', group: 'Ions in the lab', shape: 'Two corner-sharing tetrahedra', hyb: 'sp³ (each Cr)', tree: A('O', { lp: 2, angle: 126 }, A('Cr', {}, X('O', 1.5), X('O', 1.5), X('O', 1.5)), A('Cr', {}, X('O', 1.5), X('O', 1.5), X('O', 1.5))), note: 'Two CrO₄ tetrahedra sharing one corner oxygen (Cr–O–Cr ≈ 126°). Six terminal Cr–O bonds are equivalent.' },
  { id: 'scn', name: 'Thiocyanate ion', formula: 'SCN⁻', group: 'Ions in the lab', tree: A('C', { charge: -1 }, X('S', 2), X('N', 2)), note: 'Linear ambidentate ligand: binds through S (thiocyanato) or N (isothiocyanato).' },
  { id: 'cn', name: 'Cyanide ion', formula: 'CN⁻', group: 'Ions in the lab', tree: A('C', { charge: -1, lp: 1 }, X('N', 3, { lp: 1 })), note: 'Isoelectronic with CO and N₂. A strong-field ligand.' },
  { id: 'no2', name: 'Nitrogen dioxide', formula: 'NO₂', group: 'Ions in the lab', tree: A('N', { lp: 1, angle: 134 }, X('O', 1.5), X('O', 1.5)), note: 'An odd-electron molecule (brown gas). The single unpaired electron repels less than a lone pair, so the angle is 134°. Dimerises to colourless N₂O₄.' },
  { id: 'h2o2', name: 'Hydrogen peroxide', formula: 'H₂O₂', group: 'Ions in the lab', tree: A('O', { lp: 2, angle: 95 }, H(), A('O', { lp: 2, twist: -69 }, H())), note: 'Open-book (skew) structure: dihedral angle ≈ 111° in the gas phase.' },

  // complexes
  { id: 'cu_h2o6', name: 'Hexaaquacopper(II)', formula: '[Cu(H₂O)₆]²⁺', group: 'Coordination complexes', tree: A('Cu', { charge: 2 }, lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O()), hyb: 'sp³d² (outer orbital)', note: 'The pale blue ion in CuSO₄ solution. d⁹ → Jahn–Teller distortion (axial bonds are longer).' },
  { id: 'cu_nh3_4', name: 'Tetraamminecopper(II)', formula: '[Cu(NH₃)₄]²⁺', group: 'Coordination complexes', tree: A('Cu', { ghost: 2, charge: 2 }, lig.NH3(), lig.NH3(), lig.NH3(), lig.NH3()), hyb: 'dsp² (square planar)', note: 'The deep inky-blue complex from excess ammonia. NH₃ is a stronger field ligand than H₂O, which shifts the colour.' },
  { id: 'ag_nh3_2', name: 'Diamminesilver(I)', formula: '[Ag(NH₃)₂]⁺', group: 'Coordination complexes', tree: A('Ag', { charge: 1 }, lig.NH3(), lig.NH3()), hyb: 'sp (linear)', note: 'Tollens’ reagent. Formed when AgCl dissolves in ammonia.' },
  { id: 'zn_nh3_4', name: 'Tetraamminezinc(II)', formula: '[Zn(NH₃)₄]²⁺', group: 'Coordination complexes', tree: A('Zn', { charge: 2 }, lig.NH3(), lig.NH3(), lig.NH3(), lig.NH3()), hyb: 'sp³ (tetrahedral)', note: 'Colourless: Zn²⁺ is d¹⁰, so no d–d transitions are possible.' },
  { id: 'zn_oh4', name: 'Tetrahydroxozincate(II)', formula: '[Zn(OH)₄]²⁻', group: 'Coordination complexes', tree: A('Zn', { charge: -2 }, lig.OH(), lig.OH(), lig.OH(), lig.OH()), hyb: 'sp³ (tetrahedral)', note: 'Why Zn(OH)₂ dissolves in excess NaOH (amphoteric behaviour).' },
  { id: 'fe_cn6', name: 'Hexacyanoferrate(II)', formula: '[Fe(CN)₆]⁴⁻', group: 'Coordination complexes', tree: A('Fe', { charge: -4 }, lig.CN(), lig.CN(), lig.CN(), lig.CN(), lig.CN(), lig.CN()), hyb: 'd²sp³ (inner orbital, low spin)', note: 'Ferrocyanide. CN⁻ is strong field, so Fe²⁺ (d⁶) is low spin and diamagnetic. EAN = 36 (Kr).' },
  { id: 'fe_scn', name: 'Pentaaqua(thiocyanato-N)iron(III)', formula: '[Fe(H₂O)₅(NCS)]²⁺', group: 'Coordination complexes', tree: A('Fe', { charge: 2 }, lig.NCS(), lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O()), hyb: 'sp³d² (outer orbital, high spin)', note: 'The blood-red species in the Fe³⁺ test.' },
  { id: 'fe_h2o6_3', name: 'Hexaaquairon(III)', formula: '[Fe(H₂O)₆]³⁺', group: 'Coordination complexes', tree: A('Fe', { charge: 3 }, lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O()), hyb: 'sp³d² (outer orbital, high spin)', note: 'Strongly acidic: it hydrolyses to [Fe(H₂O)₅(OH)]²⁺, which is why FeCl₃ solutions are yellow-brown and acidic.' },
  { id: 'fe_h2o6_2', name: 'Hexaaquairon(II)', formula: '[Fe(H₂O)₆]²⁺', group: 'Coordination complexes', tree: A('Fe', { charge: 2 }, lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O(), lig.H2O()), hyb: 'sp³d² (outer orbital, high spin)', note: 'Pale green. 4 unpaired electrons (μ ≈ 4.9 BM).' },
  { id: 'ni_co4', name: 'Tetracarbonylnickel(0)', formula: '[Ni(CO)₄]', group: 'Coordination complexes', tree: A('Ni', {}, lig.CO(), lig.CO(), lig.CO(), lig.CO()), hyb: 'sp³ (tetrahedral)', note: 'Ni(0) is 3d¹⁰ after the 4s electrons pair into 3d. Synergic bonding: σ-donation plus π back-donation. Used in Mond’s process.' },
  { id: 'ni_cn4', name: 'Tetracyanonickelate(II)', formula: '[Ni(CN)₄]²⁻', group: 'Coordination complexes', tree: A('Ni', { ghost: 2, charge: -2 }, lig.CN(), lig.CN(), lig.CN(), lig.CN()), hyb: 'dsp² (square planar)', note: 'Strong-field CN⁻ pairs the d⁸ electrons, so it is diamagnetic and square planar. Compare [NiCl₄]²⁻: tetrahedral and paramagnetic.' },
  { id: 'nicl4', name: 'Tetrachloronickelate(II)', formula: '[NiCl₄]²⁻', group: 'Coordination complexes', tree: A('Ni', { charge: -2 }, lig.Cl(), lig.Cl(), lig.Cl(), lig.Cl()), hyb: 'sp³ (tetrahedral)', note: 'Weak-field Cl⁻: 2 unpaired electrons, paramagnetic, tetrahedral.' },
  { id: 'co_nh3_6', name: 'Hexaamminecobalt(III)', formula: '[Co(NH₃)₆]³⁺', group: 'Coordination complexes', tree: A('Co', { charge: 3 }, lig.NH3(), lig.NH3(), lig.NH3(), lig.NH3(), lig.NH3(), lig.NH3()), hyb: 'd²sp³ (inner orbital, low spin)', note: 'Co³⁺ d⁶ low spin, so it is diamagnetic. Werner’s classic complex.' },
  { id: 'cisplatin', name: 'Cisplatin', formula: 'cis-[PtCl₂(NH₃)₂]', group: 'Coordination complexes', tree: A('Pt', { ghost: 2 }, lig.Cl(), lig.NH3(), lig.Cl(), lig.NH3()), hyb: 'dsp² (square planar)', note: 'Geometrical isomerism: the cis isomer is an anti-cancer drug, the trans isomer is not.' },

  // organic
  { id: 'ethane', name: 'Ethane', formula: 'C₂H₆', group: 'Organic', tree: A('C', {}, H(), H(), H(), A('C', {}, H(), H(), H())), note: 'Shown in the staggered conformation, the most stable (eclipsed is about 12.5 kJ/mol higher).' },
  { id: 'ethene', name: 'Ethene', formula: 'C₂H₄', group: 'Organic', tree: A('C', {}, H(), H(), A('C', { bo: 2 }, H(), H())), note: 'sp² carbons, planar. The π bond prevents rotation, which is why geometrical (cis/trans) isomers exist.' },
  { id: 'ethyne', name: 'Ethyne (acetylene)', formula: 'C₂H₂', group: 'Organic', tree: A('C', {}, H(), A('C', { bo: 3 }, H())), note: 'sp carbons, linear. Terminal H is weakly acidic (50% s-character).' },
  { id: 'methanol', name: 'Methanol', formula: 'CH₃OH', group: 'Organic', tree: A('C', {}, H(), H(), H(), A('O', { lp: 2 }, H())), note: 'C–O–H angle ≈ 108.9°.' },
  { id: 'ethanol', name: 'Ethanol', formula: 'C₂H₅OH', group: 'Organic', tree: A('C', {}, H(), H(), H(), A('C', {}, H(), H(), A('O', { lp: 2 }, H()))), note: 'Hydrogen bonding gives it a much higher boiling point (78 °C) than its isomer dimethyl ether (−24 °C).' },
  { id: 'hcho', name: 'Formaldehyde', formula: 'HCHO', group: 'Organic', tree: A('C', {}, H(), H(), X('O', 2, { lp: 2 })), note: 'Trigonal planar carbonyl. Gives a silver mirror with Tollens’ reagent.' },
  { id: 'acetic', name: 'Acetic acid', formula: 'CH₃COOH', group: 'Organic', tree: A('C', {}, H(), H(), H(), A('C', {}, X('O', 2, { lp: 2 }), A('O', { lp: 2 }, H()))), note: 'Ethanoic acid (vinegar). pKa = 4.76. Forms H-bonded dimers.' },
  { id: 'acetone', name: 'Acetone', formula: '(CH₃)₂CO', group: 'Organic', tree: A('C', {}, X('O', 2, { lp: 2 }), A('C', {}, H(), H(), H()), A('C', {}, H(), H(), H())), note: 'Propanone. Gives the iodoform test (CH₃CO– group).' },
  { id: 'hcn', name: 'Hydrogen cyanide', formula: 'HCN', group: 'Organic', tree: A('C', {}, H(), X('N', 3, { lp: 1 })), note: 'Linear, sp carbon. Highly toxic.' },
  { id: 'benzene', name: 'Benzene', formula: 'C₆H₆', group: 'Organic', coords: benzene(), shape: 'Planar hexagon', hyb: 'sp² (each C)', angle: '120°', note: 'All six C–C bonds are equal (139 pm, between single 154 and double 134) because of delocalised π electrons (aromaticity, Hückel 4n+2 = 6).' },
  { id: 'cyclohexane', name: 'Cyclohexane (chair)', formula: 'C₆H₁₂', group: 'Organic', coords: cyclohexane(), shape: 'Chair conformation', hyb: 'sp³ (each C)', angle: '≈111°', note: 'The chair is strain-free. Each carbon has one axial H (vertical) and one equatorial H (around the ring). Bulky groups prefer equatorial positions.' },
];
export const MOL_BY_ID = Object.fromEntries(LIBRARY.map(m => [m.id, m]));

// lab species → molecule
export const SPECIES_MOL = {
  'Cu2+': 'cu_h2o6', 'CuNH3': 'cu_nh3_4', 'AgNH3': 'ag_nh3_2', 'ZnNH3': 'zn_nh3_4', 'ZnOH4': 'zn_oh4',
  'FeCN6': 'fe_cn6', 'FeSCN': 'fe_scn', 'Fe3+': 'fe_h2o6_3', 'Fe2+': 'fe_h2o6_2', 'NH3': 'nh3', 'NH4+': 'nh4',
  'H+': 'h3o', 'OH-': 'oh', 'SO4': 'so4', 'NO3': 'no3', 'CO3': 'co3', 'MnO4-': 'mno4', 'Cr2O7': 'cr2o7',
  'SCN-': 'scn', 'H2O2': 'h2o2', 'I2': 'i3', 'CO2': 'co2',
};
export const GAS_MOL = { CO2: 'co2', NH3: 'nh3', NO2: 'no2', H2S: 'h2s' };

// ---------- analysis of the central atom ----------
const SHAPES = {
  '2,0': 'Linear', '3,0': 'Trigonal planar', '2,1': 'Bent (V-shaped)', '4,0': 'Tetrahedral', '3,1': 'Trigonal pyramidal',
  '2,2': 'Bent (V-shaped)', '5,0': 'Trigonal bipyramidal', '4,1': 'See-saw', '3,2': 'T-shaped', '2,3': 'Linear',
  '6,0': 'Octahedral', '5,1': 'Square pyramidal', '4,2': 'Square planar', '7,0': 'Pentagonal bipyramidal', '1,0': 'Linear', '1,1': 'Linear', '1,2': 'Linear', '1,3': 'Linear',
};
const HYB = { 2: 'sp', 3: 'sp²', 4: 'sp³', 5: 'sp³d', 6: 'sp³d²', 7: 'sp³d³' };
export function analyse(mol, data) {
  if (!mol.tree) return { shape: mol.shape, hyb: mol.hyb, angle: mol.angle, lp: null };
  const root = mol.tree;
  const nb = root.ch.length, nlp = root.o.lp || 0, ng = root.o.ghost || 0;
  const shape = mol.shape || SHAPES[`${nb},${nlp + ng}`] || `${nb}-coordinate`;
  const hyb = mol.hyb || HYB[nb + nlp] || '—';
  // measure the real angles around atom 0
  const c = data.atoms[0].pos;
  const nbrs = data.bonds.filter(b => b.a === 0).map(b => data.atoms[b.b].pos.clone().sub(c).normalize());
  const set = new Set();
  for (let i = 0; i < nbrs.length; i++) for (let j = i + 1; j < nbrs.length; j++) set.add(Math.round((Math.acos(Math.min(1, Math.max(-1, nbrs[i].dot(nbrs[j])))) * 180) / Math.PI * 2) / 2);
  let angles = [...set].sort((a, b) => a - b);
  if (angles.length > 1) angles = angles.filter(a => a < 179);
  return { shape, hyb, angle: angles.length ? angles.map(a => `${a}°`).join(', ') : '—', lp: nlp, central: root.el };
}

// ---------- PubChem (any molecule by name) ----------
export async function fetchPubChem(name) {
  const base = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/' + encodeURIComponent(name.trim());
  let sdf = null, flat = false;
  const r3 = await fetch(base + '/SDF?record_type=3d');
  if (r3.ok) sdf = await r3.text();
  else {
    const r2 = await fetch(base + '/SDF');
    if (!r2.ok) throw new Error(r2.status === 404 ? `PubChem has no compound called “${name}”.` : `PubChem error ${r2.status}`);
    sdf = await r2.text(); flat = true;
  }
  let props = {};
  try {
    const rp = await fetch(base + '/property/Title,MolecularFormula,MolecularWeight,IUPACName/JSON');
    if (rp.ok) props = (await rp.json()).PropertyTable.Properties[0];
  } catch { /* optional */ }
  return { data: parseSDF(sdf), props, flat };
}
export function parseSDF(text) {
  const L = text.split(/\r?\n/);
  const na = parseInt(L[3].slice(0, 3)), nbd = parseInt(L[3].slice(3, 6));
  const atoms = [], bonds = [];
  for (let i = 0; i < na; i++) {
    const s = L[4 + i];
    atoms.push({ el: s.slice(31, 34).trim(), pos: new THREE.Vector3(parseFloat(s.slice(0, 10)), parseFloat(s.slice(10, 20)), parseFloat(s.slice(20, 30))) });
  }
  for (let i = 0; i < nbd; i++) {
    const s = L[4 + na + i];
    const o = parseInt(s.slice(6, 9));
    bonds.push({ a: parseInt(s.slice(0, 3)) - 1, b: parseInt(s.slice(3, 6)) - 1, order: o === 4 ? 1.5 : o });
  }
  for (const s of L) if (s.startsWith('M  CHG')) {
    const p = s.slice(6).trim().split(/\s+/).map(Number);
    for (let k = 1; k + 1 < p.length; k += 2) atoms[p[k] - 1].charge = p[k + 1];
  }
  return { atoms, bonds, lps: [] };
}

export function hillFormula(atoms) {
  const n = {};
  for (const a of atoms) n[a.el] = (n[a.el] || 0) + 1;
  const sub = x => (x > 1 ? String(x).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]) : '');
  const keys = Object.keys(n).sort();
  const order = n.C ? ['C', ...(n.H ? ['H'] : []), ...keys.filter(k => k !== 'C' && k !== 'H')] : keys;
  return order.map(k => k + sub(n[k])).join('');
}
