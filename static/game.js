// Game rooms and segments for Koora Clash.
// Runs inside the host's browser: the host screen is the authoritative game server,
// and every change pushes a fresh per-client view to the host screen and each phone.

const SEGMENT_KEYS = ["career", "rondo", "spy", "password", "quickfire"];
let DATA = null;

async function loadData() {
  const r = await fetch("data/questions.json", { cache: "no-cache" });
  DATA = await r.json();
  return DATA;
}

function now() { return Date.now() / 1000; }
function rand(n) { return Math.floor(Math.random() * n); }
function choice(a) { return a[rand(a.length)]; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function sample(a, n) { return shuffle(a.slice()).slice(0, n); }
function token(n) {
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, (x) => abc[x % abc.length]).join("");
}

// ---------- play history: new games favour questions this device hasn't played ----------

let HISTORY = {};
try { HISTORY = JSON.parse(localStorage.getItem("kc_history") || "{}"); } catch (e) {}

function qkey(kind, item) {
  if (kind === "career") return "career:" + item.answer.en;
  if (kind === "rondo") return "rondo:" + item.prompt.en;
  if (kind === "quickfire") return "quickfire:" + item.q.en + "|" + (item.img || "");
  return "word:" + item.en;
}
function markPlayed(kind, items) {
  for (const it of items) { const k = qkey(kind, it); HISTORY[k] = (HISTORY[k] || 0) + 1; }
  try { localStorage.setItem("kc_history", JSON.stringify(HISTORY)); } catch (e) {}
}
// Least-played first (random among ties); marks the picked ones as played when n is given.
function freshest(kind, items, n) {
  const ranked = items.map((it) => [HISTORY[qkey(kind, it)] || 0, Math.random(), it])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
  if (n == null) return ranked;
  const picked = ranked.slice(0, n);
  markPlayed(kind, picked);
  return picked;
}

// ---------- answer matching ----------

const AR_MAP = { "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي", "گ": "ج", "چ": "ج" };

function norm(text) {
  let s = String(text || "").trim().toLowerCase().replace(/[ً-ْٰـ]/g, "");
  s = s.replace(/[أإآٱةىؤئگچ]/g, (c) => AR_MAP[c]).normalize("NFKD").replace(/\p{M}/gu, "");
  return s.split(/[\s\-_.']+/).map((w) => (w.startsWith("ال") && w.length > 4 ? w.slice(2) : w))
    .join("").replace(/[^\p{L}\p{N}]/gu, "");
}

// Edit distance where swapping two neighbouring letters ("Itlay") counts as one typo.
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  let pp = null, prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1]));
      if (pp && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, pp[j - 2] + 1);
      cur.push(d);
    }
    pp = prev;
    prev = cur;
  }
  return prev[b.length];
}

function matches(guess, names) {
  const g = norm(guess);
  if (!g) return false;
  for (const n of names) {
    const t = norm(n);
    if (!t) continue;
    if (g === t) return true;
    const allowed = t.length < 4 ? 0 : t.length < 8 ? 1 : 2;
    if (allowed && lev(g, t) <= allowed) return true;
  }
  return false;
}

function namesOf(item) { return [item.en || "", item.ar || "", ...(item.aliases || [])]; }

// ---------- segments ----------

class Segment {
  constructor(room) { this.room = room; this.finished = false; }
  start() {}
  tick() { return false; }
  action() { return false; }
  hostAction() { return false; }
  public() { return {}; }
  private() { return {}; }
}

