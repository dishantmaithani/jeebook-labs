App.register({
  id: "dodge", name: "Dodge", emoji: "☄️", color: "#2d3e8f", unit: "sec",
  desc: "Avoid falling rocks as long as you can.",
  start(stage, api) {
    const W = 360, H = 480;
    const status = api.el("div", { className: "status", textContent: "Move with mouse, finger or ← →" }, stage);
    const cv = api.el("canvas", { width: W, height: H }, stage);
    const ctx = cv.getContext("2d");
    const startBtn = api.el("button", { className: "btn", textContent: "Start" }, stage);
    let px, rocks, t0, last, raf, spawn, keys = {};

    const moveTo = (clientX) => {
      const rect = cv.getBoundingClientRect();
      px = Math.min(W - 16, Math.max(16, (clientX - rect.left) * (W / rect.width)));
    };
    cv.addEventListener("mousemove", (e) => moveTo(e.clientX));
    cv.addEventListener("touchmove", (e) => { e.preventDefault(); moveTo(e.touches[0].clientX); }, { passive: false });
    const kd = (e) => { keys[e.key] = true; }, ku = (e) => { keys[e.key] = false; };
    document.addEventListener("keydown", kd); document.addEventListener("keyup", ku);

    const render = (secs) => {
      ctx.fillStyle = "#0d0b16"; ctx.fillRect(0, 0, W, H);
      ctx.font = "30px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🚀", px, H - 30);
      rocks.forEach((r) => { ctx.font = r.s * 2 + "px system-ui"; ctx.fillText("🪨", r.x, r.y); });
      ctx.font = "15px system-ui"; ctx.textAlign = "left"; ctx.fillStyle = "#fff";
      ctx.fillText(`⏱ ${secs.toFixed(1)}s`, 8, 16);
    };
    const tick = (now) => {
      const dt = Math.min(50, now - last) / 16.7; last = now;
      const secs = (now - t0) / 1000;
      if (keys.ArrowLeft) px = Math.max(16, px - 6 * dt);
      if (keys.ArrowRight) px = Math.min(W - 16, px + 6 * dt);
      spawn -= dt;
      if (spawn <= 0) {
        rocks.push({ x: api.rand(W), y: -20, s: 10 + api.rand(10), v: 2.5 + Math.random() * 2 + secs * 0.12 });
        spawn = Math.max(6, 28 - secs * 0.8);
      }
      rocks.forEach((r) => (r.y += r.v * dt));
      rocks = rocks.filter((r) => r.y < H + 30);
      render(secs);
      if (rocks.some((r) => Math.hypot(r.x - px, r.y - (H - 30)) < r.s + 10)) {
        const score = Math.round(secs * 10) / 10; api.sfx("over"); api.buzz(200);
        status.textContent = `💥 Hit! You lasted ${score}s` + (api.submit(score) ? " 🏆 New best!" : "");
        startBtn.disabled = false; startBtn.textContent = "Play again";
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    startBtn.onclick = () => {
      px = W / 2; rocks = []; spawn = 0; startBtn.disabled = true; status.textContent = "Survive!";
      t0 = last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    };
    px = W / 2; rocks = []; render(0);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku); };
  },
});
