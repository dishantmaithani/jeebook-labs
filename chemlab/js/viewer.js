// ChemLab — interactive 3D molecule viewer (three.js).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';
import { LIBRARY, MOL_BY_ID, buildTree, buildCoords, analyse, fetchPubChem, hillFormula, el } from './molecules.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hex = c => '#' + c.toString(16).padStart(6, '0');
const SUGGEST = ['aspirin', 'caffeine', 'glucose', 'paracetamol', 'benzoic acid', 'phenol', 'urea', 'nicotine', 'ascorbic acid', 'adenine', 'cholesterol', 'ferrocene'];

let viewer = null;
export function openViewer(target) {
  if (!viewer) { viewer = new Viewer(); window.chemlabViewer = viewer; } // handy for debugging
  viewer.open(target);
}

class Viewer {
  constructor() {
    this.style = 'ball';
    this.showLp = true;
    this.showLabels = false;
    this.spin = true;
    this.sel = [];
    this.buildDom();
    this.initThree();
  }

  // ---------- DOM ----------
  buildDom() {
    const root = document.createElement('div');
    root.className = 'mv';
    root.hidden = true;
    const groups = [...new Set(LIBRARY.map(m => m.group))];
    root.innerHTML = `
      <aside class="mv-side">
        <div class="mv-title"><span>🧬</span><b>Molecule viewer</b></div>
        <form class="mv-search"><input type="search" placeholder="Search any molecule (e.g. aspirin)" aria-label="Search molecules"><button>Go</button></form>
        <div class="mv-chips">${SUGGEST.map(s => `<button data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        <div class="mv-list">${groups.map(g => `<h4>${esc(g)}</h4><div class="mv-grid">${LIBRARY.filter(m => m.group === g && !m.hidden).map(m => `<button data-id="${m.id}" title="${esc(m.name)}">${esc(m.formula)}</button>`).join('')}</div>`).join('')}</div>
      </aside>
      <section class="mv-stage">
        <div class="mv-canvas"></div>
        <div class="mv-bar">
          <div class="seg mv-style">
            <button data-s="ball" class="on">Ball &amp; stick</button><button data-s="space">Space-filling</button><button data-s="stick">Stick</button><button data-s="wire">Wire</button>
          </div>
          <button class="tool mv-t" data-t="lp">Lone pairs</button>
          <button class="tool mv-t" data-t="labels">Labels</button>
          <button class="tool mv-t" data-t="spin">Spin</button>
          <button class="tool" data-act="reset">Reset view</button>
          <button class="tool" data-act="png">Save image</button>
        </div>
        <div class="mv-hint">Drag to rotate · scroll to zoom · right-drag to pan · click atoms to measure distances and angles</div>
        <div class="mv-loading" hidden><span class="spin-dot"></span><span class="mv-ltext">Loading…</span></div>
        <button class="mv-close" title="Close (Esc)">✕</button>
      </section>
      <aside class="mv-info"></aside>`;
    document.body.appendChild(root);
    this.root = root;
    this.info = root.querySelector('.mv-info');
    this.stage = root.querySelector('.mv-canvas');
    this.loading = root.querySelector('.mv-loading');

    root.querySelector('.mv-close').addEventListener('click', () => this.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) this.close(); });
    root.querySelectorAll('.mv-grid button').forEach(b => b.addEventListener('click', () => this.open(b.dataset.id)));
    root.querySelectorAll('.mv-chips button').forEach(b => b.addEventListener('click', () => this.open({ query: b.dataset.q })));
    root.querySelector('.mv-search').addEventListener('submit', e => {
      e.preventDefault();
      const q = root.querySelector('.mv-search input').value.trim();
      if (q) this.open({ query: q });
    });
    root.querySelectorAll('.mv-style button').forEach(b => b.addEventListener('click', () => {
      this.style = b.dataset.s;
      root.querySelectorAll('.mv-style button').forEach(x => x.classList.toggle('on', x === b));
      this.rebuild();
    }));
    root.querySelectorAll('.mv-t').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.t;
      if (t === 'lp') { this.showLp = !this.showLp; this.rebuild(); }
      if (t === 'labels') { this.showLabels = !this.showLabels; this.labelRenderer.domElement.style.display = this.showLabels ? '' : 'none'; }
      if (t === 'spin') { this.spin = !this.spin; this.controls.autoRotate = this.spin; }
      this.syncToggles();
    }));
    root.querySelector('[data-act="reset"]').addEventListener('click', () => this.fit());
    root.querySelector('[data-act="png"]').addEventListener('click', () => this.savePng());
    this.syncToggles();
  }
  syncToggles() {
    const set = (t, on) => this.root.querySelector(`.mv-t[data-t="${t}"]`).classList.toggle('on', on);
    set('lp', this.showLp); set('labels', this.showLabels); set('spin', this.spin);
  }

  // ---------- three.js ----------
  initThree() {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;
    this.stage.appendChild(r.domElement);
    this.renderer = r;
    const lr = new CSS2DRenderer();
    lr.domElement.className = 'mv-labels';
    lr.domElement.style.display = 'none';
    this.stage.appendChild(lr.domElement);
    this.labelRenderer = lr;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
    this.scene.add(this.camera);
    this.scene.add(new THREE.HemisphereLight(0xdfefff, 0x202838, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(4, 6, 8);
    this.camera.add(key);
    const rim = new THREE.DirectionalLight(0x88ccff, 0.8);
    rim.position.set(-6, -2, -4);
    this.camera.add(rim);

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.controls = new OrbitControls(this.camera, r.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = this.spin;
    this.controls.autoRotateSpeed = 1.6;

    this.geoSphere = new THREE.SphereGeometry(1, 40, 28);
    this.geoCyl = new THREE.CylinderGeometry(1, 1, 1, 20, 1);
    this.mats = new Map();

    new ResizeObserver(() => this.resize()).observe(this.stage);

    // picking (click without dragging)
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    let down = null;
    r.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    r.domElement.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const b = r.domElement.getBoundingClientRect();
      ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(ptr, this.camera);
      const hit = ray.intersectObjects(this.atomMeshes || [], false)[0];
      this.pick(hit ? hit.object.userData.i : null);
    });
  }
  resize() {
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  mat(color, opts = {}) {
    const k = color + JSON.stringify(opts);
    if (!this.mats.has(k)) this.mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.05, ...opts }));
    return this.mats.get(k);
  }

  // ---------- open / close ----------
  async open(target) {
    this.root.hidden = false;
    document.body.classList.add('mv-open');
    if (!this.looping) { this.looping = true; this.loop(); }
    this.resize();
    if (!target) target = this.current ? null : 'h2o';
    if (!target) return;
    if (typeof target === 'string') return this.show(MOL_BY_ID[target]);
    const q = target.query.toLowerCase().trim();
    const local = LIBRARY.find(m => m.id === q || m.name.toLowerCase() === q || m.formula.toLowerCase() === q)
      || LIBRARY.find(m => m.name.toLowerCase().includes(q));
    if (local) return this.show(local);
    this.loading.hidden = false;
    this.root.querySelector('.mv-ltext').textContent = `Fetching “${target.query}” from PubChem…`;
    try {
      const { data, props, flat } = await fetchPubChem(target.query);
      const name = props.Title || target.query;
      this.show({
        id: 'pc:' + q, name: name.charAt(0).toUpperCase() + name.slice(1), formula: props.MolecularFormula ? props.MolecularFormula.replace(/\d+/g, d => [...d].map(x => '₀₁₂₃₄₅₆₇₈₉'[x]).join('')) : hillFormula(data.atoms),
        group: flat ? 'PubChem (2D structure only)' : 'PubChem 3D conformer', data, pubchem: { ...props, flat },
      });
    } catch (err) {
      const msg = err instanceof TypeError ? 'Could not reach PubChem. Online search needs an internet connection; the built-in library works offline.' : err.message;
      this.info.innerHTML = `<h2>Not found</h2><p class="muted">${esc(msg)}</p><p class="muted">Tip: use the common name (e.g. “glucose”, “acetic acid”), or pick one from the built-in library.</p>`;
    } finally { this.loading.hidden = true; }
  }
  close() {
    this.root.hidden = true;
    document.body.classList.remove('mv-open');
    this.looping = false;
  }
  loop() {
    if (!this.looping) return;
    requestAnimationFrame(() => this.loop());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.showLabels) this.labelRenderer.render(this.scene, this.camera);
  }

  show(mol) {
    if (!mol) return;
    this.current = mol;
    this.data = mol.data || (mol.tree ? buildTree(mol.tree) : buildCoords(mol.coords));
    // centre on centroid
    const c = new THREE.Vector3();
    this.data.atoms.forEach(a => c.add(a.pos));
    c.multiplyScalar(1 / this.data.atoms.length);
    this.data.atoms.forEach(a => a.pos.sub(c));
    mol.data = this.data;
    this.root.querySelectorAll('.mv-grid button').forEach(b => b.classList.toggle('on', b.dataset.id === mol.id));
    this.sel = [];
    this.rebuild();
    this.fit();
    this.renderInfo();
  }

  fit() {
    let R = 1;
    for (const a of this.data?.atoms || []) R = Math.max(R, a.pos.length() + el(a.el).vdw * 0.6);
    const d = R / Math.sin((this.camera.fov * Math.PI) / 360) * 1.05;
    this.camera.position.set(d * 0.35, d * 0.25, d * 0.9).normalize().multiplyScalar(d);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  // ---------- scene construction ----------
  rebuild() {
    const g = this.group;
    for (const o of [...g.children]) { g.remove(o); if (o.element) o.element.remove(); }
    // CSS2D labels leave their DOM nodes behind; clear them
    this.labelRenderer.domElement.innerHTML = '';
    if (!this.data) return;
    const { atoms, bonds, lps } = this.data;
    const S = this.style;
    this.atomMeshes = [];
    const atomR = a => {
      const E = el(a.el);
      if (S === 'space') return E.vdw;
      if (S === 'stick') return 0.14;
      if (S === 'wire') return 0.05;
      return 0.16 + 0.2 * E.r;
    };
    atoms.forEach((a, i) => {
      const E = el(a.el);
      const m = new THREE.Mesh(this.geoSphere, this.mat(E.c, E.metal ? { metalness: 0.45, roughness: 0.28 } : {}));
      m.position.copy(a.pos);
      m.scale.setScalar(atomR(a));
      m.userData.i = i;
      g.add(m);
      this.atomMeshes.push(m);
      const d = document.createElement('div');
      d.className = 'mv-lbl';
      d.textContent = a.el + (a.charge ? (a.charge > 0 ? '+' : '−') : '');
      const lbl = new CSS2DObject(d);
      lbl.position.copy(a.pos);
      g.add(lbl);
    });

    if (S !== 'space') {
      const br = S === 'stick' ? 0.14 : S === 'wire' ? 0.035 : 0.085;
      for (const b of bonds) this.addBond(atoms, bonds, b, br);
    }
    if (this.showLp && S !== 'space' && lps.length) {
      const lpMat = new THREE.MeshStandardMaterial({ color: 0xb88cff, transparent: true, opacity: 0.32, roughness: 0.6, depthWrite: false });
      const eMat = this.mat(0xf4ecff, { emissive: 0x6a3cc0, emissiveIntensity: 0.6 });
      for (const lp of lps) {
        const a = atoms[lp.atom];
        const base = a.pos.clone().add(lp.dir.clone().multiplyScalar(atomR(a) * 0.6 + 0.42));
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), lp.dir);
        const lobe = new THREE.Mesh(this.geoSphere, lpMat);
        lobe.position.copy(base); lobe.quaternion.copy(q); lobe.scale.set(0.24, 0.24, 0.46);
        g.add(lobe);
        const perp = new THREE.Vector3(1, 0, 0).applyQuaternion(q).multiplyScalar(0.08);
        for (const s of [1, -1]) {
          const e = new THREE.Mesh(this.geoSphere, eMat);
          e.position.copy(base).add(lp.dir.clone().multiplyScalar(0.08)).add(perp.clone().multiplyScalar(s));
          e.scale.setScalar(0.045);
          g.add(e);
        }
      }
    }
    this.drawSelection();
  }

  addBond(atoms, bonds, b, br) {
    const A = atoms[b.a], B = atoms[b.b];
    const dir = B.pos.clone().sub(A.pos);
    const len = dir.length();
    dir.normalize();
    // a perpendicular in the plane of a neighbouring atom (so double bonds look right)
    let perp = null;
    for (const o of bonds) {
      if (o === b) continue;
      const k = o.a === b.a ? o.b : o.b === b.a ? o.a : o.a === b.b ? o.b : o.b === b.b ? o.a : -1;
      if (k < 0) continue;
      const v = atoms[k].pos.clone().sub(A.pos);
      v.sub(dir.clone().multiplyScalar(v.dot(dir)));
      if (v.lengthSq() > 1e-3) { perp = v.normalize(); break; }
    }
    if (!perp) { perp = new THREE.Vector3(0, 0, 1).cross(dir); if (perp.lengthSq() < 1e-3) perp = new THREE.Vector3(1, 0, 0).cross(dir); perp.normalize(); }
    const ca = el(A.el).c, cb = el(B.el).c;
    const seg = (p1, p2, r, color, dashed) => {
      const d = p2.clone().sub(p1), L = d.length();
      const n = dashed ? 4 : 1;
      for (let k = 0; k < n; k++) {
        const s = dashed ? (k + 0.2) / n : 0, e = dashed ? (k + 0.75) / n : 1;
        const m = new THREE.Mesh(this.geoCyl, this.mat(color));
        m.position.copy(p1).add(d.clone().multiplyScalar((s + e) / 2));
        m.scale.set(r, L * (e - s), r);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        this.group.add(m);
      }
    };
    const half = (off, r, dashed = false) => {
      const p1 = A.pos.clone().add(off), p2 = B.pos.clone().add(off);
      const mid = p1.clone().lerp(p2, 0.5);
      if (dashed) { seg(p1, p2, r, 0xcfd8e0, true); return; }
      seg(p1, mid, r, ca); seg(mid, p2, r, cb);
    };
    const o = b.order, wire = this.style === 'wire';
    if (o >= 2.9 && !wire) { half(new THREE.Vector3(), br * 0.6); half(perp.clone().multiplyScalar(br * 1.6), br * 0.5); half(perp.clone().multiplyScalar(-br * 1.6), br * 0.5); }
    else if (o >= 1.9 && !wire) { half(perp.clone().multiplyScalar(br * 0.85), br * 0.62); half(perp.clone().multiplyScalar(-br * 0.85), br * 0.62); }
    else if (o > 1.1 && !wire) { half(perp.clone().multiplyScalar(-br * 0.45), br * 0.75); half(perp.clone().multiplyScalar(br * 1.5), br * 0.4, true); }
    else half(new THREE.Vector3(), br);
    void len;
  }

  // ---------- measuring ----------
  pick(i) {
    if (i == null) this.sel = [];
    else if (this.sel.includes(i)) this.sel = this.sel.filter(x => x !== i);
    else { if (this.sel.length >= 3) this.sel = []; this.sel.push(i); }
    this.drawSelection();
    this.renderMeasure();
  }
  drawSelection() {
    if (this.selObjs) for (const o of this.selObjs) this.group.remove(o);
    this.selObjs = [];
    if (!this.data) return;
    const halo = new THREE.MeshBasicMaterial({ color: 0x5ad1e6, transparent: true, opacity: 0.35, depthWrite: false });
    for (const i of this.sel) {
      const m = this.atomMeshes[i];
      const h = new THREE.Mesh(this.geoSphere, halo);
      h.position.copy(m.position); h.scale.setScalar(m.scale.x * 1.35 + 0.08);
      this.group.add(h); this.selObjs.push(h);
    }
    for (let k = 0; k + 1 < this.sel.length; k++) {
      const p = [this.data.atoms[this.sel[k]].pos, this.data.atoms[this.sel[k + 1]].pos];
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineDashedMaterial({ color: 0x5ad1e6, dashSize: 0.12, gapSize: 0.08, depthTest: false }));
      line.computeLineDistances(); line.renderOrder = 10;
      this.group.add(line); this.selObjs.push(line);
    }
  }
  renderMeasure() {
    const box = this.info.querySelector('.mv-measure');
    if (!box) return;
    const at = this.data.atoms, s = this.sel;
    const nm = i => `${at[i].el}<sub>${i + 1}</sub>`;
    if (!s.length) { box.innerHTML = '<span class="muted">Click an atom to start measuring. 2 atoms give a distance, 3 give an angle.</span>'; return; }
    const lines = [`Selected: ${s.map(nm).join(' – ')}`];
    for (let k = 0; k + 1 < s.length; k++) lines.push(`Distance ${nm(s[k])}–${nm(s[k + 1])}: <b>${at[s[k]].pos.distanceTo(at[s[k + 1]].pos).toFixed(3)} Å</b>`);
    if (s.length === 3) {
      const a = at[s[0]].pos.clone().sub(at[s[1]].pos).normalize(), b = at[s[2]].pos.clone().sub(at[s[1]].pos).normalize();
      lines.push(`Angle ${nm(s[0])}–${nm(s[1])}–${nm(s[2])}: <b>${((Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180) / Math.PI).toFixed(1)}°</b>`);
    }
    box.innerHTML = lines.join('<br>');
  }

  // ---------- info panel ----------
  renderInfo() {
    const m = this.current, d = this.data;
    const counts = {};
    d.atoms.forEach(a => (counts[a.el] = (counts[a.el] || 0) + 1));
    const legend = Object.entries(counts).map(([e, n]) => `<span><i style="background:${hex(el(e).c)}"></i>${esc(el(e).name)} ×${n}</span>`).join('');
    let facts = '';
    if (m.pubchem) {
      const p = m.pubchem;
      facts = `<dl>
        ${p.IUPACName ? `<dt>IUPAC name</dt><dd>${esc(p.IUPACName)}</dd>` : ''}
        ${p.MolecularWeight ? `<dt>Molar mass</dt><dd>${esc(p.MolecularWeight)} g/mol</dd>` : ''}
        <dt>Atoms</dt><dd>${d.atoms.length}</dd><dt>Bonds</dt><dd>${d.bonds.length}</dd>
        <dt>Source</dt><dd>PubChem CID ${esc(p.CID || '—')}${p.flat ? ' (2D drawing, no 3D conformer)' : ' (computed 3D conformer)'}</dd></dl>`;
    } else {
      const a = analyse(m, d);
      const centre = m.tree ? `${el(a.central).name} (${a.central})` : '';
      facts = `<dl>
        ${centre ? `<dt>Central atom</dt><dd>${esc(centre)}</dd>` : ''}
        <dt>Shape</dt><dd>${esc(a.shape)}</dd>
        <dt>Hybridisation</dt><dd>${esc(a.hyb)}</dd>
        <dt>Bond angle${String(a.angle).includes(',') ? 's' : ''}</dt><dd>${esc(a.angle)}</dd>
        ${a.lp != null ? `<dt>Lone pairs (centre)</dt><dd>${a.lp}</dd>` : ''}
        <dt>Atoms</dt><dd>${d.atoms.length}</dd></dl>`;
    }
    this.info.innerHTML = `
      <div class="mv-tag">${esc(m.group)}</div>
      <h2>${esc(m.name)}</h2>
      <div class="mv-formula">${esc(m.formula)}</div>
      ${facts}
      ${m.note ? `<div class="note"><span>JEE</span>${esc(m.note)}</div>` : ''}
      <h4>Elements</h4><div class="mv-legend">${legend}</div>
      <h4>Measure</h4><div class="mv-measure"></div>`;
    this.renderMeasure();
  }

  savePng() {
    this.renderer.render(this.scene, this.camera);
    const a = document.createElement('a');
    a.download = (this.current?.name || 'molecule').replace(/[^\w-]+/g, '_') + '.png';
    a.href = this.renderer.domElement.toDataURL('image/png');
    a.click();
  }
}
