App.register({
  id: "higherlower", name: "Higher or Lower", emoji: "🎴", color: "#7d3c98", unit: "streak",
  desc: "Will the next card be higher or lower?",
  start(stage, api) {
    const names = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const suits = ["♠", "♥", "♦", "♣"];
    const status = api.el("div", { className: "status" }, stage);
    const card = api.el("div", { className: "big" }, stage);
    card.style.cssText = "background:#fff;color:#222;border-radius:16px;width:150px;height:210px;display:flex;align-items:center;justify-content:center;font-size:56px";
    const row = api.el("div", { className: "row" }, stage);
    const hi = api.el("button", { className: "btn", textContent: "⬆️ Higher" }, row);
    const lo = api.el("button", { className: "btn", textContent: "⬇️ Lower" }, row);
    const again = api.el("button", { className: "btn ghost", textContent: "New game" }, stage);
    let cur, streak, over;

    const deal = () => ({ v: api.rand(13), s: suits[api.rand(4)] });
    const show = (c) => {
      card.textContent = names[c.v] + c.s;
      card.style.color = c.s === "♥" || c.s === "♦" ? "#d62c4a" : "#222";
    };
    const guess = (up) => {
      if (over) return;
      const nx = deal();
      show(nx);
      if (nx.v === cur.v) { status.textContent = `Same card, free pass! Streak ${streak}`; cur = nx; return; }
      if ((nx.v > cur.v) === up) { streak++; api.sfx("good"); status.textContent = `Correct! ✅ Streak ${streak}`; api.submit(streak); cur = nx; }
      else { over = true; api.sfx("over"); status.textContent = `Wrong! Final streak ${streak}`; }
    };
    hi.onclick = () => guess(true);
    lo.onclick = () => guess(false);
    const reset = () => { cur = deal(); show(cur); streak = 0; over = false; status.textContent = "Streak 0 · Ace is lowest, King highest"; };
    again.onclick = reset;
    reset();
  },
});
