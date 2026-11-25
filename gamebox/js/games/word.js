App.register({
  id: "word", name: "Word Guess", emoji: "🔤", color: "#6c5ce7", unit: "words",
  desc: "Guess the hidden word letter by letter.",
  start(stage, api) {
    const words = ["planet", "guitar", "jungle", "rocket", "pizza", "castle", "dragon", "silver", "window", "banana",
      "orange", "monkey", "puzzle", "garden", "bridge", "circle", "school", "travel", "friend", "summer",
      "winter", "candle", "forest", "island", "basket", "camera", "doctor", "engine", "flower", "hammer"];
    const lives = api.el("div", { className: "status" }, stage);
    const shown = api.el("div", { className: "big" }, stage);
    shown.style.letterSpacing = "8px";
    const status = api.el("div", { className: "status" }, stage);
    const keys = api.el("div", { className: "row" }, stage);
    keys.style.maxWidth = "420px";
    const again = api.el("button", { className: "btn", textContent: "Next word" }, stage);
    let word, guessed, miss, streak = 0, over;

    const draw = () => {
      shown.textContent = [...word].map((c) => (guessed.has(c) ? c : "_")).join("").toUpperCase();
      lives.textContent = "❤️".repeat(6 - miss) + "🖤".repeat(miss) + `  Streak: ${streak}`;
    };
    const press = (c, btn) => {
      if (over || guessed.has(c)) return;
      guessed.add(c); btn.disabled = true; btn.style.opacity = .35;
      if (!word.includes(c)) { miss++; api.sfx("bad"); } else api.sfx("pop");
      draw();
      if ([...word].every((x) => guessed.has(x))) {
        over = true; streak++; draw(); api.sfx("good");
        status.textContent = "You got it! 🎉" + (api.submit(streak) ? " 🏆 New best streak!" : "");
      } else if (miss >= 6) {
        over = true; streak = 0; draw(); api.sfx("over");
        status.textContent = `Out of lives! It was "${word.toUpperCase()}"`;
      }
    };
    const reset = () => {
      word = words[api.rand(words.length)]; guessed = new Set(); miss = 0; over = false;
      status.textContent = ""; keys.innerHTML = "";
      "abcdefghijklmnopqrstuvwxyz".split("").forEach((c) => {
        const b = api.el("button", { className: "btn ghost", textContent: c.toUpperCase() }, keys);
        b.style.cssText = "width:40px;padding:10px 0";
        b.dataset.k = c;
        b.onclick = () => press(c, b);
      });
      draw();
    };
    const onKey = (e) => {
      const b = keys.querySelector(`[data-k="${e.key.toLowerCase()}"]`);
      if (b && e.key.length === 1) press(e.key.toLowerCase(), b);
    };
    document.addEventListener("keydown", onKey);
    again.onclick = reset;
    reset();
    return () => document.removeEventListener("keydown", onKey);
  },
});
