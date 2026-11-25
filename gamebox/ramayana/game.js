// Ramayana: The Journey — an open-world 3D adventure (three.js)
// World runs north (Ayodhya, -z) to south (Lanka, +z).
import * as THREE from 'three';

// ================= utils =================
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(20261125);
const perm = new Uint8Array(512);
{ const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const hash = (i, j) => perm[(perm[i & 255] + (j & 255)) & 511] / 255;
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v) * 2 - 1;
}
function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s; }
function angLerp(a, b, t) { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; }
const hyp = Math.hypot;
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } }

// ================= renderer / scene =================
const isTouch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.25 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !isTouch;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.3, 2400);
scene.background = new THREE.Color(0x9fd0ec);
scene.fog = new THREE.Fog(0x9fd0ec, 140, 950);
const hemi = new THREE.HemisphereLight(0xd8ecff, 0x6a6a3a, 1.0);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 500 });
sun.shadow.bias = -0.0006;
scene.add(hemi, sun, sun.target);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// materials
const matCache = new Map();
function M(color, opts) {
  const k = color + (opts ? JSON.stringify(opts) : '');
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color, flatShading: true, ...(opts || {}) }));
  return matCache.get(k);
}
const GOLD = new THREE.MeshPhongMaterial({ color: 0xf2c14e, shininess: 90, specular: 0xffeeaa, flatShading: true, emissive: 0x3a2600 });
const GLOW = (c) => new THREE.MeshBasicMaterial({ color: c });
function mk(geo, mat, x = 0, y = 0, z = 0, parent = null, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  if (parent) parent.add(m);
  return m;
}

// ================= world layout =================
const HALF = 850, N = 272, STEP = (HALF * 2) / N;
const LOC = {
  start: [0, -598], palace: [0, -660], dasharatha: [0, -628],
  ashram: [60, -260], agastya: [62, -262], panchavati: [170, -40], hut: [176, -46],
  jatayu: [70, 118], hanuman: [-140, 172], arena: [-250, 260],
  setu: [0, 392], lanka: [0, 705], fort: [0, 715], ravana: [0, 708], grove: [44, 748],
};
function coastZ(x) { return 400 + Math.sin(x * 0.013) * 15 + vnoise(x * 0.01, 3.3) * 10; }
const riverZ = (x) => -400 + Math.sin(x * 0.011) * 18;
const ROADS = [
  [[0, -560], [0, -470], [0, -400], [20, -330], [60, -282], [90, -200], [140, -110], [170, -64], [150, 20], [100, 80], [64, 118],
    [-20, 160], [-120, 172], [-160, 205], [-205, 245], [-160, 300], [-100, 300], [-40, 345], [0, 385]],
  [[0, 555], [0, 640]],
];
function roadDist(x, z) {
  let best = 1e9;
  for (const r of ROADS) for (let i = 0; i < r.length - 1; i++) {
    const [ax, az] = r[i], [bx, bz] = r[i + 1], dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    const d = hyp(x - ax - dx * t, z - az - dz * t); if (d < best) best = d;
  }
  return best;
}
function flat(h, x, z, cx, cz, r, fall, t) { return lerp(h, t, 1 - smooth(r, r + fall, hyp(x - cx, z - cz))); }
function rawHeight(x, z) {
  let h = 6 + fbm(x * 0.0032 + 10.3, z * 0.0032 - 7.1) * 13 + fbm(x * 0.021, z * 0.021, 2) * 1.4;
  const dk = hyp(x + 260, z - 250);
  h += (1 - smooth(50, 250, dk)) * (24 + fbm(x * 0.016 + 3, z * 0.016, 3) * 20);
  const ax = Math.abs(x); if (ax > 600) h += (ax - 600) * 0.55 * (1 + fbm(x * 0.01, z * 0.01, 2) * 0.5);
  if (z < -700) h += (-700 - z) * 0.6 * (1 + fbm(x * 0.01, z * 0.01, 2) * 0.5);
  h = flat(h, x, z, 0, -610, 150, 50, 5);
  h = flat(h, x, z, 60, -260, 30, 30, 5);
  h = flat(h, x, z, 170, -40, 34, 30, 4);
  h = flat(h, x, z, -250, 260, 26, 22, 24);
  const rd = roadDist(x, z), rm = 1 - smooth(3, 10, rd);
  if (rm > 0) h = lerp(h, Math.max(h, 1.6), rm);
  h = lerp(h, -1.1, 1 - smooth(7, 17, Math.abs(z - riverZ(x))));
  const cz = coastZ(x);
  h = lerp(h, 1.4, smooth(cz - 90, cz - 10, z));
  h = lerp(h, -14, smooth(cz, cz + 55, z));
  const dl = hyp(x, z - 705), isl = 1 - smooth(115, 175, dl);
  if (isl > 0) {
    let lh = 6 + fbm(x * 0.02 + 5, z * 0.02, 3) * 5 + (1 - smooth(10, 75, hyp(x, z - 850))) * 40;
    lh = flat(lh, x, z, 0, 715, 88, 18, 7);
    h = lerp(h, lh, isl);
  }
  return h;
}

// ================= terrain =================
const H = new Float32Array((N + 1) * (N + 1));
const mapRGB = new Uint8ClampedArray((N + 1) * (N + 1) * 4);
let terrainMesh;
function terrainH(x, z) {
  const fx = (x + HALF) / STEP, fz = (z + HALF) / STEP;
  const ix = clamp(Math.floor(fx), 0, N - 1), iz = clamp(Math.floor(fz), 0, N - 1);
  const tx = clamp(fx - ix, 0, 1), tz = clamp(fz - iz, 0, 1), W = N + 1;
  const a = H[iz * W + ix], b = H[(iz + 1) * W + ix], c = H[(iz + 1) * W + ix + 1], d = H[iz * W + ix + 1];
  if (tx + tz <= 1) return a + (d - a) * tx + (b - a) * tz;
  return c + (b - c) * (1 - tx) + (d - c) * (1 - tz);
}
const platforms = [];
function groundAt(x, z) {
  let h = terrainH(x, z);
  for (const p of platforms) if (p.on && x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 && p.y > h) h = p.y;
  return h;
}
const isDeep = (x, z) => groundAt(x, z) < -1.4;

function groundColor(x, z, h, ny, rd) {
  const n = vnoise(x * 0.09, z * 0.09) * 0.035;
  const dl = hyp(x, z - 705), lankaF = 1 - smooth(120, 180, dl);
  let c;
  if (h < -0.3) { const t = clamp(-h / 14, 0, 1); c = [lerp(0.74, 0.2, t), lerp(0.68, 0.42, t), lerp(0.5, 0.5, t)]; }
  else if (h < 2.3 && (z > 300 || lankaF > 0.3 || Math.abs(z - riverZ(x)) < 22)) c = [0.88, 0.8, 0.57];
  else {
    const forest = smooth(-420, -360, z) * (1 - smooth(160, 240, z));
    c = [lerp(0.44, 0.22, forest), lerp(0.64, 0.46, forest), lerp(0.25, 0.17, forest)];
    if (lankaF > 0) { const red = smooth(-0.2, 0.4, vnoise(x * 0.03, z * 0.03)); c = [lerp(c[0], lerp(0.32, 0.56, red), lankaF), lerp(c[1], lerp(0.42, 0.32, red), lankaF), lerp(c[2], lerp(0.18, 0.22, red), lankaF)]; }
    if (ny < 0.8 || h > 26) c = [0.64, 0.52, 0.37];
    if (h > 46) c = [0.56, 0.54, 0.52];
    if (h > 78) c = [0.95, 0.95, 0.97];
  }
  if (rd < 4.5 && h > 0) { const t = 1 - smooth(2.4, 4.5, rd); c = [lerp(c[0], 0.7, t), lerp(c[1], 0.57, t), lerp(c[2], 0.4, t)]; }
  if (Math.abs(x) < 118 && Math.abs(z + 610) < 118) c = Math.abs(x) < 9 ? [0.9, 0.82, 0.66] : [0.8, 0.7, 0.54];
  if (hyp(x, z - 715) < 80) c = hyp(x - 44, z - 748) < 18 ? [0.3, 0.5, 0.2] : [0.42, 0.36, 0.37];
  return [c[0] + n, c[1] + n, c[2] + n];
}

function buildTerrain() {
  const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, N, N);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const h = rawHeight(pos.getX(i), pos.getZ(i)); pos.setY(i, h); H[i] = h; }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal, cols = new Float32Array(pos.count * 3), col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = H[i];
    const [r, g, b] = groundColor(x, z, h, nrm.getY(i), roadDist(x, z));
    col.setRGB(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1), THREE.SRGBColorSpace);
    cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
    let mr = r, mg = g, mb = b;
    if (h < 0) { const t = clamp(0.55 + -h / 20, 0, 0.9); mr = lerp(r, 0.16, t); mg = lerp(g, 0.45, t); mb = lerp(b, 0.72, t); }
    mapRGB[i * 4] = mr * 255; mapRGB[i * 4 + 1] = mg * 255; mapRGB[i * 4 + 2] = mb * 255; mapRGB[i * 4 + 3] = 255;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  terrainMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshPhongMaterial({ color: 0x2b86c4, transparent: true, opacity: 0.8, shininess: 120, specular: 0xaad8ff }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0; water.receiveShadow = true;
  scene.add(water); world.water = water;
}

// ================= colliders =================
const CELL = 12, grid = new Map();
const gkey = (cx, cz) => (cx + 500) * 1000 + (cz + 500);
function addCol(c) {
  let x0, x1, z0, z1;
  if (c.r != null) { x0 = c.x - c.r; x1 = c.x + c.r; z0 = c.z - c.r; z1 = c.z + c.r; } else ({ x0, x1, z0, z1 } = c);
  for (let cx = Math.floor((x0 - 2) / CELL); cx <= Math.floor((x1 + 2) / CELL); cx++)
    for (let cz = Math.floor((z0 - 2) / CELL); cz <= Math.floor((z1 + 2) / CELL); cz++) {
      const k = gkey(cx, cz); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(c);
    }
  return c;
}
function collide(p, r) {
  const a = grid.get(gkey(Math.floor(p.x / CELL), Math.floor(p.z / CELL))); if (!a) return;
  for (const c of a) {
    if (c.off) continue;
    if (c.r != null) {
      const dx = p.x - c.x, dz = p.z - c.z, d = hyp(dx, dz), m = r + c.r;
      if (d < m && d > 1e-4) { p.x = c.x + (dx / d) * m; p.z = c.z + (dz / d) * m; }
    } else {
      const qx = clamp(p.x, c.x0, c.x1), qz = clamp(p.z, c.z0, c.z1), dx = p.x - qx, dz = p.z - qz, d = hyp(dx, dz);
      if (d < r) {
        if (d > 1e-4) { p.x = qx + (dx / d) * r; p.z = qz + (dz / d) * r; }
        else { const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, rr, t, b);
          if (m === l) p.x = c.x0 - r; else if (m === rr) p.x = c.x1 + r; else if (m === t) p.z = c.z0 - r; else p.z = c.z1 + r; }
      }
    }
  }
}
function moveEntity(p, dx, dz, r) {
  const nx = p.x + dx, nz = p.z + dz;
  if (!isDeep(nx, nz)) { p.x = nx; p.z = nz; } else if (!isDeep(nx, p.z)) p.x = nx; else if (!isDeep(p.x, nz)) p.z = nz;
  collide(p, r);
  p.x = clamp(p.x, -800, 800); p.z = clamp(p.z, -800, 860);
}
function boxCol(cx, cz, w, d) { return addCol({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 }); }

