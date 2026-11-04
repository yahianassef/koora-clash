// Phone controller: join, then follow the host's game.

let S = null;
let spyShown = {};  // round index -> whether the role card is revealed
let PEER = null, CONN = null, SESSION = null;  // SESSION: {room, cid?, name}
let joining = false;
let MY_LAST = null, LAST_PHASE = null;

function act(a, p) { if (CONN && CONN.open) CONN.send({ t: "act", a, p: p || {} }); }

function boot() {
  applyLang();
  const params = new URLSearchParams(location.search);
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem("kc_player") || "null"); } catch (e) {}
  const want = (params.get("r") || "").toUpperCase();
  if (saved && (!want || saved.room === want)) return start(saved);
  showJoin(want);
}

// Dial the host's browser; on drop (phone slept, Wi-Fi blip) keep redialling with our saved seat.
function dial() {
  if (!PEER || PEER.destroyed) return;
  if (PEER.disconnected) PEER.reconnect();
  const conn = PEER.connect(peerId(SESSION.room), { reliable: true, serialization: "json" });
  CONN = conn;
  conn.on("open", () => conn.send({ t: "join", name: SESSION.name, cid: SESSION.cid }));
  conn.on("data", (msg) => onHostData(msg));
  conn.on("close", () => {
    if (CONN !== conn) return;
    showConn(true);
    setTimeout(() => { if (CONN === conn && SESSION) dial(); }, 2000);
  });
}

function onHostData(msg) {
  if (msg.t === "joined") {
    joining = false;
    showConn(false);
    SESSION = { room: msg.room, cid: msg.cid, name: msg.name };
    try { sessionStorage.setItem("kc_player", JSON.stringify(SESSION)); } catch (e) {}
    history.replaceState(null, "", `play.html?r=${msg.room}`);
    $("#joinform").hidden = true;
    $("#joinerr").textContent = "";
  } else if (msg.t === "error") {
    gone(msg.error);
  } else if (msg.t === "state") {
    if (msg.s.kicked) { gone("kicked"); return; }
    S = msg.s;
    if (S.now) OFFSET = S.now * 1000 - Date.now();
    render();
  }
}

function start(session) {
  SESSION = session;
  joining = !session.cid;
  if (PEER) PEER.destroy();
  PEER = new Peer({ debug: 1 });
  PEER.on("open", dial);
  PEER.on("error", (e) => {
    if (e.type === "peer-unavailable") {
      // Host not reachable: a bad code when joining fresh, or the host screen is reloading.
      if (joining) { gone("no_room"); return; }
      showConn(true);
      setTimeout(dial, 3000);
    } else if (["network", "server-error", "socket-error", "socket-closed", "disconnected"].includes(e.type)) {
      showConn(true);
      setTimeout(() => { if (PEER && !PEER.destroyed) { PEER.reconnect(); } }, 2000);
    }
  });
}

function showJoin(code, err) {
  $("#joinform").hidden = false;
  $("#content").innerHTML = "";
  $("#answerbar").hidden = true;
  if (code) $("#codein").value = code;
  $("#joinerr").textContent = err ? t(err) : "";
  (code ? $("#namein") : $("#codein")).focus();
}

$("#joinform").addEventListener("submit", (e) => {
  e.preventDefault();
  const room = $("#codein").value.trim().toUpperCase();
  const name = $("#namein").value.trim();
  if (!room || !name) return;
  $("#joinerr").textContent = "…";
  start({ room, name });
});

function gone(msg) {
  const room = SESSION ? SESSION.room : "";
  sessionStorage.removeItem("kc_player");
  SESSION = null; S = null;
  const c = CONN; CONN = null;
  if (c) c.close();
  if (PEER) { PEER.destroy(); PEER = null; }
  showConn(false);
  $("#content")._h = null;
  showJoin(msg === "no_room" || msg === "name_taken" ? room : "", msg);
}

$("#answerform").addEventListener("submit", (e) => {
  e.preventDefault();
  const el = $("#answerin");
  const text = el.value.trim();
  if (!text || !S) return;
  el.value = "";
  if (S.seg_key === "career") act("guess", { text });
  if (S.seg_key === "rondo") act("answer", { text });
  el.focus();
});

