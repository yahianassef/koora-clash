// Shared helpers: i18n, server connection, timers.

const I18N = {
  en: {
    brand: "Koora Clash", tagline: "The football trivia showdown for your outings",
    host_game: "Host a game", join_game: "Join a game", host_hint: "Open on a laptop or TV everyone can see",
    join_hint: "Open on your phone", room_code: "Room code", your_name: "Your name", join: "Join",
    join_at: "Join on your phone", or_scan: "or scan", players: "Players", no_players: "Waiting for players…",
    mode: "Mode", teams: "Teams", solo: "Every player for themself", team_a: "Team A", team_b: "Team B",
    team_name: "Team name", segments: "Segments", start: "Start the challenge", need_players: "At least one player must join",
    go: "Kick off", next: "Next segment", continue: "Continue", final_whistle: "Final whistle", end_game: "End game", back_lobby: "Back to lobby",
    skip: "Skip", score: "Score", scoreboard: "Scoreboard", winner: "Winner", draw: "It's a draw!",
    segment: "Segment", of: "of", pts: "pts", reconnecting: "Reconnecting…",
    pick_team: "Pick your team", you_are_in: "You're in!", wait_host: "Waiting for the host to start…",
    watch_screen: "Watch the big screen", send: "Send", type_answer: "Type your answer…",
    kicked: "You were removed from the room.", room_gone: "This room no longer exists.",
    name_taken: "That name is taken in this room.", no_room: "Room not found. Check the code.",
    move: "Move", kick: "Remove",
    seg_career: "Career Path", seg_rondo: "The Rondo", seg_spy: "The Spy", seg_password: "Password", seg_quickfire: "Quick Fire",
    rules_career: "Clubs appear one at a time. Type the player's name on your phone. The earlier you get it, the more points (5 → 1). A wrong guess locks you out for 3 seconds.",
    rules_rondo: "Take turns naming answers that fit the category — 12 seconds per turn. Run out of time and you lose a life (2 each). Last one standing wins 3 points. The host can accept answers the game didn't recognise.",
    rules_spy: "Everyone gets the same secret name on their phone — except the spy. Take turns giving one clue each, then vote. Catch the spy: +2 to every other side, unless the spy then guesses the name (+2 to the spy). Spy escapes: +3 to the spy's side.",
    rules_password_teams: "One player sees names on their phone and describes them without saying the name. Their team shouts guesses. 60 seconds, +1 per name.",
    rules_password_solo: "One player sees names on their phone and describes them. Everyone shouts guesses; the describer taps who got it — both get +1. 60 seconds each.",
    rules_quickfire: "Answer on your phone before time runs out. Fastest correct answer per side scores: 2 points within 5 seconds, otherwise 1.",
    question: "Question", worth: "worth", next_clue: "next club in", time_left: "time left",
    the_answer: "The answer", nobody: "Nobody got it", got_it: "got it",
    wrong_guesses: "Wrong guesses", locked: "Locked", your_turn: "YOUR TURN!", turn_of: "Turn:",
    lives: "lives", accept: "Accept", unrecognised: "Not recognised — accept?", said: "Said so far",
    remaining: "left to find", missed: "Answers nobody said", out: "OUT",
    ev_ok: "✔ accepted", ev_bad: "✖ not accepted", ev_dup: "⟲ already said", ev_timeout: "⏱ ran out of time",
    category: "Category", winners: "Survivors",
    check_phone: "Check your phone 🤫", check_phone_sub: "Don't let anyone see it!", speak_order: "Clue order",
    discuss: "Give one clue each, then discuss", start_vote: "Start voting", vote_now: "Vote on your phones",
    voted: "voted", spy_caught: "caught!", spy_guessing: "The spy is trying to guess the name…",
    spy_was: "The spy was", secret_was: "The secret name was", out_escaped: "The spy escaped! +3",
    out_caught: "Spy caught! +2 to the others", out_stole: "Caught — but guessed the name! +2 to the spy",
    spy_picked: "Spy guessed", votes: "votes", round: "Round",
    you_spy: "You are the SPY 🕵️", you_spy_sub: "Blend in. Figure out the name from the clues.",
    secret: "The secret name", tap_reveal: "Tap to reveal", tap_hide: "Tap to hide", vote_for: "Who is the spy?",
    you_voted: "Vote locked in", guess_name: "Guess the secret name!", spy_guess_wait: "The spy is guessing…",
    describes_for: "describes for", press_start: "press Start on their phone", start_turn: "Start my turn",
    correct: "Got it ✔", pass: "Pass", their_turn: "Other team's turn — no helping!", who_guessed: "Who guessed it?", guess_aloud: "Shout your guesses!",
    describing: "is describing", names_got: "Names guessed", passed: "Passed", you_describe: "You're describing!",
    get_ready: "Get ready — your team guesses", locked_in: "Locked in!", too_slow: "Time's up",
    right: "Correct!", wrong: "Wrong", answered: "answered", fastest: "fastest",
    spy_too_few: "The Spy needs at least 3 connected players — skipped.", host: "Host", play_again: "Play again",
    champions: "Champions", segment_over: "Segment over", connected: "online", offline: "offline",
    lang: "عربي", copy: "Copy link", copied: "Copied!", plus: "+1", minus: "−1",
  },
  ar: {
    brand: "تحدي الكورة", tagline: "تحدي معلومات الكورة للخروجات والقعدات",
    host_game: "ابدأ لعبة", join_game: "ادخل لعبة", host_hint: "افتحها على لابتوب أو شاشة الكل شايفها",
    join_hint: "افتحها من موبايلك", room_code: "كود الغرفة", your_name: "اسمك", join: "ادخل",
    join_at: "ادخل من موبايلك", or_scan: "أو امسح الكود", players: "اللاعبين", no_players: "مستنيين اللاعبين…",
    mode: "النظام", teams: "فرق", solo: "كل واحد لنفسه", team_a: "الفريق أ", team_b: "الفريق ب",
    team_name: "اسم الفريق", segments: "الفقرات", start: "يلا نبدأ التحدي", need_players: "لازم لاعب واحد على الأقل يدخل",
    go: "ابدأ", next: "الفقرة اللي بعدها", continue: "كمّل", final_whistle: "صافرة النهاية", end_game: "إنهاء اللعبة", back_lobby: "رجوع للبداية",
    skip: "تخطي", score: "النتيجة", scoreboard: "الترتيب", winner: "الفائز", draw: "تعادل!",
    segment: "الفقرة", of: "من", pts: "نقطة", reconnecting: "بنحاول نتصل تاني…",
    pick_team: "اختار فريقك", you_are_in: "انت جوه!", wait_host: "مستنيين المضيف يبدأ…",
    watch_screen: "بص على الشاشة الكبيرة", send: "ابعت", type_answer: "اكتب إجابتك…",
    kicked: "اتشلت من الغرفة.", room_gone: "الغرفة دي مبقتش موجودة.",
    name_taken: "الاسم ده مستخدم في الغرفة.", no_room: "الغرفة مش موجودة. اتأكد من الكود.",
    move: "نقل", kick: "شيل",
    seg_career: "مسيرة لاعب", seg_rondo: "الروندو", seg_spy: "الجاسوس", seg_password: "كلمة السر", seg_quickfire: "أسئلة سريعة",
    rules_career: "الأندية بتظهر واحد ورا التاني. اكتب اسم اللاعب على موبايلك. كل ما تعرفه أبدري كل ما تاخد نقط أكتر (٥ ← ١). الإجابة الغلط بتقفلك ٣ ثواني.",
    rules_rondo: "بالدور، كل واحد يقول إجابة تنفع للفئة — ١٢ ثانية لكل دور. لو الوقت خلص تخسر روح (لكل واحد روحين). آخر واحد يفضل يكسب ٣ نقط. المضيف يقدر يقبل إجابة اللعبة مفهمتهاش.",
    rules_spy: "الكل بياخد نفس الاسم السري على موبايله — ماعدا الجاسوس. كل واحد يقول تلميح واحد، وبعدين تصويت. لو مسكتوا الجاسوس: +٢ لكل الباقيين، إلا لو الجاسوس عرف الاسم (+٢ للجاسوس). لو الجاسوس هرب: +٣ لفريقه.",
    rules_password_teams: "لاعب واحد بيشوف أسامي على موبايله ويوصفها من غير ما يقول الاسم. فريقه يخمن بصوت عالي. ٦٠ ثانية، +١ لكل اسم.",
    rules_password_solo: "لاعب واحد بيشوف أسامي ويوصفها. الكل يخمن، والواصف يدوس على اللي عرف — الاتنين ياخدوا +١. ٦٠ ثانية لكل واحد.",
    rules_quickfire: "جاوب على موبايلك قبل الوقت ما يخلص. أسرع إجابة صح لكل فريق بتاخد: نقطتين لو في أول ٥ ثواني، غير كده نقطة.",
    question: "سؤال", worth: "بـ", next_clue: "النادي الجاي بعد", time_left: "الوقت الباقي",
    the_answer: "الإجابة", nobody: "محدش عرفها", got_it: "عرفها",
    wrong_guesses: "إجابات غلط", locked: "مقفول", your_turn: "دورك!", turn_of: "الدور على:",
    lives: "أرواح", accept: "اقبل", unrecognised: "مش متعرّفة — نقبلها؟", said: "اتقال لحد دلوقتي",
    remaining: "باقي", missed: "إجابات محدش قالها", out: "خرج",
    ev_ok: "✔ مقبولة", ev_bad: "✖ مش مقبولة", ev_dup: "⟲ اتقالت قبل كده", ev_timeout: "⏱ الوقت خلص",
    category: "الفئة", winners: "اللي فضلوا",
    check_phone: "بص على موبايلك 🤫", check_phone_sub: "محدش يشوفه!", speak_order: "ترتيب التلميحات",
    discuss: "كل واحد تلميح، وبعدين ناقشوا", start_vote: "ابدأ التصويت", vote_now: "صوتوا من موبايلاتكم",
    voted: "صوتوا", spy_caught: "اتمسك!", spy_guessing: "الجاسوس بيحاول يعرف الاسم…",
    spy_was: "الجاسوس كان", secret_was: "الاسم السري كان", out_escaped: "الجاسوس هرب! +٣",
    out_caught: "الجاسوس اتمسك! +٢ للباقيين", out_stole: "اتمسك — بس عرف الاسم! +٢ للجاسوس",
    spy_picked: "الجاسوس اختار", votes: "أصوات", round: "جولة",
    you_spy: "انت الجاسوس 🕵️", you_spy_sub: "اندمج معاهم واعرف الاسم من التلميحات.",
    secret: "الاسم السري", tap_reveal: "دوس عشان تشوف", tap_hide: "دوس عشان تخبي", vote_for: "مين الجاسوس؟",
    you_voted: "صوتك اتسجل", guess_name: "خمن الاسم السري!", spy_guess_wait: "الجاسوس بيخمن…",
    describes_for: "بيوصف لـ", press_start: "يدوس ابدأ على موبايله", start_turn: "ابدأ دوري",
    correct: "عرفوها ✔", pass: "عدّي", their_turn: "دور الفريق التاني — ممنوع المساعدة!", who_guessed: "مين عرفها؟", guess_aloud: "خمنوا بصوت عالي!",
    describing: "بيوصف", names_got: "أسامي اتعرفت", passed: "اتعدّت", you_describe: "انت اللي بتوصف!",
    get_ready: "جهز نفسك — فريقك هيخمن", locked_in: "إجابتك اتسجلت!", too_slow: "الوقت خلص",
    right: "صح!", wrong: "غلط", answered: "جاوبوا", fastest: "الأسرع",
    spy_too_few: "الجاسوس محتاج ٣ لاعبين متصلين على الأقل — اتخطت.", host: "المضيف", play_again: "العب تاني",
    champions: "الأبطال", segment_over: "الفقرة خلصت", connected: "متصل", offline: "مش متصل",
    lang: "English", copy: "انسخ اللينك", copied: "اتنسخ!", plus: "+١", minus: "−١",
  },
};

