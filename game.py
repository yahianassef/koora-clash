"""Game rooms and segments for Koora Clash.

All state lives on the server. Every change bumps the room and pushes a
fresh, per-client view (host screen or a player's phone) over SSE.
"""
import json
import os
import random
import re
import secrets
import string
import threading
import time
import unicodedata

LOCK = threading.RLock()
ROOMS = {}

with open(os.path.join(os.path.dirname(__file__), "data", "questions.json"), encoding="utf-8") as f:
    DATA = json.load(f)

SEGMENT_KEYS = ["career", "rondo", "spy", "password", "quickfire"]

# How often each question has been played on this machine, so new games favour unplayed ones.
HISTORY_PATH = os.path.join(os.path.dirname(__file__), "data", "history.json")
try:
    with open(HISTORY_PATH, encoding="utf-8") as f:
        HISTORY = json.load(f)
except (OSError, ValueError):
    HISTORY = {}


def qkey(kind, item):
    if kind == "career":
        return "career:" + item["answer"]["en"]
    if kind == "rondo":
        return "rondo:" + item["prompt"]["en"]
    if kind == "quickfire":
        return "quickfire:" + item["q"]["en"] + "|" + item.get("img", "")
    return "word:" + item["en"]


def save_history():
    try:
        with open(HISTORY_PATH, "w", encoding="utf-8") as f:
            json.dump(HISTORY, f, ensure_ascii=False)
    except OSError:
        pass


def mark_played(kind, items):
    for it in items:
        k = qkey(kind, it)
        HISTORY[k] = HISTORY.get(k, 0) + 1
    save_history()


def freshest(kind, items, n=None):
    """Least-played first (random among ties); marks the picked ones as played."""
    ranked = sorted(items, key=lambda it: (HISTORY.get(qkey(kind, it), 0), random.random()))
    picked = ranked if n is None else ranked[:n]
    if n is not None:
        mark_played(kind, picked)
    return picked


def now():
    return time.time()


# ---------- answer matching ----------

_AR_MARKS = re.compile("[ً-ْٰـ]")
_AR_MAP = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي", "گ": "ج", "چ": "ج"})


def norm(text):
    s = _AR_MARKS.sub("", text.strip().lower()).translate(_AR_MAP)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    words = []
    for w in re.split(r"[\s\-_.']+", s):
        if w.startswith("ال") and len(w) > 4:
            w = w[2:]
        words.append(w)
    return re.sub(r"[^\w]|_", "", "".join(words))


def _lev(a, b):
    if abs(len(a) - len(b)) > 2:
        return 99
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def matches(guess, names):
    g = norm(guess)
    if not g:
        return False
    for n in names:
        t = norm(n)
        if not t:
            continue
        if g == t:
            return True
        allowed = 0 if len(t) < 4 else 1 if len(t) < 8 else 2
        if allowed and _lev(g, t) <= allowed:
            return True
    return False


def names_of(item, extra_key="aliases"):
    out = [item.get("en", ""), item.get("ar", "")]
    out += item.get(extra_key, [])
    return out


# ---------- segments ----------

class Segment:
    key = ""

    def __init__(self, room):
        self.room = room
        self.finished = False

    def start(self):
        pass

    def tick(self, t):
        return False

    def action(self, pid, act, p):
        return False

    def host_action(self, act, p):
        return False

    def public(self):
        return {}

    def private(self, pid):
        return {}


