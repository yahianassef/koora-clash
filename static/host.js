// Host screen: the "studio" everyone watches.

let S = null, ROOM = null, JOIN_URL = "";
const ALL_SEGS = ["career", "rondo", "spy", "password", "quickfire"];

function act(a, p) { hostAct(a, p || {}); }

async function boot() {
  applyLang();
  await loadData();
  let room = null;
  try {
    const saved = sessionStorage.getItem("kc_host_room");
    if (saved) room = Room.restore(saved);
  } catch (e) { room = null; }
  if (!room) room = new Room(randomCode());
  wireSettings();
  startHosting(room, (s) => { S = s; render(); }, (code) => {
    ROOM = code;
    JOIN_URL = new URL(`play.html?r=${code}`, location.href).href;
    $("#codechip").textContent = code;
    qrDone = false;
    $("#stage")._h = null;
    render();
  });
}

function wireSettings() {
  document.querySelectorAll("input[name=mode]").forEach((r) => r.addEventListener("change", () => act("settings", { mode: r.value })));
  ["A", "B"].forEach((k) => {
    const el = $("#name" + k);
    el.addEventListener("change", () => act("settings", { ["team_" + k]: el.value }));
  });
  $("#startbtn").addEventListener("click", () => act("start"));
}

function renderSettings() {
  const box = $("#settings");
  box.hidden = S.phase !== "lobby";
  if (box.hidden) return;
  document.querySelectorAll("input[name=mode]").forEach((r) => { r.checked = r.value === S.mode; });
  $("#teamnames").hidden = S.mode !== "teams";
  ["A", "B"].forEach((k) => {
    const el = $("#name" + k);
    el.placeholder = t("team_" + k.toLowerCase());
    if (document.activeElement !== el) el.value = S.team_names[k] || "";
  });
  setHTML($("#seglist"), ALL_SEGS.map((k) => `<label><input type="checkbox" data-seg="${k}" ${S.segments.includes(k) ? "checked" : ""}>
    ${SEG_ICON[k]} ${esc(segTitle(k))}</label>`).join(""));
  $("#seglist").querySelectorAll("input").forEach((cb) => {
    cb.onchange = () => {
      const segs = ALL_SEGS.filter((k) => $(`#seglist input[data-seg=${k}]`).checked);
      if (segs.length) act("settings", { segments: segs }); else cb.checked = true;
    };
  });
  $("#startbtn").disabled = !S.players.length;
  $("#starthint").textContent = S.players.length ? "" : t("need_players");
}

let PREV_SCORES = {}, LAST_FX = "";
// Celebrate big moments on the studio screen once each: a correct reveal, a round win, the final whistle.
function studioFx() {
  const g = S.seg || {};
  const key = [S.phase, S.seg_key, g.state, g.qi, g.ci, g.ri, g.ti].join("|");
  if (key === LAST_FX) return;
  LAST_FX = key;
  if (S.phase === "final") { confetti(1.4); setTimeout(() => confetti(1), 900); return; }
  if (S.phase !== "play") return;
  if (S.seg_key === "career" && g.state === "result" && g.winner) { confetti(.8); toast(hype("ok")); }
  if (S.seg_key === "quickfire" && g.state === "reveal" && g.gained && g.gained.length) toast(hype("ok"));
  if (S.seg_key === "rondo" && g.state === "result" && g.winners && g.winners.length) confetti(.7);
  if (S.seg_key === "spy" && g.state === "result") confetti(.7);
}

