App.register({
  id: "oddone", name: "Odd One Out", emoji: "👁️", color: "#4a6fa5", unit: "levels",
  desc: "Find the tile with a slightly different color.",
  start(stage, api) {
    const status = api.el("div", { className: "status", textContent: "Sharp eyes? 40 seconds." }, stage);
    const grid = api.el("div", {}, stage);
    grid.style.cssText = "display:grid;gap:5px;width:min(88vw,360px);height:min(88vw,360px)";
    const startBtn = api.el("button", { className: "btn", textContent: "Start" }, stage);
    let level, left, clock, playing = false;

    const build = () => {
      const n = Math.min(8, 2 + Math.floor(level / 3));
      const diff = Math.max(6, 40 - level * 2);
      const h = api.rand(360), s = 55 + api.rand(25), l = 45 + api.rand(15);
      const odd = api.rand(n * n);
      grid.style.gridTemplateColumns = `repeat(${n},1fr)`;
      grid.innerHTML = "";
      for (let i = 0; i < n * n; i++) {
        const t = api.el("button", {}, grid);
        t.style.cssText = `border:0;border-radius:8px;cursor:pointer;background:hsl(${h},${s}%,${i === odd ? l + diff / 2 : l}%)`;
        t.onclick = () => {
          if (!playing) return;
          if (i === odd) { level++; api.sfx("good"); status.textContent = `Level ${level} · ⏱ ${left}s`; build(); }
          else { left = Math.max(0, left - 3); t.style.opacity = .3; api.sfx("bad"); api.buzz(80); }
        };
      }
    };
    startBtn.onclick = () => {
      level = 0; left = 40; playing = true; startBtn.disabled = true;
      status.textContent = "Level 0 · ⏱ 40s (wrong = −3s)"; build();
      clock = setInterval(() => {
        left--; status.textContent = `Level ${level} · ⏱ ${left}s`;
        if (left <= 0) {
          clearInterval(clock); playing = false; api.sfx("over"); grid.innerHTML = "";
          status.textContent = `Time! You reached level ${level}` + (api.submit(level) ? " 🏆 New best!" : "");
          startBtn.disabled = false; startBtn.textContent = "Play again";
        }
      }, 1000);
    };
    return () => clearInterval(clock);
  },
});