function setAnswerBar(show, fb, fbClass) {
  const bar = $("#answerbar");
  bar.hidden = !show;
  const f = $("#fb");
  if (fbClass === "bad" && fb && f.textContent !== fb) shake($("#answerform"));
  f.textContent = fb || "";
  f.className = "fb " + (fbClass || "");
}

const PHONE = {
  career(g, m) {
    const clubs = g.clubs.map((c, i) => clubCard(c, i < g.clubs.length - 1)).join(`<span class="arrow">➜</span>`);
    let html = `<div class="muted">${t("question")} ${g.qi + 1}/${g.qn} · ${t("worth")} ${g.points} ${t("pts")}</div><div class="path">${clubs}</div>`;
    if (g.state === "reveal") {
      const locked = m.locked_until * 1000 > serverNow();
      setAnswerBar(true, locked ? `${t("wrong")} — ${t("locked")}` : "", locked ? "bad" : "");
      if (locked) setTimeout(render, m.locked_until * 1000 - serverNow() + 50);
      html += timerBar(g.next_clue_at || g.deadline, g.next_clue_at ? 6 : 12);
    } else {
      setAnswerBar(false);
      const mine = g.winner && g.winner.pid === S.me.id;
      html += `<div class="card center"><div class="muted">${t("the_answer")}</div><div class="huge" style="color:var(--gold)">${esc(L(g.answer))}</div>
        <div>${g.winner ? (mine ? `🎉 +${g.winner.pts} ${t("pts")}` : `${esc(g.winner.name)} ${t("got_it")}`) : t("nobody")}</div></div>`;
    }
    return html;
  },

  rondo(g, m) {
    const turnName = g.turn ? teamLabel(S, g.turn) : "";
    let html = `<div class="card center"><div class="muted">${t("category")}</div><div style="font-size:22px;font-weight:900">${esc(L(g.prompt))}</div></div>`;
    if (g.state === "play") {
      html += m.my_turn ? `<div class="yourturn">${t("your_turn")} <span class="clock" data-deadline="${g.deadline}"></span></div>`
        : `<div class="center" style="font-size:20px">${t("turn_of")} <b>${esc(turnName)}</b> · <span class="clock" data-deadline="${g.deadline}"></span></div>`;
      html += timerBar(g.deadline, 12);
      let fb = "", cls = "";
      if (g.last && g.last.side === S.me.side) {
        fb = t("ev_" + g.last.type) + (g.last.text ? " · " + L(g.last.text) : "");
        cls = g.last.type === "ok" ? "ok" : "bad";
      }
      setAnswerBar(m.my_turn, fb, cls);
    } else {
      setAnswerBar(false);
      html += `<div class="huge">🏆 ${g.winners.map((s) => esc(teamLabel(S, s))).join(" · ") || "—"}</div>`;
    }
    html += `<div class="answers">${g.used.map((u) => `<span class="chip">${esc(L(u.text))}</span>`).join("")}</div>`;
    return html;
  },

  spy(g, m) {
    setAnswerBar(false);
    if (m.spectator) return `<div class="center muted">${t("watch_screen")}</div>`;
    const shown = !!spyShown[g.ri];
    const isSpy = m.role === "spy";
    const card = `<div class="role ${isSpy ? "spy" : ""}" id="rolecard">${shown
      ? (isSpy ? `<div class="w">${t("you_spy")}</div><div class="muted">${t("you_spy_sub")}</div>`
        : `<div class="muted">${t("secret")}</div><div class="w">${esc(L(m.word))}</div>`) + `<div class="muted">${t("tap_hide")}</div>`
      : `<div style="font-size:50px">🂠</div><div class="muted">${t("tap_reveal")}</div>`}</div>`;
    let html = `<div class="muted">${t("round")} ${g.ri + 1}/${g.rn}</div>`;
    if (g.state === "reveal" || g.state === "discuss") {
      html += card + timerBar(g.deadline, g.state === "reveal" ? 12 : 100);
    } else if (g.state === "vote") {
      html += `<h2 class="center" style="margin:0">${t("vote_for")}</h2>`;
      html += m.my_vote ? `<div class="center" style="color:var(--ok);font-weight:800">${t("you_voted")}</div>` : "";
      html += `<div class="btngrid">${m.candidates.map((c) => `<button data-vote="${c.id}" class="${m.my_vote === c.id ? "primary" : ""}">${esc(c.name)}</button>`).join("")}</div>`;
      html += timerBar(g.deadline, 30) + card;
    } else if (g.state === "guess") {
      html += m.options
        ? `<h2 class="center" style="margin:0">${t("guess_name")}</h2><div class="btngrid">${m.options.map((o, i) => `<button data-guess="${i}">${esc(L(o))}</button>`).join("")}</div>${timerBar(g.deadline, 20)}`
        : `<div class="huge">🚨 ${esc(g.spy)}</div><div class="center muted">${t("spy_guess_wait")}</div>`;
    } else if (g.state === "result") {
      const msg = { escaped: t("out_escaped"), caught: t("out_caught"), stole: t("out_stole") }[g.outcome];
      html += `<div class="card center"><div class="muted">${t("spy_was")}</div><div class="huge">🕵️ ${esc(g.spy)}</div>
        <div class="muted">${t("secret_was")}</div><div style="font-size:24px;font-weight:900">${esc(L(g.word))}</div><div style="margin-top:10px;font-weight:800">${msg}</div></div>`;
    }
    return html;
  },

  password(g, m) {
    setAnswerBar(false);
    if (!m.describer) {
      if (g.state === "active" && S.mode === "teams" && g.side !== S.me.team)
        return `<div class="huge">🤐</div><div class="center" style="font-size:20px"><b>${esc(g.describer)}</b> ${t("describing")}</div>
          <div class="center" style="font-size:22px;font-weight:900">${t("their_turn")}</div>${timerBar(g.deadline, 60)}`;
      if (g.state === "active") return `<div class="huge">🗣️</div><div class="center" style="font-size:22px"><b>${esc(g.describer)}</b> ${t("describing")}</div>
        <div class="center" style="font-size:24px;font-weight:900">${t("guess_aloud")}</div>${timerBar(g.deadline, 60)}`;
      if (g.state === "ready") return `<div class="center" style="font-size:22px"><b>${esc(g.describer)}</b> ${S.mode === "teams" ? t("describes_for") + " " + esc(teamLabel(S, g.side)) : t("describing")}</div>`;
      return `<div class="center muted">${t("watch_screen")}</div>`;
    }
    if (g.state === "ready") return `<div class="huge">${t("you_describe")}</div><div class="center muted">${t("get_ready")}</div>
      <button class="primary" style="padding:22px;font-size:22px" data-pw="begin">${t("start_turn")}</button>`;
    if (g.state === "active") {
      let html = `<div class="row"><span class="clock" data-deadline="${g.deadline}" style="font-size:28px"></span><span class="grow">${timerBar(g.deadline, 60)}</span><span class="chip">✔ ${g.count}</span></div>
        <div class="wordcard">${esc(L(m.word))}</div>`;
      if (m.guessers) {
        html += `<div class="muted center">${t("who_guessed")}</div><div class="btngrid">${m.guessers.map((p) => `<button data-got="${p.id}">${esc(p.name)}</button>`).join("")}</div>`;
      } else {
        html += `<button class="primary" style="padding:22px;font-size:24px" data-pw="got">${t("correct")}</button>`;
      }
      html += `<button data-pw="pass">${t("pass")}</button>`;
      return html;
    }
    return `<div class="huge">✔ ${g.got.length}</div>`;
  },

  quickfire(g, m) {
    setAnswerBar(false);
    const keys = ["A", "B", "C", "D"];
    let html = `<div class="muted">${t("question")} ${g.qi + 1}/${g.qn}</div><div style="font-size:22px;font-weight:900">${esc(L(g.q))}</div>`;
    if (g.img) html += `<img class="qimg" src="${esc(g.img)}" alt="" style="max-height:110px">`;
    if (g.state === "question") html += timerBar(g.deadline, 15);
    html += `<div class="opts">${g.options.map((o, i) => {
      let cls = m.my_pick === i ? "mine" : "";
      if (g.state === "reveal") cls = i === g.correct ? "right" : m.my_pick === i ? "wrongpick" : "dim";
      const dis = g.state !== "question" || m.my_pick != null ? "disabled" : "";
      return `<button class="opt ${cls}" data-pick="${i}" ${dis}><span class="k">${keys[i]}</span>${esc(L(o))}</button>`;
    }).join("")}</div>`;
    if (g.state === "question" && m.my_pick != null) html += `<div class="center" style="color:var(--gold);font-weight:800">${t("locked_in")}</div>`;
    if (g.state === "reveal") html += `<div class="huge">${m.my_pick === g.correct ? "✅ " + t("right") : m.my_pick == null ? "⏱ " + t("too_slow") : "❌ " + t("wrong")}</div>`;
    return html;
  },
};

