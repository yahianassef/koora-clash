# Koora Clash · تحدي الكورة

Football trivia for outings and for killing time alone, inspired by Sabaho Koora's *صباحو تحدي* show,
Sporcle quizzes and playfootballgames.com. Arabic + English.

**Play:** https://yahianassef.github.io/koora-clash/

## Play with friends (party)

One screen (laptop/TV) is the studio; everyone plays from their phone.

1. Open the site on the laptop → **Play with friends** → **Host a game**.
2. Everyone scans the QR code (or opens the site → **Join a game** and types the 4-letter room code).

Phones connect straight to the host's browser over WebRTC (via the free PeerJS relay), so there's no server to run. Same Wi-Fi is most reliable; phones on mobile data usually work too, but some carrier networks block direct WebRTC connections. Keep the host tab open and in front — it *is* the game. Refreshing it keeps the game and phones reconnect on their own.

Modes: **Teams** (two named teams) or **every player for themself**.

| Segment | How it plays |
|---|---|
| 🧭 Career Path · مسيرة لاعب | Clubs appear one by one; first to type the player wins 5→1 points. |
| ❓ Who's the Player? · مين اللاعب؟ | First-person clues appear one by one, hardest first; first to type the player wins 7→1 points. |
| 🔁 The Rondo · الروندو | Take turns naming answers in a category. 12s per turn, 2 lives. The host can accept answers the game didn't recognise. |
| 🕵️ The Spy · الجاسوس | Everyone sees the same name except the spy. Clues, then a phone vote. Needs 3+ players. |
| 🗣️ Password · كلمة السر | One player describes names on their phone; their team shouts guesses. 60s per turn. |
| ⚡ Quick Fire · أسئلة سريعة | Multiple choice, including flags. Fastest correct answer per side scores. |

## Play solo

| Game | How it plays |
|---|---|
| 📝 Name Them All · سمّيهم كلهم | Sporcle-style: type every answer in a category before the clock runs out. |
| 🧭 Career Path · مسيرة لاعب | Guess 5 players from their clubs; each wrong guess or hint reveals another club. |
| ❤️ Survival Quiz · تحدي البقاء | Endless multiple choice, 10s each, 3 lives. Chase your best streak. |
| ❓ Who's the Player? · مين اللاعب؟ | "I played for only three clubs…" — clues are revealed hardest first; a wrong guess or *Next clue* reveals another, and the fewer you need the more you score. Daily player or a 5-player random round. |

Best scores are saved on the device.

## Run locally

Any static file server works, e.g.

```bash
python -m http.server 8000
```

then open http://localhost:8000 (needs internet for the PeerJS relay, fonts and the QR code library).

## Content

- `data/questions.json` — career paths, Rondo categories, Spy/Password names and Quick Fire questions. For `quickfire`, the **first option is the correct one** (options are shuffled at play time).
- Career paths list each club with the `years` the player spent there ("2001–2004", "2015", or "2017–" if he's still there).
- `data/clubs.json` — club name → crest image URL (from TheSportsDB). Run `python tools/fetch_club_logos.py` after adding clubs; clubs without a crest show their initials.
- `data/players.json` — players (nation code, position GK/DF/MF/FW, birth year, English club names) plus the `nations` table. Players with a `clues` list (5–8 first-person clues, hardest first, each {en, ar}) appear in Who's the Player?.

Add `aliases` to help the answer matcher (it already ignores accents, Arabic hamza/taa-marbuta variants, "ال", and small typos). Run the validator before committing:

```bash
python tools/validate_questions.py
```

Games favour questions that device hasn't played yet. The bank grows daily: a scheduled Claude task adds new, fact-checked content, validates it, and pushes to this repo — GitHub Pages redeploys automatically.