// Clubs appear one by one; first correct guess scores more the earlier it lands.
class CareerPath extends Segment {
  static key = "career";
  constructor(room) { super(room); this.qs = freshest("career", DATA.career, 4); this.qi = -1; }
  start() { this.nextQ(); }
  nextQ() {
    this.qi++;
    if (this.qi >= this.qs.length) { this.finished = true; return; }
    this.q = this.qs[this.qi];
    this.shown = 1;
    this.state = "reveal";
    this.nextClueAt = now() + CareerPath.CLUE_EVERY;
    this.deadline = null;
    this.locks = {}; this.feed = []; this.winner = null;
  }
  points() { return Math.max(1, 6 - this.shown); }
  tick(t) {
    if (this.state === "reveal") {
      const clubs = this.q.clubs.length;
      if (this.shown < clubs && t >= this.nextClueAt) {
        this.shown++;
        this.nextClueAt = t + CareerPath.CLUE_EVERY;
        if (this.shown === clubs) this.deadline = t + CareerPath.EXTRA;
        return true;
      }
      if (this.shown === clubs && this.deadline == null) { this.deadline = t + CareerPath.EXTRA; return true; }
      if (this.deadline && t >= this.deadline) { this.state = "result"; this.deadline = t + CareerPath.RESULT; return true; }
    } else if (this.state === "result" && t >= this.deadline) {
      this.nextQ();
      return true;
    }
    return false;
  }
  action(pid, act, p) {
    if (act !== "guess" || this.state !== "reveal") return false;
    const t = now();
    if ((this.locks[pid] || 0) > t) return false;
    const text = String(p.text || "").slice(0, 60);
    if (matches(text, [this.q.answer.en, this.q.answer.ar, ...this.q.aliases])) {
      const pts = this.points();
      this.room.award(pid, pts);
      this.winner = { pid, name: this.room.pname(pid), pts, side: this.room.sideOf(pid) };
      this.state = "result"; this.deadline = t + CareerPath.RESULT;
    } else {
      this.locks[pid] = t + CareerPath.LOCKOUT;
      this.feed = [...this.feed, { name: this.room.pname(pid), text }].slice(-6);
    }
    return true;
  }
  hostAction(act) {
    if (act !== "skip") return false;
    if (this.state === "reveal") { this.state = "result"; this.deadline = now() + CareerPath.RESULT; } else this.nextQ();
    return true;
  }
  public() {
    const total = this.q.clubs.length;
    const v = { state: this.state, qi: this.qi, qn: this.qs.length, clubs: this.q.clubs.slice(0, this.shown), total,
      points: this.points(), feed: this.feed, winner: this.winner,
      next_clue_at: this.shown < total ? this.nextClueAt : null, deadline: this.deadline };
    if (this.state === "result") v.answer = this.q.answer;
    return v;
  }
  private(pid) { return { locked_until: this.locks[pid] || 0 }; }
}
Object.assign(CareerPath, { CLUE_EVERY: 6, EXTRA: 12, RESULT: 6, LOCKOUT: 3 });

