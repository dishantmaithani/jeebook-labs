App.register({
  id: "ttt", name: "Tic Tac Toe", emoji: "❌", color: "#e2557a", unit: "win streak",
  desc: "Beat the computer, three in a row.",
  start(stage, api) {
    const status = api.el("div", { className: "status" }, stage);
    const board = api.el("div", {}, stage);
    board.style.cssText = "display:grid;grid-template-columns:repeat(3,min(28vw,110px));gap:8px";
    const again = api.el("button", { className: "btn", textContent: "Play again" }, stage);
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    let cells, over, streak = 0, timer;

    const winner = (b) => {
      for (const [a, c, d] of lines) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
      return b.every(Boolean) ? "draw" : null;
    };
    const minimax = (b, turn) => {
      const w = winner(b);
      if (w === "O") return { s: 1 }; if (w === "X") return { s: -1 }; if (w) return { s: 0 };
      let best = { s: turn === "O" ? -2 : 2 };
      b.forEach((v, i) => {
        if (v) return;
        b[i] = turn; const r = minimax(b, turn === "O" ? "X" : "O"); b[i] = null;
        if (turn === "O" ? r.s > best.s : r.s < best.s) best = { s: r.s, i };
      });
      return best;
    };
    const draw = () => btns.forEach((bt, i) => { bt.textContent = cells[i] || ""; bt.style.color = cells[i] === "X" ? "#ff8fab" : "#8fd3ff"; });
    const finish = (w) => {
      over = true;
      if (w === "X") { api.sfx("good"); streak++; status.textContent = "You win! 🎉 Streak: " + streak; api.submit(streak); }
      else if (w === "O") { api.sfx("bad"); streak = 0; status.textContent = "Computer wins 🤖"; }
      else status.textContent = "Draw 🤝 Streak: " + streak;
    };
    const btns = Array.from({ length: 9 }, (_, i) => {
      const b = api.el("button", { className: "btn ghost" }, board);
      b.style.cssText = "width:min(28vw,110px);height:min(28vw,110px);font-size:min(14vw,60px);padding:0";
      b.onclick = () => {
        if (over || cells[i]) return;
        cells[i] = "X"; draw();
        let w = winner(cells); if (w) return finish(w);
        over = true; status.textContent = "Thinking…";
        timer = setTimeout(() => {
          over = false;
          const empty = cells.map((v, k) => v ? -1 : k).filter((k) => k >= 0);
          // 75% perfect play, 25% random, so it can be beaten.
          const move = Math.random() < 0.75 ? minimax(cells, "O").i : empty[api.rand(empty.length)];
          cells[move] = "O"; draw();
          w = winner(cells); if (w) finish(w); else status.textContent = "Your turn (X)";
        }, 350);
      };
      return b;
    });
    const reset = () => { clearTimeout(timer); cells = Array(9).fill(null); over = false; status.textContent = "Your turn (X)"; draw(); };
    again.onclick = reset;
    reset();
    return () => clearTimeout(timer);
  },
});