class CareerPath(Segment):
    """Clubs appear one by one; first correct guess scores more the earlier it lands."""
    key = "career"
    CLUE_EVERY, EXTRA, RESULT, LOCKOUT = 6, 12, 6, 3

    def __init__(self, room):
        super().__init__(room)
        self.qs = freshest("career", DATA["career"], 4)
        self.qi = -1

    def start(self):
        self.next_q()

    def next_q(self):
        self.qi += 1
        if self.qi >= len(self.qs):
            self.finished = True
            return
        self.q = self.qs[self.qi]
        self.shown = 1
        self.state = "reveal"
        self.next_clue_at = now() + self.CLUE_EVERY
        self.deadline = None
        self.locks, self.feed, self.winner = {}, [], None

    def points(self):
        return max(1, 6 - self.shown)

    def tick(self, t):
        if self.state == "reveal":
            clubs = len(self.q["clubs"])
            if self.shown < clubs and t >= self.next_clue_at:
                self.shown += 1
                self.next_clue_at = t + self.CLUE_EVERY
                if self.shown == clubs:
                    self.deadline = t + self.EXTRA
                return True
            if self.shown == clubs and self.deadline is None:
                self.deadline = t + self.EXTRA
                return True
            if self.deadline and t >= self.deadline:
                self.state, self.deadline = "result", t + self.RESULT
                return True
        elif self.state == "result" and t >= self.deadline:
            self.next_q()
            return True
        return False

    def action(self, pid, act, p):
        if act != "guess" or self.state != "reveal":
            return False
        t = now()
        if self.locks.get(pid, 0) > t:
            return False
        text = str(p.get("text", ""))[:60]
        if matches(text, names_of(self.q["answer"]) + self.q["aliases"]):
            pts = self.points()
            self.room.award(pid, pts)
            self.winner = {"pid": pid, "name": self.room.pname(pid), "pts": pts, "side": self.room.side_of(pid)}
            self.state, self.deadline = "result", t + self.RESULT
        else:
            self.locks[pid] = t + self.LOCKOUT
            self.feed = (self.feed + [{"name": self.room.pname(pid), "text": text}])[-6:]
        return True

    def host_action(self, act, p):
        if act == "skip":
            if self.state == "reveal":
                self.state, self.deadline = "result", now() + self.RESULT
            else:
                self.next_q()
            return True
        return False

    def public(self):
        v = {"state": self.state, "qi": self.qi, "qn": len(self.qs), "clubs": self.q["clubs"][: self.shown],
             "total": len(self.q["clubs"]), "points": self.points(), "feed": self.feed, "winner": self.winner,
             "next_clue_at": self.next_clue_at if self.shown < len(self.q["clubs"]) else None,
             "deadline": self.deadline}
        if self.state == "result":
            v["answer"] = self.q["answer"]
        return v

    def private(self, pid):
        return {"locked_until": self.locks.get(pid, 0)}