// ================= characters =================
const G = {
  leg: (() => { const g = new THREE.CylinderGeometry(0.12, 0.1, 0.88, 6); g.translate(0, -0.44, 0); return g; })(),
  arm: (() => { const g = new THREE.CylinderGeometry(0.085, 0.07, 0.7, 6); g.translate(0, -0.35, 0); return g; })(),
  foot: new THREE.BoxGeometry(0.16, 0.08, 0.28),
  head: new THREE.SphereGeometry(0.2, 10, 8),
  eye: new THREE.SphereGeometry(0.028, 5, 4),
  hair: new THREE.SphereGeometry(0.215, 10, 6, 0, TAU, 0, Math.PI / 1.9),
  torso: new THREE.CylinderGeometry(0.3, 0.23, 0.62, 8),
  dhoti: new THREE.CylinderGeometry(0.27, 0.32, 0.46, 8),
  skirt: new THREE.CylinderGeometry(0.24, 0.44, 0.98, 10),
  crownBase: new THREE.CylinderGeometry(0.14, 0.2, 0.3, 8),
  crownTip: new THREE.ConeGeometry(0.07, 0.2, 6),
  neck: new THREE.TorusGeometry(0.2, 0.035, 5, 12),
  bangle: new THREE.TorusGeometry(0.085, 0.025, 4, 8),
  beard: new THREE.ConeGeometry(0.15, 0.36, 6),
  horn: new THREE.ConeGeometry(0.06, 0.28, 5),
  tusk: new THREE.ConeGeometry(0.025, 0.12, 4),
};
function makeChar(o) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.scale.setScalar(o.scale || 1);
  const skin = M(o.skin), cloth = M(o.cloth), top = o.top != null ? M(o.top) : skin;
  const legs = [], arms = [];
  for (const sx of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0.14 * sx, 0.92, 0); body.add(p);
    mk(G.leg, o.legCol ? M(o.legCol) : skin, 0, 0, 0, p); mk(G.foot, o.legCol ? M(o.legCol) : skin, 0, -0.86, 0.06, p); legs.push(p);
  }
  if (o.skirt) mk(G.skirt, cloth, 0, 0.5, 0, body); else mk(G.dhoti, cloth, 0, 0.86, 0, body);
  mk(G.torso, top, 0, 1.36, 0, body);
  if (o.jewel !== false) { const nk = mk(G.neck, GOLD, 0, 1.6, 0.02, body); nk.rotation.x = Math.PI / 2.3; }
  if (o.sash) { const s = mk(new THREE.BoxGeometry(0.08, 0.75, 0.62), M(o.sash), 0, 1.36, 0, body); s.rotation.z = 0.7; s.scale.set(1, 1, 1.02); }
  for (const sx of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0.38 * sx, 1.6, 0); body.add(p);
    mk(G.arm, skin, 0, 0, 0, p); if (o.jewel !== false) { const b = mk(G.bangle, GOLD, 0, -0.55, 0, p); b.rotation.x = Math.PI / 2; }
    p.rotation.z = 0.08 * sx; arms.push(p);
  }
  const head = new THREE.Group(); head.position.set(0, 1.88, 0); body.add(head);
  const heads = o.heads || 1, eyeMat = o.eye ? GLOW(o.eye) : M(0x141018);
  for (let i = 0; i < heads; i++) {
    const hx = heads === 1 ? 0 : (i - (heads - 1) / 2) * 0.27, hs = heads === 1 ? 1 : (Math.abs(i - (heads - 1) / 2) < 1 ? 1.08 : 0.92);
    const hg = new THREE.Group(); hg.position.set(hx, heads === 1 ? 0 : -Math.abs(hx) * 0.12, heads === 1 ? 0 : -Math.abs(hx) * 0.1); hg.scale.setScalar(hs); head.add(hg);
    mk(G.head, o.face ? M(o.face) : skin, 0, 0, 0, hg);
    for (const sx of [-1, 1]) mk(G.eye, eyeMat, 0.07 * sx, 0.03, 0.175, hg, false);
    if (o.hair) mk(G.hair, M(o.hair), 0, 0.02, -0.02, hg);
    if (o.crown) { mk(G.crownBase, GOLD, 0, 0.27, 0, hg); mk(G.crownTip, GOLD, 0, 0.5, 0, hg); }
    if (o.beard) { const b = mk(G.beard, M(o.beard), 0, -0.2, 0.09, hg); b.rotation.x = Math.PI + 0.25; }
    if (o.horns) for (const sx of [-1, 1]) { const h = mk(G.horn, M(0xe8dcc0), 0.13 * sx, 0.2, 0, hg); h.rotation.z = -0.5 * sx; }
    if (o.tusks) for (const sx of [-1, 1]) { const t = mk(G.tusk, M(0xf4f0e0), 0.06 * sx, -0.1, 0.17, hg); t.rotation.x = Math.PI; }
    if (o.muzzle) mk(new THREE.SphereGeometry(0.12, 8, 6), M(o.muzzle), 0, -0.06, 0.13, hg);
  }
  if (o.longHair) mk(new THREE.BoxGeometry(0.36, 0.7, 0.12), M(o.hair || 0x1a1010), 0, 1.6, -0.2, body);
  g.userData = { legs, arms, head, body, phase: Math.random() * 6, scale: o.scale || 1 };
  return g;
}
function animChar(g, speed, dt) {
  const u = g.userData; if (!u.legs) return;
  u.phase += dt * (speed * 1.5 / (u.scale || 1) + 0.0001);
  const sw = Math.min(1, speed / 4) * 0.75, s = Math.sin(u.phase) * sw;
  u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s;
  if (!u.pose) { u.arms[0].rotation.x = -s * 0.8; u.arms[1].rotation.x = s * 0.8; }
  u.body.position.y = Math.abs(Math.cos(u.phase)) * 0.06 * sw * (u.scale || 1);
}
function makeBow(r = 0.75) {
  const g = new THREE.Group(), arc = Math.PI * 0.75;
  const bow = mk(new THREE.TorusGeometry(r, 0.035, 4, 16, arc), GOLD, -r, 0, 0, g); bow.rotation.z = -arc / 2;
  // torus rotation shifts around its own origin, so place the grip back at the group origin
  bow.position.set(-r, 0, 0);
  const str = mk(new THREE.CylinderGeometry(0.006, 0.006, 2 * r * Math.sin(arc / 2), 3), M(0xf8f4e8), -r + r * Math.cos(arc / 2), 0, 0, g, false);
  g.rotation.y = -Math.PI / 2;
  g.userData.str = str;
  return g;
}
function makeRama() {
  const g = makeChar({ skin: 0x4a76bd, cloth: 0xf5c518, top: 0x4a76bd, crown: true, hair: 0x141018, sash: 0xffe07a });
  const holder = new THREE.Group(); holder.position.set(0, -0.66, 0.05); holder.add(makeBow()); g.userData.arms[1].add(holder); g.userData.bowHolder = holder;
  const q = mk(new THREE.CylinderGeometry(0.1, 0.09, 0.7, 7), M(0x7a4a22), 0.15, 1.45, -0.3, g.userData.body); q.rotation.z = 0.35;
  for (let i = 0; i < 3; i++) { const a = mk(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 3), M(0xe6d6b0), 0.28 + i * 0.03, 1.85, -0.3 + i * 0.03, g.userData.body); a.rotation.z = 0.35; }
  return g;
}
function makeMonkey(o) {
  const g = makeChar({ skin: o.fur, cloth: o.cloth, face: o.face, muzzle: o.face, crown: o.crown, scale: o.scale || 1, jewel: !!o.crown, hair: o.fur });
  const pts = [[0, 0.85, -0.22], [0, 0.6, -0.6], [0, 0.9, -1.0], [0, 1.6, -1.05], [0, 1.9, -0.75]].map((p) => new THREE.Vector3(...p));
  mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.05, 5), M(o.fur), 0, 0, 0, g.userData.body);
  if (o.mace) {
    const m = new THREE.Group(); m.position.set(0, -0.66, 0.1); g.userData.arms[0].add(m);
    mk(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5), GOLD, 0, 0.25, 0, m); mk(new THREE.SphereGeometry(0.22, 8, 6), GOLD, 0, 0.7, 0, m);
  }
  return g;
}
function makeRakshasa(scaleMul = 1) {
  const skins = [0x4a2f5e, 0x3a4a2e, 0x5e2f2f, 0x2f3e5e];
  const g = makeChar({ skin: skins[Math.floor(Math.random() * 4)], cloth: 0x6a0f12, scale: 1.22 * scaleMul, hair: 0x101010, horns: true, tusks: true, eye: 0xff3a1a, jewel: false });
  const club = new THREE.Group(); club.position.set(0, -0.66, 0.05); g.userData.arms[0].add(club);
  mk(new THREE.CylinderGeometry(0.11, 0.04, 0.9, 6), M(0x3a2414), 0, 0.3, 0.15, club).rotation.x = 0.4;
  return g;
}
function makeRavana() {
  const g = makeChar({ skin: 0x5b3d55, cloth: 0x8a1018, top: 0x7a1a20, scale: 2.35, heads: 10, crown: true, hair: 0x101010, eye: 0xffb020, sash: 0xf2c14e });
  const b = g.userData.body;
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    const p = new THREE.Group(); p.position.set(0.36 * sx, 1.55 - k * 0.05, -0.05 - k * 0.04); b.add(p);
    mk(G.arm, M(0x5b3d55), 0, 0, 0, p); p.rotation.z = (0.5 + k * 0.35) * sx; p.rotation.x = -0.3 - k * 0.2;
    mk(new THREE.BoxGeometry(0.04, 0.9, 0.09), M(0xd8dde4), 0, -1.05, 0, p);
  }
  const weak = mk(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.95 }), 0, 1.14, 0.25, b, false);
  weak.visible = false; g.userData.weak = weak;
  return g;
}
function makeDeer() {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  const goldDeer = new THREE.MeshPhongMaterial({ color: 0xffc634, emissive: 0x6a4300, shininess: 80, specular: 0xffffff, flatShading: true });
  const body = mk(new THREE.SphereGeometry(0.5, 10, 8), goldDeer, 0, 1.15, 0, b); body.scale.set(0.75, 0.72, 1.5);
  const legs = [];
  for (const [x, z] of [[-0.2, 0.5], [0.2, 0.5], [-0.2, -0.5], [0.2, -0.5]]) {
    const p = new THREE.Group(); p.position.set(x, 1.0, z); b.add(p); mk(new THREE.CylinderGeometry(0.05, 0.035, 1.0, 5), goldDeer, 0, -0.5, 0, p); legs.push(p);
  }
  const neck = mk(new THREE.CylinderGeometry(0.1, 0.14, 0.65, 6), goldDeer, 0, 1.55, 0.62, b); neck.rotation.x = 0.5;
  const hd = new THREE.Group(); hd.position.set(0, 1.85, 0.82); b.add(hd);
  mk(new THREE.SphereGeometry(0.15, 8, 6), goldDeer, 0, 0, 0.05, hd).scale.set(1, 0.9, 1.5);
  for (const sx of [-1, 1]) { const a = mk(new THREE.CylinderGeometry(0.015, 0.02, 0.4, 3), GOLD, 0.08 * sx, 0.3, -0.05, hd); a.rotation.z = -0.35 * sx; mk(G.eye, M(0x111111), 0.08 * sx, 0.04, 0.18, hd, false); }
  for (let i = 0; i < 10; i++) mk(new THREE.SphereGeometry(0.05, 5, 4), GLOW(0xf4f6ff), (Math.random() - 0.5) * 0.6, 1.2 + Math.random() * 0.3, (Math.random() - 0.5) * 1.2, b, false);
  g.userData = { legs: [legs[0], legs[3]], arms: [legs[1], legs[2]], body: b, phase: 0, scale: 0.6 };
  return g;
}
function makeJatayu() {
  const g = new THREE.Group(); const brown = M(0x6a4a2a), white = M(0xeeeae0);
  mk(new THREE.SphereGeometry(0.9, 10, 8), brown, 0, 0.6, 0, g).scale.set(1, 0.6, 1.5);
  for (const sx of [-1, 1]) { const w = mk(new THREE.BoxGeometry(3.2, 0.08, 1.3), brown, 1.9 * sx, 0.35, -0.1, g); w.rotation.z = 0.12 * sx; w.rotation.y = 0.2 * sx; }
  mk(new THREE.CylinderGeometry(0.18, 0.3, 0.9, 7), white, 0, 1.0, 1.0, g).rotation.x = 1.0;
  const hd = mk(new THREE.SphereGeometry(0.28, 8, 6), white, 0, 1.25, 1.45, g);
  const beak = mk(new THREE.ConeGeometry(0.1, 0.4, 5), M(0xe8b830), 0, 1.2, 1.78, g); beak.rotation.x = Math.PI / 2 + 0.4;
  for (const sx of [-1, 1]) mk(G.eye, M(0x111111), 0.15 * sx, 1.3, 1.62, g, false);
  mk(new THREE.CylinderGeometry(0.12, 0.2, 0.25, 8), GOLD, 0, 1.5, 1.42, g);
  g.userData = {}; return g;
}
function makeVimana() {
  const g = new THREE.Group();
  mk(new THREE.SphereGeometry(2.2, 12, 8), GOLD, 0, 0, 0, g).scale.set(1.1, 0.45, 2.4);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mk(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6), GOLD, 1.3 * sx, 1.3, 2.2 * sz, g);
  mk(new THREE.BoxGeometry(3, 0.2, 5.2), M(0xb5161e), 0, 2.4, 0, g);
  mk(new THREE.SphereGeometry(1.4, 10, 6, 0, TAU, 0, Math.PI / 2), GOLD, 0, 2.5, 0, g);
  mk(new THREE.ConeGeometry(0.3, 1.2, 6), GOLD, 0, 4.2, 0, g);
  for (const sx of [-1, 1]) { const w = mk(new THREE.BoxGeometry(3.5, 0.1, 1.2), M(0xf2e0b0), 2.6 * sx, 0.3, 0, g); w.rotation.z = 0.2 * sx; }
  return g;
}

// ================= world objects =================
const world = { water: null, clouds: null, diyas: null, bridge: [], bStart: 0, bEnd: 0, flames: [], stones: [], lotuses: [], fireworks: [], vimana: null };

function scatterTrees() {
  const tr = rng(77);
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 1, 6); trunkGeo.translate(0, 0.5, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1, 0);
  const palmGeo = new THREE.ConeGeometry(1, 0.6, 7); palmGeo.translate(0, -0.3, 0);
  const MAX = 3600;
  const trunks = new THREE.InstancedMesh(trunkGeo, M(0x6b4a2b), MAX);
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial({ flatShading: true }), MAX);
  const palms = new THREE.InstancedMesh(palmGeo, new THREE.MeshLambertMaterial({ flatShading: true }), 900);
  let nt = 0, nc = 0, np = 0;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  function put(x, z, kind, sc, colorHex) {
    const h = terrainH(x, z);
    if (kind === 'palm') {
      const th = 5 + sc * 3;
      m4.compose(p.set(x, h, z), q.identity(), s.set(0.6, th, 0.6)); trunks.setMatrixAt(nt++, m4);
      m4.compose(p.set(x, h + th, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tr() * 6), s.set(2.6 + sc, 1.2, 2.6 + sc)); palms.setMatrixAt(np, m4);
      palms.setColorAt(np++, col.set(colorHex || 0x3d7a2a));
    } else {
      const th = 2.2 + sc * 2.2, cr = 1.8 + sc * 1.8;
      m4.compose(p.set(x, h, z), q.identity(), s.set(1 + sc * 0.4, th, 1 + sc * 0.4)); trunks.setMatrixAt(nt++, m4);
      m4.compose(p.set(x, h + th + cr * 0.6, z), q.setFromEuler(new THREE.Euler(tr(), tr() * 6, tr())), s.set(cr, cr * (0.85 + tr() * 0.3), cr)); crowns.setMatrixAt(nc, m4);
      const base = colorHex != null ? colorHex : [0x2f6b26, 0x3b7f2c, 0x4c8a30, 0x2b5e24, 0x5a8f34][Math.floor(tr() * 5)];
      crowns.setColorAt(nc++, col.set(base).offsetHSL(0, 0, (tr() - 0.5) * 0.06));
    }
    addCol({ x, z, r: 0.55 + sc * 0.25 });
  }
  for (let i = 0; i < 26000 && nt < MAX - 40; i++) {
    const x = (tr() - 0.5) * 1560, z = -780 + tr() * 1640;
    const h = terrainH(x, z); if (h < 1.6 || h > 44) continue;
    if (Math.abs(x) < 135 && Math.abs(z + 610) < 135) continue;
    if (roadDist(x, z) < 7) continue;
    if (hyp(x - 60, z + 260) < 34 || hyp(x - 170, z + 40) < 38 || hyp(x + 250, z - 260) < 34 || hyp(x - 70, z - 118) < 12 || hyp(x + 140, z - 172) < 10) continue;
    if (hyp(x, z - 715) < 92) continue;
    if (Math.abs(x) < 30 && z > 340 && z < 600) continue;
    const forest = smooth(-400, -360, z) * (1 - smooth(150, 230, z));
    const coast = z > coastZ(x) - 70 && z < 480, lanka = hyp(x, z - 705) < 180;
    const kish = hyp(x + 260, z - 250) < 220;
    let p0 = 0.12 + forest * 0.75; if (kish) p0 = 0.12; if (lanka) p0 = 0.35;
    const dens = smooth(-0.5, 0.3, vnoise(x * 0.012 + 40, z * 0.012));
    if (tr() > p0 * (0.35 + dens)) continue;
    const sc = tr();
    if ((coast || lanka) && tr() < 0.75 && np < 880) put(x, z, 'palm', sc);
    else put(x, z, 'tree', sc);
  }
  // Ashoka grove in Lanka (red-orange blossoms)
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = 6 + (i % 3) * 5; put(LOC.grove[0] + Math.cos(a) * r, LOC.grove[1] + Math.sin(a) * r, 'tree', 0.5 + tr() * 0.5, [0xe2552b, 0xf08a2a, 0xd63a3a][i % 3]); }
  trunks.count = nt; crowns.count = nc; palms.count = np;
  for (const im of [trunks, crowns, palms]) { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.instanceMatrix.needsUpdate = true; scene.add(im); }
  // rocks around Kishkindha
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M(0x9a8468), 500); let nr = 0;
  for (let i = 0; i < 4000 && nr < 500; i++) {
    const a = tr() * TAU, d = Math.sqrt(tr()) * 230, x = -260 + Math.cos(a) * d, z = 250 + Math.sin(a) * d;
    if (roadDist(x, z) < 6 || hyp(x + 250, z - 260) < 30 || terrainH(x, z) < 2) continue;
    const sc = 0.8 + tr() * tr() * 5;
    m4.compose(p.set(x, terrainH(x, z) + sc * 0.2, z), q.setFromEuler(new THREE.Euler(tr() * 3, tr() * 3, tr() * 3)), s.set(sc, sc * 0.75, sc));
    rocks.setMatrixAt(nr++, m4); addCol({ x, z, r: sc * 0.8 });
  }
  // arena standing stones
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU; if (Math.abs(a - Math.PI * 1.25) < 0.3) continue;
    const x = LOC.arena[0] + Math.cos(a) * 21, z = LOC.arena[1] + Math.sin(a) * 21;
    m4.compose(p.set(x, terrainH(x, z) + 2, z), q.setFromEuler(new THREE.Euler(0, a, 0.05)), s.set(1.3, 4.5, 0.9)); rocks.setMatrixAt(nr++, m4); addCol({ x, z, r: 1.2 });
  }
  rocks.count = nr; rocks.castShadow = rocks.receiveShadow = true; rocks.frustumCulled = false; scene.add(rocks);
}

