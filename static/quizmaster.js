// Quizmaster mode: no phones. The host reads each question with the answer in front of them
// and taps which team got it right. Scores, setup and answer visibility are kept on this device.

const QM_SEGS = ["career", "who", "quickfire", "rondo"];
const TEAM_CLS = ["ta", "tb", "tc", "td"];
let QM = null;          // { phase, teams, segs, level, qfLevel, si, seg }
let AWARDS = [];        // undo stack of { team, pts }

function save() { try { localStorage.setItem("kc_qm", JSON.stringify({ teams: QM.teams.map((x) => x.name), segs: QM.segs, level: QM.level, qfLevel: QM.qfLevel })); } catch (e) {} }
function loadSetup() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem("kc_qm") || "null"); } catch (e) {}
  return {
    teams: (s && s.teams && s.teams.length >= 2 ? s.teams : ["", ""]).map((name) => ({ name, score: 0 })),
    segs: s && s.segs ? s.segs.filter((k) => QM_SEGS.includes(k)) : QM_SEGS.slice(),
    level: (s && s.level) || "pro",
    qfLevel: (s && s.qfLevel) || "hard",
  };
}
function teamName(i) { return QM.teams[i].name || `${t("team")} ${"ABCD"[i]}`; }

function award(i, pts) {
  QM.teams[i].score += pts;
  AWARDS.push({ team: i, pts });
  if (pts > 0) { toast(`${teamName(i)} +${pts} · ${hype("ok")}`); confetti(.5); }
  renderBoard(i);
}
function undo() {
  const a = AWARDS.pop();
  if (!a) return;
  QM.teams[a.team].score -= a.pts;
  renderBoard();
}

// ---------- scoreboard ----------
function renderBoard(bumpTeam) {
  $("#board").innerHTML = QM.teams.map((tm, i) => `<div class="row-s ${TEAM_CLS[i]}">
      <div class="grow"><div class="n">${esc(teamName(i))}</div></div>
      <div class="sc ${i === bumpTeam ? "bump" : ""}">${tm.score}</div>
      <div class="adj"><button data-adj="${i}" data-d="1">+</button><button data-adj="${i}" data-d="-1">−</button></div></div>`).join("");
  $("#board").querySelectorAll("[data-adj]").forEach((b) => { b.onclick = () => award(+b.dataset.adj, +b.dataset.d); });
  $("#undo").textContent = `↶ ${t("undo")}`;
  $("#undo").disabled = !AWARDS.length;
}

