App.register({
  id: "bricks", name: "Brick Breaker", emoji: "🧱", color: "#d35400", unit: "pts",
  desc: "Bounce the ball, smash every brick.",
  start(stage, api) {
    const W = 360, H = 480;
    const status = api.el("div", { className: "status", textContent: "Move with mouse, finger or ← →" }, stage);
    const cv = api.el("canvas", { width: W, height: H }, stage);
    const ctx = cv.getContext("2d");
    const startBtn = api.el("button", { className: "btn", textContent: "Start" }, stage);
    const COLS = 8, ROWS = 5, BW = 40, BH = 16, GAP = 4;
    let paddle, ball, bricks, score, lives, raf, running = false, keys = {};

    const reset = () => {
      paddle = { x: W / 2 - 40, w: 80 };
      ball = { x: W / 2, y: H - 60, dx: 3, dy: -3.5 };
      bricks = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
        bricks.push({ x: 8 + c * (BW + GAP), y: 40 + r * (BH + GAP), alive: true, hue: r * 40 });
      score = 0; lives = 3;
    };
    const moveTo = (clientX) => {
      const rect = cv.getBoundingClientRect();
      const x = (clientX - rect.left) * (W / rect.width);
      paddle.x = Math.min(W - paddle.w, Math.max(0, x - paddle.w / 2));
    };
    cv.addEventListener("mousemove", (e) => moveTo(e.clientX));
    cv.addEventListener("touchmove", (e) => { e.preventDefault(); moveTo(e.touches[0].clientX); }, { passive: false });
    const kd = (e) => { keys[e.key] = true; }, ku = (e) => { keys[e.key] = false; };
    document.addEventListener("keydown", kd); document.addEventListener("keyup", ku);

    const render = () => {
      ctx.fillStyle = "#0d0b16"; ctx.fillRect(0, 0, W, H);
      bricks.forEach((b) => { if (b.alive) { ctx.fillStyle = `hsl(${b.hue},80%,60%)`; ctx.fillRect(b.x, b.y, BW, BH); } });
      ctx.fillStyle = "#fff"; ctx.fillRect(paddle.x, H - 24, paddle.w, 10);
      ctx.beginPath(); ctx.arc(ball.x, ball.y, 7, 0, 7); ctx.fill();
      ctx.font = "14px system-ui"; ctx.fillText(`Score ${score}   Lives ${"❤️".repeat(lives)}`, 8, 20);
    };
    const stop = (msg) => {
      running = false; cancelAnimationFrame(raf); api.sfx("over");
      status.textContent = msg + (api.submit(score) ? " 🏆 New best!" : "");
      startBtn.disabled = false; startBtn.textContent = "Play again";
    };
    const tick = () => {
      if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - 7);
      if (keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + 7);
      ball.x += ball.dx; ball.y += ball.dy;
      if (ball.x < 7 || ball.x > W - 7) ball.dx *= -1;
      if (ball.y < 7) ball.dy *= -1;
      if (ball.dy > 0 && ball.y > H - 31 && ball.y < H - 14 && ball.x > paddle.x - 4 && ball.x < paddle.x + paddle.w + 4) {
        const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        const speed = Math.min(8, Math.hypot(ball.dx, ball.dy) * 1.02);
        ball.dx = speed * hit * 0.9; ball.dy = -Math.sqrt(speed * speed - ball.dx * ball.dx);
      }
      for (const b of bricks) {
        if (b.alive && ball.x > b.x && ball.x < b.x + BW && ball.y > b.y - 7 && ball.y < b.y + BH + 7) {
          b.alive = false; ball.dy *= -1; score += 10; api.sfx("pop"); break;
        }
      }
      if (ball.y > H) {
        lives--; api.sfx("bad"); api.buzz(120);
        if (lives <= 0) { render(); return stop(`Game over! Score ${score}`); }
        ball = { x: W / 2, y: H - 60, dx: 3, dy: -3.5 };
      }
      render();
      if (bricks.every((b) => !b.alive)) return stop(`You cleared it! Score ${score} 🎉`);
      raf = requestAnimationFrame(tick);
    };
    startBtn.onclick = () => {
      reset(); running = true; startBtn.disabled = true; status.textContent = "Go!";
      cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    };
    reset(); render();
    return () => { cancelAnimationFrame(raf); document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku); };
  },
});