function buildAyodhya() {
  const cx = 0, cz = -610, Hh = 120, wallH = 13, base = 5, sand = M(0xe3cf9e), sand2 = M(0xd8be86);
  const wall = (x, z, w, d) => { mk(new THREE.BoxGeometry(w, wallH + 4, d), sand, x, base - 2 + (wallH + 4) / 2, z, scene); boxCol(x, z, w, d);
    mk(new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6), M(0xc4562a), x, base + wallH + 2.4, z, scene); };
  wall(cx, cz - Hh, Hh * 2, 4);
  wall(cx - Hh, cz, 4, Hh * 2); wall(cx + Hh, cz, 4, Hh * 2);
  const gap = 9; wall(cx - (Hh + gap) / 2, cz + Hh, Hh - gap, 4); wall(cx + (Hh + gap) / 2, cz + Hh, Hh - gap, 4);
  mk(new THREE.BoxGeometry(gap * 2 + 4, 4, 5), sand2, cx, base + wallH + 2, cz + Hh, scene);
  const tower = (x, z, r, h) => { mk(new THREE.CylinderGeometry(r, r * 1.1, h, 10), sand2, x, base + h / 2 - 2, z, scene); mk(new THREE.SphereGeometry(r * 1.05, 10, 6, 0, TAU, 0, Math.PI / 2), GOLD, x, base + h - 2, z, scene); mk(new THREE.ConeGeometry(0.4, 2.5, 6), GOLD, x, base + h - 2 + r + 1, z, scene); addCol({ x, z, r }); };
  for (const [x, z] of [[-Hh, -Hh], [Hh, -Hh], [-Hh, Hh], [Hh, Hh]]) tower(cx + x, cz + z, 5, 22);
  tower(cx - gap - 3, cz + Hh, 4, 24); tower(cx + gap + 3, cz + Hh, 4, 24);
  // palace
  const pz = LOC.palace[1];
  mk(new THREE.BoxGeometry(52, 15, 34), M(0xf6ead0), 0, base + 7.5 - 1, pz, scene); boxCol(0, pz, 52, 34);
  mk(new THREE.BoxGeometry(56, 1.2, 38), M(0xc4562a), 0, base + 14.6, pz, scene);
  mk(new THREE.SphereGeometry(10, 16, 10, 0, TAU, 0, Math.PI / 2), GOLD, 0, base + 15, pz, scene);
  mk(new THREE.ConeGeometry(1, 6, 8), GOLD, 0, base + 27, pz, scene);
  for (const [x, z] of [[-24, -15], [24, -15], [-24, 15], [24, 15]]) {
    mk(new THREE.CylinderGeometry(3.4, 3.6, 28, 10), M(0xf6ead0), x, base + 13, pz + z, scene);
    mk(new THREE.SphereGeometry(3.7, 10, 6, 0, TAU, 0, Math.PI / 2), GOLD, x, base + 27, pz + z, scene);
    mk(new THREE.ConeGeometry(0.5, 3, 6), GOLD, x, base + 31.5, pz + z, scene);
    const f = mk(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshLambertMaterial({ color: 0xff8a1a, side: THREE.DoubleSide }), x + 1.2, base + 33, pz + z, scene, false);
    world.flames.push({ m: f, flag: true });
  }
  for (let i = 0; i < 8; i++) { const x = -21 + i * 6; mk(new THREE.CylinderGeometry(0.6, 0.7, 10, 8), M(0xfff6e4), x, base + 4, pz + 22, scene); addCol({ x, z: pz + 22, r: 0.7 }); }
  mk(new THREE.BoxGeometry(48, 1.4, 9), M(0xf6ead0), 0, base + 9.6, pz + 21, scene);
  mk(new THREE.BoxGeometry(14, 0.1, 20), M(0xb5161e), 0, base + 0.06, pz + 28, scene, false);
  // houses (instanced)
  const tr = rng(9), MAXH = 110;
  const box = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ flatShading: true }), MAXH);
  const roofGeo = new THREE.ConeGeometry(0.75, 1, 4); roofGeo.rotateY(Math.PI / 4);
  const roofs = new THREE.InstancedMesh(roofGeo, new THREE.MeshLambertMaterial({ flatShading: true }), MAXH);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let n = 0; const pal = [0xf7efe0, 0xf4d9a8, 0xf2c6b4, 0xe9e2c8, 0xf7e2c2, 0xe6c79c];
  for (let x = -105; x <= 105; x += 15) for (let z = -715; z <= -500; z += 15) {
    if (Math.abs(x) < 16 || (Math.abs(x) < 50 && z < -585) || tr() < 0.18 || n >= MAXH) continue;
    if (Math.abs(x) < 30 && Math.abs(z + 540) < 18) continue;
    const w = 7 + tr() * 4, d = 7 + tr() * 4, h = 4 + tr() * 4, X = x + (tr() - 0.5) * 3, Z = z + (tr() - 0.5) * 3;
    m4.compose(p.set(X, base + h / 2 - 0.5, Z), q.identity(), s.set(w, h + 1, d)); box.setMatrixAt(n, m4); box.setColorAt(n, col.set(pal[Math.floor(tr() * pal.length)]));
    m4.compose(p.set(X, base + h + 0.5 + h * 0.3, Z), q.identity(), s.set(w * 0.98, h * 0.6, d * 0.98)); roofs.setMatrixAt(n, m4); roofs.setColorAt(n, col.set(tr() < 0.5 ? 0xb8482a : 0xc9662f));
    boxCol(X, Z, w, d); n++;
  }
  box.count = roofs.count = n;
  for (const im of [box, roofs]) { im.castShadow = im.receiveShadow = true; im.frustumCulled = false; im.instanceColor.needsUpdate = true; scene.add(im); }
  // temples along the avenue
  for (const [x, z] of [[-26, -540], [26, -540]]) {
    mk(new THREE.BoxGeometry(9, 5, 9), M(0xf2dcb0), x, base + 2.5, z, scene); boxCol(x, z, 9, 9);
    mk(new THREE.CylinderGeometry(1.2, 4.2, 11, 8), M(0xe88a2a), x, base + 10.5, z, scene);
    mk(new THREE.SphereGeometry(1.4, 8, 6), GOLD, x, base + 16.5, z, scene);
    const f = mk(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshLambertMaterial({ color: 0xff8a1a, side: THREE.DoubleSide }), x + 0.8, base + 18.5, z, scene, false);
    world.flames.push({ m: f, flag: true });
  }
  // river bridge on the Sarayu
  const rz = riverZ(0);
  mk(new THREE.BoxGeometry(10, 0.6, 34), M(0x8a5a32), 0, 1.25, rz, scene);
  for (const sx of [-1, 1]) { mk(new THREE.BoxGeometry(0.4, 1, 34), M(0x6a4024), 4.8 * sx, 2, rz, scene); addCol({ x0: 4.6 * sx - 0.3, x1: 4.6 * sx + 0.3, z0: rz - 12, z1: rz + 12 }); }
  platforms.push({ x0: -5, x1: 5, z0: rz - 17, z1: rz + 17, y: 1.55, on: true });
  // diyas (lit at the end)
  const pts = [];
  for (let t = -Hh; t <= Hh; t += 6) { pts.push([cx + t, base + wallH + 3, cz - Hh - 2.2], [cx - Hh - 2.2, base + wallH + 3, cz + t], [cx + Hh + 2.2, base + wallH + 3, cz + t]); if (Math.abs(t) > gap + 4) pts.push([cx + t, base + wallH + 3, cz + Hh + 2.2]); }
  for (let z = -500; z >= -630; z -= 5) pts.push([-9, base + 0.3, z], [9, base + 0.3, z]);
  for (let i = 0; i < 9; i++) pts.push([-24 + i * 6, base + 10.6, pz + 25.6]);
  const dg = new THREE.ConeGeometry(0.14, 0.42, 5); dg.translate(0, 0.21, 0);
  const diyas = new THREE.InstancedMesh(dg, GLOW(0xffb040), pts.length);
  pts.forEach((pp, i) => { m4.compose(p.set(...pp), q.identity(), s.set(1, 1, 1)); diyas.setMatrixAt(i, m4); });
  diyas.visible = false; diyas.frustumCulled = false; scene.add(diyas); world.diyas = diyas;
  world.cityLight = new THREE.PointLight(0xffa040, 0, 260, 1.2); world.cityLight.position.set(0, 30, -600); scene.add(world.cityLight);
}