class Rondo(Segment):
    """Take turns naming answers in a category; run out of time twice and you're out."""
    key = "rondo"
    FIRST, TURN, RESULT, LIVES = 15, 12, 7, 2

    def __init__(self, room):
        super().__init__(room)
        self.cats = freshest("rondo", DATA["rondo"], 2)
        self.ci = -1

    def start(self):
        self.next_cat()

    def next_cat(self):
        self.ci += 1
        sides = self.room.side_list()
        if self.ci >= len(self.cats) or not sides:
            self.finished = True
            return
        self.cat = self.cats[self.ci]
        self.used, self.used_idx, self.rejected = [], set(), []
        self.order = sides[:]
        random.shuffle(self.order)
        self.lives = {s: self.LIVES for s in self.order}
        self.turn_i, self.turn_no = 0, 0
        self.state, self.deadline = "play", now() + self.FIRST
        self.last, self.winners = None, []

    def alive(self):
        return [s for s in self.order if self.lives[s] > 0]

    def current(self):
        return self.order[self.turn_i]

    def advance(self, t):
        n = len(self.order)
        for k in range(1, n + 1):
            i = (self.turn_i + k) % n
            if self.lives[self.order[i]] > 0:
                self.turn_i = i
                break
        self.turn_no += 1
        self.deadline = t + self.TURN

    def end_cat(self, t, exhausted=False):
        self.state, self.deadline = "result", t + self.RESULT
        alive = self.alive()
        self.winners = alive
        if exhausted:
            for s in alive:
                self.room.award_side(s, 1)
        elif len(alive) == 1 and len(self.order) > 1:
            self.room.award_side(alive[0], 3)

    def tick(self, t):
        if self.state == "play" and t >= self.deadline:
            cur = self.current()
            self.lives[cur] -= 1
            self.last = {"type": "timeout", "side": cur}
            alive = self.alive()
            if (len(self.order) > 1 and len(alive) <= 1) or not alive:
                self.end_cat(t)
            else:
                self.advance(t)
            return True
        if self.state == "result" and t >= self.deadline:
            self.next_cat()
            return True
        return False

    def accept(self, text, side, pid, idx=None):
        t = now()
        if idx is not None:
            self.used_idx.add(idx)
        self.used.append({"text": text, "side": side, "name": self.room.pname(pid)})
        self.last = {"type": "ok", "side": side, "text": text}
        if len(self.used_idx) >= len(self.cat["answers"]):
            self.end_cat(t, exhausted=True)
        else:
            self.advance(t)

    def action(self, pid, act, p):
        if act != "answer" or self.state != "play":
            return False
        side = self.room.side_of(pid)
        if side != self.current():
            return False
        text = str(p.get("text", "")).strip()[:50]
        if not text:
            return False
        for i, a in enumerate(self.cat["answers"]):
            if matches(text, names_of(a)):
                if i in self.used_idx:
                    self.last = {"type": "dup", "side": side, "text": text}
                    return True
                self.accept(a, side, pid, i)
                return True
        rid = len(self.rejected)
        self.rejected = (self.rejected + [{"id": rid, "text": text, "side": side, "pid": pid,
                                           "name": self.room.pname(pid), "turn": self.turn_no}])[-5:]
        self.last = {"type": "bad", "side": side, "text": text}
        return True

    def host_action(self, act, p):
        if act == "rondo_accept" and self.state == "play":
            for r in self.rejected:
                if r["id"] == p.get("id") and r["turn"] == self.turn_no and r["side"] == self.current():
                    self.rejected.remove(r)
                    self.accept({"en": r["text"], "ar": r["text"]}, r["side"], r["pid"])
                    return True
            return False
        if act == "skip":
            if self.state == "play":
                self.end_cat(now())
            else:
                self.next_cat()
            return True
        return False

    def public(self):
        v = {"state": self.state, "ci": self.ci, "cn": len(self.cats), "prompt": self.cat["prompt"],
             "used": self.used, "remaining": len(self.cat["answers"]) - len(self.used_idx),
             "order": [{"side": s, "name": self.room.side_name(s), "lives": self.lives[s]} for s in self.order],
             "turn": self.current() if self.state == "play" else None, "deadline": self.deadline, "last": self.last,
             "rejected": [r for r in self.rejected if r["turn"] == self.turn_no], "winners": self.winners}
        if self.state == "result":
            v["missed"] = [a for i, a in enumerate(self.cat["answers"]) if i not in self.used_idx]
        return v

    def private(self, pid):
        return {"my_turn": self.state == "play" and self.room.side_of(pid) == self.current()}


