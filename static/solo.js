// Solo games: dated quizzes (2 new per game per day) with a progress calendar, plus a practice mode.
// Everything runs on this device; progress and best scores live in localStorage.

let PLAYERS = null;
let QUIZZES = null;
const SOLO_GAMES = ["nameall", "career", "survival", "mystery"];
const SOLO_ICON = Object.fromEntries(SOLO_GAMES.map((k) => [k, icon(k)]));
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

// ---------- quiz progress ----------
function progressAll() { try { return JSON.parse(localStorage.getItem("kc_progress") || "{}"); } catch (e) { return {}; } }
function progressOf(id) { return progressAll()[id]; }
// Keeps the best score per quiz; returns true when it's a new best.
function saveProgress(id, score, max) {
  const all = progressAll();
  const old = all[id];
  const better = !old || score > old.score;
  all[id] = { score: better ? score : old.score, max, at: old ? old.at : todayStr(), last: todayStr() };
  try { localStorage.setItem("kc_progress", JSON.stringify(all)); } catch (e) {}
  return better;
}
function todayStr(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function quizzesOf(game) { return (QUIZZES && QUIZZES[game]) || []; }
// Consecutive days, ending today or yesterday, on which at least one quiz of this game was finished.
function dayStreak(game) {
  const all = progressAll();
  const done = new Set();
  quizzesOf(game).forEach((q) => { if (all[q.id]) { done.add(all[q.id].at); done.add(all[q.id].last); } });
  let n = 0;
  const d = new Date();
  if (!done.has(todayStr(d))) d.setDate(d.getDate() - 1);
  while (done.has(todayStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function clearTimers() { TIMERS.forEach(clearInterval); TIMERS.forEach(clearTimeout); TIMERS = []; }
function app() { return $("#app"); }
function go(game, extra) {
  history.replaceState(null, "", game ? `solo.html?g=${game}${extra || ""}` : "solo.html");
  route();
}

function menuHTML() {
  return `<div class="sologrid">${SOLO_GAMES.map((k) => {
    const list = quizzesOf(k);
    const done = list.filter((q) => progressOf(q.id)).length;
    return soloTile(k, list.length ? `${done}/${list.length}` : null, `data-go="${k}"`, "button");
  }).join("")}</div>`;
}

function wire(root) {
  root.querySelectorAll("[data-go]").forEach((b) => { b.onclick = () => go(b.dataset.go); });
  root.querySelectorAll("[data-menu]").forEach((b) => { b.onclick = () => go(null); });
  root.querySelectorAll("[data-cal]").forEach((b) => { b.onclick = () => Archive.show(b.dataset.cal, b.dataset.date); });
}

function topbar(key, extra) {
  return `<div class="row"><button class="small ghost" data-cal="${key}">← ${t("quizzes")}</button>
    <h2 class="c-${key}" style="margin:0"><span style="color:var(--c)">${SOLO_ICON[key]}</span> ${t("g_" + key)}</h2><span class="grow"></span>${extra || ""}</div>`;
}

// Result card shown at the end of a quiz or practice round.
function resultCard(game, quiz, score, max, isBest) {
  let nextBtn = "";
  if (quiz) {
    const next = quizzesOf(game).find((q) => !progressOf(q.id) && q.id !== quiz.id);
    if (next) nextBtn = `<button class="primary" data-play="${next.id}">${t("next_quiz")} ${icon("arrow")}</button>`;
  }
  return `<div class="card center answer-card"><div class="muted">${quiz ? quizLabel(quiz) : t("practice")}</div>
    <div class="huge">${score} / ${max}</div>${isBest && score ? `<div style="color:var(--gold);font-weight:800">${t("new_best")}</div>` : ""}
    <div class="row" style="justify-content:center;margin-top:12px">${nextBtn}
      <button ${nextBtn ? "" : 'class="primary"'} data-cal="${game}" data-date="${quiz ? quiz.date : ""}">${icon("calendar")} ${t("back_calendar")}</button></div></div>`;
}
function wireResult(root) {
  wire(root);
  root.querySelectorAll("[data-play]").forEach((b) => { b.onclick = () => playQuiz(b.dataset.play); });
}
function finishQuiz(game, quiz, score, max) {
  const best = quiz ? saveProgress(quiz.id, score, max) : saveBest("practice_" + game, score);
  if (best && score) confetti();
  return best;
}

function fmtDate(s, opts) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LANG === "ar" ? "ar-EG" : "en-GB", opts || { weekday: "long", day: "numeric", month: "long" });
}
function quizLabel(q) {
  const n = q.id.split("-").pop();
  return `${t("quiz")} ${n} · ${fmtDate(q.date, { day: "numeric", month: "short" })}${q.level ? " · " + t("lvl_" + q.level) : ""}`;
}

// ---------- calendar / archive ----------
const Archive = {
  show(game, date) {
    clearTimers();
    this.game = game;
    const list = quizzesOf(game);
    const dates = [...new Set(list.map((q) => q.date))].sort();
    const today = todayStr();
    this.sel = date || (dates.includes(today) ? today : dates[dates.length - 1] || today);
    const [y, m] = this.sel.split("-").map(Number);
    this.month = { y, m };
    this.render();
  },
  render() {
    const game = this.game, list = quizzesOf(game);
    const done = list.filter((q) => progressOf(q.id)).length;
    const streak = dayStreak(game);
    const { y, m } = this.month;
    const first = new Date(y, m - 1, 1);
    const days = new Date(y, m, 0).getDate();
    const lead = (first.getDay() + 6) % 7;  // Monday-first grid
    const byDate = {};
    list.forEach((q) => { (byDate[q.date] = byDate[q.date] || []).push(q); });
    const wd = t("weekdays").split(",");
    let cells = wd.map((w) => `<div class="cal-h">${w}</div>`).join("");
    for (let i = 0; i < lead; i++) cells += `<div></div>`;
    for (let d = 1; d <= days; d++) {
      const ds = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const qs = byDate[ds] || [];
      const doneN = qs.filter((q) => progressOf(q.id)).length;
      const cls = [qs.length ? "has" : "", ds === this.sel ? "sel" : "", ds === todayStr() ? "today" : "",
        qs.length && doneN === qs.length ? "full" : ""].join(" ");
      cells += `<button class="cal-d ${cls}" data-day="${ds}" ${qs.length ? "" : "disabled"}><span>${d}</span>
        <span class="dots">${qs.map((q) => `<i class="${progressOf(q.id) ? "on" : ""}"></i>`).join("")}</span></button>`;
    }
    const dayQs = byDate[this.sel] || [];
    const monthName = first.toLocaleDateString(LANG === "ar" ? "ar-EG" : "en-GB", { month: "long", year: "numeric" });
    app().innerHTML = `<div class="row"><button class="small ghost" data-menu>← ${t("menu")}</button>
        <h2 class="c-${game}" style="margin:0"><span style="color:var(--c)">${SOLO_ICON[game]}</span> ${t("g_" + game)}</h2></div>
      <div class="statrow">
        <div class="card stat"><b>${done}<small>/${list.length}</small></b><span>${t("quizzes_done")}</span></div>
        <div class="card stat"><b>${streak}${streak ? " 🔥" : ""}</b><span>${t("day_streak")}</span></div>
        <div class="card stat"><b>${(byDate[todayStr()] || []).filter((q) => !progressOf(q.id)).length}</b><span>${t("new_today")}</span></div>
      </div>
      <div class="cal-wrap">
        <div class="card cal">
          <div class="row"><button class="small ghost" data-mon="-1">‹</button><b class="grow center">${monthName}</b><button class="small ghost" data-mon="1">›</button></div>
          <div class="cal-grid">${cells}</div>
        </div>
        <div class="day">
          <h3 style="margin:0 0 10px">${fmtDate(this.sel)}${this.sel === todayStr() ? ` <span class="chip tag ts">${t("today")}</span>` : ""}</h3>
          ${dayQs.length ? dayQs.map((q) => {
            const p = progressOf(q.id);
            return `<div class="card quiz-row c-${game}">
              <div class="grow"><b>${t("quiz")} ${q.id.split("-").pop()}</b>${q.level ? ` <span class="chip lvl-${q.level} lvlchip">${t("lvl_" + q.level)}</span>` : ""}
                <div class="muted">${quizDesc(game, q)}</div></div>
              ${p ? `<span class="score">${p.score}/${p.max}</span>` : `<span class="chip tag ts">${t("new_badge")}</span>`}
              <button class="${p ? "" : "primary"}" data-play="${q.id}">${p ? t("replay") : t("play")}</button></div>`;
          }).join("") : `<div class="muted">${t("no_quizzes_day")}</div>`}
          <button class="ghost" id="practice" style="margin-top:10px">${icon("dice")} ${t("practice")}</button>
        </div>
      </div>`;
    wire(app());
    app().querySelectorAll("[data-day]").forEach((b) => { b.onclick = () => { this.sel = b.dataset.day; this.render(); }; });
    app().querySelectorAll("[data-mon]").forEach((b) => {
      b.onclick = () => {
        let { y, m } = this.month;
        m += +b.dataset.mon;
        if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
        this.month = { y, m };
        this.render();
      };
    });
    app().querySelectorAll("[data-play]").forEach((b) => { b.onclick = () => playQuiz(b.dataset.play); });
    $("#practice").onclick = () => SOLO[game].practice();
  },
};

function quizDesc(game, q) {
  if (game === "nameall") {
    const c = DATA.rondo.find((x) => x.prompt.en === q.items[0]);
    return c ? esc(L(c.prompt)) : "";
  }
  const unit = { career: t("u_players"), survival: t("u_questions"), mystery: t("u_players") }[game];
  return `${q.items.length} ${unit}`;
}

function playQuiz(id) {
  const game = id.split("-")[0];
  const quiz = quizzesOf(game).find((q) => q.id === id);
  if (!quiz) return Archive.show(game);
  history.replaceState(null, "", `solo.html?g=${game}`);
  SOLO[game].playQuiz(quiz);
}

// ---------- Name Them All (Sporcle-style) ----------
const NameAll = {
  playQuiz(quiz) {
    const cat = DATA.rondo.find((c) => c.prompt.en === quiz.items[0]);
    if (cat) this.play(cat, quiz);
  },
  practice() {
    const cats = DATA.rondo;
    app().innerHTML = topbar("nameall") + `<h3>${t("choose_cat")}</h3><div class="btngrid">
      <button class="primary" data-cat="-1">${icon("dice")} ${t("random_cat")}</button>
      ${cats.map((c, i) => { const b = getBest("nameall:" + c.prompt.en); return `<button data-cat="${i}">${esc(L(c.prompt))}${b != null ? ` <span class="muted">· ${b}/${c.answers.length}</span>` : ""}</button>`; }).join("")}</div>`;
    wire(app());
    app().querySelectorAll("[data-cat]").forEach((b) => {
      b.onclick = () => { const i = +b.dataset.cat; this.play(i < 0 ? freshest("rondo", cats, 1)[0] : cats[i], null); };
    });
  },
  play(cat, quiz) {
    clearTimers();
    const secs = Math.max(90, cat.answers.length * 15);
    const deadline = now() + secs;
    const found = new Array(cat.answers.length).fill(false);
    let over = false;
    app().innerHTML = topbar("nameall", `<span class="clock" data-deadline="${deadline}" style="font-size:26px"></span>`) +
      `<div class="card center"><div class="muted">${quiz ? quizLabel(quiz) : t("practice")}</div><div style="font-size:24px;font-weight:900">${esc(L(cat.prompt))}</div>
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
      saveBest("nameall:" + cat.prompt.en, n);
      const best = finishQuiz("nameall", quiz, n, cat.answers.length);
      $("#na-end").innerHTML = resultCard("nameall", quiz, n, cat.answers.length, best);
      wireResult(app());
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
          $("#na-count").classList.remove("bump"); void $("#na-count").offsetWidth; $("#na-count").classList.add("bump");
          if (n % 4 === 0 && n < cat.answers.length) toast(hype("ok"));
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
  playQuiz(quiz) {
    this.quiz = quiz;
    this.begin(quiz.items.map((n) => DATA.career.find((c) => c.answer.en === n)).filter(Boolean));
  },
  practice() { this.quiz = null; this.begin(freshest("career", DATA.career, 5)); },
  begin(qs) {
    clearTimers();
    this.qs = qs;
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
      `<div class="muted">${this.quiz ? quizLabel(this.quiz) + " · " : ""}${t("round_of")} ${this.qi + 1}/${this.qs.length} · ${t("worth")} <b id="cp-pts"></b> ${t("pts")}</div>
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
        shake($("#cp-form"));
        this.more();
      }
    };
    $("#cp-more").onclick = () => this.more();
    $("#cp-skip").onclick = () => this.reveal(false);
  },
  points() { return Math.max(1, 6 - this.shown); },
  draw() {
    const clubs = this.q.clubs.map((c, i) => i < this.shown ? clubCard(c, i < this.shown - 1) : `<span class="club hidden">?</span>`);
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
    if (won) { toast(`${hype("ok")} +${pts}`); if (pts >= 4) confetti(.6); } else toast(hype("bad"), "bad");
    this.shown = this.q.clubs.length;
    this.draw();
    $("#cp-total").textContent = this.total;
    $("#cp-form").hidden = true;
    $("#cp-more").parentElement.hidden = true;
    $("#cp-fb").textContent = "";
    const last = this.qi + 1 >= this.qs.length;
    $("#cp-end").innerHTML = `<div class="card center"><div class="muted">${won ? "✅ +" + pts + " " + t("pts") : t("it_was")}</div>
      <div class="huge" style="color:var(--gold)">${esc(L(this.q.answer))}</div>
      <button class="primary" id="cp-next" style="margin-top:10px">${last ? t("see_score") : t("next_player")}</button></div>`;
    $("#cp-next").onclick = () => this.next();
    $("#cp-next").focus();
  },
  end() {
    const max = this.qs.length * 5;
    const best = finishQuiz("career", this.quiz, this.total, max);
    app().innerHTML = topbar("career") + resultCard("career", this.quiz, this.total, max, best);
    wireResult(app());
  },
};

