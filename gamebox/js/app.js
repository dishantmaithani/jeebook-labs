// Game Box core: registers games, shows the home grid, runs a game, keeps best scores,
// and gives every game sound + vibration helpers.
// To add a new game: create www/js/games/yourgame.js that calls App.register({...})
// and add a <script> tag for it in index.html.
const App = (() => {
  const games = [];
  let cleanup = null;
  let current = null;
  const $ = (id) => document.getElementById(id);

  function load(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function save(key, v) { try { localStorage.setItem(key, v); } catch {} }
  function loadBest(id) { const v = load("best_" + id); return v === null ? null : Number(v); }

  // ---------- Sound (synthesised, no files needed) ----------
  let muted = load("muted") === "1";
  let actx = null;
  const tones = {
    tap:    [[520, 0.04, "sine", 0.05]],
    good:   [[660, 0.08, "sine"], [880, 0.1, "sine"]],
    bad:    [[200, 0.18, "sawtooth", 0.08]],
    pop:    [[900, 0.05, "triangle"], [1300, 0.05, "triangle"]],
    over:   [[440, 0.15, "triangle"], [330, 0.15, "triangle"], [220, 0.3, "triangle"]],
    record: [[523, 0.1, "square", 0.06], [659, 0.1, "square", 0.06], [784, 0.1, "square", 0.06], [1046, 0.3, "square", 0.06]],
    move:   [[300, 0.03, "sine", 0.04]],
  };
  function sfx(name) {
    if (muted || !tones[name]) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      let t = actx.currentTime;
      for (const [freq, dur, type, vol = 0.12] of tones[name]) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(actx.destination);
        o.start(t); o.stop(t + dur + 0.02);
        t += dur * 0.9;
      }
    } catch {}
  }
  function buzz(ms) { if (!muted && navigator.vibrate) try { navigator.vibrate(ms); } catch {} }
  function setMuted(m) { muted = m; save("muted", m ? "1" : "0"); $("muteBtn").textContent = m ? "🔇" : "🔊"; }

  function bestText(g) {
    const b = loadBest(g.id);
    return b === null ? "" : "Best: " + b + (g.unit ? " " + g.unit : "");
  }

  function register(game) { games.push(game); }

  function renderHome() {
    const home = $("home");
    home.innerHTML = "";
    const played = games.filter((g) => loadBest(g.id) !== null).length;
    const head = document.createElement("div");
    head.className = "homehead";
    head.innerHTML = `<span>${games.length} games · ${played} played</span>`;
    const surprise = document.createElement("button");
    surprise.className = "btn"; surprise.textContent = "🎲 Surprise me";
    surprise.onclick = () => open(games[Math.floor(Math.random() * games.length)]);
    head.appendChild(surprise);
    home.appendChild(head);
    games.forEach((g) => {
      const t = document.createElement("button");
      t.className = "tile";
      t.style.background = g.color;
      t.innerHTML = `<span class="emoji">${g.emoji}</span><span class="name">${g.name}</span>
        <span class="desc">${g.desc}</span><span class="hs">${bestText(g) ? "🏆 " + bestText(g) : "New!"}</span>`;
      t.onclick = () => open(g);
      home.appendChild(t);
    });
  }

  function open(g) {
    if (cleanup) cleanup();
    current = g;
    $("home").classList.add("hidden");
    const stage = $("stage");
    stage.classList.remove("hidden");
    stage.innerHTML = "";
    $("backBtn").classList.remove("hidden");
    $("title").textContent = g.emoji + " " + g.name;
    $("best").textContent = bestText(g);
    window.scrollTo(0, 0);
    cleanup = g.start(stage, api) || null;
  }

  function close() {
    if (cleanup) cleanup();
    cleanup = null; current = null;
    $("stage").classList.add("hidden");
    $("stage").innerHTML = "";
    $("home").classList.remove("hidden");
    $("backBtn").classList.add("hidden");
    $("title").textContent = "🎮 Game Box";
    $("best").textContent = "";
    renderHome();
  }

  // Helpers handed to every game.
  const api = {
    // Saves score if it beats the record. lowerIsBetter for times/tries. Returns true on new record.
    submit(score, lowerIsBetter = false) {
      const g = current; if (!g) return false;
      const b = loadBest(g.id);
      const better = b === null || (lowerIsBetter ? score < b : score > b);
      if (better) {
        save("best_" + g.id, score); $("best").textContent = bestText(g);
        sfx("record"); buzz([60, 40, 120]);
      }
      return better;
    },
    sfx,
    buzz,
    el(tag, props = {}, parent) {
      const e = document.createElement(tag);
      Object.assign(e, props);
      if (parent) parent.appendChild(e);
      return e;
    },
    rand(n) { return Math.floor(Math.random() * n); },
  };

  function init() {
    $("backBtn").onclick = close;
    setMuted(muted);
    $("muteBtn").onclick = () => setMuted(!muted);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && current) close(); });
    // Soft click on every button press.
    document.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) sfx("tap"); });
    // Phone back button: leave the game first, exit the app only from the home screen.
    const native = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    // Ignore repeat events within 400 ms so one press never both closes a game and exits.
    let lastBack = 0;
    if (native) native.addListener("backButton", () => {
      const now = Date.now();
      if (now - lastBack < 400) return;
      lastBack = now;
      if (current) close(); else native.exitApp();
    });
    // Open a game straight away with ?game=<id> (used for store screenshots).
    const want = new URLSearchParams(location.search).get("game");
    const g = games.find((x) => x.id === want);
    if (g) open(g); else renderHome();
  }

  return { register, init };
})();