class Spy(Segment):
    """Everyone sees the same name except the spy. Talk, vote, catch the spy."""
    key = "spy"
    REVEAL, DISCUSS, VOTE, GUESS, RESULT = 12, 100, 30, 20, 9

    def __init__(self, room):
        super().__init__(room)
        self.rounds = 2
        self.ri = -1
        self.used_words = set()

    def start(self):
        self.next_round()

    def next_round(self):
        self.ri += 1
        cast = [pid for pid, pl in self.room.players.items() if pl["connected"]]
        if self.ri >= self.rounds or len(cast) < 3:
            if self.ri == 0:
                self.too_few = True
            self.finished = True
            return
        self.cast = cast
        self.spy = random.choice(cast)
        pool = [w for i, w in enumerate(DATA["words"]) if i not in self.used_words]
        self.word = freshest("word", pool, 1)[0]
        wi = DATA["words"].index(self.word)
        self.used_words.add(wi)
        decoys = random.sample([w for i, w in enumerate(DATA["words"]) if i != wi], 5)
        self.options = decoys + [self.word]
        random.shuffle(self.options)
        self.order = cast[:]
        random.shuffle(self.order)
        self.votes, self.outcome, self.tally, self.spy_pick = {}, None, {}, None
        self.state, self.deadline = "reveal", now() + self.REVEAL

    def tally_votes(self, t):
        counts = {}
        for target in self.votes.values():
            counts[target] = counts.get(target, 0) + 1
        self.tally = counts
        top = max(counts.values()) if counts else 0
        tops = [k for k, c in counts.items() if c == top]
        if counts and len(tops) == 1 and tops[0] == self.spy:
            self.state, self.deadline = "guess", t + self.GUESS
        else:
            self.outcome = "escaped"
            self.room.award_side(self.room.side_of(self.spy), 3)
            self.state, self.deadline = "result", t + self.RESULT

    def caught(self, t, guessed):
        spy_side = self.room.side_of(self.spy)
        if guessed:
            self.outcome = "stole"
            self.room.award_side(spy_side, 2)
        else:
            self.outcome = "caught"
            for s in self.room.side_list():
                if s != spy_side:
                    self.room.award_side(s, 2)
        self.state, self.deadline = "result", t + self.RESULT

    def tick(self, t):
        if t < self.deadline:
            return False
        if self.state == "reveal":
            self.state, self.deadline = "discuss", t + self.DISCUSS
        elif self.state == "discuss":
            self.state, self.deadline = "vote", t + self.VOTE
        elif self.state == "vote":
            self.tally_votes(t)
        elif self.state == "guess":
            self.caught(t, False)
        elif self.state == "result":
            self.next_round()
        return True

    def action(self, pid, act, p):
        t = now()
        if act == "vote" and self.state == "vote" and pid in self.cast:
            target = p.get("target")
            if target in self.cast and target != pid:
                self.votes[pid] = target
                if len(self.votes) >= len(self.cast):
                    self.tally_votes(t)
                return True
        if act == "spy_guess" and self.state == "guess" and pid == self.spy:
            i = p.get("i")
            if isinstance(i, int) and 0 <= i < len(self.options):
                self.spy_pick = self.options[i]
                self.caught(t, self.options[i] is self.word)
                return True
        return False

    def host_action(self, act, p):
        t = now()
        if act == "spy_next":
            if self.state == "reveal":
                self.state, self.deadline = "discuss", t + self.DISCUSS
            elif self.state == "discuss":
                self.state, self.deadline = "vote", t + self.VOTE
            elif self.state == "vote":
                self.tally_votes(t)
            else:
                return False
            return True
        if act == "skip":
            self.next_round()
            return True
        return False

    def public(self):
        if self.finished:
            return {"state": "done"}
        v = {"state": self.state, "ri": self.ri, "rn": self.rounds, "deadline": self.deadline,
             "order": [self.room.pname(p) for p in self.order], "voted": len(self.votes), "cast_n": len(self.cast)}
        if self.state == "result":
            v.update({"spy": self.room.pname(self.spy), "word": self.word, "outcome": self.outcome,
                      "spy_pick": self.spy_pick,
                      "tally": sorted([{"name": self.room.pname(k), "n": n, "spy": k == self.spy}
                                       for k, n in self.tally.items()], key=lambda x: -x["n"])})
        if self.state == "guess":
            v["spy"] = self.room.pname(self.spy)
        return v

    def private(self, pid):
        if self.finished or pid not in self.cast:
            return {"spectator": True}
        v = {"role": "spy" if pid == self.spy else "agent"}
        if pid != self.spy:
            v["word"] = self.word
        if self.state == "vote":
            v["candidates"] = [{"id": c, "name": self.room.pname(c)} for c in self.cast if c != pid]
            v["my_vote"] = self.votes.get(pid)
        if self.state == "guess" and pid == self.spy:
            v["options"] = self.options
        return v