// Take turns naming answers in a category; run out of time twice and you're out.
class Rondo extends Segment {
  static key = "rondo";
  constructor(room) { super(room); this.cats = freshest("rondo", DATA.rondo, 2); this.ci = -1; }
  start() { this.nextCat(); }
  nextCat() {
    this.ci++;
    const sides = this.room.sideList();
    if (this.ci >= this.cats.length || !sides.length) { this.finished = true; return; }
    this.cat = this.cats[this.ci];
    this.used = []; this.usedIdx = []; this.rejected = []; this.rid = 0;
    this.order = shuffle(sides.slice());
    this.lives = Object.fromEntries(this.order.map((s) => [s, Rondo.LIVES]));
    this.turnI = 0; this.turnNo = 0;
    this.state = "play"; this.deadline = now() + Rondo.FIRST;
    this.last = null; this.winners = [];
  }
  alive() { return this.order.filter((s) => this.lives[s] > 0); }
  current() { return this.order[this.turnI]; }
  advance(t) {
    const n = this.order.length;
    for (let k = 1; k <= n; k++) {
      const i = (this.turnI + k) % n;
      if (this.lives[this.order[i]] > 0) { this.turnI = i; break; }
    }
    this.turnNo++;
    this.deadline = t + Rondo.TURN;
  }
  endCat(t, exhausted) {
    this.state = "result"; this.deadline = t + Rondo.RESULT;
    const alive = this.alive();
    this.winners = alive;
    if (exhausted) alive.forEach((s) => this.room.awardSide(s, 1));
    else if (alive.length === 1 && this.order.length > 1) this.room.awardSide(alive[0], 3);
  }
  tick(t) {
    if (this.state === "play" && t >= this.deadline) {
      const cur = this.current();
      this.lives[cur]--;
      this.last = { type: "timeout", side: cur };
      const alive = this.alive();
      if ((this.order.length > 1 && alive.length <= 1) || !alive.length) this.endCat(t); else this.advance(t);
      return true;
    }
    if (this.state === "result" && t >= this.deadline) { this.nextCat(); return true; }
    return false;
  }
  accept(text, side, pid, idx) {
    const t = now();
    if (idx != null) this.usedIdx.push(idx);
    this.used.push({ text, side, name: this.room.pname(pid) });
    this.last = { type: "ok", side, text };
    if (this.usedIdx.length >= this.cat.answers.length) this.endCat(t, true); else this.advance(t);
  }
  action(pid, act, p) {
    if (act !== "answer" || this.state !== "play") return false;
    const side = this.room.sideOf(pid);
    if (side !== this.current()) return false;
    const text = String(p.text || "").trim().slice(0, 50);
    if (!text) return false;
    for (let i = 0; i < this.cat.answers.length; i++) {
      const a = this.cat.answers[i];
      if (matches(text, namesOf(a))) {
        if (this.usedIdx.includes(i)) { this.last = { type: "dup", side, text }; return true; }
        this.accept(a, side, pid, i);
        return true;
      }
    }
    this.rejected = [...this.rejected, { id: this.rid++, text, side, pid, name: this.room.pname(pid), turn: this.turnNo }].slice(-5);
    this.last = { type: "bad", side, text };
    return true;
  }
  hostAction(act, p) {
    if (act === "rondo_accept" && this.state === "play") {
      const r = this.rejected.find((x) => x.id === p.id && x.turn === this.turnNo && x.side === this.current());
      if (!r) return false;
      this.rejected = this.rejected.filter((x) => x !== r);
      this.accept({ en: r.text, ar: r.text }, r.side, r.pid, null);
      return true;
    }
    if (act === "skip") {
      if (this.state === "play") this.endCat(now()); else this.nextCat();
      return true;
    }
    return false;
  }
  public() {
    const v = { state: this.state, ci: this.ci, cn: this.cats.length, prompt: this.cat.prompt, used: this.used,
      remaining: this.cat.answers.length - this.usedIdx.length,
      order: this.order.map((s) => ({ side: s, name: this.room.sideName(s), lives: this.lives[s] })),
      turn: this.state === "play" ? this.current() : null, deadline: this.deadline, last: this.last,
      rejected: this.rejected.filter((r) => r.turn === this.turnNo), winners: this.winners };
    if (this.state === "result") v.missed = this.cat.answers.filter((_, i) => !this.usedIdx.includes(i));
    return v;
  }
  private(pid) { return { my_turn: this.state === "play" && this.room.sideOf(pid) === this.current() }; }
}
Object.assign(Rondo, { FIRST: 15, TURN: 12, RESULT: 7, LIVES: 2 });