let LANG = (() => {
  try { const s = localStorage.getItem("kc_lang"); if (s) return s; } catch (e) {}
  return (navigator.language || "").startsWith("ar") ? "ar" : "en";
})();
let OFFSET = 0;
let RERENDER = () => {};

function t(k) { return (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k; }
function L(o) { if (o == null) return ""; if (typeof o === "string") return o; return o[LANG] || o.en || ""; }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function $(sel) { return document.querySelector(sel); }
function setHTML(el, html) { if (el._h !== html) { el.innerHTML = html; el._h = html; } }

function applyLang() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll("[data-tp]").forEach((el) => { el.placeholder = t(el.dataset.tp); });
}
function toggleLang() {
  LANG = LANG === "ar" ? "en" : "ar";
  try { localStorage.setItem("kc_lang", LANG); } catch (e) {}
  applyLang();
  RERENDER();
}

async function api(path, body) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  let data = {};
  try { data = await r.json(); } catch (e) {}
  return data;
}

function connect(room, cid, onState, onGone) {
  let es, fails = 0;
  const banner = $("#conn");
  const open = () => {
    es = new EventSource(`/events?room=${encodeURIComponent(room)}&cid=${encodeURIComponent(cid)}`);
    es.onmessage = (e) => {
      fails = 0;
      if (banner) banner.hidden = true;
      const s = JSON.parse(e.data);
      if (s.now) OFFSET = s.now * 1000 - Date.now();
      onState(s);
    };
    es.onerror = () => {
      if (banner) banner.hidden = false;
      fails++;
      if (fails > 4) {
        es.close();
        fetch(`/api/alive?room=${encodeURIComponent(room)}&cid=${encodeURIComponent(cid)}`)
          .then((r) => { if (r.status === 404) onGone(); else setTimeout(open, 2000); })
          .catch(() => setTimeout(open, 3000));
      }
    };
  };
  open();
}