class Password(Segment):
    """One player describes names on their phone; their team shouts guesses."""
    key = "password"
    TURN, RESULT = 60, 6

    def __init__(self, room):
        super().__init__(room)
        self.words = freshest("word", DATA["words"])
        self.wi = 0
        self.turns = self.build_turns()
        self.ti = -1

    def build_turns(self):
        r = self.room
        if r.mode == "teams":
            teams = {t: [pid for pid, pl in r.players.items() if pl["team"] == t] for t in "AB"}
            turns = []
            for k in range(2):
                for t in "AB":
                    if len(teams[t]) >= 2:
                        turns.append(teams[t][k % len(teams[t])])
            return turns
        return list(r.players.keys())[:6]

    def start(self):
        self.next_turn()

    def next_turn(self):
        self.ti += 1
        while self.ti < len(self.turns) and self.turns[self.ti] not in self.room.players:
            self.ti += 1
        if self.ti >= len(self.turns):
            self.finished = True
            return
        self.describer = self.turns[self.ti]
        self.state, self.deadline = "ready", None
        self.got, self.skipped = [], []

    def word(self):
        return self.words[self.wi % len(self.words)]

    def tick(self, t):
        if self.deadline and t >= self.deadline:
            if self.state == "active":
                self.state, self.deadline = "result", t + self.RESULT
            else:
                self.next_turn()
            return True
        return False

    def action(self, pid, act, p):
        if pid != getattr(self, "describer", None):
            return False
        if act == "begin" and self.state == "ready":
            self.state, self.deadline = "active", now() + self.TURN
            return True
        if self.state != "active":
            return False
        if act == "got":
            w = self.word()
            self.wi += 1
            mark_played("word", [w])
            if self.room.mode == "teams":
                self.room.award(pid, 1)
                self.got.append({"word": w})
            else:
                g = p.get("guesser")
                if g not in self.room.players or g == pid:
                    return False
                self.room.award(pid, 1)
                self.room.award(g, 1)
                self.got.append({"word": w, "by": self.room.pname(g)})
            return True
        if act == "pass":
            self.skipped.append(self.word())
            mark_played("word", [self.word()])
            self.wi += 1
            return True
        return False

    def host_action(self, act, p):
        if act == "skip":
            if self.state == "active":
                self.state, self.deadline = "result", now() + self.RESULT
            else:
                self.next_turn()
            return True
        return False

    def public(self):
        if self.finished:
            return {"state": "done"}
        return {"state": self.state, "ti": self.ti, "tn": len(self.turns), "deadline": self.deadline,
                "describer": self.room.pname(self.describer), "side": self.room.side_of(self.describer),
                "side_name": self.room.side_name(self.room.side_of(self.describer)),
                "count": len(self.got),
                "got": self.got if self.state == "result" else [], "skipped": self.skipped if self.state == "result" else []}

    def private(self, pid):
        if self.finished or pid != self.describer:
            return {"describer": False}
        v = {"describer": True}
        if self.state == "active":
            v["word"] = self.word()
            if self.room.mode != "teams":
                v["guessers"] = [{"id": q, "name": pl["name"]} for q, pl in self.room.players.items() if q != pid]
        return v