function hut(x, z, r = 2.6, parent = scene) {
  const h = terrainH(x, z);
  mk(new THREE.CylinderGeometry(r, r * 1.05, 2.6, 9), M(0x9a7b4f), x, h + 1.3, z, parent);
  mk(new THREE.ConeGeometry(r * 1.45, 2.8, 9), M(0xcaa95c), x, h + 4, z, parent);
  mk(new THREE.BoxGeometry(1, 1.8, 0.2), M(0x3a2414), x, h + 0.9, z + r * 0.98, parent, false);
  addCol({ x, z, r: r + 0.2 });
}
function firePit(x, z) {
  const h = terrainH(x, z);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; mk(new THREE.DodecahedronGeometry(0.28, 0), M(0x777066), x + Math.cos(a) * 0.9, h + 0.15, z + Math.sin(a) * 0.9, scene); }
  const f = mk(new THREE.ConeGeometry(0.5, 1.4, 6), GLOW(0xff8a1a), x, h + 0.7, z, scene, false);
  const f2 = mk(new THREE.ConeGeometry(0.28, 0.9, 6), GLOW(0xffe060), x, h + 0.5, z, scene, false);
  world.flames.push({ m: f }, { m: f2 });
  const l = new THREE.PointLight(0xff8a30, 6, 22, 1.5); l.position.set(x, h + 1.5, z); scene.add(l);
  addCol({ x, z, r: 1.1 });
}
function buildForestSites() {
  hut(48, -270); hut(72, -275); hut(58, -246, 2.2); firePit(60, -260);
  hut(LOC.hut[0], LOC.hut[1], 3.2); firePit(162, -36);
  const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.25, 0), new THREE.MeshLambertMaterial({ flatShading: true }), 200);
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), tr = rng(5);
  for (let i = 0; i < 200; i++) {
    const a = tr() * TAU, d = 6 + tr() * 22, x = 170 + Math.cos(a) * d, z = -40 + Math.sin(a) * d;
    m4.makeTranslation(x, terrainH(x, z) + 0.2, z); fl.setMatrixAt(i, m4); fl.setColorAt(i, col.set([0xff5a8a, 0xffe14a, 0xffffff, 0xff8a2a][i % 4]));
  }
  fl.instanceColor.needsUpdate = true; fl.frustumCulled = false; scene.add(fl);
}
function buildLanka() {
  const [fx, fz] = LOC.fort, Rw = 80, base = 7, stone = M(0x3e3236), stone2 = M(0x2e2428);
  const segs = 22;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * TAU, a1 = ((i + 1) / segs) * TAU, am = (a0 + a1) / 2;
    const x0 = fx + Math.sin(a0) * Rw, z0 = fz + Math.cos(a0) * Rw;
    if (Math.abs(((am - Math.PI + TAU) % TAU) - 0) > 0.22 && Math.abs(((am - Math.PI + TAU) % TAU) - TAU) > 0.22) {
      const len = 2 * Rw * Math.sin(Math.PI / segs) + 1;
      const w = mk(new THREE.BoxGeometry(len, 18, 4), stone, fx + Math.sin(am) * Rw, base + 7, fz + Math.cos(am) * Rw, scene); w.rotation.y = am;
      const tp = mk(new THREE.BoxGeometry(len, 0.8, 4.6), GOLD, fx + Math.sin(am) * Rw, base + 16.3, fz + Math.cos(am) * Rw, scene); tp.rotation.y = am;
      for (let t = 0; t <= 6; t++) { const a = lerp(a0, a1, t / 6); addCol({ x: fx + Math.sin(a) * Rw, z: fz + Math.cos(a) * Rw, r: 2.6 }); }
    }
    if (Math.abs(a0 - Math.PI) < 0.05) continue;
    mk(new THREE.CylinderGeometry(3.5, 4, 26, 8), stone2, x0, base + 11, z0, scene);
    mk(new THREE.ConeGeometry(4, 7, 8), GOLD, x0, base + 27.5, z0, scene);
    addCol({ x: x0, z: z0, r: 3.8 });
  }
  // inner palace on Trikuta
  for (const [x, z, w, h] of [[0, 775, 40, 18], [0, 775, 26, 32], [0, 775, 12, 46]]) mk(new THREE.BoxGeometry(w, h, w * 0.6), stone2, x, base + h / 2, z, scene);
  boxCol(0, 775, 40, 24);
  for (const sx of [-1, 1]) for (const [d, h] of [[16, 40], [26, 30]]) {
    mk(new THREE.CylinderGeometry(2.4, 3.2, h, 8), stone, d * sx, base + h / 2, 768, scene);
    mk(new THREE.ConeGeometry(3, 8, 8), GOLD, d * sx, base + h + 4, 768, scene); addCol({ x: d * sx, z: 768, r: 3.2 });
  }
  mk(new THREE.SphereGeometry(6, 12, 8, 0, TAU, 0, Math.PI / 2), GOLD, 0, base + 46, 775, scene);
  for (const [x, z] of [[-12, 690], [12, 690], [-20, 725], [20, 725]]) {
    mk(new THREE.CylinderGeometry(0.5, 0.7, 3, 6), stone, x, base + 1.5, z, scene); addCol({ x, z, r: 0.8 });
    const f = mk(new THREE.ConeGeometry(0.6, 1.6, 6), GLOW(0xff5a1a), x, base + 3.6, z, scene, false); world.flames.push({ m: f });
  }
  const l = new THREE.PointLight(0xff5020, 20, 120, 1.2); l.position.set(0, 25, 715); scene.add(l);
}
function buildBridge() {
  let z = 340; while (z < 480 && terrainH(0, z) > 0.4) z += 1; world.bStart = z - 10;
  z = 640; while (z > 500 && terrainH(0, z) > 0.4) z -= 1; world.bEnd = z + 10;
  const n = 5, len = (world.bEnd - world.bStart) / n;
  for (let i = 0; i < n; i++) {
    const z0 = world.bStart + i * len, zc = z0 + len / 2, g = new THREE.Group();
    mk(new THREE.BoxGeometry(10, 16, len + 0.4), M(0x9a8f80), 0, -8 + 1.2, 0, g);
    const tr = rng(100 + i);
    for (let k = 0; k < 10; k++) mk(new THREE.DodecahedronGeometry(0.6 + tr() * 0.9, 0), M(0x8a7f72), (tr() < 0.5 ? -1 : 1) * (4.6 + tr()), 1.3 + tr() * 0.4, (tr() - 0.5) * len, g);
    g.position.set(0, -30, zc); g.visible = false; scene.add(g);
    const plat = { x0: -5, x1: 5, z0, z1: z0 + len, y: 1.2, on: false }; platforms.push(plat);
    const cols = [addCol({ x0: -5.6, x1: -4.8, z0, z1: z0 + len, off: true }), addCol({ x0: 4.8, x1: 5.6, z0, z1: z0 + len, off: true })];
    world.bridge.push({ g, plat, cols, built: false, rise: 0 });
  }
}
function setBridge(built, instant) {
  for (const b of world.bridge) { b.built = built; b.plat.on = built; b.cols.forEach((c) => (c.off = !built)); b.g.visible = built; if (instant) { b.rise = built ? 1 : 0; b.g.position.y = built ? 0 : -30; } }
}
function textSprite(txt, color = '#ffb020', size = 46) {
  const c = document.createElement('canvas'); c.width = 160; c.height = 80; const x = c.getContext('2d');
  x.font = `bold ${size}px "Nirmala UI","Mangal","Tiro Devanagari Hindi",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = '#000'; x.shadowBlur = 6; x.fillStyle = color; x.fillText(txt, 80, 42);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false, fog: false }));
  sp.scale.set(3, 1.5, 1); return sp;
}
function buildStones() {
  const xs = [-250, -130, -35, 120, 245];
  xs.forEach((x, i) => {
    let z = coastZ(x) - 18; while (terrainH(x, z) < 0.8 && z > 300) z -= 2;
    const g = new THREE.Group(); g.position.set(x, terrainH(x, z), z);
    mk(new THREE.DodecahedronGeometry(1.1, 0), M(0x8d8a86), 0, 1, 0, g);
    const ring = mk(new THREE.TorusGeometry(1.6, 0.06, 5, 24), GLOW(0xffc040), 0, 0.15, 0, g, false); ring.rotation.x = Math.PI / 2;
    const t = textSprite('राम'); t.position.y = 3; g.add(t);
    g.visible = false; scene.add(g); world.stones.push({ g, i, x, z });
  });
}
function makeLotus() {
  const g = new THREE.Group();
  mk(new THREE.SphereGeometry(0.16, 6, 5), GLOW(0xffe060), 0, 0.3, 0, g, false);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, p = mk(new THREE.SphereGeometry(0.2, 6, 4), M(0xff7aa8, { emissive: 0x401020 }), Math.cos(a) * 0.22, 0.3, Math.sin(a) * 0.22, g, false); p.scale.set(1, 0.5, 2); p.rotation.y = -a; p.rotation.z = 0.5; }
  const ring = mk(new THREE.TorusGeometry(0.6, 0.03, 4, 18), GLOW(0xff9ac0), 0, 0.05, 0, g, false); ring.rotation.x = Math.PI / 2;
  return g;
}
function addLotus(x, z, temp = false) {
  const g = makeLotus(); g.position.set(x, groundAt(x, z), z); scene.add(g);
  world.lotuses.push({ g, x, z, t: temp ? 30 : Infinity });
}
function buildLotuses() {
  const tr = rng(31); let n = 0;
  for (let i = 0; i < 600 && n < 34; i++) {
    const x = (tr() - 0.5) * 1100, z = -560 + tr() * 1300, h = terrainH(x, z);
    if (h < 0.8 || h > 30 || (Math.abs(x) < 125 && Math.abs(z + 610) < 125)) continue;
    addLotus(x, z); n++;
  }
}
function buildClouds() {
  const tr = rng(55), n = 120;
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  world.cloudData = [];
  for (let c = 0; c < 40; c++) {
    const cx = (tr() - 0.5) * 1800, cz = (tr() - 0.5) * 1800, cy = 150 + tr() * 60;
    for (let k = 0; k < 3; k++) world.cloudData.push({ x: cx + (k - 1) * 18 + tr() * 6, y: cy + tr() * 5, z: cz + tr() * 8, s: 14 + tr() * 10 });
  }
  world.cloudData.forEach((d, i) => { m4.compose(p.set(d.x, d.y, d.z), q, s.set(d.s * 1.6, d.s * 0.6, d.s)); im.setMatrixAt(i, m4); });
  im.frustumCulled = false; scene.add(im); world.clouds = im;
}
function updateClouds(dt) {
  const im = world.clouds, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  world.cloudData.forEach((d, i) => { d.x += dt * 3; if (d.x > 1000) d.x -= 2000; m4.compose(p.set(d.x, d.y, d.z), q, s.set(d.s * 1.6, d.s * 0.6, d.s)); im.setMatrixAt(i, m4); });
  im.instanceMatrix.needsUpdate = true;
}

// ================= audio =================
let ac = null, master = null, muted = store('ram_muted') === '1';
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ac.destination); startDrone(); } catch { ac = null; }
}
function tone(f, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
  if (!ac) return; const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol = 0.2, freq = 2000, type = 'bandpass') {
  if (!ac) return; const t = ac.currentTime, b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = type; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f).connect(g).connect(master); s.start(t);
}
const sfx = {
  bow: (c) => { noise(0.12, 0.25, 2600); tone(180 + c * 120, 0.18, 'triangle', 0.12, 0.5); if (c > 0.95) tone(880, 0.5, 'sine', 0.08, 1.5); },
  hit: () => { tone(160, 0.12, 'square', 0.08, 0.6); noise(0.08, 0.2, 900); },
  hurt: () => { tone(120, 0.25, 'sawtooth', 0.1, 0.6); },
  chime: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'sine', 0.1, 0, i * 0.11)); },
  pick: () => { tone(880, 0.15, 'sine', 0.1); tone(1320, 0.25, 'sine', 0.08, 0, 0.08); },
  roar: () => { tone(90, 1.0, 'sawtooth', 0.15, 0.5); noise(0.8, 0.15, 300, 'lowpass'); },
  boom: () => { noise(0.6, 0.3, 400, 'lowpass'); tone(70, 0.6, 'sine', 0.2, 0.5); },
  pop: () => { noise(0.25, 0.15, 1800); },
  step: () => {},
};
function startDrone() {
  // tanpura-like drone: Pa, Sa, Sa, low Sa plucked in a loop
  const notes = [196, 261.63, 261.63, 130.81]; let i = 0;
  const pluck = () => {
    if (!ac) return; const t = ac.currentTime, f = notes[i++ % 4];
    for (const [m, v] of [[1, 0.05], [2, 0.02], [3, 0.012], [4.01, 0.008]]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      o.connect(g).connect(master); o.start(t); o.stop(t + 3.3);
    }
  };
  setInterval(pluck, 1150);
}
function setMuted(m) { muted = m; store('ram_muted', m ? '1' : '0'); if (master) master.gain.value = m ? 0 : 0.55; $('muteBtn').textContent = m ? '🔇' : '🔊'; }

// ================= state =================
const player = { pos: new THREE.Vector3(), vy: 0, onGround: true, facing: Math.PI, hp: 100, maxHp: 100, mesh: null, jumpT: 0, regenT: 0, dead: false };
let camYaw = 0, camPitch = 0.32, camDist = 7.5, shake = 0;
let stage = 0, stones = [0, 0, 0, 0, 0], playing = false, paused = false;
let charging = false, chargeT = 0, shotCd = 0, aimHold = 0;
const keys = {};
const enemies = [], arrows = [], particles = [];
const npcs = {};
const flags = {};
let dayT = 0.1;

function saveGame() { store('ram_save', JSON.stringify({ stage, stones, flags })); }
function loadSave() { try { const s = JSON.parse(store('ram_save') || 'null'); return s && typeof s.stage === 'number' ? s : null; } catch { return null; } }

// ================= NPCs =================
function addNPC(id, name, mesh, x, z, lines) {
  mesh.position.set(x, groundAt(x, z), z); scene.add(mesh);
  return (npcs[id] = { id, name, mesh, home: [x, z], lines: lines || [], li: 0, follow: false, offset: [0, -3], wander: null, atkCd: 0, shootCd: 0 });
}
function setNPC(id, vis, x, z) {
  const n = npcs[id]; if (!n) return; n.mesh.visible = vis;
  if (x != null) { n.home = [x, z]; n.mesh.position.set(x, groundAt(x, z), z); }
}
function buildNPCs() {
  addNPC('dasharatha', 'King Dasharatha', makeChar({ skin: 0xd9a066, cloth: 0x9a1020, top: 0xe8b84a, crown: true, beard: 0xf4f4f4, hair: 0xeeeeee, sash: 0xb5161e }), ...LOC.dasharatha,
    ['Go with my blessing, my son.']);
  npcs.dasharatha.mesh.rotation.y = 0;
  addNPC('sita', 'Sita', makeChar({ skin: 0xe8b48a, cloth: 0xc0203a, top: 0xe0a030, skirt: true, hair: 0x1a1010, longHair: true }), -4, -622,
    ['The forest has its own beauty, Rama. Look at the light through the leaves.', 'I am never afraid when you are near.']);
  addNPC('lakshmana', 'Lakshmana', makeChar({ skin: 0xe0a874, cloth: 0xe07018, crown: true, hair: 0x141018 }), 4, -622,
    ['I am right behind you, brother.', 'The forest is full of eyes. Stay alert.', 'Point me at a rakshasa and I will loose an arrow.']);
  { const lb = makeBow(0.65); lb.position.set(0, -0.6, 0.05); npcs.lakshmana.mesh.userData.arms[1].add(lb); }
  addNPC('agastya', 'Sage Agastya', makeChar({ skin: 0xb07a48, cloth: 0xe07b1a, top: 0xe07b1a, beard: 0xf4f4f4, hair: 0xf4f4f4, jewel: false }), ...LOC.agastya,
    ['May your arrows fly true, Rama.', 'Dharma protects those who protect it.']);
  addNPC('jatayu', 'Jatayu', makeJatayu(), ...LOC.jatayu, []);
  addNPC('hanuman', 'Hanuman', makeMonkey({ fur: 0xd0782a, cloth: 0xd8301a, face: 0xf0c090, crown: true, mace: true, scale: 1.08 }), ...LOC.hanuman,
    ['Jai Shri Ram! Point me at any rakshasa, my lord.', 'If you asked, I would lift a whole mountain.', 'Mother Sita waits. Every step south brings us closer.']);
  addNPC('sugriva', 'Sugriva', makeMonkey({ fur: 0xa07a40, cloth: 0x2a6ab0, face: 0xe8c898, crown: true, scale: 1.15 }), -238, 252, ['The vanara army marches for you, Rama.']);
  addNPC('nala', 'Nala', makeMonkey({ fur: 0x8a5a30, cloth: 0x3a8a3a, face: 0xe0b890 }), 12, 0, ['Stones with your name will float, my lord. Gather five of them.']);
  addNPC('vibhishana', 'Vibhishana', makeChar({ skin: 0x6a5a7a, cloth: 0xf4f0e8, top: 0x6a5a7a, crown: true, hair: 0x111111, sash: 0xf2c14e }), 10, 0,
    ['I begged my brother to return Sita. He cast me out. I stand with dharma, and with you.']);
  addNPC('bharata', 'Bharata', makeChar({ skin: 0x4f6fa0, cloth: 0xe8a020, crown: true, hair: 0x141018 }), 0, -606, ['Ayodhya is whole again, brother.']);
  // citizens of Ayodhya and vanaras
  const cit = [[0xd9a066, 0xe8e0d0], [0xc98a56, 0x2a6ab0], [0xe0b080, 0xd02a6a], [0xb07a48, 0x3a8a3a], [0xd9a066, 0xe0a030], [0xc98a56, 0x8a2ab0]];
  const lines = ['Long live Prince Rama!', 'The palace kitchens smell of sweets today.', 'They say the forests to the south are full of rakshasas.', 'Cross the Sarayu by the wooden bridge, prince.'];
  cit.forEach(([s, c], i) => { const n = addNPC('cit' + i, 'Citizen of Ayodhya', makeChar({ skin: s, cloth: c, skirt: i % 2 === 1, hair: 0x1a1010, jewel: i % 3 === 0 }), -60 + i * 22, -560 - (i % 3) * 25, [lines[i % lines.length]]); n.wander = { r: 30 }; });
  const vlines = ['Jai Shri Ram!', 'We vanaras can leap from rock to rock all day!', 'Sugriva is our true king.'];
  for (let i = 0; i < 5; i++) { const n = addNPC('van' + i, 'Vanara', makeMonkey({ fur: [0x8a5a30, 0xa07a40, 0x6a4a2a][i % 3], cloth: 0x7a5a2a, face: 0xe0b890, scale: 0.9 }), -175 + i * 9, 205 + (i % 2) * 8, [vlines[i % 3]]); n.wander = { r: 14 }; }
}
function companions() { return ['lakshmana', 'sita', 'hanuman'].map((k) => npcs[k]).filter((n) => n.follow && n.mesh.visible); }

// ================= world state per stage =================
function applyWorldState() {
  const s = stage;
  setNPC('dasharatha', s <= 1, ...LOC.dasharatha);
  const lakFollow = (s >= 1 && s <= 4) || s >= 7;
  npcs.lakshmana.follow = lakFollow; npcs.lakshmana.offset = [-2.4, -2.6];
  if (s === 0) setNPC('lakshmana', true, 4, -622); else if (s === 5 || s === 6) setNPC('lakshmana', true, LOC.hut[0] + 4, LOC.hut[1] + 5); else setNPC('lakshmana', true);
  npcs.sita.offset = [2.4, -2.6];
  if (s === 0) { setNPC('sita', true, -4, -622); npcs.sita.follow = false; }
  else if (s <= 4 || s >= 15) { setNPC('sita', true); npcs.sita.follow = true; }
  else if (s === 5) { setNPC('sita', true, LOC.hut[0] - 3, LOC.hut[1] + 5); npcs.sita.follow = false; }
  else if (s >= 10) { setNPC('sita', true, LOC.grove[0], LOC.grove[1]); npcs.sita.follow = false; }
  else { setNPC('sita', false); npcs.sita.follow = false; }
  setNPC('jatayu', s >= 6 && s <= 7);
  npcs.hanuman.offset = [0, -4.8];
  if (s >= 10) { setNPC('hanuman', true); npcs.hanuman.follow = true; } else { setNPC('hanuman', true, ...LOC.hanuman); npcs.hanuman.follow = false; }
  setNPC('sugriva', s >= 10, -238, 252);
  setNPC('nala', s >= 10 && s <= 12, 12, world.bStart - 6);
  setNPC('vibhishana', s >= 12, 10, world.bEnd + 12);
  setNPC('bharata', s >= 15, 0, -606);
  world.stones.forEach((st) => (st.g.visible = s === 10 && !stones[st.i]));
  setBridge(s >= 12, true);
  world.diyas.visible = s >= 15; world.cityLight.intensity = s >= 15 ? 60 : 0;
  $('chargeTag').classList.toggle('hidden', s < 4);
  for (const k of ['lakshmana', 'sita', 'hanuman']) { const n = npcs[k]; if (n.follow && hyp(n.mesh.position.x - player.pos.x, n.mesh.position.z - player.pos.z) > 40) placeNear(n); }
}
function placeNear(n) {
  const x = player.pos.x + n.offset[0], z = player.pos.z + n.offset[1] + 2;
  n.mesh.position.set(x, groundAt(x, z), z);
}

// ================= enemies =================
const KINDS = {
  rakshasa: { hp: 4, speed: 5.2, dmg: 9, range: 2.4, atkRate: 1.3, aggro: 26, radius: 0.75, height: 2.6, make: () => makeRakshasa() },
  brute: { hp: 9, speed: 4.4, dmg: 15, range: 2.9, atkRate: 1.6, aggro: 30, radius: 1.0, height: 3.4, make: () => makeRakshasa(1.35) },
  vali: { hp: 34, speed: 6.6, dmg: 12, range: 3.0, atkRate: 1.05, aggro: 45, radius: 1.0, height: 3.0, boss: true, name: 'Vali, the mighty vanara', make: () => makeMonkey({ fur: 0x9a8a6a, cloth: 0x5a1a6a, face: 0xd8c8a0, crown: true, mace: true, scale: 1.5 }) },
  ravana: { hp: 60, speed: 3.8, dmg: 22, range: 5.2, atkRate: 1.8, aggro: 80, radius: 1.6, height: 5.4, boss: true, name: 'Ravana, Lord of Lanka', make: makeRavana },
  deer: { hp: 3, speed: 9.5, dmg: 0, range: 0, atkRate: 99, aggro: 30, radius: 1.1, height: 1.9, make: makeDeer },
};
const barGeo = new THREE.PlaneGeometry(1, 0.12), barFgGeo = new THREE.PlaneGeometry(1, 0.12).translate(0.5, 0, 0);
const barBg = new THREE.MeshBasicMaterial({ color: 0x220000, depthTest: false, transparent: true, opacity: 0.75, fog: false });
const barFg = new THREE.MeshBasicMaterial({ color: 0xe8402a, depthTest: false, transparent: true, fog: false });
function makeBar() {
  const g = new THREE.Group(), bg = new THREE.Mesh(barGeo, barBg), fg = new THREE.Mesh(barFgGeo, barFg);
  fg.position.set(-0.5, 0, 0.001); bg.renderOrder = 10; fg.renderOrder = 11; g.add(bg, fg); g.userData.fg = fg; g.visible = false; scene.add(g); return g;
}
function spawnEnemy(kind, x, z, tag, opts = {}) {
  const def = KINDS[kind], mesh = def.make();
  const e = { kind, def, mesh, pos: new THREE.Vector3(x, groundAt(x, z), z), home: [x, z], hp: def.hp, maxHp: def.hp, tag, state: 'idle', atkCd: 1, windup: 0,
    yaw: Math.random() * TAU, dead: false, deadT: 0, wanderT: 0, wTo: null, provoked: false, vy: 0, leapCd: 4, fireCd: 3, phase: 1, weakHits: 0, flee: 0, pop: 0, ...opts };
  mesh.position.copy(e.pos); scene.add(mesh);
  if (!def.boss) e.bar = makeBar();
  enemies.push(e); return e;
}
function aliveTag(t) { return enemies.filter((e) => !e.dead && e.tag === t).length; }
function removeEnemy(e) { scene.remove(e.mesh); if (e.bar) scene.remove(e.bar); enemies.splice(enemies.indexOf(e), 1); }
function clearTag(t) { for (const e of enemies.slice()) if (e.tag === t) removeEnemy(e); }

function damageEnemy(e, dmg, at, charge, weakHit) {
  if (e.dead) return;
  e.provoked = true; e.pop = 0.15;
  if (e.kind === 'ravana' && e.phase === 2) {
    if (weakHit && charge >= 0.95) {
      e.weakHits++; burst(at, 0xfff0a0, 40, 10); sfx.boom(); floater(at, 'BRAHMASTRA!', 'big'); shake = 0.6;
      if (e.weakHits >= 3) killEnemy(e);
    } else { burst(at, 0xff5020, 6); floater(at, 'Heads regrow!', 'bad'); if (!flags.navelHintT || performance.now() - flags.navelHintT > 6000) { toast('Only a fully drawn arrow to the glowing navel can end him!'); flags.navelHintT = performance.now(); } }
    return;
  }
  e.hp -= dmg; burst(at, e.kind === 'deer' ? 0xffd040 : 0xff4a2a, 10); sfx.hit();
  floater(at, Math.round(dmg * 10) / 10 + '', charge >= 0.95 ? 'big' : '');
  if (e.hp <= 0) {
    if (e.kind === 'ravana' && e.phase === 1) { e.phase = 2; e.hp = e.maxHp; ravanaPhase2(e); return; }
    killEnemy(e);
  }
}
function killEnemy(e) {
  e.dead = true; e.deadT = 0; if (e.bar) e.bar.visible = false;
  burst(e.pos.clone().setY(e.pos.y + 1.5), 0x8a2aff, 20, 6);
  if (!e.def.boss && e.kind !== 'deer' && Math.random() < 0.3) addLotus(e.pos.x, e.pos.z, true);
  if (e.onDeath) e.onDeath(e);
}
function hurtPlayer(d) {
  if (player.dead || !playing) return;
  player.hp -= d; player.regenT = 0; shake = Math.max(shake, 0.35); sfx.hurt();
  $('hurt').style.opacity = 1; setTimeout(() => ($('hurt').style.opacity = 0), 160);
  if (player.hp <= 0) playerDie();
}
function playerDie() {
  player.dead = true; player.hp = 0;
  const f = $('fade'); f.textContent = 'Rama falls… but dharma endures.'; f.style.opacity = 1;
  setTimeout(() => { respawn(); f.style.opacity = 0; setTimeout(() => (f.textContent = ''), 900); }, 1800);
}
function respawn() {
  const [x, z] = STAGES[stage].cp; player.pos.set(x, groundAt(x, z), z); player.hp = player.maxHp; player.dead = false; player.vy = 0;
  for (const c of companions()) placeNear(c);
  for (const e of enemies) if (!e.dead && hyp(e.pos.x - x, e.pos.z - z) < 30) { e.pos.set(e.home[0], groundAt(...e.home), e.home[1]); e.provoked = false; }
}

function updateEnemy(e, dt) {
  const m = e.mesh, def = e.def;
  if (e.dead) {
    e.deadT += dt; m.rotation.x = -Math.min(Math.PI / 2, e.deadT * 4); m.position.y = e.pos.y - Math.max(0, e.deadT - 1.2) * 1.5;
    if (e.deadT > 3) removeEnemy(e); return;
  }
  const dx = player.pos.x - e.pos.x, dz = player.pos.z - e.pos.z, d = hyp(dx, dz);
  let speed = 0, mvx = 0, mvz = 0;
  if (e.kind === 'deer') {
    const dp = hyp(e.pos.x - LOC.panchavati[0], e.pos.z - LOC.panchavati[1]);
    if (d < def.aggro || e.provoked) {
      e.flee += dt; let fx = -dx / (d || 1), fz = -dz / (d || 1);
      if (dp > 150) { fx += (LOC.panchavati[0] - e.pos.x) / dp * 1.5; fz += (LOC.panchavati[1] - e.pos.z) / dp * 1.5; }
      fx += Math.sin(performance.now() / 600) * 0.4; const l = hyp(fx, fz); mvx = fx / l; mvz = fz / l; speed = def.speed;
      if (e.flee > 7) { // the magic deer vanishes and reappears
        burst(e.pos.clone().setY(e.pos.y + 1), 0xffe060, 24, 6);
        const p = randomLandNear(LOC.panchavati[0], LOC.panchavati[1], 110, 45);
        e.pos.set(p[0], groundAt(p[0], p[1]), p[1]); e.flee = 0; e.provoked = false; burst(e.pos.clone().setY(e.pos.y + 1), 0xffe060, 24, 6);
      }
    } else { e.flee = Math.max(0, e.flee - dt); wander(e, dt); speed = e.wSpeed || 0; mvx = e.wx || 0; mvz = e.wz || 0; }
  } else {
    const hd = hyp(e.pos.x - e.home[0], e.pos.z - e.home[1]);
    if (!player.dead && (d < def.aggro || (e.provoked && d < def.aggro * 2.2)) && hd < (def.boss ? 70 : 110)) {
      e.state = 'chase';
      if (d > def.range * 0.85) { mvx = dx / d; mvz = dz / d; speed = def.speed * (e.windup > 0 ? 0.2 : 1); }
      e.yaw = Math.atan2(dx, dz);
      e.atkCd -= dt;
      if (e.windup > 0) {
        e.windup -= dt; const a = m.userData.arms; if (a) { a[0].rotation.x = -2.6; m.userData.pose = true; }
        if (e.windup <= 0) {
          if (a) { a[0].rotation.x = 0.4; } setTimeout(() => (m.userData.pose = false), 200);
          if (d < def.range + 0.9) hurtPlayer(def.dmg);
        }
      } else if (d < def.range && e.atkCd <= 0) { e.windup = 0.4; e.atkCd = def.atkRate; }
      if (e.kind === 'vali') {
        e.leapCd -= dt;
        if (e.leapCd <= 0 && d > 6 && d < 24 && e.vy === 0) { e.vy = 11; e.leapV = [dx / d * d / 1.6, dz / d * d / 1.6]; e.leapCd = 5; }
      }
      if (e.kind === 'ravana') {
        e.fireCd -= dt;
        if (e.fireCd <= 0 && d > 5) {
          e.fireCd = e.phase === 2 ? 2.2 : 3.2;
          const from = e.pos.clone().add(new THREE.Vector3(0, 4.5, 0));
          for (const off of [-0.18, 0, 0.18]) {
            const to = player.pos.clone().add(new THREE.Vector3(0, 1, 0)), dir = to.sub(from).normalize();
            dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), off); fireball(from.clone(), dir.multiplyScalar(26));
          }
          sfx.roar();
        }
        if (!e.summoned && e.phase === 1 && e.hp < e.maxHp * 0.5) { e.summoned = true; for (let i = 0; i < 3; i++) spawnEnemy('rakshasa', e.pos.x + (i - 1) * 8, e.pos.z - 10, 'summon').provoked = true; }
      }
    } else {
      e.state = 'idle';
      if (hd > 8) { mvx = (e.home[0] - e.pos.x) / hd; mvz = (e.home[1] - e.pos.z) / hd; speed = def.speed * 0.6; e.provoked = false; }
      else { wander(e, dt); speed = e.wSpeed || 0; mvx = e.wx || 0; mvz = e.wz || 0; }
    }
  }
  if (e.vy !== 0 || e.pos.y > groundAt(e.pos.x, e.pos.z) + 0.05) {
    e.vy -= 25 * dt; e.pos.y += e.vy * dt; if (e.leapV) { e.pos.x += e.leapV[0] * dt; e.pos.z += e.leapV[1] * dt; }
    const g = groundAt(e.pos.x, e.pos.z);
    if (e.pos.y <= g) { e.pos.y = g; e.vy = 0; if (e.leapV) { e.leapV = null; burst(e.pos.clone(), 0xc8b090, 20, 5); sfx.boom(); shake = 0.4; if (hyp(player.pos.x - e.pos.x, player.pos.z - e.pos.z) < 4) hurtPlayer(18); } }
  } else if (speed > 0) {
    moveEntity(e.pos, mvx * speed * dt, mvz * speed * dt, def.radius);
    e.pos.y = groundAt(e.pos.x, e.pos.z);
    if (e.state !== 'chase') e.yaw = angLerp(e.yaw, Math.atan2(mvx, mvz), 1 - Math.exp(-8 * dt));
  }
  // separation
  for (const o of enemies) if (o !== e && !o.dead) { const sx = e.pos.x - o.pos.x, sz = e.pos.z - o.pos.z, sd = hyp(sx, sz), mn = def.radius + o.def.radius; if (sd < mn && sd > 0.01) { e.pos.x += sx / sd * (mn - sd) * 0.5; e.pos.z += sz / sd * (mn - sd) * 0.5; } }
  m.position.copy(e.pos); m.rotation.y = e.yaw;
  e.pop = Math.max(0, e.pop - dt); m.scale.setScalar(1 + e.pop);
  animChar(m, speed, dt);
  if (e.bar) {
    e.bar.visible = e.hp < e.maxHp && d < 60; e.bar.position.set(e.pos.x, e.pos.y + def.height + 0.6, e.pos.z);
    e.bar.quaternion.copy(camera.quaternion); e.bar.userData.fg.scale.x = Math.max(0.001, e.hp / e.maxHp);
  }
  if (e.kind === 'ravana' && m.userData.weak.visible) { const s = 1 + Math.sin(performance.now() / 120) * 0.25; m.userData.weak.scale.setScalar(s); }
}
function wander(e, dt) {
  e.wanderT -= dt;
  if (e.wanderT <= 0) {
    e.wanderT = 2 + Math.random() * 4;
    if (Math.random() < 0.4) { e.wSpeed = 0; return; }
    const a = Math.random() * TAU, r = Math.random() * 12, tx = e.home[0] + Math.cos(a) * r, tz = e.home[1] + Math.sin(a) * r;
    const l = hyp(tx - e.pos.x, tz - e.pos.z) || 1; e.wx = (tx - e.pos.x) / l; e.wz = (tz - e.pos.z) / l; e.wSpeed = e.def.speed * 0.35;
  }
}
function randomLandNear(cx, cz, r, minFromPlayer) {
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * TAU, d = Math.random() * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (terrainH(x, z) > 1 && hyp(x - player.pos.x, z - player.pos.z) > minFromPlayer) return [x, z];
  }
  return [cx, cz];
}
// ambient roaming rakshasas
const ambient = [];
function buildAmbient() {
  const tr = rng(808);
  for (let i = 0; i < 400 && ambient.length < 12; i++) {
    const x = -120 + tr() * 380, z = -360 + tr() * 480;
    if (terrainH(x, z) < 1.5 || hyp(x - 60, z + 260) < 70 || hyp(x - 170, z + 40) < 60 || roadDist(x, z) < 12 || ambient.some((a) => hyp(a.x - x, a.z - z) < 45)) continue;
    ambient.push({ x, z, zone: 'forest', e: null, t: 999, kind: tr() < 0.2 ? 'brute' : 'rakshasa' });
  }
  [0.7, -0.7, 1.4, -1.4, 2.1, -2.1].forEach((a, i) => ambient.push({ x: Math.sin(Math.PI + a) * 104, z: 715 + Math.cos(Math.PI + a) * 104, zone: 'lanka', e: null, t: 999, kind: i % 3 === 0 ? 'brute' : 'rakshasa' }));
}
function updateAmbient(dt) {
  for (const a of ambient) {
    if (a.zone === 'lanka' && stage < 12) continue;
    if (a.e && !enemies.includes(a.e)) a.e = null;
    if (!a.e) { a.t += dt; if (a.t > 75 && hyp(player.pos.x - a.x, player.pos.z - a.z) > 90 && terrainH(a.x, a.z) > 0.5) { a.e = spawnEnemy(a.kind, a.x, a.z, 'ambient'); a.t = 0; } }
  }
}

// ================= projectiles / particles =================
const arrowGeo = (() => { const g = new THREE.CylinderGeometry(0.025, 0.025, 1.1, 4); g.rotateX(Math.PI / 2); return g; })();
const tipGeo = (() => { const g = new THREE.ConeGeometry(0.06, 0.2, 4); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.62); return g; })();
const fbGeo = new THREE.SphereGeometry(0.55, 8, 6);
const Z = new THREE.Vector3(0, 0, 1);
function shootArrow(from, dir, charge, owner = 'player') {
  const g = new THREE.Group(), full = charge >= 0.95;
  g.add(new THREE.Mesh(arrowGeo, full ? GLOW(0xfff0a0) : M(0xe6d6b0)), new THREE.Mesh(tipGeo, full ? GLOW(0xffffff) : GOLD));
  if (full) { const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.6 })); glow.position.z = 0.6; g.add(glow); }
  g.position.copy(from); scene.add(g);
  const sp = owner === 'ally' ? 70 : 85 + charge * 50;
  arrows.push({ g, vel: dir.clone().multiplyScalar(sp), life: 3, dmg: owner === 'ally' ? 1 : full ? 7 : 1 + charge * 3, owner, charge, stuck: false });
}
function fireball(from, vel) {
  const g = new THREE.Mesh(fbGeo, GLOW(0xff6a10)); const inner = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), GLOW(0xfff080)); g.add(inner);
  g.position.copy(from); scene.add(g); arrows.push({ g, vel, life: 4, dmg: 14, owner: 'enemy', fire: true });
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
function segSegDist(p1, q1, p2, q2) {
  const d1 = _a.subVectors(q1, p1), d2 = _b.subVectors(q2, p2), r = _c.subVectors(p1, p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r); let s, t;
  if (a <= 1e-8 && e <= 1e-8) return p1.distanceTo(p2);
  if (a <= 1e-8) { s = 0; t = clamp(f / e, 0, 1); }
  else { const c = d1.dot(r); if (e <= 1e-8) { t = 0; s = clamp(-c / a, 0, 1); } else { const b = d1.dot(d2), den = a * e - b * b; s = den !== 0 ? clamp((b * f - c * e) / den, 0, 1) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); } } }
  const c1 = _d.copy(p1).addScaledVector(d1, s), c2 = p2.clone().addScaledVector(d2, t); return c1.distanceTo(c2);
}
const _prev = new THREE.Vector3(), _bot = new THREE.Vector3(), _top = new THREE.Vector3(), _w = new THREE.Vector3();
function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i]; a.life -= dt;
    if (a.life <= 0) { scene.remove(a.g); arrows.splice(i, 1); continue; }
    if (a.stuck) continue;
    _prev.copy(a.g.position);
    if (!a.fire) a.vel.y -= (a.charge >= 0.95 ? 2 : 9) * dt;
    a.g.position.addScaledVector(a.vel, dt);
    if (!a.fire) a.g.quaternion.setFromUnitVectors(Z, _w.copy(a.vel).normalize());
    const p = a.g.position;
    let hit = false;
    if (a.owner === 'enemy') {
      _bot.set(player.pos.x, player.pos.y + 0.3, player.pos.z); _top.set(player.pos.x, player.pos.y + 1.8, player.pos.z);
      if (!player.dead && segSegDist(_prev, p, _bot, _top) < 1.0) { hurtPlayer(a.dmg); burst(p.clone(), 0xff8a20, 14); hit = true; }
    } else {
      for (const e of enemies) {
        if (e.dead) continue;
        if (e.kind === 'ravana' && e.phase === 2) {
          e.mesh.userData.weak.getWorldPosition(_w);
          if (segSegDist(_prev, p, _w, _w) < 1.5) { damageEnemy(e, a.dmg, p.clone(), a.charge, true); hit = true; break; }
        }
        const sc = e.def.radius;
        _bot.set(e.pos.x, e.pos.y + 0.4, e.pos.z); _top.set(e.pos.x, e.pos.y + e.def.height, e.pos.z);
        if (segSegDist(_prev, p, _bot, _top) < sc + 0.15) { damageEnemy(e, a.dmg, p.clone(), a.charge || 0, false); hit = true; break; }
      }
    }
    if (hit) { scene.remove(a.g); arrows.splice(i, 1); continue; }
    const g = groundAt(p.x, p.z);
    if (p.y < g || (p.y < 0 && g < 0)) {
      if (a.fire) { burst(p.clone(), 0xff6a10, 12); scene.remove(a.g); arrows.splice(i, 1); }
      else { a.stuck = true; a.life = Math.min(a.life, 4); if (p.y < 0 && g < 0) { burst(p.clone().setY(0.1), 0xcfe8ff, 6, 3); scene.remove(a.g); arrows.splice(i, 1); } }
    }
  }
}
const partGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
function burst(pos, color, n = 10, speed = 4) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
  for (let i = 0; i < n; i++) {
    if (particles.length > 260) break;
    const m = new THREE.Mesh(partGeo, mat); m.position.copy(pos); scene.add(m);
    particles.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2).multiplyScalar(speed), life: 0.5 + Math.random() * 0.4, mat });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt; p.v.y -= 9 * dt; p.m.position.addScaledVector(p.v, dt); p.m.scale.setScalar(Math.max(0.01, p.life * 1.6));
    if (p.life <= 0) { scene.remove(p.m); particles.splice(i, 1); }
  }
}
function firework() {
  const n = 70, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
  const c = new THREE.Vector3((Math.random() - 0.5) * 160, 55 + Math.random() * 35, -610 + (Math.random() - 0.5) * 160);
  for (let i = 0; i < n; i++) { pos.set([c.x, c.y, c.z], i * 3); const v = new THREE.Vector3().randomDirection().multiplyScalar(14 + Math.random() * 6); vel.push(v); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: [0xffd040, 0xff5a8a, 0x6af0ff, 0xb0ff6a, 0xff8a20][Math.floor(Math.random() * 5)], size: 1.6, transparent: true, fog: false, depthWrite: false });
  const pts = new THREE.Points(geo, mat); scene.add(pts); world.fireworks.push({ pts, vel, life: 2.2 }); sfx.pop();
}
function updateFireworks(dt) {
  if (stage >= 15 && hyp(player.pos.x, player.pos.z + 610) < 400) { world.fwT = (world.fwT || 0) - dt; if (world.fwT <= 0) { firework(); world.fwT = 0.5 + Math.random() * 0.9; } }
  for (let i = world.fireworks.length - 1; i >= 0; i--) {
    const f = world.fireworks[i]; f.life -= dt; const a = f.pts.geometry.attributes.position;
    for (let k = 0; k < f.vel.length; k++) { f.vel[k].y -= 6 * dt; f.vel[k].multiplyScalar(0.985); a.setXYZ(k, a.getX(k) + f.vel[k].x * dt, a.getY(k) + f.vel[k].y * dt, a.getZ(k) + f.vel[k].z * dt); }
    a.needsUpdate = true; f.pts.material.opacity = clamp(f.life / 1.2, 0, 1);
    if (f.life <= 0) { scene.remove(f.pts); f.pts.geometry.dispose(); world.fireworks.splice(i, 1); }
  }
}

// ================= HUD helpers =================
let toastT = null;
function toast(t, ms = 2600) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }
const floaters = [];
function floater(pos, text, cls = '') { const el = document.createElement('div'); el.className = 'floater ' + cls; el.textContent = text; $('floaters').appendChild(el); floaters.push({ el, pos: pos.clone(), t: 0 }); }
const _v = new THREE.Vector3();
function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.t += dt; f.pos.y += dt * 1.5; _v.copy(f.pos).project(camera);
    if (_v.z > 1 || f.t > 0.9) { f.el.remove(); floaters.splice(i, 1); continue; }
    f.el.style.left = ((_v.x + 1) / 2) * innerWidth + 'px'; f.el.style.top = ((1 - _v.y) / 2) * innerHeight + 'px'; f.el.style.opacity = 1 - f.t / 0.9;
  }
}
let regionCur = '', regionT = null;
const DEVA = { 'Ayodhya': 'अयोध्या', 'Banks of the Sarayu': 'सरयू', 'Dandaka Forest': 'दण्डकारण्य', 'Panchavati': 'पञ्चवटी', 'Kishkindha': 'किष्किन्धा', 'The Southern Shore': 'दक्षिण सागर', 'Rama Setu': 'राम सेतु', 'Lanka': 'लंका', 'Kosala Plains': 'कोसल' };
function regionAt(x, z) {
  if (Math.abs(x) < 7 && z > world.bStart + 6 && z < world.bEnd - 6) return 'Rama Setu';
  if (hyp(x, z - 705) < 185) return 'Lanka';
  if (Math.abs(x) < 140 && Math.abs(z + 610) < 140) return 'Ayodhya';
  if (Math.abs(z - riverZ(x)) < 24) return 'Banks of the Sarayu';
  if (hyp(x - 170, z + 40) < 70) return 'Panchavati';
  if (hyp(x + 250, z - 245) < 190) return 'Kishkindha';
  if (z > 330) return 'The Southern Shore';
  if (z > -390 && z < 180) return 'Dandaka Forest';
  return 'Kosala Plains';
}
function checkRegion() {
  const r = regionAt(player.pos.x, player.pos.z); if (r === regionCur) return; regionCur = r;
  $('regionName').textContent = r; $('regionDeva').textContent = DEVA[r] || ''; const el = $('region'); el.classList.add('show');
  clearTimeout(regionT); regionT = setTimeout(() => el.classList.remove('show'), 2600);
}

// minimap
const mapCanvas = document.createElement('canvas'); mapCanvas.width = mapCanvas.height = N + 1;
const mm = $('minimap').getContext('2d'), bm = $('bigmapc').getContext('2d');
function drawMinimap() {
  const S = 180, viewR = 150, px = (player.pos.x + HALF) / STEP, pz = (player.pos.z + HALF) / STEP, r = viewR / STEP;
  mm.save(); mm.clearRect(0, 0, S, S); mm.beginPath(); mm.arc(S / 2, S / 2, S / 2, 0, TAU); mm.clip();
  mm.imageSmoothingEnabled = true; mm.drawImage(mapCanvas, px - r, pz - r, r * 2, r * 2, 0, 0, S, S);
  const toMM = (x, z) => [S / 2 + ((x - player.pos.x) / viewR) * (S / 2), S / 2 + ((z - player.pos.z) / viewR) * (S / 2)];
  for (const e of enemies) if (!e.dead) { const [ex, ez] = toMM(e.pos.x, e.pos.z); mm.fillStyle = e.def.boss ? '#ff3020' : '#d02a2a'; mm.beginPath(); mm.arc(ex, ez, e.def.boss ? 5 : 2.5, 0, TAU); mm.fill(); }
  const tg = objective();
  if (tg) { let [tx, tz] = toMM(tg[0], tg[1]); const dx = tx - S / 2, dz = tz - S / 2, dd = hyp(dx, dz); if (dd > S / 2 - 8) { tx = S / 2 + dx / dd * (S / 2 - 8); tz = S / 2 + dz / dd * (S / 2 - 8); }
    mm.fillStyle = '#ffd040'; mm.strokeStyle = '#000'; mm.lineWidth = 2; mm.beginPath(); mm.arc(tx, tz, 6, 0, TAU); mm.fill(); mm.stroke(); }
  mm.translate(S / 2, S / 2); mm.rotate(-player.facing + Math.PI); mm.fillStyle = '#fff'; mm.strokeStyle = '#1a3a8a'; mm.lineWidth = 2;
  mm.beginPath(); mm.moveTo(0, -8); mm.lineTo(6, 6); mm.lineTo(0, 3); mm.lineTo(-6, 6); mm.closePath(); mm.fill(); mm.stroke();
  mm.restore();
}
function drawBigMap() {
  const S = 640, k = S / (HALF * 2); bm.drawImage(mapCanvas, 0, 0, S, S);
  const P = (x, z) => [(x + HALF) * k, (z + HALF) * k];
  bm.font = 'bold 15px Cinzel, Georgia, serif'; bm.textAlign = 'center';
  for (const [n, x, z] of [['Ayodhya', 0, -680], ['Sarayu', 170, -425], ['Dandaka Forest', 40, -170], ['Panchavati', 175, -5], ['Kishkindha', -250, 190], ['Southern Shore', -200, 370], ['Rama Setu', 60, 480], ['Lanka', 0, 610]]) {
    const [a, b] = P(x, z); bm.fillStyle = 'rgba(0,0,0,.6)'; bm.fillText(n, a + 1, b + 1); bm.fillStyle = '#ffe9b0'; bm.fillText(n, a, b);
  }
  if (stage >= 12) { const [a, b] = P(0, world.bStart), [, d] = P(0, world.bEnd); bm.fillStyle = '#b8a890'; bm.fillRect(a - 3, b, 6, d - b); }
  const tg = objective(); if (tg) { const [a, b] = P(...tg); bm.fillStyle = '#ffd040'; bm.strokeStyle = '#000'; bm.lineWidth = 2; bm.beginPath(); bm.arc(a, b, 8, 0, TAU); bm.fill(); bm.stroke(); }
  const [a, b] = P(player.pos.x, player.pos.z); bm.save(); bm.translate(a, b); bm.rotate(-player.facing + Math.PI); bm.fillStyle = '#fff'; bm.strokeStyle = '#1a3a8a'; bm.lineWidth = 2;
  bm.beginPath(); bm.moveTo(0, -10); bm.lineTo(7, 8); bm.lineTo(0, 4); bm.lineTo(-7, 8); bm.closePath(); bm.fill(); bm.stroke(); bm.restore();
}

// ================= dialogue =================
let dlgQ = null, dlgDone = null, dlgReady = 0;
const inDlg = () => dlgQ !== null;
function say(lines, done) { dlgQ = lines.slice(); dlgDone = done || null; $('dlg').classList.remove('hidden'); charging = false; chargeT = 0; nextLine(true); }
function nextLine(force) {
  if (!dlgQ) return; if (!force && performance.now() < dlgReady) return;
  if (dlgQ.length === 0) { $('dlg').classList.add('hidden'); const d = dlgDone; dlgQ = null; dlgDone = null; if (d) d(); return; }
  const [who, txt] = dlgQ.shift(); $('dname').textContent = who || ''; const t = $('dtext'); t.textContent = txt; t.classList.toggle('narr', !who);
  dlgReady = performance.now() + 250; sfx.pick && tone(440, 0.05, 'sine', 0.04);
}
$('dlg').addEventListener('pointerdown', (e) => { e.stopPropagation(); nextLine(); });

// ================= quests =================
const nearestTag = (t, fb) => { let best = null, bd = 1e9; for (const e of enemies) if (!e.dead && e.tag === t) { const d = hyp(e.pos.x - player.pos.x, e.pos.z - player.pos.z); if (d < bd) { bd = d; best = [e.pos.x, e.pos.z]; } } return best || fb; };
const STAGES = [
  { title: 'The Promise of a King', desc: () => 'Speak with King Dasharatha in the palace courtyard.', target: () => LOC.dasharatha, cp: LOC.start },
  { title: 'Into Exile', desc: () => 'Leave Ayodhya with Sita and Lakshmana. Cross the Sarayu and find the ashram of the sages in the Dandaka forest.', target: () => LOC.ashram, cp: LOC.start },
  { title: 'Protector of the Rishis', desc: () => `Rakshasas are attacking the ashram. Defeat them (${aliveTag('rishis')} left).`, target: () => nearestTag('rishis', LOC.ashram), cp: [40, -236], enter: () => { if (!aliveTag('rishis')) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; spawnEnemy(i === 5 ? 'brute' : 'rakshasa', 60 + Math.cos(a) * 26, -260 + Math.sin(a) * 26, 'rishis').provoked = true; } } },
  { title: 'Gift of the Sage', desc: () => 'Speak with Sage Agastya by the sacred fire.', target: () => LOC.agastya, cp: [40, -236] },
  { title: 'Panchavati', desc: () => 'Travel south-east to Panchavati, by the Godavari, and make your home there.', target: () => LOC.hut, cp: [60, -236] },
  { title: 'The Golden Deer', desc: () => 'Sita longs for the golden deer. Hunt it with your arrows — it is fast, and it is not what it seems.', target: () => nearestTag('deer', LOC.panchavati), cp: [160, -28],
    enter: () => { if (!aliveTag('deer')) { const p = randomLandNear(170, -40, 60, 30); spawnEnemy('deer', p[0], p[1], 'deer', { onDeath: deerDied }); } } },
  { title: 'An Empty Hut', desc: () => 'Something is wrong. Hurry back to the hut at Panchavati.', target: () => LOC.hut, cp: [160, -28] },
  { title: 'The Brave Vulture', desc: () => 'Follow the trail of scattered flowers south. Find who saw Sita taken.', target: () => LOC.jatayu, cp: [150, -20] },
  { title: 'Kishkindha', desc: () => 'Go west into the rocky hills of Kishkindha and seek the vanaras.', target: () => LOC.hanuman, cp: [40, 140] },
  { title: "Sugriva's Cause", desc: () => 'Climb to the hilltop ring of stones and defeat Vali.', target: () => nearestTag('vali', LOC.arena), cp: [-140, 185],
    enter: () => { if (!aliveTag('vali')) spawnEnemy('vali', ...LOC.arena, 'vali', { onDeath: valiDied }); } },
  { title: 'Stones That Float', desc: () => `Gather the stones inscribed with Rama's name along the southern shore (${stones.filter(Boolean).length}/5).`, target: () => { let b = null, bd = 1e9; for (const s of world.stones) if (!stones[s.i]) { const d = hyp(s.x - player.pos.x, s.z - player.pos.z); if (d < bd) { bd = d; b = [s.x, s.z]; } } return b; }, cp: [0, 360] },
  { title: 'Rama Setu', desc: () => 'Bring the stones to Nala at the shore and build the bridge to Lanka.', target: () => [npcs.nala.mesh.position.x, npcs.nala.mesh.position.z], cp: [0, 360] },
  { title: 'The Gates of Lanka', desc: () => `Cross the bridge and break the rakshasa army before Lanka's gate (${aliveTag('gates')} left).`, target: () => nearestTag('gates', [0, 630]), cp: [0, 372],
    enter: () => { if (!aliveTag('gates')) for (let i = 0; i < 10; i++) spawnEnemy(i % 4 === 3 ? 'brute' : 'rakshasa', -24 + (i % 5) * 12, 598 + Math.floor(i / 5) * 18, 'gates'); } },
  { title: 'Ten-Headed Ravana', desc: () => flags.phase2 ? 'Draw a full divine arrow (hold until the ring is full) and strike Ravana\'s glowing navel.' : 'Enter the fortress and face Ravana.', target: () => nearestTag('ravana', LOC.ravana), cp: [0, 600],
    enter: () => { flags.phase2 = false; if (!aliveTag('ravana')) { const r = spawnEnemy('ravana', ...LOC.ravana, 'ravana', { onDeath: ravanaDied }); r.yaw = Math.PI; } } },
  { title: 'Reunion', desc: () => 'Go to Sita in the Ashoka grove.', target: () => LOC.grove, cp: [0, 690] },
  { title: 'Deepavali', desc: () => 'Ayodhya welcomes its prince with a thousand lamps. Speak with Bharata.', target: () => [0, -606], cp: [0, -575] },
  { title: 'Jai Shri Ram', desc: () => 'The journey is complete. The world is yours to roam.', target: () => null, cp: [0, -575] },
];
const objective = () => (STAGES[stage].target ? STAGES[stage].target() : null);
function setStage(n, resume = false) {
  stage = n; saveGame(); if (n > Number(store('best_ramayana') || 0)) store('best_ramayana', String(n)); applyWorldState(); if (STAGES[n].enter) STAGES[n].enter(resume); updateQuestUI();
  if (!resume) { sfx.chime(); toast('New quest: ' + STAGES[n].title); }
}
function updateQuestUI() { $('qtitle').textContent = STAGES[stage].title; $('qdesc').textContent = STAGES[stage].desc(); }

