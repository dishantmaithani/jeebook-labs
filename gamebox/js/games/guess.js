App.register({
  id: "guess", name: "Guess the Number", emoji: "🔢", color: "#16a085", unit: "tries",
  desc: "I'm thinking of 1–100. Find it!",
  start(stage, api) {
    const status = api.el("div", { className: "status" }, stage);
    const input = api.el("input", { className: "field", type: "number", inputMode: "numeric", placeholder: "?" }, stage);
    const row = api.el("div", { className: "row" }, stage);
    const go = api.el("button", { className: "btn", textContent: "Guess" }, row);
    const again = api.el("button", { className: "btn ghost", textContent: "New number" }, row);
    const history = api.el("div", { className: "status" }, stage);
    history.style.color = "var(--muted)";
    let target, tries, done;
    const reset = () => {
      target = api.rand(100) + 1; tries = 0; done = false;
      status.textContent = "Guess a number from 1 to 100"; history.textContent = ""; input.value = ""; input.focus();
    };
    const guess = () => {
      const n = parseInt(input.value, 10);
      if (done || !(n >= 1 && n <= 100)) return;
      tries++; input.value = ""; input.focus();
      if (n === target) {
        done = true; api.sfx("good");
        status.textContent = `🎯 ${n} is right! ${tries} tries` + (api.submit(tries, true) ? " 🏆 New best!" : "");
      } else {
        api.sfx("move"); status.textContent = n < target ? `${n} is too low ⬆️` : `${n} is too high ⬇️`;
        history.textContent += (history.textContent ? ", " : "Tried: ") + n;
      }
    };
    go.onclick = guess;
    input.onkeydown = (e) => { if (e.key === "Enter") guess(); };
    again.onclick = reset;
    reset();
  },
});
