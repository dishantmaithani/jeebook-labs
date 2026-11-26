// Oncogenesis: cancer biology strategy game. The full game lives in games/oncogenesis.html
// (a copy of the root oncogenesis.html) and is shown full-screen in an iframe below the top bar.
// Its best score is the total stars earned across all cases.
App.register({
  id: "oncogenesis", name: "Oncogenesis", emoji: "🧫", color: "#5a1d4a", unit: "★",
  desc: "Stop mutated cells before they become cancer.",
  start(stage, api) {
    const bar = document.querySelector(".topbar");
    const frame = api.el("iframe", { src: "games/oncogenesis.html", title: "Oncogenesis" }, stage);
    const fit = () => {
      const top = bar ? bar.getBoundingClientRect().bottom : 0;
      Object.assign(frame.style, {
        position: "fixed", left: "0", top: top + "px", width: "100%",
        height: `calc(100% - ${top}px)`, border: "0", background: "#0d0810", zIndex: "4",
      });
    };
    fit();
    window.addEventListener("resize", fit);
    const onMsg = (e) => {
      if (e.source === frame.contentWindow && e.data && typeof e.data.oncogenesisStars === "number")
        api.submit(e.data.oncogenesisStars);
    };
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("message", onMsg);
    };
  },
});
