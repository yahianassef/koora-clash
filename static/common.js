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
    seg_who: "Who's the Player?", next_clue_in: "next clue in",
    rules_who: "\"I played for only three clubs…\" Clues appear one at a time, hardest first. Type the player on your phone — the fewer clues shown, the more points (6 → 1). A wrong guess locks you out for 3 seconds.",
    seg_career: "Career Path", seg_rondo: "The Rondo", seg_spy: "The Spy", seg_password: "Password", seg_quickfire: "Quick Fire",
    rules_career: "Clubs appear one at a time. Type the player's name on your phone. The earlier you get it, the more points (5 → 1). A wrong guess locks you out for 3 seconds.",
    rules_rondo: "Take turns naming answers that fit the category — 12 seconds per turn. Run out of time and you lose a life (2 each). Last one standing wins 3 points. The host can accept answers the game didn't recognise.",
    rules_spy: "Everyone gets the same secret name on their phone — except the spy. Take turns giving one clue each, then vote. Catch the spy: +2 to every other side, unless the spy then guesses the name (+2 to the spy). Spy escapes: +3 to the spy's side.",
    rules_password_teams: "One player sees names on their phone and describes them without saying the name. Their team shouts guesses. 60 seconds, +1 per name.",
    rules_password_solo: "One player sees names on their phone and describes them. Everyone shouts guesses; the describer taps who got it — both get +1. 60 seconds each.",
    rules_quickfire: "Answer on your phone before time runs out. Fastest correct answer per side scores: 2 points within 5 seconds, otherwise 1.",
    question: "Question", worth: "worth", now: "now", next_clue: "next club in", time_left: "time left",
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
    tab_party: "Play with friends", tab_solo: "Play solo", party_hint: "One screen everyone watches, phones as buzzers",
    solo_hint: "Quick challenges on your own — beat your best",
    g_nameall: "Name Them All", g_nameall_d: "Sporcle-style: name every answer before the clock runs out.",
    g_career: "Career Path", g_career_d: "Guess the player from his clubs. Fewer clubs = more points.",
    g_survival: "Survival Quiz", g_survival_d: "Endless questions, 10 seconds each, 3 lives. How far can you go?",
    g_mystery: "Who's the Player?", g_mystery_d: "\"I played for only three clubs…\" Guess from the clues — the fewer you need, the more you score.",
    who_is_it: "Who am I?", difficulty: "Difficulty", who_level_opt: "Who's the Player? difficulty:", lvl_easy: "Easy", lvl_amateur: "Amateur", lvl_pro: "Pro", lvl_legend: "Legend", next_clue_btn: "Next clue", clues_left: "more clues — each one costs a point", got_him: "Got him with",
    clue_one: "clue", clues_many: "clues", see_score: "See my score",
    best: "Best", play: "Play", give_up: "Give up", again: "Play again", menu: "All games", found: "found",
    choose_cat: "Pick a category", random_cat: "Random category", time_up: "Time's up!", you_got: "You got",
    reveal_next: "Show next club", guesses_left: "guesses left", round_of: "Player", total: "Total",
    streak: "Streak", lives_left: "Lives", game_over: "Game over", new_best: "New best! 🎉",
    daily: "Daily player", random: "Random player", guess_player: "Type a player…", nation: "Nation",
    position: "Pos", born: "Born", clubs_shared: "Shared clubs", solved: "Got him in", tries: "tries",
    it_was: "It was", unknown_player: "Not in the player list — pick a suggestion", already_guessed: "Already guessed",
    pos_GK: "GK", pos_DF: "DEF", pos_MF: "MID", pos_FW: "FWD", next_player: "Next player", skip_player: "Skip",
    eyebrow: "Football trivia · Arabic & English", hero_a: "Think you know ball?", hero_b: "Prove it.",
    hero_sub: "Party games for your next outing, solo challenges for every spare minute. Built for real fans.",
    cta_host: "Host a party game", cta_solo: "Play solo", stat_career: "career paths", stat_cats: "quiz categories",
    stat_q: "questions", stat_players: "players", daily_title: "Today's Mystery Player is waiting",
    daily_sub: "Can you name him from the first clue?", party_title: "With friends", solo_title: "On your own",
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
    seg_who: "مين اللاعب؟", next_clue_in: "التلميح الجاي بعد",
    rules_who: "\"لعبت لـ٣ أندية بس…\" التلميحات بتظهر واحد ورا التاني، من الأصعب للأسهل. اكتب اسم اللاعب على موبايلك — كل ما تعرفه بتلميحات أقل، نقطك أكتر (٦ ← ١). الإجابة الغلط بتقفلك ٣ ثواني.",
    seg_career: "مسيرة لاعب", seg_rondo: "الروندو", seg_spy: "الجاسوس", seg_password: "كلمة السر", seg_quickfire: "أسئلة سريعة",
    rules_career: "الأندية بتظهر واحد ورا التاني. اكتب اسم اللاعب على موبايلك. كل ما تعرفه أبدري كل ما تاخد نقط أكتر (٥ ← ١). الإجابة الغلط بتقفلك ٣ ثواني.",
    rules_rondo: "بالدور، كل واحد يقول إجابة تنفع للفئة — ١٢ ثانية لكل دور. لو الوقت خلص تخسر روح (لكل واحد روحين). آخر واحد يفضل يكسب ٣ نقط. المضيف يقدر يقبل إجابة اللعبة مفهمتهاش.",
    rules_spy: "الكل بياخد نفس الاسم السري على موبايله — ماعدا الجاسوس. كل واحد يقول تلميح واحد، وبعدين تصويت. لو مسكتوا الجاسوس: +٢ لكل الباقيين، إلا لو الجاسوس عرف الاسم (+٢ للجاسوس). لو الجاسوس هرب: +٣ لفريقه.",
    rules_password_teams: "لاعب واحد بيشوف أسامي على موبايله ويوصفها من غير ما يقول الاسم. فريقه يخمن بصوت عالي. ٦٠ ثانية، +١ لكل اسم.",
    rules_password_solo: "لاعب واحد بيشوف أسامي ويوصفها. الكل يخمن، والواصف يدوس على اللي عرف — الاتنين ياخدوا +١. ٦٠ ثانية لكل واحد.",
    rules_quickfire: "جاوب على موبايلك قبل الوقت ما يخلص. أسرع إجابة صح لكل فريق بتاخد: نقطتين لو في أول ٥ ثواني، غير كده نقطة.",
    question: "سؤال", worth: "بـ", now: "الآن", next_clue: "النادي الجاي بعد", time_left: "الوقت الباقي",
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
    tab_party: "العب مع صحابك", tab_solo: "العب لوحدك", party_hint: "شاشة واحدة الكل بيتفرج عليها، والموبايلات للإجابة",
    solo_hint: "تحديات سريعة لوحدك — اكسر رقمك القياسي",
    g_nameall: "سمّيهم كلهم", g_nameall_d: "زي سبوركل: قول كل الإجابات قبل الوقت ما يخلص.",
    g_career: "مسيرة لاعب", g_career_d: "اعرف اللاعب من أنديته. كل ما تعرفه بأندية أقل، نقطك أكتر.",
    g_survival: "تحدي البقاء", g_survival_d: "أسئلة ورا بعض، ١٠ ثواني لكل سؤال، و٣ أرواح. هتوصل لفين؟",
    g_mystery: "مين اللاعب؟", g_mystery_d: "\"لعبت لـ٣ أندية بس…\" اعرفه من التلميحات — كل ما تحتاج تلميحات أقل، نقطك أكتر.",
    who_is_it: "أنا مين؟", difficulty: "الصعوبة", who_level_opt: "صعوبة مين اللاعب؟:", lvl_easy: "سهل", lvl_amateur: "هاوي", lvl_pro: "محترف", lvl_legend: "أسطورة", next_clue_btn: "التلميح اللي بعده", clues_left: "تلميحات كمان — كل واحد بنقطة", got_him: "عرفته من",
    clue_one: "تلميح", clues_many: "تلميحات", see_score: "شوف نتيجتي",
    best: "أحسن رقم", play: "العب", give_up: "استسلم", again: "العب تاني", menu: "كل الألعاب", found: "عرفتهم",
    choose_cat: "اختار فئة", random_cat: "فئة عشوائية", time_up: "الوقت خلص!", you_got: "جبت",
    reveal_next: "وريني النادي اللي بعده", guesses_left: "محاولات باقية", round_of: "لاعب", total: "المجموع",
    streak: "السلسلة", lives_left: "الأرواح", game_over: "خلصت اللعبة", new_best: "رقم قياسي جديد! 🎉",
    daily: "لاعب النهارده", random: "لاعب عشوائي", guess_player: "اكتب اسم لاعب…", nation: "الجنسية",
    position: "المركز", born: "مواليد", clubs_shared: "أندية مشتركة", solved: "عرفته في", tries: "محاولات",
    it_was: "كان", unknown_player: "اللاعب مش في القايمة — اختار من الاقتراحات", already_guessed: "جربته قبل كده",
    pos_GK: "حارس", pos_DF: "دفاع", pos_MF: "وسط", pos_FW: "هجوم", next_player: "اللاعب اللي بعده", skip_player: "تخطي",
    eyebrow: "تحدي معلومات كورة · عربي وإنجليزي", hero_a: "فاكر نفسك فاهم كورة؟", hero_b: "ورّينا شطارتك.",
    hero_sub: "ألعاب جماعية لخروجتك الجاية، وتحديات لوحدك لأي وقت فاضي. معمولة للفانز الحقيقيين.",
    cta_host: "ابدأ تحدي جماعي", cta_solo: "العب لوحدك", stat_career: "مسيرة لاعب", stat_cats: "فئة أسئلة",
    stat_q: "سؤال", stat_players: "لاعب", daily_title: "لاعب النهارده مستنيك",
    daily_sub: "تقدر تعرفه من أول تلميح؟", party_title: "مع صحابك", solo_title: "لوحدك",
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
  document.querySelectorAll("[data-icon]").forEach((el) => { if (!el.firstChild) el.innerHTML = icon(el.dataset.icon); });
}
function toggleLang() {
  LANG = LANG === "ar" ? "en" : "ar";
  try { localStorage.setItem("kc_lang", LANG); } catch (e) {}
  applyLang();
  RERENDER();
}