// Everyone sees the same name except the spy. Talk, vote, catch the spy.
class Spy extends Segment {
  static key = "spy";
  constructor(room) { super(room); this.rounds = 2; this.ri = -1; this.usedWords = []; }
  start() { this.nextRound(); }
  nextRound() {
    this.ri++;
    const cast = Object.keys(this.room.players).filter((pid) => this.room.players[pid].connected);
    if (this.ri >= this.rounds || cast.length < 3) {
      if (this.ri === 0) this.tooFew = true;
      this.finished = true;
      return;
    }
    this.cast = cast;
    this.spy = choice(cast);
    const pool = DATA.words.filter((w) => !this.usedWords.includes(w.en));
    this.word = freshest("word", pool, 1)[0];
    this.usedWords.push(this.word.en);
    this.options = shuffle([...sample(DATA.words.filter((w) => w.en !== this.word.en), 5), this.word]);
    this.order = shuffle(cast.slice());
    this.votes = {}; this.outcome = null; this.tally = {}; this.spyPick = null;
    this.state = "reveal"; this.deadline = now() + Spy.REVEAL;
  }
  tallyVotes(t) {
    const counts = {};
    for (const target of Object.values(this.votes)) counts[target] = (counts[target] || 0) + 1;
    this.tally = counts;
    const vals = Object.values(counts);
    const top = vals.length ? Math.max(...vals) : 0;
    const tops = Object.keys(counts).filter((k) => counts[k] === top);
    if (vals.length && tops.length === 1 && tops[0] === this.spy) {
      this.state = "guess"; this.deadline = t + Spy.GUESS;
    } else {
      this.outcome = "escaped";
      this.room.awardSide(this.room.sideOf(this.spy), 3);
      this.state = "result"; this.deadline = t + Spy.RESULT;
    }
  }
  caught(t, guessed) {
    const spySide = this.room.sideOf(this.spy);
    if (guessed) { this.outcome = "stole"; this.room.awardSide(spySide, 2); }
    else { this.outcome = "caught"; this.room.sideList().filter((s) => s !== spySide).forEach((s) => this.room.awardSide(s, 2)); }
    this.state = "result"; this.deadline = t + Spy.RESULT;
  }
  tick(t) {
    if (t < this.deadline) return false;
    if (this.state === "reveal") { this.state = "discuss"; this.deadline = t + Spy.DISCUSS; }
    else if (this.state === "discuss") { this.state = "vote"; this.deadline = t + Spy.VOTE; }
    else if (this.state === "vote") this.tallyVotes(t);
    else if (this.state === "guess") this.caught(t, false);
    else if (this.state === "result") this.nextRound();
    return true;
  }
  action(pid, act, p) {
    const t = now();
    if (act === "vote" && this.state === "vote" && this.cast.includes(pid)) {
      const target = p.target;
      if (this.cast.includes(target) && target !== pid) {
        this.votes[pid] = target;
        if (Object.keys(this.votes).length >= this.cast.length) this.tallyVotes(t);
        return true;
      }
    }
    if (act === "spy_guess" && this.state === "guess" && pid === this.spy) {
      const i = p.i;
      if (Number.isInteger(i) && i >= 0 && i < this.options.length) {
        this.spyPick = this.options[i];
        this.caught(t, this.options[i].en === this.word.en);
        return true;
      }
    }
    return false;
  }
  hostAction(act) {
    const t = now();
    if (act === "spy_next") {
      if (this.state === "reveal") { this.state = "discuss"; this.deadline = t + Spy.DISCUSS; }
      else if (this.state === "discuss") { this.state = "vote"; this.deadline = t + Spy.VOTE; }
      else if (this.state === "vote") this.tallyVotes(t);
      else return false;
      return true;
    }
    if (act === "skip") { this.nextRound(); return true; }
    return false;
  }
  public() {
    if (this.finished) return { state: "done" };
    const v = { state: this.state, ri: this.ri, rn: this.rounds, deadline: this.deadline,
      order: this.order.map((p) => this.room.pname(p)), voted: Object.keys(this.votes).length, cast_n: this.cast.length };
    if (this.state === "result") {
      Object.assign(v, { spy: this.room.pname(this.spy), word: this.word, outcome: this.outcome, spy_pick: this.spyPick,
        tally: Object.entries(this.tally).map(([k, n]) => ({ name: this.room.pname(k), n, spy: k === this.spy })).sort((a, b) => b.n - a.n) });
    }
    if (this.state === "guess") v.spy = this.room.pname(this.spy);
    return v;
  }
  private(pid) {
    if (this.finished || !this.cast.includes(pid)) return { spectator: true };
    const v = { role: pid === this.spy ? "spy" : "agent" };
    if (pid !== this.spy) v.word = this.word;
    if (this.state === "vote") {
      v.candidates = this.cast.filter((c) => c !== pid).map((c) => ({ id: c, name: this.room.pname(c) }));
      v.my_vote = this.votes[pid] || null;
    }
    if (this.state === "guess" && pid === this.spy) v.options = this.options;
    return v;
  }
}
Object.assign(Spy, { REVEAL: 12, DISCUSS: 100, VOTE: 30, GUESS: 20, RESULT: 9 });

