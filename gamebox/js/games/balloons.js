App.register({
  id: "balloons", name: "Balloon Pop", emoji: "🎈", color: "#e05297", unit: "pops",
  desc: "Pop balloons before 5 float away.",
  start(stage, api) {
    const W = 360, H = 480;
    const status = api.el("div", { className: "status", textContent: "Tap the balloons!" }, stage);
    const cv = api.el("canvas", { width: W, height: H }, stage);
    const ctx = cv.getContext("2d");
    const startBtn = api.el("button", { className: "btn", textContent: "Start" }, stage);
    let balloons, pops, missed, raf, last, spawn, playing = false, bursts;

    const hit = (cx, cy) => {
      if (!playing) return;
      const r = cv.getBoundingClientRect();
      const x = (cx - r.left) * (W / r.width), y = (cy - r.top) * (H / r.height);
      for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        if (Math.hypot(b.x - x, b.y - y) < b.r + 8) {
          balloons.splice(i, 1); pops++; api.sfx("pop"); bursts.push({ x: b.x, y: b.y, t: 12 }); return;
        }
      }
    };
    cv.addEventListener("pointerdown", (e) => hit(e.clientX, e.clientY));

    const render = () => {
      ctx.fillStyle = "#12203a"; ctx.fillRect(0, 0, W, H);
      balloons.forEach((b) => {
        ctx.strokeStyle = "#ddd"; ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r); ctx.lineTo(b.x, b.y + b.r + 22); ctx.stroke();
        ctx.fillStyle = b.c; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r * 1.2, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(b.x - b.r / 3, b.y - b.r / 2, b.r / 5, b.r / 3, 0, 0, 7); ctx.fill();
      });
      ctx.font = "24px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      bursts.forEach((p) => ctx.fillText("💥", p.x, p.y));
      ctx.fillStyle = "#fff"; ctx.font = "15px system-ui"; ctx.textAlign = "left";
      ctx.fillText(`Pops ${pops}   Missed ${missed}/5`, 8, 16);
    };
    const tick = (now) => {
      const dt = Math.min(50, now - last) / 16.7; last = now;
      spawn -= dt;
      if (spawn <= 0) {
        balloons.push({ x: 30 + api.rand(W - 60), y: H + 30, r: 18 + api.rand(10), v: 1.2 + Math.random() + pops * 0.04, c: `hsl(${api.rand(360)},80%,60%)` });
        spawn = Math.max(14, 50 - pops);
      }
      balloons.forEach((b) => (b.y -= b.v * dt));
      const before = balloons.length;
      balloons = balloons.filter((b) => b.y > -40);
      missed += before - balloons.length;
      bursts.forEach((p) => p.t--); bursts = bursts.filter((p) => p.t > 0);
      render();
      if (missed >= 5) {
        playing = false; api.sfx("over");
        status.textContent = `Game over! ${pops} pops` + (api.submit(pops) ? " 🏆 New best!" : "");
        startBtn.disabled = false; startBtn.textContent = "Play again"; return;
      }
      raf = requestAnimationFrame(tick);
    };
    startBtn.onclick = () => {
      balloons = []; bursts = []; pops = 0; missed = 0; spawn = 0; playing = true; startBtn.disabled = true;
      status.textContent = "Pop them!"; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    };
    balloons = []; bursts = []; pops = 0; missed = 0; render();
    return () => cancelAnimationFrame(raf);
  },
});
