App.register({
  id: "whack", name: "Whack-a-Mole", emoji: "🔨", color: "#b8702e", unit: "hits",
  desc: "Tap the moles fast. 30 seconds!",
  start(stage, api) {
    const status = api.el("div", { className: "status", textContent: "Hit as many moles as you can" }, stage);
    const grid = api.el("div", {}, stage);
    grid.style.cssText = "display:grid;grid-template-columns:repeat(3,min(28vw,110px));gap:10px";
    const startBtn = api.el("button", { className: "btn", textContent: "Start" }, stage);
    let score, timeLeft, active = -1, moleTimer, clock, playing = false;

    const holes = Array.from({ length: 9 }, (_, i) => {
      const h = api.el("button", { className: "btn ghost", textContent: "🕳️" }, grid);
      h.style.cssText = "width:min(28vw,110px);height:min(28vw,110px);font-size:min(13vw,56px);padding:0;border-radius:50%";
      h.onpointerdown = () => {
        if (!playing || i !== active) return;
        score++; h.textContent = "💥"; active = -1; api.sfx("pop"); api.buzz(20);
        status.textContent = `Hits: ${score} · ⏱ ${timeLeft}s`;
      };
      return h;
    });
    const pop = () => {
      holes.forEach((h) => (h.textContent = "🕳️"));
      let n; do n = api.rand(9); while (n === active);
      active = n; holes[n].textContent = "🐹";
      moleTimer = setTimeout(pop, Math.max(450, 900 - score * 15));
    };
    const end = () => {
      playing = false; clearTimeout(moleTimer); clearInterval(clock); api.sfx("over");
      holes.forEach((h) => (h.textContent = "🕳️"));
      const rec = api.submit(score);
      status.textContent = `Time's up! ${score} hits` + (rec ? " 🏆 New best!" : "");
      startBtn.textContent = "Play again"; startBtn.disabled = false;
    };
    startBtn.onclick = () => {
      score = 0; timeLeft = 30; playing = true; startBtn.disabled = true;
      status.textContent = `Hits: 0 · ⏱ 30s`;
      pop();
      clock = setInterval(() => {
        timeLeft--; status.textContent = `Hits: ${score} · ⏱ ${timeLeft}s`;
        if (timeLeft <= 0) end();
      }, 1000);
    };
    return () => { clearTimeout(moleTimer); clearInterval(clock); };
  },
});