function deerDied(e) {
  const p = e.pos.clone(); const m = makeRakshasa(); m.position.copy(p); scene.add(m); burst(p.clone().setY(p.y + 1), 0x8a2aff, 30, 6);
  say([['', 'The golden deer falls — and its body twists into the rakshasa Maricha, Ravana\'s servant.'],
    ['Maricha', '(in Rama\'s own voice) "Ha Sita! Ha Lakshmana! Help me!"'],
    ['Rama', 'That was my voice… It was a trap to draw us away. Sita!']], () => {
    scene.remove(m); setStage(6);
    launchVimana();
  });
}
function launchVimana() {
  const v = makeVimana(); const rav = makeRavana(); rav.scale.setScalar(0.45); rav.position.set(0, 2.4, -0.5); v.add(rav);
  const sit = makeChar({ skin: 0xe8b48a, cloth: 0xc0203a, top: 0xe0a030, skirt: true, hair: 0x1a1010 }); sit.position.set(0.8, 2.4, 1); v.add(sit);
  v.position.set(LOC.hut[0], terrainH(...LOC.hut) + 6, LOC.hut[1]); scene.add(v); world.vimana = { g: v, t: 0 };
}
function valiDied() {
  setTimeout(() => {
    setNPC('sugriva', true, -238, 252);
    say([['Vali', 'Rama… so it was your arrow. I see it now — I wronged my brother.'],
      ['Sugriva', 'Rama! You have returned my home and my honour. Every vanara in Kishkindha is yours to command.'],
      ['Hanuman', 'My lord, while you fought, I leapt across the sea to Lanka. I found Mother Sita in the Ashoka grove, guarded by rakshasis.'],
      ['Hanuman', 'She is alive and she waits for you. She gave me her hair-jewel, the chudamani, to bring to you.'],
      ['Hanuman', 'But the ocean lies between us. Nala says stones carved with your name will float. Gather five of them on the southern shore.']], () => setStage(10));
  }, 900);
}
function ravanaPhase2(e) {
  flags.phase2 = true; e.mesh.userData.weak.visible = true; sfx.roar();
  say([['Ravana', 'Fool! Cut one head and two more take its place. I cannot die!'],
    ['Vibhishana', 'Rama! The nectar of immortality is stored in his navel. Draw your arrow fully — the Brahmastra — and strike the glowing navel!'],
    ['', 'Hold fire until the ring is full, then aim at the glowing light. Three strikes will end him.']], updateQuestUI);
}
function ravanaDied() {
  setTimeout(() => say([['Ravana', 'Rama… so this is how it ends. Even ten heads could not see it coming.'],
    ['', 'The Brahmastra pierces the nectar. The ten-headed king falls, and all of Lanka falls silent.'],
    ['Vibhishana', 'It is over, Rama. Go to her. She waits in the Ashoka grove.']], () => { clearTag('summon'); setStage(14); }), 1200);
}