// Phones talk to the host screen's browser directly (WebRTC via PeerJS); the room code is the host's peer id.
const PEER_PREFIX = "kooraclash-v1-";
function peerId(code) { return PEER_PREFIX + code.toUpperCase(); }
function showConn(down) { const b = $("#conn"); if (b) b.hidden = !down; }

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
// Line icons (24×24, stroke = currentColor). Size them with font-size.
const ICON_PATHS = {
  ball: '<circle cx="12" cy="12" r="9.5"/><path d="m12 7.2 4.1 3-1.6 4.8h-5l-1.6-4.8z"/><path d="M12 2.5v4.7M16.1 10.2l4.6-1.6M14.5 15l2.8 4M9.5 15l-2.8 4M7.9 10.2 3.3 8.6"/>',
  career: '<path d="M5 19c5 0 3-7 7-7s2-7 7-7"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="5" r="2.2"/>',
  rondo: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 3.5v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20.5v-5h5"/>',
  spy: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.2"/>',
  password: '<path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1.5-4.8A8.5 8.5 0 1 1 21 11.5z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
  quickfire: '<path d="M13.5 2.5 4.5 14h7l-1 7.5 9-11.5h-7z"/>',
  nameall: '<path d="M10 6.5h10M10 12h10M10 17.5h10"/><path d="m3.5 6.5 1.6 1.6L8 5.2M3.5 12l1.6 1.6L8 10.7M3.5 17.5l1.6 1.6L8 16.2"/>',
  survival: '<path d="M20.6 5.2a5.3 5.3 0 0 0-7.6 0L12 6.3l-1-1.1a5.3 5.3 0 0 0-7.6 7.5L12 21.3l8.6-8.6a5.3 5.3 0 0 0 0-7.5z"/>',
  mystery: '<circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.7.3-1.2 1-1.2 1.8v.6"/><path d="M12 17.3h.01"/>',
  tv: '<rect x="2.5" y="4.5" width="19" height="13" rx="2.5"/><path d="M8 21h8M12 17.5V21"/>',
  phone: '<rect x="6.5" y="2" width="11" height="20" rx="2.5"/><path d="M11 18.2h2"/>',
  trophy: '<path d="M8 21h8M12 16.5V21M7 3.5h10v5.5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3.5 3.5 0 0 1-3.3 3.5M7 5H4v2a3.5 3.5 0 0 0 3.3 3.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  fire: '<path d="M12 22c4.1 0 7-2.9 7-6.8 0-4.6-4.2-6.6-4.6-12.2C11.2 5 10 8 10 10c-1-.8-1.8-2-2-3.6C6 8.3 5 11.3 5 15.2 5 19.1 7.9 22 12 22z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01"/>',
};
function icon(name, cls) {
  return `<svg class="i ${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}
// Numbered clue rows for Who's the Player?; the newest one is highlighted while clues are still coming.
function whoClues(clues, live) {
  return clues.map((c, i) => `<div class="clue${live && i === clues.length - 1 ? " new" : ""}"><span class="n">${i + 1}</span><span>${esc(L(c))}</span></div>`).join("");
}
const SEG_ICON = { career: icon("career"), who: icon("mystery"), rondo: icon("rondo"), spy: icon("spy"), password: icon("password"), quickfire: icon("quickfire") };

// Coloured game tile used on the landing page and the solo menu.
function soloTile(k, best, attrs, tag) {
  tag = tag || "a";
  return `<${tag} class="sologame c-${k}" ${attrs}><div class="ico">${icon(k)}</div><h3>${esc(t("g_" + k))}</h3>
    <div class="muted">${esc(t("g_" + k + "_d"))}</div>${best != null ? `<span class="chip">${icon("trophy")} ${t("best")}: ${best}</span>` : ""}
    <span class="go">${t("play")} ${icon("arrow")}</span><span class="bg">${icon(k)}</span></${tag}>`;
}
function getBestScore(k) {
  try {
    const lv = localStorage.getItem("kc_who_level") || "pro";
    return JSON.parse(localStorage.getItem("kc_best") || "{}")[k === "nameall" ? "nameall_total" : k === "mystery" ? "mystery_pts_" + lv : k];
  } catch (e) { return undefined; }
}

// ---------- feedback: hype toasts, confetti, shake ----------
const HYPE = {
  en: { ok: ["Golazo!", "Top bins!", "What a finish!", "Class!", "Clinical!", "World class!"],
        bad: ["So close!", "Unlucky!", "Shake it off!", "Next one's yours!", "Keep going!"] },
  ar: { ok: ["جووول!", "يا سلام!", "عالمي!", "إيه الحلاوة دي!", "مية مية!", "أسطورة!"],
        bad: ["قريبة!", "معلش!", "ولا يهمك!", "الجاية بتاعتك!", "كمّل!"] },
};
function hype(kind) { const l = (HYPE[LANG] || HYPE.en)[kind]; return l[Math.floor(Math.random() * l.length)]; }
function toast(text, kind) {
  let box = document.getElementById("toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
// Replay the entrance animation on el when the screen it shows changes (not on every state tick).
function enterOnChange(el, key) {
  if (el._enterKey === key) return;
  el._enterKey = key;
  el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter");
}
function screenKey(S) {
  const g = S.seg || {};
  return [S.phase, S.seg_key, g.state, g.qi, g.ci, g.ri, g.ti].join("|");
}
function shake(el) { if (!el) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
function confetti(power) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas");
  cv.id = "confetti";
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const colors = ["#c8ff2e", "#22d3ee", "#ff3d71", "#8b5cf6", "#fde047", "#ffffff"];
  const n = Math.round(140 * (power || 1));
  const parts = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * innerWidth * .3, y: innerHeight * .35,
    vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 5, r: Math.random() * 6 + 4,
    rot: Math.random() * 6, vr: (Math.random() - .5) * .4, c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
    }
    if (t - t0 < 2600) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

// Club crests (data/clubs.json: English club name -> image URL). Missing crests fall back to initials.
let CLUB_LOGOS = {};
fetch("data/clubs.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => { CLUB_LOGOS = d; }).catch(() => {});

function clubInitials(name) {
  const w = String(name).replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || "?").slice(0, 2)).toUpperCase();
}
function fmtYears(y) { return y ? (y.endsWith("–") ? y + t("now") : y) : ""; }
// Pass seen=true for clubs already on screen so only the newest one animates in.
function clubCard(c, seen) {
  const logo = CLUB_LOGOS[c.en];
  return `<span class="club${seen ? " seen" : ""}"><span class="crest">${esc(clubInitials(c.en))}${logo
    ? `<img src="${esc(logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</span>
    <span class="cinfo"><span>${esc(L(c))}</span>${c.years ? `<small>${esc(fmtYears(c.years))}</small>` : ""}</span></span>`;
}

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