// One player describes names on their phone; their team shouts guesses.
class Password extends Segment {
  static key = "password";
  constructor(room) {
    super(room);
    this.words = freshest("word", DATA.words);
    this.wi = 0;
    this.turns = this.buildTurns();
    this.ti = -1;
  }
  buildTurns() {
    const r = this.room;
    const ids = Object.keys(r.players);
    if (r.mode === "teams") {
      const teams = { A: ids.filter((id) => r.players[id].team === "A"), B: ids.filter((id) => r.players[id].team === "B") };
      const turns = [];
      for (let k = 0; k < 2; k++) for (const t of ["A", "B"]) if (teams[t].length >= 2) turns.push(teams[t][k % teams[t].length]);
      return turns;
    }
    return ids.slice(0, 6);
  }
  start() { this.nextTurn(); }
  nextTurn() {
    this.ti++;
    while (this.ti < this.turns.length && !this.room.players[this.turns[this.ti]]) this.ti++;
    if (this.ti >= this.turns.length) { this.finished = true; return; }
    this.describer = this.turns[this.ti];
    this.state = "ready"; this.deadline = null;
    this.got = []; this.skipped = [];
  }
  word() { return this.words[this.wi % this.words.length]; }
  tick(t) {
    if (this.deadline && t >= this.deadline) {
      if (this.state === "active") { this.state = "result"; this.deadline = t + Password.RESULT; } else this.nextTurn();
      return true;
    }
    return false;
  }
  action(pid, act, p) {
    if (pid !== this.describer) return false;
    if (act === "begin" && this.state === "ready") { this.state = "active"; this.deadline = now() + Password.TURN; return true; }
    if (this.state !== "active") return false;
    if (act === "got") {
      const w = this.word();
      if (this.room.mode === "teams") {
        this.room.award(pid, 1);
        this.got.push({ word: w });
      } else {
        const g = p.guesser;
        if (!this.room.players[g] || g === pid) return false;
        this.room.award(pid, 1);
        this.room.award(g, 1);
        this.got.push({ word: w, by: this.room.pname(g) });
      }
      this.wi++;
      markPlayed("word", [w]);
      return true;
    }
    if (act === "pass") {
      this.skipped.push(this.word());
      markPlayed("word", [this.word()]);
      this.wi++;
      return true;
    }
    return false;
  }
  hostAction(act) {
    if (act !== "skip") return false;
    if (this.state === "active") { this.state = "result"; this.deadline = now() + Password.RESULT; } else this.nextTurn();
    return true;
  }
  public() {
    if (this.finished) return { state: "done" };
    const side = this.room.sideOf(this.describer);
    return { state: this.state, ti: this.ti, tn: this.turns.length, deadline: this.deadline,
      describer: this.room.pname(this.describer), side, side_name: this.room.sideName(side), count: this.got.length,
      got: this.state === "result" ? this.got : [], skipped: this.state === "result" ? this.skipped : [] };
  }
  private(pid) {
    if (this.finished || pid !== this.describer) return { describer: false };
    const v = { describer: true };
    if (this.state === "active") {
      v.word = this.word();
      if (this.room.mode !== "teams") {
        v.guessers = Object.keys(this.room.players).filter((q) => q !== pid).map((q) => ({ id: q, name: this.room.players[q].name }));
      }
    }
    return v;
  }
}
Object.assign(Password, { TURN: 60, RESULT: 6 });

// Multiple-choice rapid questions; fastest correct answer per side scores.
class QuickFire extends Segment {
  static key = "quickfire";
  constructor(room) { super(room); this.qs = freshest("quickfire", DATA.quickfire, QuickFire.N); this.qi = -1; }
  start() { this.nextQ(); }
  nextQ() {
    this.qi++;
    if (this.qi >= this.qs.length) { this.finished = true; return; }
    const q = this.qs[this.qi];
    const order = shuffle(q.options.map((_, i) => i));
    this.options = order.map((i) => q.options[i]);
    this.correct = order.indexOf(0);
    this.q = q;
    this.answers = {};
    this.gained = {};
    this.started = now();
    this.state = "question"; this.deadline = this.started + QuickFire.QTIME;
  }
  reveal(t) {
    const best = {};
    for (const [pid, [choiceI, took]] of Object.entries(this.answers)) {
      if (choiceI === this.correct && this.room.players[pid]) {
        const s = this.room.sideOf(pid);
        if (!(s in best) || took < best[s]) best[s] = took;
      }
    }
    for (const [s, took] of Object.entries(best)) {
      const pts = took <= QuickFire.FAST ? 2 : 1;
      this.gained[s] = pts;
      this.room.awardSide(s, pts);
    }
    this.state = "reveal"; this.deadline = t + QuickFire.RESULT;
  }
  tick(t) {
    if (t < this.deadline) return false;
    if (this.state === "question") this.reveal(t); else this.nextQ();
    return true;
  }
  action(pid, act, p) {
    if (act !== "pick" || this.state !== "question" || pid in this.answers) return false;
    const i = p.i;
    if (!Number.isInteger(i) || i < 0 || i >= this.options.length) return false;
    const t = now();
    this.answers[pid] = [i, t - this.started];
    const active = Object.keys(this.room.players).filter((q) => this.room.players[q].connected);
    if (active.every((q) => q in this.answers)) this.reveal(t);
    return true;
  }
  hostAction(act) {
    if (act !== "skip") return false;
    if (this.state === "question") this.reveal(now()); else this.nextQ();
    return true;
  }
  public() {
    if (this.finished) return { state: "done" };
    const v = { state: this.state, qi: this.qi, qn: this.qs.length, q: this.q.q, img: this.q.img || null,
      options: this.options, deadline: this.deadline, answered: Object.keys(this.answers).length };
    if (this.state === "reveal") {
      const counts = this.options.map(() => 0);
      Object.values(this.answers).forEach(([c]) => counts[c]++);
      Object.assign(v, { correct: this.correct, counts,
        gained: Object.entries(this.gained).map(([s, n]) => ({ name: this.room.sideName(s), pts: n })) });
    }
    return v;
  }
  private(pid) { const a = this.answers[pid]; return { my_pick: a ? a[0] : null }; }
}
Object.assign(QuickFire, { QTIME: 15, RESULT: 6, FAST: 5, N: 8 });