function talkTo(n) {
  const id = n.id;
  n.mesh.rotation.y = Math.atan2(player.pos.x - n.mesh.position.x, player.pos.z - n.mesh.position.z);
  if (id === 'dasharatha' && stage === 0) {
    return say([['King Dasharatha', 'Rama, my son… Long ago I promised Queen Kaikeyi two boons. Today she has claimed them both.'],
      ['King Dasharatha', 'Bharata is to be crowned, and you must live fourteen years in the forest as an exile.'],
      ['Rama', 'Father, your word is dharma. I will go gladly. Do not grieve for me.'],
      ['Sita', 'Where Rama goes, I go. The forest with you is better than any palace without you.'],
      ['Lakshmana', 'And I will guard you both, brother — every day and every night.'],
      ['King Dasharatha', 'Go then, with my blessing. Cross the Sarayu to the south and seek the sages of the Dandaka forest.']], () => setStage(1));
  }
  if (id === 'agastya' && stage === 3) {
    return say([['Sage Agastya', 'The forest breathes freely again. Take my blessing, Rama: the power to draw divine arrows.'],
      ['Sage Agastya', 'Hold the bowstring longer and the arrow fills with light. A fully drawn arrow strikes with the force of the gods.'],
      ['', isTouch ? 'Divine arrows unlocked: hold the bow button to draw, release to loose.' : 'Divine arrows unlocked: hold left click (or F) to draw, release to loose.'],
      ['Sage Agastya', 'Now go south-east to Panchavati, beside the Godavari. Make your home there for a while.']], () => setStage(4));
  }
  if (id === 'jatayu' && stage === 7) {
    return say([['Jatayu', 'Rama… it was Ravana, king of Lanka. He carried Sita away in his flying chariot.'],
      ['Jatayu', 'I fought him with all I had… he cut my wings. He flew south, toward the sea.'],
      ['Jatayu', 'Seek the vanaras in the hills of Kishkindha, to the west… they will help you…'],
      ['', 'Jatayu, king of the vultures, breathes his last. Rama himself performs his final rites.']], () => setStage(8));
  }
  if (id === 'hanuman' && stage === 8) {
    return say([['Hanuman', 'Who are you, noble archers, walking the hills of Kishkindha with such sorrow on your faces?'],
      ['Rama', 'I am Rama, son of Dasharatha. My wife Sita has been taken by Ravana.'],
      ['Hanuman', 'Rama! My heart knew your name before you spoke it. I am Hanuman, minister to Sugriva.'],
      ['Hanuman', 'Sugriva was driven out by his brother Vali, who now rules by force. Help Sugriva, and every vanara will search the earth for Sita.'],
      ['Hanuman', 'Vali waits on the high plateau among the standing stones, to the south-west. Beware — he is mighty, and he leaps.']], () => setStage(9));
  }
  if (id === 'nala' && stage === 11) {
    return say([['Nala', 'Five stones carved with "Rama"! Watch, my lord — they will not sink.'],
      ['', 'The vanaras pass the stones hand to hand. Stone by stone, a bridge rises over the waves.']], buildSetu);
  }
  if (id === 'sita' && stage === 14) {
    return say([['Sita', 'Rama… I knew you would come. Every day I counted the leaves of this Ashoka tree, and waited.'],
      ['Rama', 'The years of exile are over, Sita. Let us go home.'],
      ['Hanuman', 'The Pushpaka vimana is ready, my lord. Ayodhya is waiting!']], goHome);
  }
  if (id === 'bharata' && stage === 15) {
    return say([['Bharata', 'Brother! All these years I kept your sandals on the throne and ruled only in your name. The kingdom is yours again.'],
      ['Rama', 'Thank you, Bharata. Dharma has been kept by all of us.'],
      ['', 'And so Rama was crowned in Ayodhya, and his rule — Rama Rajya — was remembered for ages as a time of peace and justice.']], () => { setStage(16); showCredits(); });
  }
  if (id === 'lakshmana' && stage === 6) return;
  const l = n.lines; if (!l.length) return;
  say([[n.name, l[n.li++ % l.length]]]);
}
function buildSetu() {
  setBridge(true, false); world.bridge.forEach((b, i) => { b.rise = -i * 0.6; b.g.position.y = -30; });
  sfx.boom(); shake = 0.5; setTimeout(() => setStage(12), 400);
}
function goHome() {
  const f = $('fade'); f.textContent = 'The Pushpaka vimana carries them north, over the sea, over the forests, home…'; f.style.opacity = 1;
  setTimeout(() => {
    player.pos.set(0, groundAt(0, -575), -575); player.facing = Math.PI; camYaw = 0; dayT = 0.76;
    setStage(15); f.style.opacity = 0; setTimeout(() => (f.textContent = ''), 900);
    say([['', 'Ayodhya lights a thousand lamps to welcome Rama home. This night will be celebrated forever as Deepavali, the festival of lights.']]);
  }, 2600);
}
function showCredits() { playing = false; document.exitPointerLock?.(); $('credits').classList.remove('hidden'); }

