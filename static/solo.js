// Solo games: everything runs on this device; best scores live in localStorage.

let PLAYERS = null;
const SOLO_GAMES = ["nameall", "career", "survival", "mystery"];
const SOLO_ICON = { nameall: "📝", career: "🧭", survival: "❤️", mystery: "❓" };
let TIMERS = [];

function getBest(key) { try { return JSON.parse(localStorage.getItem("kc_best") || "{}")[key]; } catch (e) { return undefined; } }
// lowerIsBetter for "fewest tries" games
function saveBest(key, val, lowerIsBetter) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem("kc_best") || "{}"); } catch (e) {}
  const old = all[key];
  const better = old == null || (lowerIsBetter ? val < old : val > old);
  if (better) { all[key] = val; try { localStorage.setItem("kc_best", JSON.stringify(all)); } catch (e) {} }
  return better;
}
function clearTimers() { TIMERS.forEach(clearInterval); TIMERS.forEach(clearTimeout); TIMERS = []; }
function app() { return $("#app"); }
function go(game) { history.replaceState(null, "", game ? `solo.html?g=${game}` : "solo.html"); route(); }

function menuHTML() {
  return `<div class="sologrid">${SOLO_GAMES.map((k) => {
    const b = getBest(k === "nameall" ? "nameall_total" : k);
    return `<button class="card sologame" data-go="${k}"><div class="ico">${SOLO_ICON[k]}</div><h3>${t("g_" + k)}</h3>
      <div class="muted">${t("g_" + k + "_d")}</div>${b != null ? `<div class="chip" style="margin-top:8px">${t("best")}: ${b}</div>` : ""}</button>`;
  }).join("")}</div>`;
}

function wire(root) {
  root.querySelectorAll("[data-go]").forEach((b) => { b.onclick = () => go(b.dataset.go); });
  root.querySelectorAll("[data-menu]").forEach((b) => { b.onclick = () => go(null); });
}

function topbar(key, extra) {
  return `<div class="row"><button class="small ghost" data-menu>← ${t("menu")}</button>
    <h2 style="margin:0">${SOLO_ICON[key]} ${t("g_" + key)}</h2><span class="grow"></span>${extra || ""}</div>`;
}

// ---------- Name Them All (Sporcle-style) ----------
const NameAll = {
  start() {
    const cats = DATA.rondo;
    app().innerHTML = topbar("nameall") + `<h3>${t("choose_cat")}</h3><div class="btngrid">
      <button class="primary" data-cat="-1">🎲 ${t("random_cat")}</button>
      ${cats.map((c, i) => { const b = getBest("nameall:" + c.prompt.en); return `<button data-cat="${i}">${esc(L(c.prompt))}${b != null ? ` <span class="muted">· ${b}/${c.answers.length}</span>` : ""}</button>`; }).join("")}</div>`;
    wire(app());
    app().querySelectorAll("[data-cat]").forEach((b) => {
      b.onclick = () => { const i = +b.dataset.cat; this.play(i < 0 ? freshest("rondo", cats, 1)[0] : cats[i]); };
    });
  },
  play(cat) {
    clearTimers();
    const secs = Math.max(90, cat.answers.length * 15);
    const deadline = now() + secs;
    const found = new Array(cat.answers.length).fill(false);
    let over = false;
    app().innerHTML = topbar("nameall", `<span class="clock" data-deadline="${deadline}" style="font-size:26px"></span>`) +
      `<div class="card center"><div style="font-size:24px;font-weight:900">${esc(L(cat.prompt))}</div>
        <div class="muted" id="na-count">0 / ${cat.answers.length}</div></div>
      ${timerBar(deadline, secs)}
      <div class="row"><input type="text" id="na-in" class="grow" autocomplete="off" spellcheck="false" placeholder="${esc(t("type_answer"))}">
        <button id="na-give">${t("give_up")}</button></div>
      <div class="slots" id="na-slots">${cat.answers.map((_, i) => `<div class="slot" data-i="${i}">${i + 1}</div>`).join("")}</div>
      <div id="na-end"></div>`;
    wire(app());
    const input = $("#na-in");
    input.focus();
    const finish = () => {
      if (over) return;
      over = true;
      clearTimers();
      input.disabled = true;
      $("#na-give").hidden = true;
      cat.answers.forEach((a, i) => {
        if (!found[i]) { const s = app().querySelector(`.slot[data-i="${i}"]`); s.textContent = L(a); s.classList.add("missed"); }
      });
      const n = found.filter(Boolean).length;
      const nb = saveBest("nameall:" + cat.prompt.en, n);
      let total = 0;
      DATA.rondo.forEach((c) => { total += getBest("nameall:" + c.prompt.en) || 0; });
      saveBest("nameall_total", total);
      $("#na-end").innerHTML = `<div class="card center"><div class="huge">${n} / ${cat.answers.length}</div>
        ${nb && n ? `<div style="color:var(--gold);font-weight:800">${t("new_best")}</div>` : ""}
        <div class="row" style="justify-content:center;margin-top:10px"><button class="primary" id="na-again">${t("again")}</button><button data-menu>${t("menu")}</button></div></div>`;
      wire(app());
      $("#na-again").onclick = () => this.start();
    };
    input.addEventListener("input", () => {
      const v = input.value;
      for (let i = 0; i < cat.answers.length; i++) {
        if (!found[i] && matches(v, namesOf(cat.answers[i]))) {
          found[i] = true;
          const s = app().querySelector(`.slot[data-i="${i}"]`);
          s.textContent = L(cat.answers[i]);
          s.classList.add("got");
          input.value = "";
          const n = found.filter(Boolean).length;
          $("#na-count").textContent = `${n} / ${cat.answers.length}`;
          if (n === cat.answers.length) finish();
          break;
        }
      }
    });
    $("#na-give").onclick = finish;
    TIMERS.push(setInterval(() => { if (now() >= deadline) finish(); }, 250));
  },
};

