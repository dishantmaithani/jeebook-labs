App.register({
  id: "sequence", name: "Color Sequence", emoji: "🌈", color: "#c0392b", unit: "rounds",
  desc: "Watch the colors light up, repeat them.",
  start(stage, api) {
    const status = api.el("div", { className: "status", textContent: "Press Start and watch" }, stage);
    const grid = api.el("div", {}, stage);
    grid.style.cssText = "display:grid;grid-template-columns:repeat(2,min(42vw,160px));gap:12px";
    const startBtn = api.el("button", { className: "btn", textContent: "Start" }, stage);
    const colors = ["#e74c3c", "#2ecc71", "#3498db", "#f1c40f"];
    let seq = [], pos = 0, input = false, timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    const pads = colors.map((c, i) => {
      const p = api.el("button", { className: "btn" }, grid);
      p.style.cssText = `width:min(42vw,160px);height:min(42vw,160px);background:${c};opacity:.35;border-radius:20px`;
      p.onpointerdown = () => {
        if (!input) return;
        flash(i);
        if (i !== seq[pos]) {
          input = false; api.sfx("bad"); api.buzz(150);
          const rounds = seq.length - 1;
          status.textContent = `Wrong! You reached ${rounds} rounds` + (api.submit(rounds) ? " 🏆 New best!" : "");
          startBtn.textContent = "Play again"; startBtn.disabled = false; return;
        }
        pos++;
        if (pos === seq.length) { input = false; api.sfx("good"); status.textContent = "Nice! ✅"; later(nextRound, 800); }
      };
      return p;
    });
    const flash = (i) => { pads[i].style.opacity = 1; later(() => (pads[i].style.opacity = .35), 300); };
    const nextRound = () => {
      seq.push(api.rand(4)); pos = 0;
      status.textContent = `Round ${seq.length} — watch…`;
      seq.forEach((c, k) => later(() => flash(c), 600 * k + 400));
      later(() => { input = true; status.textContent = `Round ${seq.length} — your turn`; }, 600 * seq.length + 400);
    };
    startBtn.onclick = () => { seq = []; startBtn.disabled = true; nextRound(); };
    return () => timers.forEach(clearTimeout);
  },
});