function updateQuest(dt) {
  const px = player.pos.x, pz = player.pos.z;
  if (stage === 1 && hyp(px - LOC.ashram[0], pz - LOC.ashram[1]) < 26) {
    say([['Sage Agastya', 'Rama! You arrive at the right hour. Rakshasas have been defiling our sacred fires.'],
      ['Sage Agastya', 'Drive them from the ashram, and the rishis will bless you.'],
      ['Lakshmana', 'I will cover your back, brother. Loose your arrows!']], () => setStage(2));
  } else if (stage === 2 && aliveTag('rishis') === 0) setStage(3);
  else if (stage === 4 && hyp(px - LOC.hut[0], pz - LOC.hut[1]) < 18) {
    say([['Sita', 'Look, Rama! A deer with a golden hide and silver spots… I have never seen anything so lovely.'],
      ['Sita', 'Will you catch it for me?'],
      ['Lakshmana', 'Brother, no deer is made of gold. This smells of rakshasa magic.'],
      ['Rama', 'Then I will find out what it is. Lakshmana, stay here and guard Sita. Do not leave her side.']], () => setStage(5));
  } else if (stage === 6 && hyp(px - LOC.hut[0], pz - LOC.hut[1]) < 12) {
    say([['Lakshmana', 'Brother! Sita heard your cry and begged me to go to you. I drew a line around the hut and told her not to cross it…'],
      ['Lakshmana', 'When I came back… she was gone. Only her flowers, scattered on the path to the south.'],
      ['Rama', 'Sita!… We follow the trail. Whoever did this will answer for it.']], () => setStage(7));
  } else if (stage === 10) {
    for (const s of world.stones) if (!stones[s.i] && hyp(px - s.x, pz - s.z) < 3) {
      stones[s.i] = 1; s.g.visible = false; sfx.pick(); burst(new THREE.Vector3(s.x, terrainH(s.x, s.z) + 1.5, s.z), 0xffc040, 20); saveGame();
      const c = stones.filter(Boolean).length; toast(`Stone of Rama ${c}/5`); updateQuestUI();
      if (c >= 5) setTimeout(() => setStage(11), 600);
    }
  } else if (stage === 12 && aliveTag('gates') === 0 && !inDlg()) {
    say([['Vibhishana', 'The gate is broken! Ravana waits in the courtyard beyond the walls.'],
      ['Vibhishana', 'Beware, Rama — my brother does not die like other beings. If his heads grow back, listen for my voice.']], () => setStage(13));
  } else if (stage === 13 && !flags.ravanaMet) {
    const r = enemies.find((e) => e.kind === 'ravana' && !e.dead);
    if (r && hyp(px - r.pos.x, pz - r.pos.z) < 45) {
      flags.ravanaMet = true; sfx.roar();
      say([['Ravana', 'So the forest-dweller has come with his army of monkeys. I am Ravana — ten heads, twenty arms, lord of all three worlds!'],
        ['Rama', 'Return Sita, Ravana, and you may yet live.'],
        ['Ravana', 'Ha! Come then, little prince — and die.']]);
    }
  }
}

// ================= input =================
let locked = false, wasLocked = false, dragging = null;
const joy = { x: 0, y: 0, id: null, cx: 0, cy: 0 }, look = { id: null, x: 0, y: 0 };
let touchRun = false;
addEventListener('keydown', (e) => {
  if (e.repeat) { if (e.code !== 'KeyF') return; }
  keys[e.code] = true; initAudio();
  if (!playing) return;
  if (inDlg()) { if (['KeyE', 'Enter', 'Space'].includes(e.code)) nextLine(); return; }
  if (e.code === 'KeyE') interact();
  if (e.code === 'Space' && player.onGround) jump();
  if (e.code === 'KeyF' && !e.repeat) startCharge();
  if (e.code === 'KeyM' || e.code === 'Tab') { e.preventDefault(); toggleMap(); }
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
});
addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'KeyF') releaseCharge(); });
canvas.addEventListener('mousedown', (e) => {
  initAudio(); if (!playing || isTouch) return;
  if (inDlg()) { nextLine(); return; }
  if (!locked && e.button === 0) { lockPointer(); }
  if (e.button === 0) startCharge();
  if (e.button === 2 || !locked) dragging = { x: e.clientX, y: e.clientY };
});
addEventListener('mouseup', (e) => { if (e.button === 0) releaseCharge(); dragging = null; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('mousemove', (e) => {
  if (!playing || paused) return;
  if (locked) { camYaw -= e.movementX * 0.0024; camPitch = clamp(camPitch + e.movementY * 0.0022, -0.35, 1.15); }
  else if (dragging) { camYaw -= (e.clientX - dragging.x) * 0.005; camPitch = clamp(camPitch + (e.clientY - dragging.y) * 0.004, -0.35, 1.15); dragging = { x: e.clientX, y: e.clientY }; }
});
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) wasLocked = true; else if (wasLocked && playing && !paused && !inDlg() && $('bigmap').classList.contains('hidden')) { wasLocked = false; showPause(true); }
});
function lockPointer() { try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch {} }
function startCharge() { if (player.dead || inDlg() || paused) return; charging = true; chargeT = 0; }
function releaseCharge() {
  if (!charging) return; charging = false;
  if (shotCd > 0 || player.dead || inDlg()) return;
  const c = stage >= 4 ? clamp(chargeT, 0, 1) : 0;
  fireFromPlayer(c); shotCd = 0.28; aimHold = 0.4;
}
const _ray = new THREE.Raycaster();
function fireFromPlayer(c) {
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  // aim point: first enemy along the camera ray, else ground, else far
  let aim = null, best = 220;
  for (const e of enemies) {
    if (e.dead) continue; const center = e.pos.clone().setY(e.pos.y + e.def.height * 0.55);
    if (e.kind === 'ravana' && e.phase === 2) e.mesh.userData.weak.getWorldPosition(center);
    const toE = center.clone().sub(camera.position), t = toE.dot(fwd); if (t < 0 || t > best) continue;
    const perp = toE.sub(fwd.clone().multiplyScalar(t)).length(); if (perp < e.def.radius + 0.8) { best = t; aim = center; }
  }
  if (!aim) { for (let t = 4; t < 220; t += 2) { const p = camera.position.clone().addScaledVector(fwd, t); if (p.y < groundAt(p.x, p.z)) { aim = p; break; } } }
  if (!aim) aim = camera.position.clone().addScaledVector(fwd, 220);
  const from = player.pos.clone().add(new THREE.Vector3(Math.sin(player.facing) * 0.6, 1.55, Math.cos(player.facing) * 0.6));
  const dir = aim.clone().sub(from).normalize();
  if (c < 0.95) dir.y += 0.012 * from.distanceTo(aim) / 40;
  shootArrow(from, dir.normalize(), c); sfx.bow(c);
}
function jump() { player.vy = 10; player.onGround = false; player.jumpT = 0.25; }
function interact() { const n = nearestTalkable(); if (n) talkTo(n); }
function nearestTalkable() {
  let best = null, bd = 4.5;
  for (const k in npcs) { const n = npcs[k]; if (!n.mesh.visible) continue; const d = hyp(n.mesh.position.x - player.pos.x, n.mesh.position.z - player.pos.z); const r = k === 'jatayu' ? 6 : bd; if (d < r && d < (best ? best.d : 99)) best = { n, d }; }
  return best ? best.n : null;
}
function toggleMap() { const b = $('bigmap'); const show = b.classList.contains('hidden'); b.classList.toggle('hidden', !show); if (show) { drawBigMap(); document.exitPointerLock?.(); } }
$('bigmap').addEventListener('pointerdown', () => $('bigmap').classList.add('hidden'));
$('mapBtn').addEventListener('click', toggleMap);
$('muteBtn').addEventListener('click', () => { initAudio(); setMuted(!muted); });
$('pauseBtn').addEventListener('click', () => togglePause());
function showPause(v) { paused = v; $('pause').classList.toggle('hidden', !v); if (v) document.exitPointerLock?.(); }
function togglePause() { if (!playing) return; showPause(!paused); }
$('btnResume').addEventListener('click', () => { showPause(false); if (!isTouch) lockPointer(); });
$('btnRestart').addEventListener('click', () => { if (confirm('Restart the whole journey from Ayodhya?')) { store('ram_save', ''); location.reload(); } });
$('btnRoam').addEventListener('click', () => { $('credits').classList.add('hidden'); playing = true; if (!isTouch) lockPointer(); });

// Game Box integration: back to the Game Box home screen and the phone back button
const inBox = new URLSearchParams(location.search).has('box') || !!window.Capacitor;
function toGameBox() { saveGame(); location.replace('../index.html'); }
if (inBox) {
  for (const id of ['btnBox', 'btnBox2']) { $(id).classList.remove('hidden'); $(id).addEventListener('click', toGameBox); }
  const capApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (capApp) capApp.addListener('backButton', () => {
    if (!$('bigmap').classList.contains('hidden')) $('bigmap').classList.add('hidden');
    else if (playing && !paused) showPause(true);
    else toGameBox();
  });
}

// touch controls
function setupTouch() {
  $('touch').classList.remove('hidden'); $('crosshair').style.opacity = 0.75;
  const base = $('joyBase'), knob = $('joyKnob');
  addEventListener('touchstart', (e) => {
    initAudio(); if (!playing) return;
    for (const t of e.changedTouches) {
      if (t.target.closest('button') || t.target.closest('#dlg') || t.target.closest('#bigmap')) continue;
      if (inDlg()) { nextLine(); continue; }
      if (t.clientX < innerWidth * 0.42 && joy.id === null) {
        joy.id = t.identifier; joy.cx = t.clientX; joy.cy = t.clientY; base.style.left = t.clientX - 60 + 'px'; base.style.top = t.clientY - 60 + 'px'; base.style.bottom = 'auto';
      } else if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; }
    }
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) { let dx = t.clientX - joy.cx, dy = t.clientY - joy.cy; const l = hyp(dx, dy), mx = 50; if (l > mx) { dx = dx / l * mx; dy = dy / l * mx; } joy.x = dx / mx; joy.y = -dy / mx; knob.style.left = 34 + dx + 'px'; knob.style.top = 34 + dy + 'px'; }
      else if (t.identifier === look.id) { camYaw -= (t.clientX - look.x) * 0.0065; camPitch = clamp(camPitch + (t.clientY - look.y) * 0.005, -0.35, 1.15); look.x = t.clientX; look.y = t.clientY; }
    }
  }, { passive: true });
  const end = (e) => { for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy.id = null; joy.x = joy.y = 0; knob.style.left = knob.style.top = '34px'; } if (t.identifier === look.id) look.id = null; } };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
  const hold = (id, down, up) => { const b = $(id); b.addEventListener('touchstart', (e) => { e.preventDefault(); initAudio(); down(); }, { passive: false }); b.addEventListener('touchend', (e) => { e.preventDefault(); up && up(); }, { passive: false }); };
  hold('tFire', () => { if (inDlg()) nextLine(); else startCharge(); }, releaseCharge);
  hold('tJump', () => { if (player.onGround && !inDlg()) jump(); });
  hold('tAct', () => { if (inDlg()) nextLine(); else interact(); });
  hold('tRun', () => { touchRun = !touchRun; $('tRun').classList.toggle('on', touchRun); });
}

