App.register({
  id: "rps", name: "Rock Paper Scissors", emoji: "✊", color: "#8e44ad", unit: "win streak",
  desc: "Classic hand game vs the computer.",
  start(stage, api) {
    const big = api.el("div", { className: "big", textContent: "❔ vs ❔" }, stage);
    const status = api.el("div", { className: "status", textContent: "Pick one!" }, stage);
    const row = api.el("div", { className: "row" }, stage);
    const tally = api.el("div", { className: "status" }, stage);
    const opts = { rock: "✊", paper: "✋", scissors: "✌️" };
    const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
    let w = 0, l = 0, d = 0, streak = 0;
    const show = () => (tally.textContent = `Wins ${w} · Losses ${l} · Draws ${d} · Streak ${streak}`);
    Object.keys(opts).forEach((k) => {
      const b = api.el("button", { className: "btn", textContent: opts[k] + " " + k }, row);
      b.onclick = () => {
        const cpu = Object.keys(opts)[api.rand(3)];
        big.textContent = `${opts[k]} vs ${opts[cpu]}`;
        if (k === cpu) { d++; status.textContent = "Draw!"; }
        else if (beats[k] === cpu) { w++; streak++; api.sfx("good"); status.textContent = "You win! 🎉"; api.submit(streak); }
        else { l++; streak = 0; api.sfx("bad"); status.textContent = "You lose 😢"; }
        show();
      };
    });
    show();
  },
});
