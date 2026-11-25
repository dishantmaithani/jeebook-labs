App.register({
  id: "reaction", name: "Reaction Time", emoji: "⚡", color: "#d4a017", unit: "ms",
  desc: "Tap the moment it turns green.",
  start(stage, api) {
    const box = api.el("button", { className: "btn" }, stage);
    box.style.cssText = "width:100%;height:320px;font-size:24px;border-radius:20px";
    const status = api.el("div", { className: "status" }, stage);
    let state = "idle", t0, timer;
    const set = (bg, text) => { box.style.background = bg; box.textContent = text; };
    set("#3a3555", "Tap to start");
    box.onpointerdown = () => {
      if (state === "idle" || state === "done") {
        state = "wait"; set("#c0392b", "Wait for green…");
        timer = setTimeout(() => { state = "go"; t0 = performance.now(); set("#27ae60", "TAP NOW!"); }, 1200 + Math.random() * 2500);
      } else if (state === "wait") {
        clearTimeout(timer); api.sfx("bad"); state = "done"; set("#3a3555", "Too soon! Tap to try again");
      } else if (state === "go") {
        const ms = Math.round(performance.now() - t0);
        api.sfx("good"); state = "done"; set("#3a3555", `${ms} ms — tap to go again`);
        status.textContent = api.submit(ms, true) ? "🏆 New best!" : "";
      }
    };
    return () => clearTimeout(timer);
  },
});
