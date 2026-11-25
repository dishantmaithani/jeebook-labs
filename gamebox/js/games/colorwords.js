App.register({
  id: "colorwords", name: "Color Words", emoji: "🎨", color: "#a83279", unit: "pts",
  desc: "Tap the INK color, not the word!",
  start(stage, api) {
    const colors = [["RED", "#e74c3c"], ["BLUE", "#3498db"], ["GREEN", "#2ecc71"], ["YELLOW", "#f1c40f"], ["PURPLE", "#9b59b6"], ["ORANGE", "#e67e22"]];
    const status = api.el("div", { className: "status", textContent: "Tap the color the word is painted in" }, stage);
    const word = api.el("div", { className: "big", textContent: "READY?" }, stage);
    word.style.minHeight = "70px";
    const row = api.el("div", { className: "row" }, stage);
    row.style.maxWidth = "360px";
    const startBtn = api.el("button", { className: "btn", textContent: "Start" }, stage);
    let ink, score, left, clock, playing = false;

    const next = () => {
      const w = colors[api.rand(6)];
      let c; do c = colors[api.rand(6)]; while (c === w && Math.random() < 0.8);
      ink = c[0]; word.textContent = w[0]; word.style.color = c[1];
    };
    colors.forEach(([name, hex]) => {
      const b = api.el("button", { className: "btn", textContent: name }, row);
      b.style.cssText = `background:${hex};width:104px;font-size:14px`;
      b.onclick = () => {
        if (!playing) return;
        if (name === ink) { score++; api.sfx("good"); } else { score = Math.max(0, score - 1); api.sfx("bad"); }
        status.textContent = `Score ${score} · ⏱ ${left}s`; next();
      };
    });
    startBtn.onclick = () => {
      score = 0; left = 30; playing = true; startBtn.disabled = true;
      status.textContent = `Score 0 · ⏱ 30s`; next();
      clock = setInterval(() => {
        left--; status.textContent = `Score ${score} · ⏱ ${left}s`;
        if (left <= 0) {
          clearInterval(clock); playing = false; api.sfx("over"); word.textContent = "⏰"; word.style.color = "";
          status.textContent = `Time! Score ${score}` + (api.submit(score) ? " 🏆 New best!" : "");
          startBtn.disabled = false; startBtn.textContent = "Play again";
        }
      }, 1000);
    };
    return () => clearInterval(clock);
  },
});
