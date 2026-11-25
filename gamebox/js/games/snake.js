App.register({
  id: "snake", name: "Snake", emoji: "🐍", color: "#2fa36b", unit: "pts",
  desc: "Eat apples, grow long, don't bite yourself.",
  start(stage, api) {
    const N = 20, S = 18;
    const status = api.el("div", { className: "status", textContent: "Arrow keys / swipe / buttons" }, stage);
    const cv = api.el("canvas", { width: N * S, height: N * S }, stage);
    const ctx = cv.getContext("2d");
    const pad = api.el("div", { className: "pad" }, stage);
    const start = api.el("button", { className: "btn", textContent: "Start" }, stage);
    let snake, dir, next, food, score, loop, alive = false;

    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const turn = (d) => {
      const [x, y] = dirs[d];
      if (x !== -dir[0] || y !== -dir[1]) next = [x, y];
    };
    ["", "up", "", "left", "", "right", "", "down", ""].forEach((d) => {
      const b = api.el("button", { className: "btn ghost", textContent: { up: "▲", down: "▼", left: "◀", right: "▶" }[d] || "" }, pad);
      if (!d) b.style.visibility = "hidden"; else b.onclick = () => turn(d);
    });
    const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
    const onKey = (e) => { if (keys[e.key] && alive) { e.preventDefault(); turn(keys[e.key]); } };
    document.addEventListener("keydown", onKey);
    let tx, ty;
    cv.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; });
    cv.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    });

    const placeFood = () => {
      do food = [api.rand(N), api.rand(N)]; while (snake.some(([x, y]) => x === food[0] && y === food[1]));
    };
    const render = () => {
      ctx.fillStyle = "#0d0b16"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#ff5c7a"; ctx.beginPath();
      ctx.arc(food[0] * S + S / 2, food[1] * S + S / 2, S / 2 - 2, 0, 7); ctx.fill();
      snake.forEach(([x, y], i) => {
        ctx.fillStyle = i === 0 ? "#7dffb0" : "#2fa36b";
        ctx.fillRect(x * S + 1, y * S + 1, S - 2, S - 2);
      });
    };
    const step = () => {
      dir = next;
      const head = [snake[0][0] + dir[0], snake[0][1] + dir[1]];
      if (head[0] < 0 || head[1] < 0 || head[0] >= N || head[1] >= N || snake.some(([x, y]) => x === head[0] && y === head[1])) {
        alive = false; clearInterval(loop); api.sfx("over"); api.buzz(150);
        const rec = api.submit(score);
        status.textContent = `Game over! Score ${score}` + (rec ? " — new best! 🏆" : "");
        start.textContent = "Play again"; return;
      }
      snake.unshift(head);
      if (head[0] === food[0] && head[1] === food[1]) { score++; api.sfx("pop"); status.textContent = "Score: " + score; placeFood(); }
      else snake.pop();
      render();
    };
    const begin = () => {
      snake = [[10, 10], [9, 10], [8, 10]]; dir = next = [1, 0]; score = 0; alive = true;
      placeFood(); status.textContent = "Score: 0"; clearInterval(loop); loop = setInterval(step, 120); render();
    };
    start.onclick = begin;
    snake = [[10, 10], [9, 10], [8, 10]]; food = [15, 10]; render();
    return () => { clearInterval(loop); document.removeEventListener("keydown", onKey); };
  },
});