// ---------- setup ----------
function renderSetup() {
  const segOpts = QM_SEGS.map((k) => `<label><input type="checkbox" data-seg="${k}" ${QM.segs.includes(k) ? "checked" : ""}> ${SEG_ICON[k]} ${esc(segTitle(k))}</label>`).join("");
  $("#stage").innerHTML = `<div class="card intro" style="padding:30px 20px">
      <div class="ico" data-icon="password">${icon("password")}</div>
      <h1>${t("qm_title")}</h1><p>${t("qm_sub")}</p></div>
    <div class="card settings">
      <div class="grid2">
        <div><h3 style="margin-top:0">${t("teams")}</h3>
          ${QM.teams.map((tm, i) => `<div class="row" style="margin-bottom:8px"><span class="chip tag ${TEAM_CLS[i]}">${"ABCD"[i]}</span>
            <input type="text" class="grow" data-team="${i}" maxlength="24" value="${esc(tm.name)}" placeholder="${t("team")} ${"ABCD"[i]}">
            ${QM.teams.length > 2 ? `<button class="small ghost" data-del="${i}">✕</button>` : ""}</div>`).join("")}
          ${QM.teams.length < 4 ? `<button class="small" id="addteam">+ ${t("add_team")}</button>` : ""}
        </div>
        <div><h3 style="margin-top:0">${t("segments")}</h3>${segOpts}
          <label style="margin-top:8px">${t("who_level_opt")} <select id="lvl">${WHO_LEVELS.map((lv) => `<option value="${lv}" ${QM.level === lv ? "selected" : ""}>${t("lvl_" + lv)}</option>`).join("")}</select></label>
          <label>${t("qf_level_opt")} <select id="qfl">${["hard", "classic"].map((lv) => `<option value="${lv}" ${QM.qfLevel === lv ? "selected" : ""}>${t("lvl_" + lv)}</option>`).join("")}</select></label>
        </div>
      </div>
      <div class="row" style="margin-top:14px"><button class="primary big" id="go">${t("start")}</button></div>
    </div>`;
  $("#stage").querySelectorAll("[data-team]").forEach((el) => { el.oninput = () => { QM.teams[+el.dataset.team].name = el.value; renderBoard(); save(); }; });
  $("#stage").querySelectorAll("[data-del]").forEach((b) => { b.onclick = () => { QM.teams.splice(+b.dataset.del, 1); save(); render(); }; });
  if ($("#addteam")) $("#addteam").onclick = () => { QM.teams.push({ name: "", score: 0 }); save(); render(); };
  $("#stage").querySelectorAll("[data-seg]").forEach((cb) => {
    cb.onchange = () => {
      const segs = QM_SEGS.filter((k) => $(`[data-seg=${k}]`).checked);
      if (segs.length) QM.segs = segs; else cb.checked = true;
      save();
    };
  });
  $("#lvl").onchange = (e) => { QM.level = e.target.value; save(); };
  $("#qfl").onchange = (e) => { QM.qfLevel = e.target.value; save(); };
  $("#go").onclick = () => { QM.teams.forEach((x) => { x.score = 0; }); AWARDS = []; QM.si = -1; nextSegment(); };
}

// ---------- segment flow ----------
function nextSegment() {
  QM.si++;
  if (QM.si >= QM.segs.length) { QM.phase = "end"; return render(); }
  const key = QM.segs[QM.si];
  QM.seg = SEGS[key].create();
  QM.seg.key = key;
  QM.phase = "intro";
  render();
}

// Award buttons: one per team, plus "nobody".
function awardRow(pts, onDone) {
  const html = `<div class="qm-award">${QM.teams.map((tm, i) => `<button class="tag ${TEAM_CLS[i]} award" data-award="${i}">✓ ${esc(teamName(i))} <b>+${pts}</b></button>`).join("")}
    <button class="ghost" data-award="-1">✗ ${t("nobody")}</button></div>`;
  return { html, wire: () => $("#stage").querySelectorAll("[data-award]").forEach((b) => {
    b.onclick = () => { const i = +b.dataset.award; if (i >= 0) award(i, pts); onDone(i); };
  }) };
}
function answerBox(label, value) {
  return `<div class="card ans-card"><div class="muted">${icon("spy")} ${t("answer_host")}</div>
    <div class="ans"><span class="muted">${label}</span> <b>${value}</b></div></div>`;
}

