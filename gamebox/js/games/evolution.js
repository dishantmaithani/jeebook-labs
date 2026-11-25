// Primordial: play a microbe in a sea where every other creature evolves by natural selection.
// Creatures carry genes (speed, size, sight, diet); children mutate; the unfit starve or get eaten.
App.register({
  id: "evolution", name: "Primordial", emoji: "🦠", color: "#0e5a4f", unit: "DNA",
  desc: "Evolve from a speck to the apex organism.",
  start(stage, api) {
    // ---------- layout ----------
    const W = 360, H = 480;
    const css = api.el("style", { textContent: `
      .evo-wrap { position: relative; width: 100%; max-width: ${W}px; }
      .evo-wrap canvas { width: 100%; display: block; }
      .evo-ov { position: absolute; inset: 0; background: rgba(4,14,16,.88); border-radius: 14px; padding: 16px;
        display: flex; flex-direction: column; gap: 8px; overflow: auto; text-align: left; }
      .evo-ov h2 { color: #5ef2b5; font-size: 20px; }
      .evo-ov p { color: #b8d8d2; font-size: 13.5px; line-height: 1.4; }
      .evo-traits { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .evo-trait { background: rgba(255,255,255,.05); border-radius: 10px; padding: 8px; font-size: 12px; color: #b8d8d2; }
      .evo-trait b { display: block; color: #fff; font-size: 13.5px; }
      .evo-trait .dots { color: #5ef2b5; letter-spacing: 2px; margin: 3px 0; }
      .evo-trait button { width: 100%; border: 0; border-radius: 8px; padding: 6px; font-weight: 700; background: #5ef2b5; color: #04261b; cursor: pointer; }
      .evo-trait button:disabled { background: #1d3a3f; color: #5f8580; cursor: default; }
      .evo-ready { animation: evoPulse 1s infinite; }
      @keyframes evoPulse { 50% { box-shadow: 0 0 0 5px rgba(94,242,181,.4); } }
    ` }, stage);
    const status = api.el("div", { className: "status", textContent: "Eat, mutate, survive." }, stage);
    const wrap = api.el("div", { className: "evo-wrap" }, stage);
    const cv = api.el("canvas", { width: W, height: H }, wrap);
    const ctx = cv.getContext("2d");
    const ov = api.el("div", { className: "evo-ov" }, wrap);
    const row = api.el("div", { className: "row" }, stage);
    const evoBtn = api.el("button", { className: "btn", textContent: "🧬 Evolve" }, row);
    const pauseBtn = api.el("button", { className: "btn ghost", textContent: "⏸ Pause" }, row);
    const chart = api.el("canvas", { width: W, height: 92 }, stage);
    const cctx = chart.getContext("2d");

    // ---------- utils ----------
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

    // ---------- world ----------
    const WW = 2200, WH = 2200;
    const MAX_FOOD = 555, POP_CAP = 125, CARN_CAP = 28;
    let food = [], creatures = [], particles = [], history = [];
    let frame = 0, paused = true, maxGen = 1, nCarnNow = 0, totalDna = 0, mode = "start";
    let event = { name: "Calm waters", food: 1, drain: 1, until: 0 };

    const TRAITS = {
      flagella: { name: "Flagella", icon: "〰", max: 5, base: 8, desc: "Faster swimming." },
      membrane: { name: "Membrane", icon: "⭕", max: 8, base: 6, desc: "Bigger body. Fewer things can eat you." },
      eyes: { name: "Eyespots", icon: "👁", max: 3, base: 12, desc: "See farther. Warns of predators." },
      jaws: { name: "Jaws", icon: "🦷", max: 3, base: 15, desc: "Eat smaller creatures." },
      spikes: { name: "Spikes", icon: "✴", max: 3, base: 12, desc: "Survive an extra bite." },
      metab: { name: "Mitochondria", icon: "⚡", max: 3, base: 10, desc: "Burn 18% less energy." },
    };

    const player = { x: WW / 2, y: WH / 2, vx: 0, vy: 0, energy: 80, dna: 0, alive: false, hp: 1, invuln: 0, phase: 0,
      lv: { flagella: 0, membrane: 0, eyes: 0, jaws: 0, spikes: 0, metab: 0 }, eaten: 0, deaths: 0, won: false, born: 0 };
    const pSize = () => 10 + player.lv.membrane * 4;
    const pSpeed = () => 2.4 + player.lv.flagella * 0.45;
    const pSight = () => 150 + player.lv.eyes * 70;
    const pMaxE = () => 60 + pSize() * 3;
    const pMaxHp = () => 1 + player.lv.spikes;
    const jawRatio = () => (player.lv.jaws ? 0.6 + player.lv.jaws * 0.12 : 0);
    const cost = (k) => TRAITS[k].base * (player.lv[k] + 1);
    // A predator can eat prey if its diet is meaty enough and the prey is clearly smaller.
    const canEat = (diet, size, preySize) => diet > 0.3 && preySize < size * 0.85;

    // ---------- creatures ----------
    const newGenome = (carn) => carn
      ? { speed: rand(1.3, 1.7), size: rand(15, 19), sense: rand(120, 170), diet: rand(0.75, 0.9) }
      : { speed: rand(1.0, 1.5), size: rand(7, 10), sense: rand(80, 130), diet: rand(0, 0.12) };
    const mutate = (g) => ({
      speed: clamp(g.speed * (1 + gauss() * 0.08), 0.4, 3.4),
      size: clamp(g.size * (1 + gauss() * 0.06), 5, g.diet > 0.5 ? 44 : 22),
      sense: clamp(g.sense * (1 + gauss() * 0.08), 30, 360),
      diet: clamp(g.diet + gauss() * 0.04, 0, 1),
    });
    function spawn(g, x, y, e, gen = 1) {
      creatures.push({ x, y, vx: 0, vy: 0, g, energy: e ?? g.size * 2.5, age: 0, gen, wander: rand(0, 6.28), phase: rand(0, 6.28), dead: false });
      if (gen > maxGen) maxGen = gen;
    }
    const addFood = (x, y, e = 14) => food.push({ x: x ?? rand(10, WW - 10), y: y ?? rand(10, WH - 10), e, dead: false, r: e > 14 ? 4.5 : 3 });
    const drainOf = (g) => (0.012 + 0.0018 * g.size + 0.00012 * g.size * g.size + 0.014 * g.speed * g.speed + 0.00006 * g.sense) * event.drain;
    const burst = (x, y, col, n) => { for (let i = 0; i < n; i++) { const a = rand(0, 6.28), s = rand(0.5, 3); particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(20, 40), col }); } };

    function updateCreature(c) {
      c.age++; c.phase += 0.2 + c.g.speed * 0.1;
      const s = c.g.size, sense2 = c.g.sense * c.g.sense;
      let fx = 0, fy = 0, flee = false, target = null, best = Infinity;
      const herb = c.g.diet < 0.7, carn = c.g.diet > 0.3;
      for (const o of creatures) {
        if (o === c || o.dead) continue;
        const dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy;
        if (d2 > sense2) continue;
        if (canEat(o.g.diet, o.g.size, s)) {
          if (d2 > sense2 * 0.4) continue; // predators are noticed late
          const d = Math.sqrt(d2) || 1; fx -= dx / d; fy -= dy / d; flee = true;
        } else if (carn && canEat(c.g.diet, s, o.g.size)) {
          const r = s + o.g.size;
          if (d2 < r * r) { o.dead = true; c.energy += (o.energy * 0.6 + o.g.size * 4) * c.g.diet; if (inView(o.x, o.y, 20)) burst(o.x, o.y, "#ff8a7a", 8); continue; }
          if (d2 < best) { best = d2; target = o; }
        }
      }
      if (player.alive) {
        const dx = player.x - c.x, dy = player.y - c.y, d2 = dx * dx + dy * dy, ps = pSize();
        if (d2 < sense2) {
          if (player.lv.jaws && s < ps * jawRatio()) { const d = Math.sqrt(d2) || 1; fx -= dx / d * 1.5; fy -= dy / d * 1.5; flee = true; }
          else if (carn && canEat(c.g.diet, s, ps) && d2 < best) { best = d2; target = player; }
        }
      }
      if (herb && !flee) {
        for (const f of food) {
          if (f.dead) continue;
          const dx = f.x - c.x, dy = f.y - c.y, d2 = dx * dx + dy * dy;
          if (d2 < (s + f.r) * (s + f.r)) { f.dead = true; c.energy += f.e * (1 - c.g.diet); continue; }
          if (d2 < sense2 && d2 < best) { best = d2; target = f; }
        }
      }
      let dx, dy;
      if (flee) { dx = fx; dy = fy; }
      else if (target) { dx = target.x - c.x; dy = target.y - c.y; }
      else { c.wander += gauss() * 0.25; dx = Math.cos(c.wander); dy = Math.sin(c.wander); }
      const m = Math.hypot(dx, dy) || 1;
      const hunting = target && target !== null && (target.g || target === player) && carn; // sprint when chasing prey
      const sp = c.g.speed * (flee ? 1 : hunting ? 1.3 : target ? 1 : 0.6);
      c.vx += (dx / m * sp - c.vx) * 0.12; c.vy += (dy / m * sp - c.vy) * 0.12;
      c.x += c.vx; c.y += c.vy;
      if (c.x < s) { c.x = s; c.vx *= -1; c.wander = Math.PI - c.wander; }
      if (c.x > WW - s) { c.x = WW - s; c.vx *= -1; c.wander = Math.PI - c.wander; }
      if (c.y < s) { c.y = s; c.vy *= -1; c.wander = -c.wander; }
      if (c.y > WH - s) { c.y = WH - s; c.vy *= -1; c.wander = -c.wander; }
      c.energy = Math.min(c.energy - drainOf(c.g), s * 6);
      if (c.energy <= 0 || c.age > 60 * 150) { c.dead = true; if (Math.random() < 0.5) addFood(c.x, c.y, 20); return; }
      // Reproduction: split in two; the child carries mutated genes.
      if (c.energy > s * 3.6 && c.age > 240 && (c.g.diet > 0.5 ? nCarnNow < CARN_CAP : creatures.length - nCarnNow < POP_CAP)) {
        c.energy /= 2;
        spawn(mutate(c.g), c.x + rand(-5, 5), c.y + rand(-5, 5), c.energy, c.gen + 1);
      }
    }

    // ---------- input ----------
    const keys = {};
    let pointer = null;
    const kd = (e) => {
      const k = e.key.toLowerCase(); keys[k] = true;
      if (k === "e") toggleEvo();
      if (e.key === " ") { togglePause(); e.preventDefault(); }
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k) && mode === "play") e.preventDefault();
    };
    const ku = (e) => { keys[e.key.toLowerCase()] = false; };
    document.addEventListener("keydown", kd); document.addEventListener("keyup", ku);
    const toCanvas = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }; };
    cv.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" || e.buttons) pointer = toCanvas(e); });
    cv.addEventListener("pointerdown", (e) => { pointer = toCanvas(e); });
    cv.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") pointer = null; });
    cv.addEventListener("pointerleave", () => { pointer = null; });
    cv.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

    // ---------- player ----------
    function updatePlayer() {
      const ps = pSize(), sp = pSpeed();
      player.phase += 0.25 + player.lv.flagella * 0.05;
      let dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      let dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
      let mag = 0;
      if (dx || dy) mag = 1;
      else if (pointer) { dx = pointer.x - W / 2; dy = pointer.y - H / 2; mag = clamp((Math.hypot(dx, dy) - ps) / 90, 0, 1); }
      const m = Math.hypot(dx, dy) || 1;
      player.vx += (dx / m * sp * mag - player.vx) * 0.15; player.vy += (dy / m * sp * mag - player.vy) * 0.15;
      player.x = clamp(player.x + player.vx, ps, WW - ps); player.y = clamp(player.y + player.vy, ps, WH - ps);

      player.energy -= (0.04 + ps * 0.0025 + player.lv.flagella * 0.006) * (1 - 0.18 * player.lv.metab) * event.drain;
      if (player.invuln > 0) player.invuln--;
      if (player.hp < pMaxHp() && frame % 600 === 0) player.hp++;

      for (const f of food) {
        if (f.dead) continue;
        const ddx = f.x - player.x, ddy = f.y - player.y, r = ps + f.r;
        if (ddx * ddx + ddy * ddy < r * r) {
          f.dead = true; player.energy += f.e * (player.lv.jaws >= 3 ? 0.45 : 0.65); player.dna += 1; totalDna += 1;
          burst(f.x, f.y, "#9dffb0", 3);
        }
      }
      for (const c of creatures) {
        if (c.dead) continue;
        const ddx = c.x - player.x, ddy = c.y - player.y, r = ps + c.g.size;
        if (ddx * ddx + ddy * ddy >= r * r) continue;
        if (player.lv.jaws && c.g.size < ps * jawRatio()) {
          const gain = Math.ceil(c.g.size / 3);
          c.dead = true; player.energy += c.g.size * 2.2; player.dna += gain; totalDna += gain; player.eaten++;
          burst(c.x, c.y, "#ffcf7a", 10); api.sfx("pop");
        } else if (canEat(c.g.diet, c.g.size, ps) && player.invuln <= 0) {
          player.hp--; player.invuln = 90;
          const d = Math.hypot(ddx, ddy) || 1;
          if (player.lv.spikes) { c.energy -= 12 * player.lv.spikes; c.vx = ddx / d * 6; c.vy = ddy / d * 6; }
          player.vx = -ddx / d * 5; player.vy = -ddy / d * 5;
          burst(player.x, player.y, "#ff6b6b", 12); api.sfx("bad"); api.buzz(120);
          if (player.hp <= 0) { die("Eaten", `A predator (size ${c.g.size.toFixed(0)}, generation ${c.gen}) caught you.`); return; }
        }
      }
      player.energy = Math.min(player.energy, pMaxE());
      if (player.energy <= 0) die("Starved", "You ran out of energy. Bigger, faster bodies burn more of it.");
    }

    // ---------- screens ----------
    function showStart() {
      mode = "start";
      ov.classList.remove("hidden");
      ov.innerHTML = `<h2>🦠 Primordial</h2>
        <p>You're a single cell in an ancient sea. Eat to gain <b>energy</b> and <b>🧬 DNA</b>, then spend DNA on mutations.</p>
        <p>Every other creature evolves on its own. Children mutate slightly. The slow, the hungry and the easy to catch die out. Watch the chart below the sea.</p>
        <p><span style="color:#7ee081">● Green</span> eat plants. <span style="color:#ff7b6b">● Red</span> are predators. They eat anything clearly smaller than themselves.</p>
        <p>Steer by touching or pointing, or with WASD / arrows. E opens mutations.</p>
        <p>Goal: grow your membrane to the max and become the <b>apex organism</b>.</p>`;
      const b = api.el("button", { className: "btn", textContent: "Begin life" }, ov);
      b.onclick = () => { ov.classList.add("hidden"); player.alive = true; player.invuln = 120; player.born = frame; mode = "play"; paused = false; status.textContent = "Eat green pellets. Avoid bigger red cells."; };
    }
    function die(title, msg) {
      player.alive = false; player.deaths++; paused = true; mode = "dead";
      burst(player.x, player.y, "#ffffff", 25); api.sfx("over"); api.buzz([80, 40, 160]);
      const rec = api.submit(totalDna);
      player.dna = Math.floor(player.dna / 2);
      ov.classList.remove("hidden");
      ov.innerHTML = `<h2>${title}</h2><p>${msg}</p><p>Your species keeps its mutations but loses half its unspent DNA.</p>
        <p>DNA collected so far: <b>${totalDna}</b>${rec ? " 🏆 New best!" : ""}</p>`;
      const b = api.el("button", { className: "btn", textContent: "Divide again" }, ov);
      b.onclick = respawn;
    }
    function respawn() {
      for (let t = 0; t < 30; t++) {
        const x = rand(200, WW - 200), y = rand(200, WH - 200);
        if (!creatures.some((c) => canEat(c.g.diet, c.g.size, pSize()) && Math.hypot(c.x - x, c.y - y) < 350)) { player.x = x; player.y = y; break; }
      }
      player.vx = player.vy = 0; player.energy = pMaxE(); player.hp = pMaxHp(); player.invuln = 120; player.alive = true;
      ov.classList.add("hidden"); mode = "play"; paused = false;
    }
    function toggleEvo(force) {
      if (mode !== "play" && mode !== "evo") return;
      const open = force ?? mode === "play";
      if (open) { mode = "evo"; paused = true; ov.classList.remove("hidden"); renderTraits(); }
      else { mode = "play"; paused = false; ov.classList.add("hidden"); }
    }
    function togglePause() {
      if (mode === "play") { mode = "paused"; paused = true; pauseBtn.textContent = "▶ Resume"; status.textContent = "Paused"; }
      else if (mode === "paused") { mode = "play"; paused = false; pauseBtn.textContent = "⏸ Pause"; status.textContent = ""; }
    }
    function renderTraits() {
      ov.innerHTML = `<h2>🧬 Mutations · DNA ${player.dna}</h2><div class="evo-traits">${Object.entries(TRAITS).map(([k, t]) => {
        const lv = player.lv[k], maxed = lv >= t.max, c = cost(k);
        return `<div class="evo-trait"><b>${t.icon} ${t.name}</b>${t.desc}<div class="dots">${"●".repeat(lv)}${"○".repeat(t.max - lv)}</div>
          <button data-k="${k}" ${maxed || player.dna < c ? "disabled" : ""}>${maxed ? "Maxed" : "🧬 " + c}</button></div>`;
      }).join("")}</div>`;
      const b = api.el("button", { className: "btn ghost", textContent: "Back to the sea" }, ov);
      b.onclick = () => toggleEvo(false);
    }
    ov.addEventListener("click", (e) => {
      const k = e.target.dataset && e.target.dataset.k; if (!k) return;
      const c = cost(k); if (player.dna < c || player.lv[k] >= TRAITS[k].max) return;
      player.dna -= c; player.lv[k]++; api.sfx("good");
      if (k === "spikes") player.hp++;
      if (k === "membrane") player.energy = Math.min(player.energy + 20, pMaxE());
      renderTraits();
      if (k === "membrane" && player.lv.membrane >= TRAITS.membrane.max && !player.won) win();
    });
    function win() {
      player.won = true; mode = "won"; paused = true;
      const rec = api.submit(totalDna);
      const mins = ((frame - player.born) / 3600).toFixed(1);
      ov.innerHTML = `<h2>👑 Apex organism</h2><p>In ${mins} minutes you went from a speck to a giant.</p>
        <p>Deaths: ${player.deaths} · Creatures eaten: ${player.eaten} · The sea reached generation ${maxGen}.</p>
        <p>DNA collected: <b>${totalDna}</b>${rec ? " 🏆 New best!" : ""}</p>`;
      const b = api.el("button", { className: "btn", textContent: "Keep evolving" }, ov);
      b.onclick = () => { ov.classList.add("hidden"); mode = "play"; paused = false; };
    }
    evoBtn.onclick = () => toggleEvo();
    pauseBtn.onclick = togglePause;

    // ---------- events (selection pressure) ----------
    const EVENTS = [
      { name: "🌿 Algae bloom: food everywhere", food: 2.6, drain: 1 },
      { name: "☀ Drought: food is scarce", food: 0.5, drain: 1 },
      { name: "❄ Cold snap: energy burns faster", food: 1, drain: 1.25 },
      { name: "Calm waters", food: 1, drain: 1 },
    ];
    function updateEvent() {
      if (frame < event.until) return;
      event = frame < 60 * 40 ? { ...EVENTS[3] } : { ...EVENTS[Math.floor(Math.random() * EVENTS.length)] };
      event.until = frame + 60 * rand(25, 40);
      if (player.alive) status.textContent = event.name;
    }

    // ---------- simulation step ----------
    function step() {
      frame++;
      updateEvent();
      let spawnN = 1.0 * event.food;
      while (spawnN > 0 && food.length < MAX_FOOD) { if (Math.random() < spawnN) addFood(); spawnN--; }
      nCarnNow = 0; for (const c of creatures) if (c.g.diet > 0.5) nCarnNow++;
      for (const c of creatures) if (!c.dead) updateCreature(c);
      if (player.alive) updatePlayer();
      creatures = creatures.filter((c) => !c.dead);
      food = food.filter((f) => !f.dead);
      // Migration keeps the ecosystem from collapsing; incoming predators match today's prey.
      if (frame % 300 === 0) {
        const hs = creatures.filter((c) => c.g.diet <= 0.5), nCarn = creatures.length - hs.length;
        if (hs.length < 10) for (let i = 0; i < 4; i++) spawn(newGenome(false), rand(0, WW), rand(0, WH));
        if (nCarn < 4) {
          const g = newGenome(true);
          if (hs.length) {
            g.speed = Math.max(g.speed, hs.reduce((a, c) => a + c.g.speed, 0) / hs.length);
            g.size = clamp(Math.max(g.size, hs.reduce((a, c) => a + c.g.size, 0) / hs.length * 1.3), 5, 44);
          }
          spawn(g, rand(0, WW), rand(0, WH), g.size * 5);
        }
      }
      if (frame % 60 === 0) {
        const n = creatures.length || 1;
        let sz = 0, sp = 0, h = 0, c = 0;
        for (const k of creatures) { sz += k.g.size; sp += k.g.speed; k.g.diet > 0.5 ? c++ : h++; }
        history.push({ size: sz / n, speed: sp / n, h, c });
        if (history.length > 150) history.shift();
      }
    }

    // ---------- drawing ----------
    let camX = 0, camY = 0;
    const inView = (x, y, r) => x + r > camX && x - r < camX + W && y + r > camY && y - r < camY + H;
    const cellColor = (diet, a = 1) => `hsla(${120 - diet * 115},70%,${48 + diet * 6}%,${a})`;
    function drawCell(x, y, r, diet, vx, vy, phase, tail, o = {}) {
      const ang = Math.atan2(vy, vx), ca = Math.cos(ang), sa = Math.sin(ang);
      const nT = o.tails || 1;
      ctx.strokeStyle = o.player ? "rgba(140,230,255,.6)" : cellColor(diet, 0.55); ctx.lineWidth = Math.max(1.2, r * 0.12);
      for (let t = 0; t < nT; t++) {
        const off = (t - (nT - 1) / 2) * 0.35;
        ctx.beginPath();
        for (let i = 0; i <= 10; i++) {
          const k = i / 10, L = r + k * r * (0.8 + tail * 0.5), wob = Math.sin(phase - k * 7) * r * 0.3 * k;
          const bx = -ca * L - sa * (wob + off * r), by = -sa * L + ca * (wob + off * r);
          i ? ctx.lineTo(x + bx, y + by) : ctx.moveTo(x + bx, y + by);
        }
        ctx.stroke();
      }
      if (o.spikes) {
        ctx.fillStyle = "#e8fff6";
        const n = 6 + o.spikes * 4, L = r + 3 + o.spikes * 2;
        for (let i = 0; i < n; i++) {
          const a = i / n * 6.283 + phase * 0.02;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(a - 0.12) * r, y + Math.sin(a - 0.12) * r);
          ctx.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); ctx.lineTo(x + Math.cos(a + 0.12) * r, y + Math.sin(a + 0.12) * r); ctx.fill();
        }
      }
      const sq = 1 + Math.sin(phase * 0.5) * 0.04;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sq, 1 / sq);
      ctx.fillStyle = o.player ? "hsla(190,85%,60%,.9)" : cellColor(diet, 0.85);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
      ctx.lineWidth = o.player ? 2.5 : 1.5; ctx.strokeStyle = o.player ? "#fff" : cellColor(diet); ctx.stroke();
      ctx.fillStyle = "rgba(0,30,30,.35)"; ctx.beginPath(); ctx.arc(-r * 0.25, 0, r * 0.35, 0, 6.283); ctx.fill();
      if (o.jaws) { ctx.fillStyle = "#fff3d6"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.75, s * r * 0.15); ctx.lineTo(r + 2 + o.jaws * 2, s * r * 0.35); ctx.lineTo(r * 0.6, s * r * 0.5); ctx.fill(); } }
      const er = Math.max(1.5, r * 0.16);
      ctx.fillStyle = "#fff"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.45, s * r * 0.32, er, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = "#000"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.5, s * r * 0.32, er * 0.55, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }

    function draw() {
      camX = player.x - W / 2; camY = player.y - H / 2;
      ctx.fillStyle = "#08222a"; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(-camX, -camY);
      ctx.strokeStyle = "rgba(120,220,210,.06)"; ctx.lineWidth = 1;
      const g = 80, gx0 = Math.floor(camX / g) * g, gy0 = Math.floor(camY / g) * g;
      ctx.beginPath();
      for (let x = gx0; x < camX + W + g; x += g) { ctx.moveTo(x, camY); ctx.lineTo(x, camY + H); }
      for (let y = gy0; y < camY + H + g; y += g) { ctx.moveTo(camX, y); ctx.lineTo(camX + W, y); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,120,120,.4)"; ctx.lineWidth = 6; ctx.strokeRect(0, 0, WW, WH);
      for (const f of food) { if (!inView(f.x, f.y, 5)) continue; ctx.fillStyle = f.e > 14 ? "#c7ff8a" : "#6fe39a"; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill(); }
      for (const c of creatures) {
        if (!inView(c.x, c.y, c.g.size * 3)) continue;
        drawCell(c.x, c.y, c.g.size, c.g.diet, c.vx, c.vy, c.phase, c.g.speed / 2, { jaws: c.g.diet > 0.5 ? 1 : 0, tails: c.g.speed > 2.2 ? 2 : 1 });
      }
      if (player.alive && !(player.invuln > 0 && frame % 10 < 5)) {
        const L = player.lv;
        drawCell(player.x, player.y, pSize(), 0, player.vx || 1, player.vy, player.phase, L.flagella * 0.4 + 0.5,
          { player: true, jaws: L.jaws, spikes: L.spikes, tails: 1 + Math.floor((L.flagella + 1) / 2) });
      }
      for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / 40); ctx.fillStyle = p.col; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Darkness beyond your sight.
      const sight = pSight();
      const grd = ctx.createRadialGradient(W / 2, H / 2, sight * 0.55, W / 2, H / 2, sight);
      grd.addColorStop(0, "rgba(2,8,10,0)"); grd.addColorStop(1, "rgba(2,8,10,.93)");
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

      // Eyespots: arrows toward predators lurking in the dark.
      if (player.alive && player.lv.eyes) {
        const range = sight * (1.4 + player.lv.eyes * 0.3);
        for (const c of creatures) {
          if (!canEat(c.g.diet, c.g.size, pSize())) continue;
          const dx = c.x - player.x, dy = c.y - player.y, d = Math.hypot(dx, dy);
          if (d < sight * 0.7 || d > range) continue;
          const a = Math.atan2(dy, dx), R = Math.min(sight * 0.62, W / 2 - 18);
          ctx.save(); ctx.translate(W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R); ctx.rotate(a);
          ctx.fillStyle = `rgba(255,90,90,${Math.min(1, 1.3 - d / range)})`;
          ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.fill(); ctx.restore();
        }
      }

      // HUD
      const eFrac = clamp(player.energy / pMaxE(), 0, 1);
      ctx.fillStyle = "rgba(4,20,24,.75)"; ctx.fillRect(8, 8, 120, 26); ctx.fillRect(W - 128, 8, 120, 26);
      ctx.fillStyle = "#12333a"; ctx.fillRect(14, 22, 108, 6);
      ctx.fillStyle = eFrac < 0.25 ? "#ff6b6b" : "#5ef2b5"; ctx.fillRect(14, 22, 108 * eFrac, 6);
      ctx.fillStyle = "#dff6f0"; ctx.font = "11px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("Energy  " + "♥".repeat(Math.max(0, player.hp)) + "♡".repeat(Math.max(0, pMaxHp() - player.hp)), 14, 18);
      ctx.textAlign = "right"; ctx.font = "bold 13px system-ui";
      ctx.fillText(`🧬 ${player.dna}   Gen ${maxGen}`, W - 14, 26);
    }

    function drawChart() {
      const w = chart.width, h = chart.height;
      cctx.fillStyle = "#0d0b16"; cctx.fillRect(0, 0, w, h);
      cctx.fillStyle = "#9c97b8"; cctx.font = "11px system-ui"; cctx.textAlign = "left";
      cctx.fillText("Natural selection, last 2.5 min", 8, 14);
      if (history.length < 2) return;
      const top = 20, bot = h - 18, ph = bot - top;
      const maxPop = Math.max(30, ...history.map((s) => Math.max(s.h, s.c)));
      const line = (fn, max, col) => {
        cctx.strokeStyle = col; cctx.lineWidth = 1.6; cctx.beginPath();
        history.forEach((s, i) => { const x = 8 + i / 149 * (w - 16), y = bot - clamp(fn(s) / max, 0, 1) * ph; i ? cctx.lineTo(x, y) : cctx.moveTo(x, y); });
        cctx.stroke();
      };
      line((s) => s.h, maxPop, "#7ee081"); line((s) => s.c, maxPop, "#ff7b6b");
      line((s) => s.size, 30, "#ffd166"); line((s) => s.speed, 3.4, "#6fd3ff");
      const L = history[history.length - 1];
      let x = 8; cctx.font = "10px system-ui";
      for (const [t, c] of [["plant-eaters " + L.h, "#7ee081"], ["predators " + L.c, "#ff7b6b"], ["size " + L.size.toFixed(1), "#ffd166"], ["speed " + L.speed.toFixed(2), "#6fd3ff"]]) {
        cctx.fillStyle = c; cctx.fillText(t, x, h - 5); x += cctx.measureText(t).width + 8;
      }
    }

    // ---------- loop (fixed 60 steps/s so fast screens don't speed it up) ----------
    let raf, last = performance.now(), acc = 0;
    function loop(now) {
      acc = Math.min(acc + (now - last), 100); last = now;
      while (acc >= 1000 / 60) {
        acc -= 1000 / 60;
        if (!paused) step();
        for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vx *= 0.93; p.vy *= 0.93; p.life--; }
        particles = particles.filter((p) => p.life > 0);
      }
      draw();
      if (frame % 30 === 0) drawChart();
      const affordable = mode === "play" && Object.keys(TRAITS).some((k) => player.lv[k] < TRAITS[k].max && player.dna >= cost(k));
      evoBtn.classList.toggle("evo-ready", affordable);
      raf = requestAnimationFrame(loop);
    }

    // ---------- init ----------
    for (let i = 0; i < 280; i++) addFood();
    for (let i = 0; i < 56; i++) spawn(newGenome(false), rand(0, WW), rand(0, WH));
    for (let i = 0; i < 8; i++) spawn(newGenome(true), rand(0, WW), rand(0, WH));
    for (let i = 0; i < 600; i++) step(); // let the sea settle before you arrive
    creatures = creatures.filter((c) => !(canEat(c.g.diet, c.g.size, pSize()) && Math.hypot(c.x - player.x, c.y - player.y) < 300));
    showStart(); drawChart();
    raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku); };
  },
});
