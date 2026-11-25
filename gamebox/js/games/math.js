App.register({
  id: "math", name: "Math Sprint", emoji: "➗", color: "#2c6e8f", unit: "correct",
  desc: "Solve as many sums as you can in 60s.",
  start(stage, api) {
    const status = api.el("div", { className: "status", textContent: "60 seconds. Go fast!" }, stage);
    const q = api.el("div", { className: "big", textContent: "? + ?" }, stage);
    const choices = api.el("div", { className: "row" }, stage);
    const startBtn = api.el("button", { className: "btn", textContent: "Start" }, stage);
    let answer, score, left, clock, playing = false;

    const ask = () => {
      const ops = ["+", "−", "×"];
      const op = ops[api.rand(score > 8 ? 3 : 2)];
      let a = api.rand(20) + 1, b = api.rand(20) + 1;
      if (op === "×") { a = api.rand(12) + 1; b = api.rand(12) + 1; }
      if (op === "−" && b > a) [a, b] = [b, a];
      answer = op === "+" ? a + b : op === "−" ? a - b : a * b;
      q.textContent = `${a} ${op} ${b}`;
      const set = new Set([answer]);
      while (set.size < 4) set.add(Math.max(0, answer + api.rand(11) - 5));
      choices.innerHTML = "";
      [...set].sort(() => Math.random() - 0.5).forEach((n) => {
        const b = api.el("button", { className: "btn ghost", textContent: n }, choices);
        b.style.cssText = "min-width:70px;font-size:22px";
        b.onclick = () => {
          if (!playing) return;
          if (n === answer) { score++; api.sfx("good"); } else { left = Math.max(0, left - 3); api.sfx("bad"); api.buzz(80); }
          status.textContent = `✅ ${score} · ⏱ ${left}s`;
          ask();
        };
      });
    };
    startBtn.onclick = () => {
      score = 0; left = 60; playing = true; startBtn.disabled = true;
      status.textContent = "✅ 0 · ⏱ 60s (wrong = −3s)"; ask();
      clock = setInterval(() => {
        left--; status.textContent = `✅ ${score} · ⏱ ${left}s`;
        if (left <= 0) {
          clearInterval(clock); playing = false; api.sfx("over"); choices.innerHTML = ""; q.textContent = "⏰";
          status.textContent = `Done! ${score} correct` + (api.submit(score) ? " 🏆 New best!" : "");
          startBtn.disabled = false; startBtn.textContent = "Play again";
        }
      }, 1000);
    };
    return () => clearInterval(clock);
  },
});