const SEGS = {
  // Clubs one by one; earlier = more points (5 → 1).
  career: {
    create() { return { items: freshest("career", DATA.career, 4), i: 0, shown: 1, done: null }; },
    view(g) {
      const q = g.items[g.i];
      const pts = Math.max(1, 6 - g.shown);
      const clubs = q.clubs.map((c, i) => i < g.shown || g.done ? clubCard(c, i < g.shown - 1) : `<span class="club hidden">?</span>`).join(`<span class="arrow">➜</span>`);
      let html = `<div class="card"><div class="path">${clubs}</div></div>` + answerBox(t("the_answer"), esc(L(q.answer)));
      if (g.done) return { html: html + doneBox(g, L(q.answer)), wire: () => wireNext(g) };
      const row = awardRow(pts, (i) => { g.done = { team: i, pts }; render(); });
      html += row.html + `<div class="row"><button id="more" ${g.shown >= q.clubs.length ? "disabled" : ""}>${t("reveal_next")} ${icon("arrow")}</button></div>`;
      return { html, wire: () => { row.wire(); $("#more").onclick = () => { g.shown++; render(); }; }, sub: `${g.i + 1}/${g.items.length} · ${t("worth")} ${pts} ${t("pts")}` };
    },
  },
  // First-person clues, hardest first; 6 → 1 points.
  who: {
    create() {
      const pool = DATA.whoLevels[QM.level] || DATA.whoLevels.pro;
      return { items: freshest("who", pool, Math.min(4, pool.length)), i: 0, shown: 1, done: null };
    },
    view(g) {
      const p = g.items[g.i];
      const pts = p.clues.length - g.shown + 1;
      const shown = g.done ? p.clues : p.clues.slice(0, g.shown);
      let html = `<div class="clues">${whoClues(shown, !g.done)}</div>` + answerBox(t("the_answer"), esc(L(p.name)));
      if (g.done) return { html: html + doneBox(g, L(p.name)), wire: () => wireNext(g) };
      const row = awardRow(pts, (i) => { g.done = { team: i, pts }; render(); });
      html += row.html + `<div class="row"><button id="more" ${g.shown >= p.clues.length ? "disabled" : ""}>${t("next_clue_btn")} ${icon("arrow")}</button></div>`;
      return { html, wire: () => { row.wire(); $("#more").onclick = () => { g.shown++; render(); }; }, sub: `${g.i + 1}/${g.items.length} · ${t("lvl_" + QM.level)} · ${t("worth")} ${pts} ${t("pts")}` };
    },
  },
  // Multiple choice: tick every team that answered right, +1 each.
  quickfire: {
    create() {
      const hard = QM.qfLevel === "hard";
      const pool = DATA.quickfire.filter((x) => (x.level === "hard") === hard);
      return { items: freshest("quickfire", pool, Math.min(10, pool.length)).map((q) => ({ q, order: shuffle(q.options.map((_, i) => i)) })), i: 0, picks: [], done: null };
    },
    view(g) {
      const { q, order } = g.items[g.i];
      const correct = order.indexOf(0);
      const opts = order.map((k) => q.options[k]);
      let html = `<div class="card"><div class="qtext">${esc(L(q.q))}</div>${q.img ? `<img class="qimg" src="${esc(q.img)}" alt="" style="margin-top:12px">` : ""}</div>
        <div class="opts">${opts.map((o, i) => `<div class="opt ${g.done && i === correct ? "right" : g.done ? "dim" : ""}"><span class="k">${"ABCD"[i]}</span>${esc(L(o))}</div>`).join("")}</div>`
        + answerBox(t("the_answer"), `${"ABCD"[correct]} · ${esc(L(opts[correct]))}`);
      if (g.done) {
        const who = g.picks.length ? g.picks.map((i) => esc(teamName(i))).join(" · ") + " +1" : t("nobody");
        return { html: html + `<div class="card center"><b>${who}</b></div><div class="row"><button class="primary" id="next">${t("next_item")} ${icon("arrow")}</button></div>`, wire: () => wireNext(g) };
      }
      html += `<div class="muted">${t("tick_teams")}</div><div class="qm-award">${QM.teams.map((tm, i) => `<button class="tag ${TEAM_CLS[i]} award ${g.picks.includes(i) ? "on" : ""}" data-pick="${i}">${g.picks.includes(i) ? "✓" : "○"} ${esc(teamName(i))}</button>`).join("")}</div>
        <div class="row"><button class="primary" id="reveal">${t("reveal_award")}</button></div>`;
      return {
        html,
        wire: () => {
          $("#stage").querySelectorAll("[data-pick]").forEach((b) => {
            b.onclick = () => { const i = +b.dataset.pick; g.picks = g.picks.includes(i) ? g.picks.filter((x) => x !== i) : [...g.picks, i]; render(); };
          });
          $("#reveal").onclick = () => { g.picks.forEach((i) => award(i, 1)); g.done = true; render(); };
        },
        sub: `${t("question")} ${g.i + 1}/${g.items.length}`,
      };
    },
  },
  // Teams take turns naming answers; the host taps what was said. 2 lives each, last team standing +3.
  rondo: {
    create() {
      const cats = freshest("rondo", DATA.rondo, 2);
      return { cats, ci: 0, ...this.fresh() };
    },
    fresh() {
      return { used: [], lives: QM.teams.map(() => 2), turn: 0, over: false, deadline: now() + 15 };
    },
    view(g) {
      const cat = g.cats[g.ci];
      const alive = QM.teams.map((_, i) => i).filter((i) => g.lives[i] > 0);
      const order = `<div class="order">${QM.teams.map((tm, i) => `<span class="chip tag ${TEAM_CLS[i]} ${!g.over && g.turn === i ? "turn" : ""} ${g.lives[i] <= 0 ? "dead" : ""}">${esc(teamName(i))} ${"❤️".repeat(Math.max(0, g.lives[i]))}</span>`).join("")}</div>`;
      const chips = cat.answers.map((a, i) => `<button class="chip ans-chip ${g.used.includes(i) ? "used" : ""}" data-ans="${i}" ${g.used.includes(i) || g.over ? "disabled" : ""}>${esc(L(a))}</button>`).join("");
      let html = `<div class="card"><div class="muted center">${t("category")} ${g.ci + 1}/${g.cats.length}</div><div class="prompt">${esc(L(cat.prompt))}</div></div>` + order;
      if (!g.over) html += `<div class="row"><span class="clock" data-deadline="${g.deadline}" style="font-size:28px"></span><span class="grow">${timerBar(g.deadline, 12)}</span></div>`;
      html += `<div class="card ans-card"><div class="muted">${icon("spy")} ${t("answer_host")} · ${t("tap_said")}</div><div class="ans answers">${chips}</div></div>`;
      if (g.over) {
        html += `<div class="card center"><b>${g.over}</b></div><div class="row"><button class="primary" id="next">${t("next_item")} ${icon("arrow")}</button></div>`;
        return { html, wire: () => { $("#next").onclick = () => { if (g.ci + 1 < g.cats.length) { g.ci++; Object.assign(g, this.fresh()); render(); } else endSegment(); }; } };
      }
      html += `<div class="row"><button class="tag ta" id="wrong" style="--tc:var(--bad)">✗ ${t("wrong_time")}</button></div>`;
      const advance = () => {
        const n = QM.teams.length;
        for (let k = 1; k <= n; k++) { const i = (g.turn + k) % n; if (g.lives[i] > 0) { g.turn = i; break; } }
        g.deadline = now() + 12;
      };
      const finish = (exhausted) => {
        const left = QM.teams.map((_, i) => i).filter((i) => g.lives[i] > 0);
        if (exhausted) { left.forEach((i) => award(i, 1)); g.over = `${t("all_found")} · ${left.map((i) => esc(teamName(i))).join(" · ")} +1`; }
        else { award(left[0], 3); g.over = `🏆 ${esc(teamName(left[0]))} +3`; }
        render();
      };
      return {
        html,
        sub: `${t("turn_of")} ${esc(teamName(g.turn))}`,
        wire: () => {
          $("#stage").querySelectorAll("[data-ans]").forEach((b) => {
            b.onclick = () => {
              g.used.push(+b.dataset.ans);
              if (g.used.length >= cat.answers.length) return finish(true);
              advance(); render();
            };
          });
          $("#wrong").onclick = () => {
            g.lives[g.turn]--;
            shake($("#stage .order"));
            if (QM.teams.filter((_, i) => g.lives[i] > 0).length <= 1) return finish(false);
            advance(); render();
          };
        },
      };
    },
  },
};

