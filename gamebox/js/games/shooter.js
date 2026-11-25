App.register({
  id: "shooter", name: "Space Blaster", emoji: "🚀", color: "#1b2a6b", unit: "pts",
  desc: "Drag your ship, blast the aliens, grab power-ups.",
  start(stage, api) {
    const W = 360, H = 520;
    const status = api.el("div", { className: "status", textContent: "Drag or use ← → · ship fires by itself" }, stage);
    const cv = api.el("canvas", { width: W, height: H }, stage);
    const ctx = cv.getContext("2d");
    const startBtn = api.el("button", { className: "btn", textContent: "Start" }, stage);
    const stars = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.5 }));
    let ship, shots, foes, bombs, parts, pows, score, lives, wave, fireT, spawnT, raf, last, running = false, keys = {}, shake = 0, power = 0, inv = 0;

    const reset = () => {
      ship = { x: W / 2, y: H - 50 }; shots = []; foes = []; bombs = []; parts = []; pows = [];
      score = 0; lives = 3; wave = 1; fireT = 0; spawnT = 30; power = 0; inv = 0;
    };
    const moveTo = (cx) => {
      const r = cv.getBoundingClientRect();
      ship.x = Math.min(W - 18, Math.max(18, (cx - r.left) * (W / r.width)));
    };
    cv.addEventListener("pointermove", (e) => { if (running) moveTo(e.clientX); });
    cv.addEventListener("pointerdown", (e) => { if (running) moveTo(e.clientX); });
    cv.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
    const kd = (e) => { keys[e.key] = true; }, ku = (e) => { keys[e.key] = false; };
    document.addEventListener("keydown", kd); document.addEventListener("keyup", ku);

    const boom = (x, y, c, n = 14) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 7, v = Math.random() * 4 + 1;
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 25 + api.rand(15), c });
      }
    };
    const spawnFoe = () => {
      const kind = Math.random() < Math.min(0.45, wave * 0.07) ? "zig" : Math.random() < 0.25 ? "rock" : "basic";
      const hp = kind === "rock" ? 3 : 1;
      foes.push({ x: 24 + api.rand(W - 48), y: -20, kind, hp, t: Math.random() * 6, vy: kind === "rock" ? 1.2 : 1.6 + wave * 0.15, fire: 60 + api.rand(120) });
    };
    const hurt = () => {
      if (inv > 0) return;
      lives--; inv = 90; shake = 12; power = 0; api.sfx("bad"); api.buzz(150); boom(ship.x, ship.y, "#7cd4ff", 20);
      if (lives <= 0) {
        running = false; api.sfx("over");
        const rec = api.submit(score);
        status.textContent = `Game over! ${score} points · wave ${wave}` + (rec ? " 🏆 New best!" : "");
        startBtn.disabled = false; startBtn.textContent = "Play again";
      }
    };

    const render = () => {
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      ctx.fillStyle = "#05051a"; ctx.fillRect(-12, -12, W + 24, H + 24);
      stars.forEach((s) => { ctx.fillStyle = `rgba(255,255,255,${s.s / 2.5})`; ctx.fillRect(s.x, s.y, s.s, s.s); });
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      pows.forEach((p) => { ctx.font = "24px system-ui"; ctx.fillText("⚡", p.x, p.y); });
      foes.forEach((f) => {
        ctx.font = (f.kind === "rock" ? 34 : 28) + "px system-ui";
        ctx.fillText(f.kind === "rock" ? "🪨" : f.kind === "zig" ? "👾" : "👽", f.x, f.y);
      });
      ctx.fillStyle = "#ff5c7a"; bombs.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 7); ctx.fill(); });
      ctx.fillStyle = "#7dffb0"; shots.forEach((s) => ctx.fillRect(s.x - 2, s.y - 8, 4, 12));
      if (lives > 0 && !(inv > 0 && Math.floor(inv / 5) % 2)) {
        // ship
        ctx.fillStyle = "#7cd4ff";
        ctx.beginPath(); ctx.moveTo(ship.x, ship.y - 18); ctx.lineTo(ship.x + 16, ship.y + 14); ctx.lineTo(ship.x, ship.y + 7); ctx.lineTo(ship.x - 16, ship.y + 14); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `hsl(${30 + Math.random() * 30},100%,60%)`;
        ctx.beginPath(); ctx.moveTo(ship.x - 5, ship.y + 10); ctx.lineTo(ship.x, ship.y + 20 + Math.random() * 8); ctx.lineTo(ship.x + 5, ship.y + 10); ctx.fill();
      }
      parts.forEach((q) => { ctx.globalAlpha = Math.max(0, q.t / 40); ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, 3, 3); });
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff"; ctx.font = "bold 16px system-ui"; ctx.textAlign = "left";
      ctx.fillText(`${score}`, 10, 18);
      ctx.textAlign = "right"; ctx.fillText("❤️".repeat(Math.max(0, lives)) + (power > 0 ? " ⚡" : ""), W - 10, 18);
      ctx.textAlign = "center"; ctx.font = "13px system-ui"; ctx.fillStyle = "#9c97b8"; ctx.fillText(`Wave ${wave}`, W / 2, 18);
      ctx.restore();
    };
    const tick = (now) => {
      const dt = Math.min(40, now - last) / 16.7; last = now;
      stars.forEach((s) => { s.y += s.s * 0.8 * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
      if (keys.ArrowLeft) ship.x = Math.max(18, ship.x - 6 * dt);
      if (keys.ArrowRight) ship.x = Math.min(W - 18, ship.x + 6 * dt);
      if (running) {
        fireT -= dt;
        if (fireT <= 0) {
          shots.push({ x: ship.x, y: ship.y - 18, vx: 0 });
          if (power > 0) { shots.push({ x: ship.x - 8, y: ship.y - 10, vx: -1.5 }, { x: ship.x + 8, y: ship.y - 10, vx: 1.5 }); }
          fireT = 11;
        }
        spawnT -= dt;
        if (spawnT <= 0) { spawnFoe(); spawnT = Math.max(14, 50 - wave * 4) + api.rand(20); }
      }
      power = Math.max(0, power - dt); inv = Math.max(0, inv - dt); shake = Math.max(0, shake - dt);
      shots.forEach((s) => { s.y -= 9 * dt; s.x += s.vx * dt; });
      shots = shots.filter((s) => s.y > -10);
      foes.forEach((f) => {
        f.t += 0.05 * dt; f.y += f.vy * dt;
        if (f.kind === "zig") f.x += Math.sin(f.t * 2) * 2.4 * dt;
        if (f.kind !== "rock") { f.fire -= dt; if (f.fire <= 0 && running) { bombs.push({ x: f.x, y: f.y + 10, vy: 3.5 + wave * 0.2 }); f.fire = 90 + api.rand(120); } }
      });
      bombs.forEach((b) => (b.y += b.vy * dt)); bombs = bombs.filter((b) => b.y < H + 10);
      pows.forEach((p) => (p.y += 1.8 * dt)); pows = pows.filter((p) => p.y < H + 20);
      parts.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; q.t -= dt; }); parts = parts.filter((q) => q.t > 0);
      // shots vs foes
      for (const f of foes) for (const s of shots) {
        if (!s.dead && Math.abs(s.x - f.x) < 18 && Math.abs(s.y - f.y) < 18) {
          s.dead = true; f.hp--;
          if (f.hp <= 0) {
            f.dead = true; score += f.kind === "rock" ? 30 : f.kind === "zig" ? 20 : 10;
            boom(f.x, f.y, f.kind === "rock" ? "#b08968" : "#9cff57"); api.sfx("pop"); shake = Math.max(shake, 3);
            if (Math.random() < 0.08) pows.push({ x: f.x, y: f.y });
            if (score >= wave * 250) { wave++; api.sfx("good"); }
          } else boom(s.x, s.y, "#ccc", 4);
        }
      }
      shots = shots.filter((s) => !s.dead);
      if (running) {
        foes.forEach((f) => {
          if (!f.dead && Math.abs(f.x - ship.x) < 22 && Math.abs(f.y - ship.y) < 22) { f.dead = true; boom(f.x, f.y, "#9cff57"); hurt(); }
          if (!f.dead && f.y > H + 20) { f.dead = true; if (f.kind !== "rock") hurt(); }
        });
        bombs = bombs.filter((b) => { if (Math.abs(b.x - ship.x) < 13 && Math.abs(b.y - ship.y) < 15) { hurt(); return false; } return true; });
        pows = pows.filter((p) => { if (Math.abs(p.x - ship.x) < 22 && Math.abs(p.y - ship.y) < 22) { power = 480; api.sfx("good"); return false; } return true; });
      }
      foes = foes.filter((f) => !f.dead);
      render();
      if (running || parts.length) raf = requestAnimationFrame(tick);
    };
    startBtn.onclick = () => {
      reset(); running = true; startBtn.disabled = true; status.textContent = "Aliens that get past you cost a life!";
      last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    };
    reset(); render();
    return () => { cancelAnimationFrame(raf); document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku); };
  },
});