class QuickFire(Segment):
    """Multiple-choice rapid questions; fastest correct answer per side scores."""
    key = "quickfire"
    QTIME, RESULT, FAST, N = 15, 6, 5, 8

    def __init__(self, room):
        super().__init__(room)
        self.qs = freshest("quickfire", DATA["quickfire"], self.N)
        self.qi = -1

    def start(self):
        self.next_q()

    def next_q(self):
        self.qi += 1
        if self.qi >= len(self.qs):
            self.finished = True
            return
        q = self.qs[self.qi]
        order = list(range(len(q["options"])))
        random.shuffle(order)
        self.options = [q["options"][i] for i in order]
        self.correct = order.index(0)
        self.q = q
        self.answers = {}
        self.gained = {}
        self.started = now()
        self.state, self.deadline = "question", self.started + self.QTIME

    def reveal(self, t):
        best = {}
        for pid, (choice, took) in self.answers.items():
            if choice == self.correct and pid in self.room.players:
                s = self.room.side_of(pid)
                if s not in best or took < best[s]:
                    best[s] = took
        for s, took in best.items():
            pts = 2 if took <= self.FAST else 1
            self.gained[s] = pts
            self.room.award_side(s, pts)
        self.state, self.deadline = "reveal", t + self.RESULT

    def tick(self, t):
        if t >= self.deadline:
            if self.state == "question":
                self.reveal(t)
            else:
                self.next_q()
            return True
        return False

    def action(self, pid, act, p):
        if act != "pick" or self.state != "question" or pid in self.answers:
            return False
        i = p.get("i")
        if not isinstance(i, int) or not 0 <= i < len(self.options):
            return False
        t = now()
        self.answers[pid] = (i, t - self.started)
        active = [q for q, pl in self.room.players.items() if pl["connected"]]
        if all(q in self.answers for q in active):
            self.reveal(t)
        return True

    def host_action(self, act, p):
        if act == "skip":
            if self.state == "question":
                self.reveal(now())
            else:
                self.next_q()
            return True
        return False

    def public(self):
        if self.finished:
            return {"state": "done"}
        v = {"state": self.state, "qi": self.qi, "qn": len(self.qs), "q": self.q["q"], "img": self.q.get("img"),
             "options": self.options, "deadline": self.deadline, "answered": len(self.answers)}
        if self.state == "reveal":
            counts = [0] * len(self.options)
            for c, _ in self.answers.values():
                counts[c] += 1
            v.update({"correct": self.correct, "counts": counts,
                      "gained": [{"name": self.room.side_name(s), "pts": n} for s, n in self.gained.items()]})
        return v

    def private(self, pid):
        a = self.answers.get(pid)
        return {"my_pick": a[0] if a else None}


SEGMENTS = {c.key: c for c in (CareerPath, Rondo, Spy, Password, QuickFire)}


# ---------- channels & rooms ----------

class Channel:
    def __init__(self):
        self.cond = threading.Condition()
        self.data = "{}"
        self.version = 0
        self.listeners = 0

    def push(self, data):
        with self.cond:
            self.data = data
            self.version += 1
            self.cond.notify_all()


def _code():
    while True:
        c = "".join(random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(4))
        if c not in ROOMS:
            return c