const SEGMENTS = Object.fromEntries([CareerPath, Rondo, Spy, Password, QuickFire].map((c) => [c.key, c]));

// ---------- room ----------

class Room {
  constructor(code) {
    this.code = code;
    this.players = {};
    this.mode = "teams";
    this.team_names = { A: "", B: "" };
    this.segments = SEGMENT_KEYS.slice();
    this.scores = {};
    this.phase = "lobby";
    this.seg = null;
    this.seg_index = -1;
    this.notice = null;
    this.send = () => {};  // (cid | "host", view) — set by the host page
  }

  // sides: a team in teams mode, the player themself in solo mode
  sideOf(pid) { const pl = this.players[pid]; if (!pl) return null; return this.mode === "teams" ? pl.team : pid; }
  sideList() {
    const ids = Object.keys(this.players);
    if (this.mode === "teams") return ["A", "B"].filter((t) => ids.some((id) => this.players[id].team === t));
    return ids;
  }
  sideName(side) { return side === "A" || side === "B" ? this.team_names[side] || "#" + side : this.pname(side); }
  pname(pid) { const pl = this.players[pid]; return pl ? pl.name : "?"; }
  awardSide(side, pts) { if (side != null) this.scores[side] = (this.scores[side] || 0) + pts; }
  award(pid, pts) { this.awardSide(this.sideOf(pid), pts); }
  scoreboard() {
    const ps = Object.entries(this.players);
    if (this.mode === "teams") {
      return ["A", "B"].map((t) => ({ side: t, name: this.team_names[t], team: t, score: this.scores[t] || 0,
        members: ps.filter(([, p]) => p.team === t).map(([, p]) => p.name) }));
    }
    return ps.map(([pid, p]) => ({ side: pid, name: p.name, team: null, score: this.scores[pid] || 0 })).sort((a, b) => b.score - a.score);
  }

  // Returns {cid} or {error}
  join(name) {
    name = String(name || "").trim().slice(0, 16);
    if (!name) return { error: "no_name" };
    const same = Object.keys(this.players).find((pid) => this.players[pid].name.toLowerCase() === name.toLowerCase());
    if (same) {
      // Same name on a dropped connection = the same person rejoining (phone slept, tab closed).
      if (!this.players[same].connected) return { cid: same };
      return { error: "name_taken" };
    }
    const pid = "p_" + token(12);
    const a = Object.values(this.players).filter((p) => p.team === "A").length;
    const b = Object.values(this.players).filter((p) => p.team === "B").length;
    this.players[pid] = { name, team: a <= b ? "A" : "B", connected: false, joined: now() };
    return { cid: pid };
  }