// ---------- Survival Quiz ----------
const Survival = {
  QTIME: 10,
  playQuiz(quiz) {
    const key = (x) => x.q.en + (x.img ? "|" + x.img : "");
    this.quiz = quiz;
    this.begin(quiz.items.map((k) => DATA.quickfire.find((x) => key(x) === k)).filter(Boolean));
  },
  // Practice: endless, hardest questions first.
  practice() {
    this.quiz = null;
    const hard = DATA.quickfire.filter((x) => x.level === "hard");
    this.begin(null, [...freshest("quickfire", hard), ...freshest("quickfire", DATA.quickfire.filter((x) => x.level !== "hard"))]);
  },
  begin(list, endless) {
    clearTimers();
    this.list = list;
    this.queue = list ? list.slice() : endless;
    this.total = list ? list.length : null;
    this.lives = 3;
    this.streak = 0;
    this.n = 0;
    this.next();
  },
  next() {
    clearTimers();
    if (!this.queue.length) {
      if (this.list) return this.end();
      this.queue = freshest("quickfire", DATA.quickfire);
    }
    const q = this.queue.shift();
    this.n++;
    markPlayed("quickfire", [q]);
    const order = shuffle(q.options.map((_, i) => i));
    const opts = order.map((i) => q.options[i]);
    const correct = order.indexOf(0);
    const deadline = now() + this.QTIME;
    let answered = false;
    app().innerHTML = topbar("survival", `<span class="chip">${t("streak")}: <b>${this.streak}</b></span><span class="chip">${"❤️".repeat(this.lives)}</span>`) +
      `<div class="muted">${this.quiz ? `${quizLabel(this.quiz)} · ${t("question")} ${this.n}/${this.total}` : t("practice")}</div>
      <div class="card"><div style="font-size:24px;font-weight:900;text-align:center">${esc(L(q.q))}</div>
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
      if (i === correct) {
        this.streak++;
        if (this.streak % 5 === 0) { toast(`${this.streak} 🔥`, "fire"); confetti(.6); } else toast(hype("ok"));
      } else {
        this.lives--;
        shake(app().querySelector(".opts"));
        toast(hype("bad"), "bad");
      }
      TIMERS.push(setTimeout(() => (this.lives > 0 ? this.next() : this.end()), 1300));
    };
    app().querySelectorAll(".opt").forEach((b) => { b.onclick = () => pick(+b.dataset.i); });
    TIMERS.push(setInterval(() => { if (now() >= deadline) pick(-1); }, 200));
  },
  end() {
    clearTimers();
    const max = this.list ? this.list.length : this.streak;
    const best = finishQuiz("survival", this.quiz, this.streak, max);
    app().innerHTML = topbar("survival") + `<div class="muted center">${this.lives > 0 ? "" : t("game_over")}</div>` +
      resultCard("survival", this.quiz, this.streak, max, best);
    wireResult(app());
  },
};

// ---------- Who's the Player? (clue by clue, hardest first) ----------
const Mystery = {
  playQuiz(quiz) {
    this.quiz = quiz;
    this.begin(quiz.items.map((n) => PLAYERS.players.find((p) => p.name.en === n)).filter(Boolean));
  },
  // Practice: 5 random players at the chosen difficulty (remembered per device).
  level() {
    let lv = null;
    try { lv = localStorage.getItem("kc_who_level"); } catch (e) {}
    return WHO_LEVELS.includes(lv) ? lv : "pro";
  },
  practice() {
    this.quiz = null;
    const pool = PLAYERS.players.filter((p) => (p.clues || []).length >= 5 && p.tier === this.level());
    this.begin(freshest("who", pool, Math.min(5, pool.length)));
  },
  begin(queue) {
    clearTimers();
    this.queue = queue;
    this.qi = -1;
    this.total = 0;
    this.next();
  },
  next() {
    this.qi++;
    if (this.qi >= this.queue.length) return this.end();
    this.p = this.queue[this.qi];
    this.shown = 1;
    this.done = false;
    const all = PLAYERS.players;
    const levels = this.quiz ? "" : `<span class="levels">${WHO_LEVELS.map((lv) => `<button class="small lvl lvl-${lv} ${this.level() === lv ? "on" : ""}" data-level="${lv}">${t("lvl_" + lv)}</button>`).join("")}</span>`;
    app().innerHTML = topbar("mystery", `<span class="chip">${t("total")}: <b id="wh-total">${this.total}</b></span>`) +
      `<div class="row"><span class="muted">${this.quiz ? quizLabel(this.quiz) : t("practice")} · ${t("round_of")} ${this.qi + 1}/${this.queue.length} · ${t("worth")} <b id="wh-pts"></b> ${t("pts")}</span>
        <span class="grow"></span>${levels}</div>
      <div class="clues" id="wh-clues"></div>
      <form class="row" id="wh-form"><input type="text" id="wh-in" class="grow" list="wh-list" autocomplete="off" spellcheck="false" placeholder="${esc(t("who_is_it"))}">
        <button class="primary">${t("send")}</button></form>
      <datalist id="wh-list">${all.map((p) => `<option value="${esc(L(p.name))}">`).join("")}</datalist>
      <div class="row"><button id="wh-more">${t("next_clue_btn")}</button><button class="ghost" id="wh-skip">${t("give_up")}</button></div>
      <div class="fb" id="wh-fb"></div><div id="wh-end"></div>`;
    wire(app());
    app().querySelectorAll("[data-level]").forEach((b) => {
      b.onclick = () => { try { localStorage.setItem("kc_who_level", b.dataset.level); } catch (e) {} this.practice(); };
    });
    this.draw();
    $("#wh-in").focus();
    $("#wh-form").onsubmit = (e) => {
      e.preventDefault();
      const v = $("#wh-in").value.trim();
      if (!v || this.done) return;
      $("#wh-in").value = "";
      if (matches(v, [this.p.name.en, this.p.name.ar, ...this.p.aliases])) return this.reveal(true);
      $("#wh-fb").textContent = `✖ ${v}`;
      $("#wh-fb").className = "fb bad";
      shake($("#wh-form"));
      this.more();
    };
    $("#wh-more").onclick = () => this.more();
    $("#wh-skip").onclick = () => this.reveal(false);
  },
  points() { return this.p.clues.length - this.shown + 1; },
  draw() {
    const cl = this.p.clues;
    const left = cl.length - this.shown;
    $("#wh-clues").innerHTML = cl.slice(0, this.shown).map((c, i) =>
      `<div class="clue${i === this.shown - 1 && !this.done ? " new" : ""}"><span class="n">${i + 1}</span><span>${esc(L(c))}</span></div>`).join("") +
      (left ? `<div class="clue locked"><span class="n">+${left}</span><span>${t("clues_left")}</span></div>` : "");
    $("#wh-pts").textContent = this.done ? 0 : this.points();
    $("#wh-more").disabled = this.shown >= cl.length;
  },
  more() {
    if (this.shown < this.p.clues.length) { this.shown++; this.draw(); }
    else this.reveal(false);
  },
  reveal(won) {
    if (this.done) return;
    const pts = won ? this.points() : 0;
    const used = this.shown;
    this.done = true;
    this.total += pts;
    if (won) { toast(`${hype("ok")} +${pts}`); confetti(used <= 2 ? 1.2 : .6); } else toast(hype("bad"), "bad");
    this.shown = this.p.clues.length;
    this.draw();
    $("#wh-total").textContent = this.total;
    $("#wh-form").hidden = true;
    $("#wh-more").parentElement.hidden = true;
    $("#wh-fb").textContent = "";
    const N = PLAYERS.nations[this.p.nation];
    const last = this.qi + 1 >= this.queue.length;
    $("#wh-end").innerHTML = `<div class="card center answer-card"><div class="muted">${won ? `${t("got_him")} ${used} ${used === 1 ? t("clue_one") : t("clues_many")} · +${pts} ${t("pts")}` : t("it_was")}</div>
      <div class="huge" style="color:var(--gold)">${esc(L(this.p.name))}</div>
      <div class="muted">${esc(L(N))} · ${t("pos_" + this.p.pos)} · ${this.p.born}</div>
      <button class="primary" id="wh-next" style="margin-top:12px">${last ? t("see_score") : t("next_player")}</button></div>`;
    $("#wh-next").onclick = () => this.next();
    $("#wh-next").focus();
  },
  end() {
    const max = this.queue.reduce((s, p) => s + p.clues.length, 0);
    const best = finishQuiz("mystery", this.quiz, this.total, max);
    app().innerHTML = topbar("mystery") + resultCard("mystery", this.quiz, this.total, max, best);
    wireResult(app());
  },
};

const SOLO = { nameall: NameAll, career: CareerSolo, survival: Survival, mystery: Mystery };

function route() {
  clearTimers();
  const params = new URLSearchParams(location.search);
  const g = params.get("g");
  if (SOLO[g]) Archive.show(g, params.get("d") || undefined);
  else { app().innerHTML = `<h2 style="margin:0">${t("tab_solo")}</h2>` + menuHTML(); wire(app()); }
}

async function boot() {
  applyLang();
  await loadData();
  [PLAYERS, QUIZZES] = await Promise.all(["data/players.json", "data/quizzes.json"]
    .map((f) => fetch(f, { cache: "no-cache" }).then((r) => r.json())));
  route();
}
RERENDER = () => { if (Archive.game && app().querySelector(".cal")) Archive.render(); else if (!Archive.game) route(); };
boot();