// ---------- Career Path (solo) ----------
const CareerSolo = {
  start() {
    clearTimers();
    this.qs = freshest("career", DATA.career, 5);
    this.qi = -1;
    this.total = 0;
    this.next();
  },
  next() {
    this.qi++;
    if (this.qi >= this.qs.length) return this.end();
    this.q = this.qs[this.qi];
    this.shown = 1;
    this.done = false;
    app().innerHTML = topbar("career", `<span class="chip">${t("total")}: <b id="cp-total">${this.total}</b></span>`) +
      `<div class="muted">${t("round_of")} ${this.qi + 1}/${this.qs.length} · ${t("worth")} <b id="cp-pts"></b> ${t("pts")}</div>
      <div class="card"><div class="path" id="cp-path"></div></div>
      <form class="row" id="cp-form"><input type="text" id="cp-in" class="grow" autocomplete="off" spellcheck="false" placeholder="${esc(t("guess_player"))}">
        <button class="primary">${t("send")}</button></form>
      <div class="row"><button id="cp-more">${t("reveal_next")}</button><button class="ghost" id="cp-skip">${t("skip_player")}</button></div>
      <div class="fb" id="cp-fb"></div><div id="cp-end"></div>`;
    wire(app());
    this.draw();
    $("#cp-in").focus();
    $("#cp-form").onsubmit = (e) => {
      e.preventDefault();
      const v = $("#cp-in").value.trim();
      if (!v || this.done) return;
      $("#cp-in").value = "";
      if (matches(v, [this.q.answer.en, this.q.answer.ar, ...this.q.aliases])) this.reveal(true);
      else {
        $("#cp-fb").textContent = `✖ ${v}`;
        $("#cp-fb").className = "fb bad";
        this.more();
      }
    };
    $("#cp-more").onclick = () => this.more();
    $("#cp-skip").onclick = () => this.reveal(false);
  },
  points() { return Math.max(1, 6 - this.shown); },
  draw() {
    const clubs = this.q.clubs.map((c, i) => i < this.shown ? `<span class="club">${esc(L(c))}</span>` : `<span class="club hidden">?</span>`);
    $("#cp-path").innerHTML = clubs.join(`<span class="arrow">➜</span>`);
    $("#cp-pts").textContent = this.points();
    $("#cp-more").disabled = this.shown >= this.q.clubs.length;
  },
  more() {
    if (this.shown < this.q.clubs.length) { this.shown++; this.draw(); }
    else this.reveal(false);
  },
  reveal(won) {
    if (this.done) return;
    this.done = true;
    const pts = won ? this.points() : 0;
    this.total += pts;
    this.shown = this.q.clubs.length;
    this.draw();
    $("#cp-total").textContent = this.total;
    $("#cp-form").hidden = true;
    $("#cp-more").parentElement.hidden = true;
    $("#cp-fb").textContent = "";
    $("#cp-end").innerHTML = `<div class="card center"><div class="muted">${won ? "✅ +" + pts + " " + t("pts") : t("it_was")}</div>
      <div class="huge" style="color:var(--gold)">${esc(L(this.q.answer))}</div>
      <button class="primary" id="cp-next" style="margin-top:10px">${t("next_player")}</button></div>`;
    $("#cp-next").onclick = () => this.next();
    $("#cp-next").focus();
  },
  end() {
    const max = this.qs.length * 5;
    const nb = saveBest("career", this.total);
    app().innerHTML = topbar("career") + `<div class="card center"><div class="muted">${t("total")}</div>
      <div class="huge">${this.total} / ${max}</div>${nb && this.total ? `<div style="color:var(--gold);font-weight:800">${t("new_best")}</div>` : ""}
      <div class="row" style="justify-content:center;margin-top:10px"><button class="primary" id="cp-again">${t("again")}</button><button data-menu>${t("menu")}</button></div></div>`;
    wire(app());
    $("#cp-again").onclick = () => this.start();
  },
};

