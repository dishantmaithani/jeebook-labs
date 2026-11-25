App.register({
  id: "typing", name: "Typing Speed", emoji: "⌨️", color: "#34495e", unit: "WPM",
  desc: "Type the words as fast as you can. 30s.",
  start(stage, api) {
    const pool = ("the sun cat dog run jump blue green happy apple water house tree bird fish game play fast slow light dark " +
      "music dance smile cloud rain snow star moon river mountain phone book friend school pizza candy tiger lion " +
      "ocean garden window rocket planet happy little big small quick brown yellow purple orange simple world").split(" ");
    const status = api.el("div", { className: "status", textContent: "Type the highlighted word and press space" }, stage);
    const words = api.el("div", {}, stage);
    words.style.cssText = "font-size:22px;line-height:1.7;text-align:center;min-height:120px;max-width:420px";
    const input = api.el("input", { className: "field", placeholder: "start typing…", autocomplete: "off", autocapitalize: "off", spellcheck: false }, stage);
    input.style.width = "260px";
    const again = api.el("button", { className: "btn ghost", textContent: "Restart" }, stage);
    let list, idx, correct, chars, left, clock, started, over;

    const draw = () => {
      words.innerHTML = list.slice(idx, idx + 10).map((w, i) =>
        `<span style="padding:2px 6px;border-radius:6px;${i === 0 ? "background:#7c5cff" : "opacity:.7"}">${w}</span>`).join(" ");
    };
    const reset = () => {
      clearInterval(clock);
      list = Array.from({ length: 200 }, () => pool[api.rand(pool.length)]);
      idx = 0; correct = 0; chars = 0; left = 30; started = false; over = false;
      input.value = ""; input.disabled = false;
      status.textContent = "Type the highlighted word and press space"; draw(); input.focus();
    };
    const finish = () => {
      clearInterval(clock); over = true; input.disabled = true; api.sfx("over");
      const wpm = Math.round(chars / 5 / 0.5);
      status.textContent = `${wpm} WPM · ${correct} correct words` + (api.submit(wpm) ? " 🏆 New best!" : "");
    };
    input.addEventListener("input", () => {
      if (over) return;
      if (!started) {
        started = true;
        clock = setInterval(() => { left--; status.textContent = `⏱ ${left}s · ✅ ${correct}`; if (left <= 0) finish(); }, 1000);
      }
      const v = input.value;
      if (v.endsWith(" ")) {
        if (v.trim().toLowerCase() === list[idx]) { correct++; chars += list[idx].length + 1; api.sfx("move"); } else api.sfx("bad");
        idx++; input.value = ""; draw();
        status.textContent = `⏱ ${left}s · ✅ ${correct}`;
      }
    });
    again.onclick = reset;
    reset();
    return () => clearInterval(clock);
  },
});
