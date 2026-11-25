App.register({
  id: "slide", name: "Sliding Puzzle", emoji: "🧩", color: "#1f8a8a", unit: "moves",
  desc: "Slide the tiles into order 1 to 8.",
  start(stage, api) {
    const status = api.el("div", { className: "status" }, stage);
    const grid = api.el("div", {}, stage);
    grid.style.cssText = "display:grid;grid-template-columns:repeat(3,min(28vw,110px));gap:6px";
    const again = api.el("button", { className: "btn", textContent: "Shuffle" }, stage);
    let tiles, moves, done;

    const neighbors = (i) => [i - 3, i + 3, i % 3 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1].filter((n) => n >= 0 && n < 9);
    const solved = () => tiles.every((t, i) => t === (i === 8 ? 0 : i + 1));
    const draw = () => {
      grid.innerHTML = "";
      tiles.forEach((t, i) => {
        const b = api.el("button", { className: "btn", textContent: t || "" }, grid);
        b.style.cssText = `width:min(28vw,110px);height:min(28vw,110px);font-size:min(10vw,44px);padding:0;${t ? "" : "visibility:hidden"}`;
        b.onclick = () => {
          const blank = tiles.indexOf(0);
          if (done || !neighbors(i).includes(blank)) return;
          [tiles[i], tiles[blank]] = [tiles[blank], tiles[i]];
          moves++; api.sfx("move"); draw();
          if (solved()) {
            done = true; api.sfx("good");
            status.textContent = `Solved in ${moves} moves! 🎉` + (api.submit(moves, true) ? " 🏆 New best!" : "");
          } else status.textContent = "Moves: " + moves;
        };
      });
    };
    const reset = () => {
      tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      // Shuffle with real moves so the puzzle is always solvable.
      let blank = 8, prev = -1;
      for (let k = 0; k < 200; k++) {
        const opts = neighbors(blank).filter((n) => n !== prev);
        const n = opts[api.rand(opts.length)];
        [tiles[blank], tiles[n]] = [tiles[n], tiles[blank]];
        prev = blank; blank = n;
      }
      if (solved()) return reset();
      moves = 0; done = false; status.textContent = "Moves: 0"; draw();
    };
    again.onclick = reset;
    reset();
  },
});
