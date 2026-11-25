App.register({
  id: "maze", name: "Maze Run", emoji: "🌀", color: "#27866b", unit: "sec",
  desc: "Find your way to the star, fast!",
  start(stage, api) {
    const N = 12, S = 28;
    const status = api.el("div", { className: "status", textContent: "Arrows / swipe / buttons. Reach the ⭐" }, stage);
    const cv = api.el("canvas", { width: N * S, height: N * S }, stage);
    const ctx = cv.getContext("2d");
    const pad = api.el("div", { className: "pad" }, stage);
    const again = api.el("button", { className: "btn", textContent: "New maze" }, stage);
    // walls[y][x] = {n,s,e,w} true when there is a wall.
    let walls, px, py, t0, done, clock;

    const gen = () => {
      walls = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ n: 1, s: 1, e: 1, w: 1 })));
      const seen = Array.from({ length: N }, () => Array(N).fill(false));
      const stack = [[0, 0]]; seen[0][0] = true;
      const D = [[0, -1, "n", "s"], [0, 1, "s", "n"], [1, 0, "e", "w"], [-1, 0, "w", "e"]];
      while (stack.length) {
        const [x, y] = stack[stack.length - 1];
        const opts = D.filter(([dx, dy]) => { const a = x + dx, b = y + dy; return a >= 0 && b >= 0 && a < N && b < N && !seen[b][a]; });
        if (!opts.length) { stack.pop(); continue; }
        const [dx, dy, w1, w2] = opts[api.rand(opts.length)];
        walls[y][x][w1] = 0; walls[y + dy][x + dx][w2] = 0; seen[y + dy][x + dx] = true; stack.push([x + dx, y + dy]);
      }
    };
    const render = () => {
      ctx.fillStyle = "#0d0b16"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = "#7c5cff"; ctx.lineWidth = 3; ctx.beginPath();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const c = walls[y][x], X = x * S, Y = y * S;
        if (c.n) { ctx.moveTo(X, Y); ctx.lineTo(X + S, Y); }
        if (c.w) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + S); }
        if (y === N - 1 && c.s) { ctx.moveTo(X, Y + S); ctx.lineTo(X + S, Y + S); }
        if (x === N - 1 && c.e) { ctx.moveTo(X + S, Y); ctx.lineTo(X + S, Y + S); }
      }
      ctx.stroke();
      ctx.font = S * 0.7 + "px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("⭐", (N - 0.5) * S, (N - 0.5) * S);
      ctx.fillStyle = "#2ecc71"; ctx.beginPath(); ctx.arc((px + 0.5) * S, (py + 0.5) * S, S * 0.32, 0, 7); ctx.fill();
    };
    const move = (d) => {
      if (done) return;
      const c = walls[py][px];
      if (d === "up" && !c.n) py--; else if (d === "down" && !c.s) py++;
      else if (d === "left" && !c.w) px--; else if (d === "right" && !c.e) px++;
      else return;
      if (!t0) { t0 = performance.now(); clock = setInterval(() => (status.textContent = `⏱ ${((performance.now() - t0) / 1000).toFixed(1)}s`), 100); }
      render();
      if (px === N - 1 && py === N - 1) {
        done = true; clearInterval(clock); api.sfx("good");
        const secs = Math.round((performance.now() - t0) / 100) / 10;
        status.textContent = `Escaped in ${secs}s! 🎉` + (api.submit(secs, true) ? " 🏆 New best!" : "");
      }
    };
    ["", "up", "", "left", "", "right", "", "down", ""].forEach((d) => {
      const b = api.el("button", { className: "btn ghost", textContent: { up: "▲", down: "▼", left: "◀", right: "▶" }[d] || "" }, pad);
      if (!d) b.style.visibility = "hidden"; else b.onclick = () => move(d);
    });
    const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const onKey = (e) => { if (keys[e.key]) { e.preventDefault(); move(keys[e.key]); } };
    document.addEventListener("keydown", onKey);
    let tx, ty;
    cv.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; });
    cv.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    });
    const reset = () => { clearInterval(clock); gen(); px = py = 0; t0 = 0; done = false; status.textContent = "Arrows / swipe / buttons. Reach the ⭐"; render(); };
    again.onclick = reset;
    reset();
    return () => { clearInterval(clock); document.removeEventListener("keydown", onKey); };
  },
});