// Countdown text + bars. Elements: <span data-deadline="epochSec"> or <div class="bar" data-deadline data-total><i></i></div>
function serverNow() { return Date.now() + OFFSET; }
setInterval(() => {
  const n = serverNow();
  document.querySelectorAll("[data-deadline]").forEach((el) => {
    const left = Math.max(0, el.dataset.deadline * 1000 - n);
    if (el.classList.contains("bar")) {
      const total = (+el.dataset.total || 10) * 1000;
      el.firstElementChild.style.width = Math.min(100, (left / total) * 100) + "%";
      el.classList.toggle("urgent", left < 4000);
    } else {
      el.textContent = Math.ceil(left / 1000);
      el.classList.toggle("urgent", left < 4000);
    }
  });
}, 100);

function timerBar(deadline, total) {
  if (!deadline) return "";
  return `<div class="bar" data-deadline="${deadline}" data-total="${total}"><i></i></div>`;
}
function timerNum(deadline) { return deadline ? `<span class="clock" data-deadline="${deadline}"></span>` : ""; }

function segTitle(key) { return t("seg_" + key); }
function segRules(key, mode) { return key === "password" ? t("rules_password_" + (mode === "teams" ? "teams" : "solo")) : t("rules_" + key); }
const SEG_ICON = { career: "🧭", rondo: "🔁", spy: "🕵️", password: "🗣️", quickfire: "⚡" };

function teamLabel(S, side) {
  if (side === "A" || side === "B") return (S.team_names && S.team_names[side]) || t("team_" + side.toLowerCase());
  const p = (S.players || []).find((x) => x.id === side);
  return p ? p.name : "?";
}
function sideClass(side) { return side === "A" ? "ta" : side === "B" ? "tb" : "ts"; }

function scoreRows(S) {
  return S.scores.map((r) => {
    const name = r.team ? teamLabel(S, r.team) : r.name;
    return { side: r.side, name, score: r.score, members: r.members, cls: sideClass(r.team || "") };
  });
}
