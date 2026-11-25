App.register({
  id: "memory", name: "Memory Match", emoji: "🃏", color: "#3b7dd8", unit: "moves",
  desc: "Flip cards and find all the pairs.",
  start(stage, api) {
    const status = api.el("div", { className: "status" }, stage);
    const grid = api.el("div", {}, stage);
    grid.style.cssText = "display:grid;grid-template-columns:repeat(4,min(21vw,90px));gap:8px";
    const again = api.el("button", { className: "btn", textContent: "New game" }, stage);
    const icons = ["🍎", "🚀", "🐱", "⚽", "🎸", "🌵", "🍩", "🦄"];
    let first, lock, moves, found, timer;

    const reset = () => {
      clearTimeout(timer);
      grid.innerHTML = ""; first = null; lock = false; moves = 0; found = 0;
      status.textContent = "Moves: 0";
      const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
      deck.forEach((icon) => {
        const c = api.el("button", { className: "btn ghost" }, grid);
        c.style.cssText = "width:min(21vw,90px);height:min(21vw,90px);font-size:min(10vw,44px);padding:0";
        c.onclick = () => {
          if (lock || c.dataset.open) return;
          c.textContent = icon; c.dataset.open = 1; c.style.background = "#3b7dd8";
          if (!first) { first = c; return; }
          moves++; status.textContent = "Moves: " + moves;
          if (first.textContent === icon) {
            found++; first = null; api.sfx("good");
            if (found === icons.length) {
              const rec = api.submit(moves, true);
              status.textContent = `You did it in ${moves} moves!` + (rec ? " 🏆 New best!" : " 🎉");
            }
          } else {
            lock = true; const a = first; first = null; api.sfx("bad");
            timer = setTimeout(() => {
              [a, c].forEach((x) => { x.textContent = ""; delete x.dataset.open; x.style.background = ""; });
              lock = false;
            }, 700);
          }
        };
      });
    };
    again.onclick = reset;
    reset();
    return () => clearTimeout(timer);
  },
});