// ================= main update =================
function updatePlayer(dt) {
  if (player.dead) return;
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  ix += joy.x; iz += joy.y;
  const len = hyp(ix, iz); if (len > 1) { ix /= len; iz /= len; }
  const sprint = keys.ShiftLeft || keys.ShiftRight || touchRun;
  const g0 = groundAt(player.pos.x, player.pos.z);
  let spd = (sprint ? 14 : 7.5) * (charging ? 0.5 : 1) * (g0 < -0.2 ? 0.6 : 1);
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  const mx = (fx * iz + rx * ix) * spd, mz = (fz * iz + rz * ix) * spd, moving = hyp(ix, iz) > 0.05;
  if (moving) moveEntity(player.pos, mx * dt, mz * dt, 0.6); else collide(player.pos, 0.6);
  for (const e of enemies) if (!e.dead) { const sx = player.pos.x - e.pos.x, sz = player.pos.z - e.pos.z, sd = hyp(sx, sz), mn = 0.6 + e.def.radius; if (sd < mn && sd > 0.01) { player.pos.x = e.pos.x + sx / sd * mn; player.pos.z = e.pos.z + sz / sd * mn; } }
  let tf = player.facing;
  if (charging || aimHold > 0) tf = Math.atan2(fx, fz); else if (moving) tf = Math.atan2(mx, mz);
  player.facing = angLerp(player.facing, tf, 1 - Math.exp(-14 * dt));
  player.jumpT -= dt;
  const g = groundAt(player.pos.x, player.pos.z);
  player.vy -= 28 * dt; player.pos.y += player.vy * dt;
  if (player.pos.y <= g) { player.pos.y = g; player.vy = 0; player.onGround = true; }
  else if (player.onGround && player.jumpT <= 0 && player.pos.y - g < 1.2) { player.pos.y = g; player.vy = 0; }
  else player.onGround = false;
  const m = player.mesh; m.position.copy(player.pos); m.rotation.y = player.facing;
  animChar(m, moving ? spd * Math.min(1, len) : 0, dt);
  const u = m.userData;
  if (charging || aimHold > 0) { u.pose = true; u.arms[1].rotation.x = -1.55; u.arms[1].rotation.z = 0.15; u.bowHolder.rotation.x = 1.55; u.arms[0].rotation.x = -1.45; u.arms[0].rotation.z = -0.5 - chargeT * 0.4; }
  else if (u.pose) { u.pose = false; u.bowHolder.rotation.x = 0; u.arms[0].rotation.z = -0.08; u.arms[1].rotation.z = 0.08; }
  if (charging && stage >= 4) chargeT = Math.min(1, chargeT + dt * 1.1);
  shotCd -= dt; aimHold -= dt;
  player.regenT += dt; if (player.regenT > 5 && player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + dt * 4);
  for (let i = world.lotuses.length - 1; i >= 0; i--) {
    const l = world.lotuses[i]; l.t -= dt; l.g.rotation.y += dt; l.g.position.y = groundAt(l.x, l.z) + 0.2 + Math.sin(performance.now() / 400 + i) * 0.1;
    if (l.t <= 0) { scene.remove(l.g); world.lotuses.splice(i, 1); continue; }
    if (player.hp < player.maxHp && hyp(player.pos.x - l.x, player.pos.z - l.z) < 1.8) { player.hp = Math.min(player.maxHp, player.hp + 35); sfx.pick(); burst(l.g.position.clone(), 0xff9ac0, 14); floater(l.g.position.clone(), '+35'); scene.remove(l.g); world.lotuses.splice(i, 1); }
  }
}
function updateNPCs(dt) {
  const foes = enemies.filter((e) => !e.dead && e.kind !== 'deer' && !(e.kind === 'ravana' && e.phase === 2));
  for (const k in npcs) {
    const n = npcs[k], m = n.mesh; if (!m.visible) continue;
    let speed = 0;
    if (n.follow) {
      let tx = player.pos.x + Math.sin(player.facing) * n.offset[1] + Math.cos(player.facing) * n.offset[0];
      let tz = player.pos.z + Math.cos(player.facing) * n.offset[1] - Math.sin(player.facing) * n.offset[0];
      if (k === 'hanuman') { let best = null, bd = 22; for (const e of foes) { const d = hyp(e.pos.x - m.position.x, e.pos.z - m.position.z); if (d < bd && hyp(e.pos.x - player.pos.x, e.pos.z - player.pos.z) < 30) { bd = d; best = e; } } if (best) { tx = best.pos.x; tz = best.pos.z; n.atkCd -= dt; if (bd < 2.6 && n.atkCd <= 0) { n.atkCd = 1.1; damageEnemy(best, best.def.boss ? 0.6 : 1.5, best.pos.clone().setY(best.pos.y + 1.5), 0); m.userData.arms[0].rotation.x = -2.4; m.userData.pose = true; setTimeout(() => (m.userData.pose = false), 250); } } }
      const dx = tx - m.position.x, dz = tz - m.position.z, d = hyp(dx, dz);
      if (d > 70) { placeNear(n); }
      else if (d > 1.2) { speed = clamp(d * 2.2, 0, 15); const p = m.position; moveEntity(p, dx / d * speed * dt, dz / d * speed * dt, 0.5); m.rotation.y = angLerp(m.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-10 * dt)); }
      else m.rotation.y = angLerp(m.rotation.y, player.facing, 1 - Math.exp(-3 * dt));
      m.position.y = groundAt(m.position.x, m.position.z);
      if (k === 'lakshmana') { n.shootCd -= dt; if (n.shootCd <= 0) { let best = null, bd = 28; for (const e of foes) { const dd = hyp(e.pos.x - m.position.x, e.pos.z - m.position.z); if (dd < bd) { bd = dd; best = e; } } if (best) { n.shootCd = 1.7; const from = m.position.clone().setY(m.position.y + 1.6), to = best.pos.clone().setY(best.pos.y + best.def.height * 0.5); m.rotation.y = Math.atan2(to.x - from.x, to.z - from.z); shootArrow(from, to.sub(from).normalize(), 0, 'ally'); } else n.shootCd = 0.5; } }
    } else if (n.wander) {
      n.wt = (n.wt || 0) - dt;
      if (n.wt <= 0) { n.wt = 3 + Math.random() * 5; const a = Math.random() * TAU, r = Math.random() * n.wander.r; n.wto = Math.random() < 0.5 ? null : [n.home[0] + Math.cos(a) * r, n.home[1] + Math.sin(a) * r]; }
      const near = hyp(player.pos.x - m.position.x, player.pos.z - m.position.z) < 5;
      if (n.wto && !near) { const dx = n.wto[0] - m.position.x, dz = n.wto[1] - m.position.z, d = hyp(dx, dz); if (d > 0.5) { speed = 2.2; moveEntity(m.position, dx / d * speed * dt, dz / d * speed * dt, 0.5); m.rotation.y = Math.atan2(dx, dz); m.position.y = groundAt(m.position.x, m.position.z); } }
      if (near) m.rotation.y = angLerp(m.rotation.y, Math.atan2(player.pos.x - m.position.x, player.pos.z - m.position.z), 1 - Math.exp(-5 * dt));
    } else if (k !== 'jatayu' && hyp(player.pos.x - m.position.x, player.pos.z - m.position.z) < 9) {
      m.rotation.y = angLerp(m.rotation.y, Math.atan2(player.pos.x - m.position.x, player.pos.z - m.position.z), 1 - Math.exp(-4 * dt));
    }
    animChar(m, speed, dt);
  }
}
const SKY = { day: new THREE.Color(0x8fcaf0), dusk: new THREE.Color(0xf0a060), night: new THREE.Color(0x0e1a3a), lanka: new THREE.Color(0x5a2a2a) };
const _sky = new THREE.Color(), sunDir = new THREE.Vector3();
function updateSky(dt) {
  dayT = (dayT + dt / 540) % 1;
  const ph = dayT < 0.7 ? (dayT / 0.7) * Math.PI : Math.PI + ((dayT - 0.7) / 0.3) * Math.PI;
  const elev = Math.sin(ph), dayness = smooth(-0.12, 0.3, elev), duskF = clamp(1 - Math.abs(elev) / 0.32, 0, 1);
  _sky.copy(SKY.night).lerp(SKY.day, dayness).lerp(SKY.dusk, duskF * 0.55);
  const lk = 1 - smooth(140, 380, hyp(player.pos.x, player.pos.z - 705)); _sky.lerp(SKY.lanka, lk * 0.45);
  scene.background.copy(_sky); scene.fog.color.copy(_sky);
  scene.fog.far = lerp(950, 650, lk);
  if (elev > -0.05) { sunDir.set(Math.cos(ph) * 0.8, Math.max(0.12, elev), 0.45).normalize(); sun.color.setHex(0xfff1d6).lerp(SKY.dusk, duskF * 0.6); sun.intensity = 0.4 + 2.2 * dayness; }
  else { sunDir.set(-0.3, 0.8, 0.4).normalize(); sun.color.setHex(0x9ab0ff); sun.intensity = 0.45; }
  hemi.intensity = lerp(0.42, 1.05, dayness); hemi.color.setHex(0xd8ecff).lerp(SKY.night, 1 - dayness);
  sun.position.copy(player.pos).addScaledVector(sunDir, 220); sun.target.position.copy(player.pos);
  world.clouds.material.color.setHex(0xffffff).lerp(SKY.night, (1 - dayness) * 0.75).lerp(SKY.dusk, duskF * 0.3);
  world.water.material.color.setHex(0x2b86c4).lerp(SKY.night, (1 - dayness) * 0.6);
}
let camDist0 = 7.5, curDist = 7.5;
function updateCamera(dt) {
  if (!playing) camYaw += dt * 0.06;
  const d = charging ? 5.2 : camDist0, tgt = new THREE.Vector3(player.pos.x, player.pos.y + 2.0, player.pos.z);
  curDist = lerp(curDist, d, 1 - Math.exp(-6 * dt));
  const cp = Math.cos(camPitch), off = new THREE.Vector3(Math.sin(camYaw) * cp, Math.sin(camPitch), Math.cos(camYaw) * cp).multiplyScalar(curDist);
  const sh = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw)).multiplyScalar(charging || aimHold > 0 ? 1.0 : 0.55);
  camera.position.copy(tgt).add(off).add(sh);
  const cg = groundAt(camera.position.x, camera.position.z) + 0.7; if (camera.position.y < cg) camera.position.y = cg;
  if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake = Math.max(0, shake - dt * 1.5); }
  camera.lookAt(tgt.add(sh));
}
addEventListener('wheel', (e) => { camDist0 = clamp(camDist0 + Math.sign(e.deltaY) * 0.8, 4, 14); }, { passive: true });

let hudT = 0, regionTick = 0;
function updateHUD(dt) {
  $('hpfill').style.width = (player.hp / player.maxHp) * 100 + '%';
  $('hpfill').style.background = player.hp < 30 ? 'linear-gradient(90deg,#c22a2a,#e86b3b)' : '';
  const ring = $('chargeRing'); ring.style.strokeDashoffset = charging && stage >= 4 ? 88 * (1 - chargeT) : 88; ring.style.stroke = chargeT >= 0.95 ? '#fff6c0' : '#ffd36a';
  hudT -= dt; if (hudT <= 0) { hudT = 0.25; updateQuestUI(); drawMinimap(); }
  regionTick -= dt; if (regionTick <= 0) { regionTick = 0.5; checkRegion(); }
  const tg = objective(), ca = $('carrow'), cd = $('cdist');
  if (tg) {
    const dx = tg[0] - player.pos.x, dz = tg[1] - player.pos.z, dist = hyp(dx, dz);
    const ang = Math.atan2(dx, dz) - Math.atan2(-Math.sin(camYaw), -Math.cos(camYaw));
    ca.style.transform = `rotate(${-ang}rad)`; cd.textContent = Math.round(dist) + ' m';
    $('compass').classList.remove('hidden');
    beam.visible = dist > 12; beam.position.set(tg[0], groundAt(tg[0], tg[1]), tg[1]);
  } else { $('compass').classList.add('hidden'); beam.visible = false; }
  const n = inDlg() ? null : nearestTalkable();
  const p = $('prompt'); if (n) { p.textContent = (isTouch ? '' : 'E — ') + (n.id === 'jatayu' ? 'Kneel beside Jatayu' : 'Talk to ' + n.name); p.classList.remove('hidden'); } else p.classList.add('hidden');
  if (isTouch) { $('tAct').classList.toggle('hidden', !n && !inDlg()); $('tAct').textContent = inDlg() ? 'Next' : 'Talk'; }
  const boss = enemies.find((e) => e.def.boss && !e.dead && hyp(e.pos.x - player.pos.x, e.pos.z - player.pos.z) < 90);
  $('bossbar').classList.toggle('hidden', !boss);
  if (boss) { $('bossname').textContent = boss.def.name + (boss.phase === 2 ? ' — immortal' : ''); $('bossfill').style.width = (boss.phase === 2 ? (3 - boss.weakHits) / 3 : boss.hp / boss.maxHp) * 100 + '%'; }
}
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 160, 12, 1, true).translate(0, 80, 0), new THREE.MeshBasicMaterial({ color: 0xffd040, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false }));
scene.add(beam);

function updateWorld(dt) {
  const t = performance.now() / 1000;
  for (const f of world.flames) { if (f.flag) f.m.rotation.y = Math.sin(t * 2 + f.m.position.x) * 0.4; else f.m.scale.set(1, 0.8 + Math.sin(t * 13 + f.m.position.x) * 0.2, 1); }
  for (const s of world.stones) if (s.g.visible) { s.g.children[0].position.y = 1 + Math.sin(t * 2 + s.i) * 0.25; s.g.children[0].rotation.y += dt; }
  for (const b of world.bridge) if (b.built && b.rise < 1) { b.rise += dt * 0.7; const k = clamp(b.rise, 0, 1); b.g.position.y = lerp(-30, 0, 1 - Math.pow(1 - k, 3)); if (b.rise >= 1 && !b.boomed) { b.boomed = true; burst(new THREE.Vector3(0, 1.5, b.plat.z0 + 10), 0xcfe8ff, 30, 8); sfx.boom(); } }
  if (world.vimana) {
    const v = world.vimana; v.t += dt; const k = clamp(v.t / 22, 0, 1);
    v.g.position.set(lerp(LOC.hut[0], 0, k), lerp(terrainH(...LOC.hut) + 6, 70, Math.min(1, k * 3)), lerp(LOC.hut[1], 700, k)); v.g.rotation.y = Math.atan2(-LOC.hut[0], 740);
    if (k >= 1) { scene.remove(v.g); world.vimana = null; }
  }
  world.water.position.y = Math.sin(t * 0.6) * 0.06;
  updateClouds(dt); updateFireworks(dt);
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  frame(dt);
}
function frame(dt) {
  if (playing && !paused) {
    if (!inDlg()) {
      updatePlayer(dt);
      for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i]) updateEnemy(enemies[i], dt);
      updateNPCs(dt); updateArrows(dt); updateQuest(dt); updateAmbient(dt);
    }
    updateParticles(dt); updateFloaters(dt); updateHUD(dt);
  }
  updateWorld(dt); updateSky(playing && !paused ? dt : 0); updateCamera(dt);
  renderer.render(scene, camera);
}

// ================= boot =================
function controlsHTML() {
  return isTouch
    ? '<b>Left side</b> drag to move · <b>Right side</b> drag to look<br><b>🏹</b> hold to draw, release to shoot · <b>Talk</b> appears near people'
    : '<b>WASD</b> move · <b>Shift</b> run · <b>Space</b> jump · <b>Mouse</b> look<br><b>Left click / F</b> hold to draw, release to shoot · <b>E</b> talk<br><b>M</b> map · <b>P / Esc</b> pause · <b>Wheel</b> zoom';
}
function boot() {
  $('controlsHelp').innerHTML = controlsHTML(); $('controlsHelp2').innerHTML = controlsHTML();
  setMuted(muted);
  buildTerrain(); scatterTrees(); buildAyodhya(); buildForestSites(); buildLanka(); buildBridge(); buildStones(); buildLotuses(); buildClouds(); buildNPCs(); buildAmbient();
  mapCanvas.getContext('2d').putImageData(new ImageData(mapRGB, N + 1, N + 1), 0, 0);
  player.mesh = makeRama(); scene.add(player.mesh);
  player.pos.set(LOC.start[0], groundAt(...LOC.start), LOC.start[1]); player.mesh.position.copy(player.pos);
  applyWorldState(); updateCamera(0.016);
  $('loading').classList.add('hidden'); $('tbtns').classList.remove('hidden');
  const sv = loadSave(); if (sv && sv.stage > 0) $('btnContinue').classList.remove('hidden');
  $('btnNew').onclick = () => start(null);
  $('btnContinue').onclick = () => start(sv);
  requestAnimationFrame(loop);
}
function start(sv) {
  initAudio();
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden');
  if (isTouch) setupTouch(); else lockPointer();
  playing = true;
  if (sv) { stones = sv.stones || stones; Object.assign(flags, sv.flags || {}); flags.ravanaMet = false; stage = sv.stage; }
  else { stage = 0; stones = [0, 0, 0, 0, 0]; }
  const [x, z] = STAGES[stage].cp; player.pos.set(x, groundAt(x, z), z); player.facing = Math.PI; camYaw = 0;
  if (stage >= 15) dayT = 0.76;
  setStage(stage, true);
  if (!sv) say([['', 'Long ago, in the golden city of Ayodhya, Prince Rama was to be crowned heir to the throne of Kosala…'],
    ['', 'But on the morning of the coronation, King Dasharatha summoned his eldest son to the palace courtyard.'],
    ['', isTouch ? 'Drag the left side to move and the right side to look. Walk up to the king and tap Talk.' : 'Move with WASD and look with the mouse. Walk up to the king and press E to talk.']]);
  else toast('Welcome back. Quest: ' + STAGES[stage].title);
}
window.__ram = { tick: (n = 1) => { for (let i = 0; i < n; i++) frame(0.033); }, setStage: (n) => setStage(n), kill: (e) => killEnemy(e), aimAt: (x, z) => { camYaw = Math.atan2(player.pos.x - x, player.pos.z - z); camPitch = 0.12; }, talk: (id) => talkTo(npcs[id]), tp: (x, z) => player.pos.set(x, groundAt(x, z), z), player, enemies, get stage() { return stage; }, LOC, world, npcs };
try { boot(); } catch (err) { $('loading').textContent = 'Could not start: ' + err.message; console.error(err); }