  startSegment() {
    this.seg_index++;
    if (this.seg_index >= this.segments.length) { this.phase = "final"; this.seg = null; return; }
    this.seg = new SEGMENTS[this.segments[this.seg_index]](this);
    this.phase = "intro";
  }
  checkFinished() {
    if (this.seg && this.seg.finished && this.phase === "play") {
      this.phase = "seg_end";
      if (this.seg.tooFew) this.notice = "spy_too_few";
    }
  }
  tick(t) {
    let changed = false;
    if (this.phase === "play" && this.seg) { changed = this.seg.tick(t); this.checkFinished(); }
    return changed;
  }

  hostAction(act, p) {
    p = p || {};
    if (act === "settings" && this.phase === "lobby") {
      if (p.mode === "teams" || p.mode === "solo") this.mode = p.mode;
      for (const t of ["A", "B"]) if (typeof p["team_" + t] === "string") this.team_names[t] = p["team_" + t].slice(0, 24);
      if (Array.isArray(p.segments)) {
        const segs = p.segments.filter((s) => SEGMENTS[s]);
        if (segs.length) this.segments = segs;
      }
      return true;
    }
    if (act === "move" && this.players[p.pid] && (p.team === "A" || p.team === "B")) { this.players[p.pid].team = p.team; return true; }
    if (act === "kick" && this.players[p.pid]) { delete this.players[p.pid]; this.send(p.pid, { kicked: true }); return true; }
    if (act === "adjust" && Number.isInteger(p.delta)) { this.awardSide(p.side, Math.max(-5, Math.min(5, p.delta))); return true; }
    if (act === "start" && this.phase === "lobby" && Object.keys(this.players).length) {
      this.scores = {}; this.seg_index = -1; this.startSegment(); return true;
    }
    if (act === "go" && this.phase === "intro") {
      this.phase = "play"; this.notice = null; this.seg.start(); this.checkFinished(); return true;
    }
    if (act === "next" && this.phase === "seg_end") { this.startSegment(); return true; }
    if (act === "end_game" && ["intro", "play", "seg_end"].includes(this.phase)) { this.phase = "final"; this.seg = null; return true; }
    if (act === "lobby") { this.phase = "lobby"; this.seg = null; this.seg_index = -1; this.scores = {}; return true; }
    if (this.phase === "play" && this.seg) { const r = this.seg.hostAction(act, p); this.checkFinished(); return r; }
    return false;
  }

  playerAction(pid, act, p) {
    p = p || {};
    if (!this.players[pid]) return false;
    if (act === "team" && (p.team === "A" || p.team === "B") && this.phase === "lobby") { this.players[pid].team = p.team; return true; }
    if (this.phase === "play" && this.seg) { const r = this.seg.action(pid, act, p); this.checkFinished(); return r; }
    return false;
  }

  baseView() {
    const v = { now: now(), room: this.code, phase: this.phase, mode: this.mode, team_names: this.team_names,
      segments: this.segments, seg_index: this.seg_index, seg_key: this.seg ? this.seg.constructor.key : null,
      notice: this.notice,
      players: Object.entries(this.players).map(([id, p]) => ({ id, name: p.name, team: p.team, connected: p.connected })),
      scores: this.scoreboard() };
    if (this.phase === "play" && this.seg) v.seg = this.seg.public();
    return v;
  }

  broadcast() {
    const base = this.baseView();
    this.send("host", { ...base, role: "host" });
    for (const [pid, pl] of Object.entries(this.players)) {
      if (!pl.connected) continue;
      const v = { ...base, role: "player", me: { id: pid, name: pl.name, team: pl.team, side: this.sideOf(pid) } };
      if (this.phase === "play" && this.seg) v.mine = this.seg.private(pid);
      this.send(pid, v);
    }
  }

  // Save/restore so a host refresh doesn't wipe the game.
  dump() {
    const seg = this.seg ? { key: this.seg.constructor.key, ...Object.fromEntries(Object.entries(this.seg).filter(([k]) => k !== "room")) } : null;
    const { send, ...rest } = this;
    return JSON.stringify({ ...rest, seg });
  }
  static restore(json) {
    const d = JSON.parse(json);
    const room = new Room(d.code);
    const { seg, ...rest } = d;
    Object.assign(room, rest);
    for (const p of Object.values(room.players)) p.connected = false;
    if (seg) {
      const s = Object.create(SEGMENTS[seg.key].prototype);
      delete seg.key;
      Object.assign(s, seg, { room });
      room.seg = s;
    }
    return room;
  }
}
