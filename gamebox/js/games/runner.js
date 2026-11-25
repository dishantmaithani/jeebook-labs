App.register({
  id: "runner", name: "Jump Run", emoji: "🏃", color: "#e67e22", unit: "m",
  desc: "Tap to jump (twice for double jump). Grab coins!",
  start(stage, api) {
    const W = 360, H = 420, GROUND = 340;
    const status = api.el("div", { className: "status", textContent: "Tap / Space to jump · tap again in the air to double jump" }, stage);
    const cv = api.el("canvas", { width: W, height: H }, stage);
    const ctx = cv.getContext("2d");
    const startBtn = api.el("button", { className: "btn", textContent: "Start" }, stage);
    let p, obs, coins, parts, clouds, hills, speed, dist, bonus, raf, last, spawn, coinSpawn, running = false, shake = 0;

    const reset = () => {
      p = { y: GROUND, vy: 0, jumps: 0, squash: 0 };
      obs = []; coins = []; parts = [];
      clouds = Array.from({ length: 4 }, (_, i) => ({ x: i * 110 + api.rand(40), y: 40 + api.rand(70) }));
      hills = Array.from({ length: 4 }, (_, i) => ({ x: i * 140, h: 50 + api.rand(50) }));
      speed = 4.2; dist = 0; bonus = 0; spawn = 60; coinSpawn = 90;
    };
    const jump = () => {
      if (!running) return;
      if (p.jumps < 2) {
        p.vy = p.jumps ? -10 : -12.5; p.jumps++; api.sfx("move");
        for (let i = 0; i < 6; i++) parts.push({ x: 60, y: p.y, vx: -Math.random() * 2, vy: Math.random() * -1, t: 20, c: "#ddd" });
      }
    };
    cv.addEventListener("pointerdown", jump);
    const onKey = (e) => { if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); jump(); } };
    document.addEventListener("keydown", onKey);

    const score = () => Math.floor(dist / 10) + bonus;
    const render = () => {
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, "#5b8def"); sky.addColorStop(1, "#ffd59e");
      ctx.fillStyle = sky; ctx.fillRect(-10, -10, W + 20, H + 20);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      clouds.forEach((c) => { ctx.beginPath(); ctx.arc(c.x, c.y, 16, 0, 7); ctx.arc(c.x + 18, c.y - 6, 20, 0, 7); ctx.arc(c.x + 38, c.y, 15, 0, 7); ctx.fill(); });
      ctx.fillStyle = "#7fb069";
      hills.forEach((h) => { ctx.beginPath(); ctx.ellipse(h.x, GROUND, 90, h.h, 0, Math.PI, 0); ctx.fill(); });
      ctx.fillStyle = "#4e7d3a"; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = "#3d6a2c";
      for (let x = -(dist % 30); x < W; x += 30) ctx.fillRect(x, GROUND + 8, 14, 4);
      coins.forEach((c) => {
        const w = Math.abs(Math.sin(c.spin)) * 9 + 2;
        ctx.fillStyle = "#f1c40f"; ctx.beginPath(); ctx.ellipse(c.x, c.y, w, 10, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "#b7950b"; ctx.lineWidth = 2; ctx.stroke();
      });
      obs.forEach((o) => {
        if (o.bird) {
          ctx.font = "30px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("🦅", o.x + o.w / 2, o.y + o.h / 2);
        } else {
          ctx.fillStyle = "#8e44ad"; ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.fillStyle = "#a569bd"; ctx.fillRect(o.x, o.y, o.w, 5);
        }
      });
      // player: a round little runner with eyes
      const sq = p.squash;
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath(); ctx.ellipse(60, p.y - 18 + sq * 4, 18 + sq * 4, 18 - sq * 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(66, p.y - 22, 6, 0, 7); ctx.fill();
      ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(68, p.y - 22, 3, 0, 7); ctx.fill();
      parts.forEach((q) => { ctx.globalAlpha = q.t / 25; ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, 4, 4); });
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff"; ctx.font = "bold 18px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText(`${score()} m`, 10, 26);
      ctx.restore();
    };
    const tick = (now) => {
      const dt = Math.min(40, now - last) / 16.7; last = now;
      speed += 0.0018 * dt; dist += speed * dt;
      p.vy += 0.6 * dt; p.y += p.vy * dt;
      if (p.y >= GROUND) { if (p.jumps) p.squash = 1; p.y = GROUND; p.vy = 0; p.jumps = 0; }
      p.squash = Math.max(0, p.squash - 0.1 * dt);
      clouds.forEach((c) => { c.x -= speed * 0.2 * dt; if (c.x < -60) c.x = W + api.rand(60); });
      hills.forEach((h) => { h.x -= speed * 0.5 * dt; if (h.x < -100) { h.x = W + 100; h.h = 50 + api.rand(50); } });
      spawn -= dt;
      if (spawn <= 0) {
        const r = Math.random(), d = dist / 10;
        if (d > 150 && r < 0.25) obs.push({ x: W, y: GROUND - 75 - api.rand(25), w: 34, h: 26, bird: true });
        else { const h = 25 + api.rand(30 + Math.min(30, d / 20)); obs.push({ x: W, y: GROUND - h, w: 22 + api.rand(18), h }); }
        spawn = 55 + api.rand(55) - Math.min(30, speed * 2);
      }
      coinSpawn -= dt;
      if (coinSpawn <= 0) {
        const y = GROUND - 40 - api.rand(110);
        for (let i = 0; i < 3; i++) coins.push({ x: W + i * 28, y, spin: i });
        coinSpawn = 100 + api.rand(80);
      }
      obs.forEach((o) => (o.x -= speed * (o.bird ? 1.25 : 1) * dt));
      coins.forEach((c) => { c.x -= speed * dt; c.spin += 0.15 * dt; });
      obs = obs.filter((o) => o.x > -60); coins = coins.filter((c) => c.x > -20);
      parts.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 0.15 * dt; q.t -= dt; });
      parts = parts.filter((q) => q.t > 0);
      shake = Math.max(0, shake - dt);
      // coin pickup
      coins = coins.filter((c) => {
        if (Math.hypot(c.x - 60, c.y - (p.y - 18)) < 26) {
          bonus += 5; api.sfx("pop");
          for (let i = 0; i < 8; i++) parts.push({ x: c.x, y: c.y, vx: (Math.random() - .5) * 4, vy: (Math.random() - .5) * 4, t: 20, c: "#f1c40f" });
          return false;
        }
        return true;
      });
      // collision (slightly forgiving hitbox)
      const hit = obs.some((o) => 60 + 13 > o.x + 3 && 60 - 13 < o.x + o.w - 3 && p.y - 4 > o.y + 3 && p.y - 32 < o.y + o.h - 3);
      if (hit) {
        running = false; shake = 10; api.sfx("over"); api.buzz(200);
        for (let i = 0; i < 20; i++) parts.push({ x: 60, y: p.y - 18, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, t: 25, c: "#ff6b6b" });
        const s = score();
        const rec = api.submit(s);
        status.textContent = `💥 Ouch! You ran ${s} m` + (rec ? " 🏆 New best!" : "");
        startBtn.disabled = false; startBtn.textContent = "Run again";
        // let the crash particles play out
        const fade = (t) => { const d2 = Math.min(40, t - last) / 16.7; last = t; parts.forEach((q) => { q.x += q.vx * d2; q.y += q.vy * d2; q.t -= d2; }); parts = parts.filter((q) => q.t > 0); shake = Math.max(0, shake - d2); render(); if (parts.length && !running) raf = requestAnimationFrame(fade); };
        raf = requestAnimationFrame(fade);
        return;
      }
      render();
      raf = requestAnimationFrame(tick);
    };
    startBtn.onclick = () => {
      reset(); running = true; startBtn.disabled = true; status.textContent = "Run!";
      last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    };
    reset(); render();
    return () => { cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); };
  },
});