function scoresHTML() {
  const rows = scoreRows(S);
  return `<div class="podium">${[...rows].sort((a, b) => b.score - a.score)
    .map((r) => `<div class="row-s ${r.cls}" style="font-size:18px">${esc(r.name)}<span class="sc" style="font-size:24px">${r.score}</span></div>`).join("")}</div>`;
}

function render() {
  if (!S || !S.me) return;
  const me = S.me;
  const mySide = S.scores.find((r) => r.side === me.side);
  const myScore = mySide ? mySide.score : 0;
  // Cheer on the phone whenever this player's side scores.
  if (MY_LAST != null && myScore > MY_LAST && S.phase === "play") { toast(`${hype("ok")} +${myScore - MY_LAST}`); confetti(.4); }
  if (S.phase === "final" && LAST_PHASE !== "final") {
    const top = Math.max(...S.scores.map((r) => r.score));
    if (myScore === top && top > 0) confetti(1.2);
  }
  MY_LAST = S.phase === "lobby" ? 0 : myScore;
  LAST_PHASE = S.phase;
  setHTML($("#mechip"), `<span class="chip tag ${S.mode === "teams" ? sideClass(me.team) : "ts"}">${esc(me.name)} · ${mySide ? mySide.score : 0}</span>`);
  let html = "";
  if (S.phase === "lobby") {
    setAnswerBar(false);
    html = `<div class="huge">✅ ${t("you_are_in")}</div>`;
    if (S.mode === "teams") {
      html += `<div class="center muted">${t("pick_team")}</div><div class="btngrid">${["A", "B"].map((k) =>
        `<button class="tag ${sideClass(k)} ${me.team === k ? "" : "ghost"}" style="${me.team === k ? "background:var(--tc);color:#fff" : ""}" data-team="${k}">${esc(teamLabel(S, k))}</button>`).join("")}</div>`;
    }
    html += `<div class="center muted">${t("wait_host")}</div>`;
  } else if (S.phase === "intro") {
    setAnswerBar(false);
    html = `<div class="intro c-${S.seg_key}" style="padding:10px 0 0"><div class="ico" style="font-size:80px">${SEG_ICON[S.seg_key]}</div></div><div class="huge">${esc(segTitle(S.seg_key))}</div>
      <div class="card" style="line-height:1.7">${esc(segRules(S.seg_key, S.mode))}</div>`;
  } else if (S.phase === "play" && S.seg) {
    html = PHONE[S.seg_key](S.seg, S.mine || {});
  } else if (S.phase === "seg_end" || S.phase === "final") {
    setAnswerBar(false);
    html = `<div class="huge">${S.phase === "final" ? "🏆 " + t("champions") : t("segment_over")}</div>` + scoresHTML();
  }
  const el = $("#content");
  const before = el._h;
  setHTML(el, html);
  enterOnChange(el, screenKey(S));
  if (el._h === before) return;
  el.querySelectorAll("[data-team]").forEach((b) => { b.onclick = () => act("team", { team: b.dataset.team }); });
  el.querySelectorAll("[data-vote]").forEach((b) => { b.onclick = () => act("vote", { target: b.dataset.vote }); });
  el.querySelectorAll("[data-guess]").forEach((b) => { b.onclick = () => act("spy_guess", { i: +b.dataset.guess }); });
  el.querySelectorAll("[data-pick]").forEach((b) => { b.onclick = () => act("pick", { i: +b.dataset.pick }); });
  el.querySelectorAll("[data-pw]").forEach((b) => { b.onclick = () => act(b.dataset.pw); });
  el.querySelectorAll("[data-got]").forEach((b) => { b.onclick = () => act("got", { guesser: b.dataset.got }); });
  const rc = $("#rolecard");
  if (rc) rc.onclick = () => { spyShown[S.seg.ri] = !spyShown[S.seg.ri]; el._h = null; render(); };
}
RERENDER = () => { $("#content")._h = null; render(); };
boot();