function renderBoard() {
  const rows = scoreRows(S);
  setHTML($("#board"), rows.map((r) => `<div class="row-s ${r.cls}">
      <div class="grow"><div class="n">${esc(r.name)}</div>${r.members ? `<div class="mem">${esc(r.members.join(" · "))}</div>` : ""}</div>
      <div class="sc">${r.score}</div>
      <div class="adj"><button data-adj="${esc(r.side)}" data-d="1">+</button><button data-adj="${esc(r.side)}" data-d="-1">−</button></div>
    </div>`).join("") || `<div class="muted">${t("no_players")}</div>`);
  $("#board").querySelectorAll("[data-adj]").forEach((b) => { b.onclick = () => act("adjust", { side: b.dataset.adj, delta: +b.dataset.d }); });
  rows.forEach((r, i) => {
    if (PREV_SCORES[r.side] != null && r.score > PREV_SCORES[r.side]) {
      const el = $("#board").querySelectorAll(".sc")[i];
      if (el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    }
    PREV_SCORES[r.side] = r.score;
  });
}

function playerChip(p) {
  return `<div class="pl"><span class="dot ${p.connected ? "" : "off"}"></span><span class="nm">${esc(p.name)}</span>
    ${S.mode === "teams" ? `<button class="small" data-move="${p.id}" data-to="${p.team === "A" ? "B" : "A"}">⇄</button>` : ""}
    <button class="small ghost" data-kick="${p.id}" title="${t("kick")}">✕</button></div>`;
}

function lobbyHTML() {
  const join = `<div class="card joinbox"><div id="qr"></div><div>
      <div class="muted" style="font-size:20px">${t("join_at")}</div>
      <div class="url">${esc(JOIN_URL)}</div>
      <div class="muted" style="margin-top:10px">${t("room_code")}</div><div class="big">${ROOM}</div></div></div>`;
  let players;
  if (S.mode === "teams") {
    players = `<div class="teams">${["A", "B"].map((k) => `<div class="card teamcol ${sideClass(k)}">
        <h3>${esc(teamLabel(S, k))}</h3>${S.players.filter((p) => p.team === k).map(playerChip).join("") || `<div class="muted">—</div>`}</div>`).join("")}</div>`;
  } else {
    players = `<div class="card"><h3 style="margin-top:0">${t("players")}</h3>${S.players.map(playerChip).join("") || `<div class="muted">${t("no_players")}</div>`}</div>`;
  }
  return join + players;
}

function introHTML() {
  const k = S.seg_key;
  return `<div class="card intro c-${k}"><div class="muted">${t("segment")} ${S.seg_index + 1} ${t("of")} ${S.segments.length}</div>
    <div class="ico">${SEG_ICON[k]}</div><h1>${esc(segTitle(k))}</h1><p>${esc(segRules(k, S.mode))}</p></div>`;
}

function head(title, sub) {
  return `<div class="seg-head c-${S.seg_key}"><span>${SEG_ICON[S.seg_key]}</span><h2>${esc(title)}</h2>${sub ? `<span class="chip">${sub}</span>` : ""}</div>`;
}

// ----- segment renderers -----
const SEG = {
  career(g) {
    const clubs = g.clubs.map((c, i) => clubCard(c, i < g.clubs.length - 1));
    for (let i = g.clubs.length; i < g.total; i++) clubs.push(`<span class="club hidden">?</span>`);
    const path = clubs.join(`<span class="arrow">➜</span>`);
    let body = `<div class="card"><div class="path">${path}</div></div>`;
    if (g.state === "reveal") {
      body += g.next_clue_at
        ? `<div class="row"><span class="muted">${t("next_clue")}</span> ${timerNum(g.next_clue_at)} <span class="grow">${timerBar(g.next_clue_at, 6)}</span></div>`
        : `<div class="row"><span class="muted">${t("time_left")}</span> ${timerNum(g.deadline)} <span class="grow">${timerBar(g.deadline, 12)}</span></div>`;
      if (g.feed.length) body += `<div><div class="muted">${t("wrong_guesses")}</div><div class="feed">${g.feed.map((f) => `<span class="chip">${esc(f.name)}: ${esc(f.text)}</span>`).join("")}</div></div>`;
    } else {
      body += `<div class="card center"><div class="muted">${t("the_answer")}</div><div class="reveal">${esc(L(g.answer))}</div>
        <div style="font-size:22px;margin-top:8px">${g.winner ? `🏅 <b>${esc(g.winner.name)}</b> ${t("got_it")} — +${g.winner.pts} ${t("pts")}` : t("nobody")}</div></div>`;
    }
    return head(segTitle("career"), `${t("question")} ${g.qi + 1}/${g.qn} · ${t("worth")} ${g.points} ${t("pts")}`) + body;
  },

  rondo(g) {
    const order = `<div class="order">${g.order.map((o) => `<span class="chip ${sideClass(o.side.length === 1 ? o.side : "")} tag ${g.turn === o.side ? "turn" : ""} ${o.lives <= 0 ? "dead" : ""}">
        ${esc(teamLabel(S, o.side))} ${"❤️".repeat(Math.max(0, o.lives))}${o.lives <= 0 ? " " + t("out") : ""}</span>`).join("")}</div>`;
    let body = `<div class="card"><div class="muted center">${t("category")} ${g.ci + 1}/${g.cn}</div><div class="prompt">${esc(L(g.prompt))}</div></div>` + order;
    if (g.state === "play") {
      body += `<div class="row"><span class="clock" data-deadline="${g.deadline}" style="font-size:30px"></span><span class="grow">${timerBar(g.deadline, 12)}</span></div>`;
      if (g.last) body += `<div class="event ${g.last.type}">${esc(teamLabel(S, g.last.side))} ${t("ev_" + g.last.type)} ${g.last.text ? "· " + esc(L(g.last.text)) : ""}</div>`;
      if (g.rejected.length) body += `<div class="card"><div class="muted">${t("unrecognised")}</div><div class="row" style="margin-top:6px">${g.rejected
        .map((r) => `<span class="chip">${esc(r.name)}: ${esc(r.text)}</span><button class="small primary" data-accept="${r.id}">${t("accept")}</button>`).join("")}</div></div>`;
    } else {
      body += `<div class="bigmsg">🏆 ${g.winners.map((s) => esc(teamLabel(S, s))).join(" · ") || "—"}</div>`;
      if (g.missed && g.missed.length) body += `<div><div class="muted">${t("missed")}</div><div class="answers">${g.missed.map((a) => `<span class="chip">${esc(L(a))}</span>`).join("")}</div></div>`;
    }
    body += `<div><div class="muted">${t("said")} · ${g.remaining} ${t("remaining")}</div><div class="answers">${g.used
      .map((u) => `<span class="chip tag ${sideClass(u.side.length === 1 ? u.side : "")}">${esc(L(u.text))}</span>`).join("")}</div></div>`;
    return head(segTitle("rondo")) + body;
  },

  spy(g) {
    const sub = `${t("round")} ${g.ri + 1}/${g.rn}`;
    let body = "";
    if (g.state === "reveal") {
      body = `<div class="card intro"><div class="ico">📱</div><h1>${t("check_phone")}</h1><p>${t("check_phone_sub")}</p>${timerBar(g.deadline, 12)}</div>`;
    } else if (g.state === "discuss") {
      body = `<div class="card"><h3 style="margin-top:0">${t("discuss")}</h3><div class="muted">${t("speak_order")}</div>
        <ol style="font-size:24px;font-weight:800;line-height:1.8">${g.order.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></div>
        <div class="row"><span class="clock" data-deadline="${g.deadline}" style="font-size:30px"></span><span class="grow">${timerBar(g.deadline, 100)}</span></div>`;
    } else if (g.state === "vote") {
      body = `<div class="card intro"><div class="ico">🗳️</div><h1>${t("vote_now")}</h1><p>${g.voted}/${g.cast_n} ${t("voted")}</p>${timerBar(g.deadline, 30)}</div>`;
    } else if (g.state === "guess") {
      body = `<div class="card intro"><div class="ico">🚨</div><h1>${esc(g.spy)} ${t("spy_caught")}</h1><p>${t("spy_guessing")}</p>${timerBar(g.deadline, 20)}</div>`;
    } else if (g.state === "result") {
      const msg = { escaped: t("out_escaped"), caught: t("out_caught"), stole: t("out_stole") }[g.outcome];
      body = `<div class="card center"><div class="muted">${t("spy_was")}</div><div class="reveal">🕵️ ${esc(g.spy)}</div>
        <div class="muted" style="margin-top:10px">${t("secret_was")}</div><div style="font-size:30px;font-weight:900">${esc(L(g.word))}</div>
        <div class="bigmsg" style="font-size:30px;margin-top:14px">${msg}</div>
        ${g.spy_pick ? `<div class="muted">${t("spy_picked")}: ${esc(L(g.spy_pick))}</div>` : ""}</div>
        <div class="row">${g.tally.map((x) => `<span class="chip ${x.spy ? "tag ts" : ""}">${esc(x.name)} · ${x.n} ${t("votes")}</span>`).join("")}</div>`;
    }
    return head(segTitle("spy"), sub) + body;
  },

  password(g) {
    const sub = `${g.ti + 1}/${g.tn}`;
    const who = `<b>${esc(g.describer)}</b>`;
    let body = "";
    if (g.state === "ready") {
      body = `<div class="card intro"><div class="ico">🗣️</div><h1>${who}</h1>
        <p>${S.mode === "teams" ? `${t("describes_for")} <b>${esc(teamLabel(S, g.side))}</b> — ` : ""}${t("press_start")}</p></div>`;
    } else if (g.state === "active") {
      body = `<div class="card intro"><p>${who} ${t("describing")} — ${t("guess_aloud")}</p>
        <div style="font-size:110px;font-weight:900;color:var(--gold)">${g.count}</div>
        <div class="clock" data-deadline="${g.deadline}" style="font-size:40px"></div>${timerBar(g.deadline, 60)}</div>`;
    } else {
      body = `<div class="card center"><div class="muted">${t("names_got")}</div><div class="reveal">${g.got.length}</div>
        <div class="answers" style="justify-content:center;margin-top:10px">${g.got.map((x) => `<span class="chip tag ts">${esc(L(x.word))}${x.by ? " · " + esc(x.by) : ""}</span>`).join("")}</div>
        ${g.skipped.length ? `<div class="muted" style="margin-top:10px">${t("passed")}</div><div class="answers" style="justify-content:center">${g.skipped.map((w) => `<span class="chip">${esc(L(w))}</span>`).join("")}</div>` : ""}</div>`;
    }
    return head(segTitle("password"), sub) + body;
  },

  quickfire(g) {
    const keys = ["A", "B", "C", "D"];
    let body = `<div class="card"><div class="qtext">${esc(L(g.q))}</div>${g.img ? `<img class="qimg" src="${esc(g.img)}" alt="" style="margin-top:14px">` : ""}</div>`;
    body += `<div class="opts">${g.options.map((o, i) => {
      let cls = "";
      if (g.state === "reveal") cls = i === g.correct ? "right" : "dim";
      const cnt = g.state === "reveal" ? `<span class="cnt">${g.counts[i]}</span>` : "";
      return `<div class="opt ${cls}"><span class="k">${keys[i]}</span>${esc(L(o))}${cnt}</div>`;
    }).join("")}</div>`;
    if (g.state === "question") {
      body += `<div class="row"><span class="clock" data-deadline="${g.deadline}" style="font-size:30px"></span><span class="grow">${timerBar(g.deadline, 15)}</span><span class="chip">${g.answered} ${t("answered")}</span></div>`;
    } else {
      body += `<div class="row">${g.gained.map((x) => `<span class="chip tag ts">${esc(x.name)} +${x.pts}</span>`).join("") || `<span class="muted">${t("nobody")}</span>`}</div>`;
    }
    return head(segTitle("quickfire"), `${t("question")} ${g.qi + 1}/${g.qn}`) + body;
  },
};

function podiumHTML(title) {
  const rows = scoreRows(S);
  const top = rows.length ? Math.max(...rows.map((r) => r.score)) : 0;
  const leaders = rows.filter((r) => r.score === top);
  const banner = S.phase === "final"
    ? `<div class="intro"><div class="ico">🏆</div><h1>${leaders.length > 1 ? t("draw") : esc(leaders[0] ? leaders[0].name : "")}</h1><p>${t("champions")}</p></div>`
    : `<div class="bigmsg">${esc(title)}</div>`;
  const notice = S.notice ? `<div class="card center muted">${t(S.notice)}</div>` : "";
  return banner + notice + `<div class="podium">${[...rows].sort((a, b) => b.score - a.score)
    .map((r, i) => `<div class="row-s ${r.cls} ${i === 0 && r.score === top ? "first" : ""}">${esc(r.name)}<span class="sc">${r.score}</span></div>`).join("")}</div>`;
}

function controlsHTML() {
  const c = [];
  if (S.phase === "intro") c.push(`<button class="primary" data-act="go">${t("go")}</button>`);
  if (S.phase === "play") {
    if (S.seg_key === "spy" && S.seg && ["reveal", "discuss", "vote"].includes(S.seg.state)) c.push(`<button class="primary" data-act="spy_next">${S.seg.state === "discuss" ? t("start_vote") : t("continue")} ⏭</button>`);
    c.push(`<button data-act="skip">${t("skip")} ⏭</button>`);
  }
  if (S.phase === "seg_end") {
    const last = S.seg_index + 1 >= S.segments.length;
    c.push(`<button class="primary" data-act="next">${last ? t("final_whistle") : t("next")}</button>`);
  }
  if (["intro", "play", "seg_end"].includes(S.phase)) c.push(`<button class="ghost" data-act="end_game">${t("end_game")}</button>`);
  if (S.phase === "final") c.push(`<button class="primary" data-act="lobby">${t("play_again")}</button>`);
  return c.join("");
}

let qrDone = false;
function render() {
  if (!S) return;
  renderSettings();
  renderBoard();
  studioFx();
  let html = "";
  if (S.phase === "lobby") html = lobbyHTML();
  else if (S.phase === "intro") html = introHTML();
  else if (S.phase === "play" && S.seg) html = SEG[S.seg_key](S.seg);
  else if (S.phase === "seg_end") html = podiumHTML(t("segment_over") + " · " + segTitle(S.seg_key));
  else if (S.phase === "final") html = podiumHTML("");
  const stage = $("#stage");
  const before = stage._h;
  setHTML(stage, html);
  enterOnChange(stage, screenKey(S));
  if (stage._h !== before) {
    qrDone = false;
    stage.querySelectorAll("[data-move]").forEach((b) => { b.onclick = () => act("move", { pid: b.dataset.move, team: b.dataset.to }); });
    stage.querySelectorAll("[data-kick]").forEach((b) => { b.onclick = () => act("kick", { pid: b.dataset.kick }); });
    stage.querySelectorAll("[data-accept]").forEach((b) => { b.onclick = () => act("rondo_accept", { id: +b.dataset.accept }); });
  }
  const qr = $("#qr");
  if (qr && !qrDone) {
    qrDone = true;
    qr.innerHTML = "";
    if (window.QRCode) new QRCode(qr, { text: JOIN_URL, width: 180, height: 180 });
    else qr.hidden = true;
  }
  setHTML($("#controls"), controlsHTML());
  $("#controls").querySelectorAll("[data-act]").forEach((b) => { b.onclick = () => act(b.dataset.act); });
}
RERENDER = render;
boot();
