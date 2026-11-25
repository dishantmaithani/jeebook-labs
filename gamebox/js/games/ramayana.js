// Ramayana: a full 3D open-world game that lives in its own page (www/ramayana/).
// The tile shows a short intro, then opens that page. Progress = quests completed.
App.register({
  id: "ramayana", name: "Ramayana", emoji: "🏹", color: "#c2571a", unit: "/ 16 quests",
  desc: "Open-world 3D adventure: Ayodhya to Lanka as Rama.",
  start(stage, api) {
    api.el("div", { className: "status", textContent: "Walk from Ayodhya to Lanka as Rama — a big 3D world with quests, battles and Ravana himself." }, stage);
    api.el("div", { className: "status", textContent: "Best played with headphones. Progress saves automatically." }, stage);
    const go = api.el("button", { className: "btn", textContent: "▶ Play Ramayana" }, stage);
    go.onclick = () => location.replace("ramayana/index.html?box=1");
  },
});
