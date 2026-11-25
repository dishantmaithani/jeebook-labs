App.register({
  id: "tapspeed", name: "Tap Speed", emoji: "👆", color: "#c0392b", unit: "taps",
  desc: "How many taps can you do in 10 seconds?",
  start(stage, api) {
    const status = api.el("div", { className: "status", textContent: "Tap the button to start the clock" }, stage);
    const pad = api.el("button", { className: "btn" }, stage);
    pad.style.cssText = "width:240px;height:240px;border-radius:50%;font-size:40px";
    pad.textContent = "TAP!";
    let taps = 0, left = 0, clock, state = "idle", cool;
    pad.onpointerdown = () => {
      if (state === "cool") return;
      if (state === "idle") {
        state = "run"; taps = 0; left = 10;
        clock = setInterval(() => {
          left--; status.textContent = `Taps ${taps} · ⏱ ${left}s`;
          if (left <= 0) {
            clearInterval(clock); state = "cool"; api.sfx("good");
            status.textContent = `${taps} taps! (${(taps / 10).toFixed(1)} per second)` + (api.submit(taps) ? " 🏆 New best!" : "");
            pad.textContent = "⏳";
            cool = setTimeout(() => { state = "idle"; pad.textContent = "AGAIN"; }, 1500);
          }
        }, 1000);
      }
      taps++; pad.textContent = taps;
      pad.style.transform = "scale(.95)"; setTimeout(() => (pad.style.transform = ""), 60);
      status.textContent = `Taps ${taps} · ⏱ ${left}s`;
    };
    return () => { clearInterval(clock); clearTimeout(cool); };
  },
});