function doneBox(g, answer) {
  const who = g.done.team >= 0 ? `🏅 ${esc(teamName(g.done.team))} +${g.done.pts}` : t("nobody");
  return `<div class="card center"><div class="reveal" style="font-size:44px">${esc(answer)}</div><div style="font-size:20px">${who}</div></div>
    <div class="row"><button class="primary" id="next">${t("next_item")} ${icon("arrow")}</button></div>`;
}
function wireNext(g) {
  $("#next").onclick = () => {
    g.i++;
    g.shown = 1; g.done = null; g.picks = [];
    if (g.i >= g.items.length) return endSegment();
    render();
  };
}
function endSegment() { QM.phase = "seg_end"; render(); }

// ---------- rendering ----------
function head(key, sub) {
  return `<div class="seg-head c-${key}"><span>${SEG_ICON[key]}</span><h2>${esc(segTitle(key))}</h2>${sub ? `<span class="chip">${sub}</span>` : ""}</div>`;
}
function podium(title) {
  const rows = QM.teams.map((tm, i) => ({ i, name: teamName(i), score: tm.score })).sort((a, b) => b.score - a.score);
  const top = rows[0].score;
  const tie = rows.filter((r) => r.score === top).length > 1;
  return `<div class="intro"><div class="ico">${icon("trophy")}</div><h1>${title || (tie ? t("draw") : esc(rows[0].name))}</h1>${title ? "" : `<p>${t("champions")}</p>`}</div>
    <div class="podium">${rows.map((r, k) => `<div class="row-s ${TEAM_CLS[r.i]} ${k === 0 && r.score === top ? "first" : ""}">${esc(r.name)}<span class="sc">${r.score}</span></div>`).join("")}</div>`;
}
function render() {
  renderBoard();
  const st = $("#stage");
  if (QM.phase === "setup") return renderSetup();
  if (QM.phase === "intro") {
    const k = QM.seg.key;
    st.innerHTML = `<div class="card intro c-${k}"><div class="muted">${t("segment")} ${QM.si + 1} ${t("of")} ${QM.segs.length}</div>
      <div class="ico">${SEG_ICON[k]}</div><h1>${esc(segTitle(k))}</h1><p>${t("qm_rules_" + k)}</p></div>
      <div class="row"><button class="primary big" id="go">${t("go")}</button><button class="ghost" id="skipseg">${t("skip")} ⏭</button></div>`;
    $("#go").onclick = () => { QM.phase = "play"; if (QM.seg.key === "rondo") QM.seg.deadline = now() + 15; render(); };
    $("#skipseg").onclick = () => nextSegment();
    return;
  }
  if (QM.phase === "play") {
    const v = SEGS[QM.seg.key].view(QM.seg);
    st.innerHTML = head(QM.seg.key, v.sub) + v.html + `<div class="row" style="margin-top:6px"><span class="grow"></span><button class="small ghost" id="skipseg">${t("next")} ⏭</button></div>`;
    v.wire && v.wire();
    $("#skipseg").onclick = () => endSegment();
    enterOnChange(st, [QM.si, QM.seg.i, QM.seg.ci, QM.seg.done ? 1 : 0].join("|"));
    return;
  }
  if (QM.phase === "seg_end") {
    const last = QM.si + 1 >= QM.segs.length;
    st.innerHTML = podium(t("segment_over") + " · " + segTitle(QM.seg.key)) +
      `<div class="row" style="justify-content:center"><button class="primary big" id="next">${last ? t("final_whistle") : t("next")}</button></div>`;
    $("#next").onclick = () => nextSegment();
    return;
  }
  if (QM.phase === "end") {
    st.innerHTML = podium() + `<div class="row" style="justify-content:center"><button class="primary big" id="again">${t("play_again")}</button></div>`;
    confetti(1.3);
    $("#again").onclick = () => { QM.phase = "setup"; render(); };
  }
}

function setEye(hidden) {
  document.body.classList.toggle("hide-ans", hidden);
  $("#eye").innerHTML = `${icon("spy")} ${hidden ? t("show_answers") : t("hide_answers")}`;
  try { localStorage.setItem("kc_qm_hide", hidden ? "1" : ""); } catch (e) {}
}

async function boot() {
  applyLang();
  await loadData();
  QM = { phase: "setup", ...loadSetup() };
  $("#undo").onclick = undo;
  let hidden = false;
  try { hidden = !!localStorage.getItem("kc_qm_hide"); } catch (e) {}
  $("#eye").onclick = () => setEye(!document.body.classList.contains("hide-ans"));
  setEye(hidden);
  render();
}
RERENDER = () => { setEye(document.body.classList.contains("hide-ans")); render(); };
boot();