// ---------- Survival Quiz ----------
const Survival = {
  QTIME: 10,
  start() {
    clearTimers();
    this.queue = [];
    this.lives = 3;
    this.streak = 0;
    this.next();
  },
  next() {
    clearTimers();
    if (!this.queue.length) this.queue = freshest("quickfire", DATA.quickfire);
    const q = this.queue.shift();
    markPlayed("quickfire", [q]);
    const order = shuffle(q.options.map((_, i) => i));
    const opts = order.map((i) => q.options[i]);
    const correct = order.indexOf(0);
    const deadline = now() + this.QTIME;
    let answered = false;
    app().innerHTML = topbar("survival", `<span class="chip">${t("streak")}: <b>${this.streak}</b></span><span class="chip">${"❤️".repeat(this.lives)}</span>`) +
      `<div class="card"><div style="font-size:24px;font-weight:900;text-align:center">${esc(L(q.q))}</div>
        ${q.img ? `<img class="qimg" src="${esc(q.img)}" alt="" style="margin-top:12px;max-height:130px">` : ""}</div>
      ${timerBar(deadline, this.QTIME)}
      <div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${"ABCD"[i]}</span>${esc(L(o))}</button>`).join("")}</div>`;
    wire(app());
    const pick = (i) => {
      if (answered) return;
      answered = true;
      clearTimers();
      app().querySelectorAll(".opt").forEach((b, j) => {
        b.disabled = true;
        b.classList.add(j === correct ? "right" : j === i ? "wrongpick" : "dim");
      });
      if (i === correct) this.streak++; else this.lives--;
      TIMERS.push(setTimeout(() => (this.lives > 0 ? this.next() : this.end()), 1300));
    };
    app().querySelectorAll(".opt").forEach((b) => { b.onclick = () => pick(+b.dataset.i); });
    TIMERS.push(setInterval(() => { if (now() >= deadline) pick(-1); }, 200));
  },
  end() {
    const nb = saveBest("survival", this.streak);
    app().innerHTML = topbar("survival") + `<div class="card center"><div class="muted">${t("game_over")} · ${t("streak")}</div>
      <div class="huge">${this.streak}</div>${nb && this.streak ? `<div style="color:var(--gold);font-weight:800">${t("new_best")}</div>` : ""}
      <div class="row" style="justify-content:center;margin-top:10px"><button class="primary" id="sv-again">${t("again")}</button><button data-menu>${t("menu")}</button></div></div>`;
    wire(app());
    $("#sv-again").onclick = () => this.start();
  },
};

// ---------- Mystery Player (Who Are Ya?-style) ----------
const Mystery = {
  TRIES: 8,
  start(mode) {
    clearTimers();
    this.mode = mode || "daily";
    const list = PLAYERS.players;
    if (this.mode === "daily") {
      const d = new Date();
      const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      let h = seed;
      for (let i = 0; i < 5; i++) h = (h * 1103515245 + 12345) % 2147483648;
      this.target = list[h % list.length];
    } else {
      this.target = choice(list);
    }
    this.guesses = [];
    this.over = false;
    app().innerHTML = topbar("mystery") +
      `<div class="row"><button class="small ${this.mode === "daily" ? "primary" : ""}" data-mode="daily">📅 ${t("daily")}</button>
        <button class="small ${this.mode === "random" ? "primary" : ""}" data-mode="random">🎲 ${t("random")}</button>
        <span class="grow"></span><span class="chip"><b id="my-left">${this.TRIES}</b> ${t("guesses_left")}</span></div>
      <form class="row" id="my-form"><input type="text" id="my-in" class="grow" list="my-list" autocomplete="off" spellcheck="false" placeholder="${esc(t("guess_player"))}">
        <button class="primary">${t("send")}</button></form>
      <datalist id="my-list">${list.map((p) => `<option value="${esc(L(p.name))}">`).join("")}</datalist>
      <div class="fb bad" id="my-fb"></div>
      <div class="mtable"><div class="mrow mhead"><div></div><div>${t("nation")}</div><div>${t("position")}</div><div>${t("born")}</div><div>${t("clubs_shared")}</div></div><div id="my-rows"></div></div>
      <div id="my-end"></div>`;
    wire(app());
    app().querySelectorAll("[data-mode]").forEach((b) => { b.onclick = () => this.start(b.dataset.mode); });
    $("#my-in").focus();
    $("#my-form").onsubmit = (e) => {
      e.preventDefault();
      if (this.over) return;
      const v = $("#my-in").value.trim();
      if (!v) return;
      const exact = list.find((p) => norm(p.name.en) === norm(v) || norm(p.name.ar) === norm(v));
      const p = exact || list.find((x) => matches(v, [x.name.en, x.name.ar, ...x.aliases]));
      if (!p) { $("#my-fb").textContent = t("unknown_player"); return; }
      if (this.guesses.includes(p)) { $("#my-fb").textContent = t("already_guessed"); return; }
      $("#my-fb").textContent = "";
      $("#my-in").value = "";
      this.guess(p);
    };
  },
  guess(p) {
    const T = this.target, N = PLAYERS.nations;
    this.guesses.push(p);
    const nat = p.nation === T.nation ? "g" : N[p.nation].continent === N[T.nation].continent ? "y" : "x";
    const pos = p.pos === T.pos ? "g" : "x";
    const dy = T.born - p.born;
    const born = dy === 0 ? "g" : Math.abs(dy) <= 2 ? "y" : "x";
    const arrow = dy > 0 ? " ↑" : dy < 0 ? " ↓" : "";
    const shared = p.clubs.filter((c) => T.clubs.includes(c));
    const clubs = p === T ? "g" : shared.length ? "y" : "x";
    const row = document.createElement("div");
    row.className = "mrow";
    row.innerHTML = `<div class="mname">${esc(L(p.name))}</div><div class="${nat}">${esc(L(N[p.nation]))}</div>
      <div class="${pos}">${t("pos_" + p.pos)}</div><div class="${born}">${p.born}${arrow}</div>
      <div class="${clubs}">${shared.length ? esc(shared.slice(0, 2).join(", ")) + (shared.length > 2 ? ` +${shared.length - 2}` : "") : "—"}</div>`;
    $("#my-rows").prepend(row);
    $("#my-left").textContent = this.TRIES - this.guesses.length;
    if (p === T || this.guesses.length >= this.TRIES) this.end(p === T);
  },
  end(won) {
    this.over = true;
    $("#my-form").hidden = true;
    const nb = won && saveBest("mystery", this.guesses.length, true);
    $("#my-end").innerHTML = `<div class="card center"><div class="muted">${won ? `${t("solved")} ${this.guesses.length} ${t("tries")}` : t("it_was")}</div>
      <div class="huge" style="color:var(--gold)">${esc(L(this.target.name))}</div>${nb ? `<div style="color:var(--gold);font-weight:800">${t("new_best")}</div>` : ""}
      <div class="row" style="justify-content:center;margin-top:10px"><button class="primary" data-mode="random">🎲 ${t("random")}</button><button data-menu>${t("menu")}</button></div></div>`;
    wire(app());
    app().querySelectorAll("#my-end [data-mode]").forEach((b) => { b.onclick = () => this.start("random"); });
  },
};

const SOLO = { nameall: NameAll, career: CareerSolo, survival: Survival, mystery: Mystery };

function route() {
  clearTimers();
  const g = new URLSearchParams(location.search).get("g");
  if (SOLO[g]) SOLO[g].start();
  else { app().innerHTML = `<h2 style="margin:0">🎮 ${t("tab_solo")}</h2>` + menuHTML(); wire(app()); }
}

async function boot() {
  applyLang();
  await loadData();
  PLAYERS = await (await fetch("data/players.json", { cache: "no-cache" })).json();
  route();
}
RERENDER = route;
boot();