class Room:
    def __init__(self):
        self.code = _code()
        self.host_token = "h_" + secrets.token_urlsafe(12)
        self.players = {}
        self.channels = {self.host_token: Channel()}
        self.mode = "teams"
        self.team_names = {"A": "", "B": ""}
        self.segments = SEGMENT_KEYS[:]
        self.scores = {}
        self.phase = "lobby"
        self.seg = None
        self.seg_index = -1
        self.touched = now()
        self.notice = None

    # sides: a team in teams mode, the player themself in solo mode
    def side_of(self, pid):
        pl = self.players.get(pid)
        if not pl:
            return None
        return pl["team"] if self.mode == "teams" else pid

    def side_list(self):
        if self.mode == "teams":
            return [t for t in "AB" if any(p["team"] == t for p in self.players.values())]
        return list(self.players.keys())

    def side_name(self, side):
        if side in ("A", "B"):
            return self.team_names[side] or ("#" + side)
        return self.pname(side)

    def pname(self, pid):
        pl = self.players.get(pid)
        return pl["name"] if pl else "?"

    def award_side(self, side, pts):
        if side is not None:
            self.scores[side] = self.scores.get(side, 0) + pts

    def award(self, pid, pts):
        self.award_side(self.side_of(pid), pts)

    def scoreboard(self):
        if self.mode == "teams":
            return [{"side": t, "name": self.team_names[t], "team": t, "score": self.scores.get(t, 0),
                     "members": [p["name"] for p in self.players.values() if p["team"] == t]} for t in "AB"]
        rows = [{"side": pid, "name": p["name"], "team": None, "score": self.scores.get(pid, 0)}
                for pid, p in self.players.items()]
        return sorted(rows, key=lambda r: -r["score"])

    # ----- lifecycle -----
    def join(self, name, team=None):
        pid = "p_" + secrets.token_urlsafe(10)
        if team not in ("A", "B"):
            a = sum(1 for p in self.players.values() if p["team"] == "A")
            b = sum(1 for p in self.players.values() if p["team"] == "B")
            team = "A" if a <= b else "B"
        self.players[pid] = {"name": name, "team": team, "connected": False, "joined": now()}
        self.channels[pid] = Channel()
        return pid

    def start_segment(self):
        self.seg_index += 1
        if self.seg_index >= len(self.segments):
            self.phase = "final"
            self.seg = None
            return
        self.seg = SEGMENTS[self.segments[self.seg_index]](self)
        self.phase = "intro"

    def check_finished(self):
        if self.seg and self.seg.finished and self.phase == "play":
            self.phase = "seg_end"
            if getattr(self.seg, "too_few", False):
                self.notice = "spy_too_few"

    def tick(self, t):
        changed = False
        if self.phase == "play" and self.seg:
            changed = self.seg.tick(t)
            self.check_finished()
        return changed

    def host_action(self, act, p):
        if act == "settings" and self.phase == "lobby":
            if p.get("mode") in ("teams", "solo"):
                self.mode = p["mode"]
            for t in "AB":
                if isinstance(p.get("team_" + t), str):
                    self.team_names[t] = p["team_" + t][:24]
            segs = p.get("segments")
            if isinstance(segs, list):
                self.segments = [s for s in segs if s in SEGMENTS] or self.segments
            return True
        if act == "move" and p.get("pid") in self.players and p.get("team") in ("A", "B"):
            self.players[p["pid"]]["team"] = p["team"]
            return True
        if act == "kick" and p.get("pid") in self.players:
            del self.players[p["pid"]]
            self.channels[p["pid"]].push(json.dumps({"kicked": True}))
            return True
        if act == "adjust" and isinstance(p.get("delta"), int):
            self.award_side(p.get("side"), max(-5, min(5, p["delta"])))
            return True
        if act == "start" and self.phase == "lobby" and self.players:
            self.scores = {}
            self.seg_index = -1
            self.start_segment()
            return True
        if act == "go" and self.phase == "intro":
            self.phase = "play"
            self.notice = None
            self.seg.start()
            self.check_finished()
            return True
        if act == "next" and self.phase == "seg_end":
            self.start_segment()
            return True
        if act == "end_game" and self.phase in ("intro", "play", "seg_end"):
            self.phase, self.seg = "final", None
            return True
        if act == "lobby":
            self.phase, self.seg, self.seg_index, self.scores = "lobby", None, -1, {}
            return True
        if self.phase == "play" and self.seg:
            r = self.seg.host_action(act, p)
            self.check_finished()
            return r
        return False

    def player_action(self, pid, act, p):
        if pid not in self.players:
            return False
        if act == "team" and p.get("team") in ("A", "B") and self.phase == "lobby":
            self.players[pid]["team"] = p["team"]
            return True
        if self.phase == "play" and self.seg:
            r = self.seg.action(pid, act, p)
            self.check_finished()
            return r
        return False

    # ----- views -----
    def base_view(self):
        v = {"now": now(), "room": self.code, "phase": self.phase, "mode": self.mode,
             "team_names": self.team_names, "segments": self.segments, "seg_index": self.seg_index,
             "seg_key": self.seg.key if self.seg else None, "notice": self.notice,
             "players": [{"id": pid, "name": p["name"], "team": p["team"], "connected": p["connected"]}
                         for pid, p in self.players.items()],
             "scores": self.scoreboard()}
        if self.phase == "play" and self.seg:
            v["seg"] = self.seg.public()
        return v

    def broadcast(self):
        base = self.base_view()
        self.channels[self.host_token].push(json.dumps(dict(base, role="host"), ensure_ascii=False))
        for pid, pl in self.players.items():
            v = dict(base, role="player", me={"id": pid, "name": pl["name"], "team": pl["team"],
                                                  "side": self.side_of(pid)})
            if self.phase == "play" and self.seg:
                v["mine"] = self.seg.private(pid)
            self.channels[pid].push(json.dumps(v, ensure_ascii=False))


def ticker():
    while True:
        time.sleep(0.2)
        t = now()
        with LOCK:
            for code, room in list(ROOMS.items()):
                if t - room.touched > 6 * 3600:
                    del ROOMS[code]
                    continue
                if room.tick(t):
                    room.broadcast()
