# Koora Clash · تحدي الكورة

A football-trivia party game for outings, inspired by Sabaho Koora's *صباحو تحدي* show.
One screen (laptop/TV) is the studio; everyone plays from their phone. Arabic + English.

## Run it

Needs only Python 3.10+ (no packages to install).

```bash
python server.py
```

- Host screen: open `http://localhost:8000/host` on the laptop connected to the TV.
- Players: scan the QR code on the host screen, or open the `/play` link it shows. Phones must be on the same Wi-Fi.
- Windows may ask to allow Python through the firewall the first time — allow it on private networks, or phones can't connect.

## Modes

- **Teams** — two teams (name them anything, e.g. Team Nasouhi vs Team Marei). Players pick a side on their phone; the host can move them.
- **Every player for themself** — solo scoring for each player.

## Segments

| Segment | How it plays |
|---|---|
| 🧭 Career Path · مسيرة لاعب | Clubs appear one by one; first to type the player wins 5→1 points. |
| 🔁 The Rondo · الروندو | Take turns naming answers in a category (World Cup winners, Egyptians in the PL…). 12s per turn, 2 lives. The host can accept answers the game didn't recognise. |
| 🕵️ The Spy · الجاسوس | Everyone sees the same name except the spy. Clues, then a phone vote. Needs 3+ players. |
| 🗣️ Password · كلمة السر | One player describes names on their phone; their team shouts guesses. 60s per turn. |
| ⚡ Quick Fire · أسئلة سريعة | Multiple choice, including flags. Fastest correct answer per side scores. |

The host picks which segments to play in the lobby, can skip anything, and can nudge scores with +/−.

## Questions

All content lives in `data/questions.json` (bilingual). For `quickfire`, the **first option is the correct one** — options are shuffled at play time. Add `aliases` to help the answer matcher (it already ignores accents, Arabic hamza/taa-marbuta variants, "ال", and small typos).

Facts were written to be accurate as of mid-2026; review them before a big night out.

Before committing changes to the bank, run the validator (schema, bilingual fields, duplicates):

```bash
python tools/validate_questions.py
```

Games favour questions that haven't been played yet on that machine. Play counts are kept in `data/history.json` (not committed); delete it to reset.

The bank grows daily: a scheduled Claude task adds new, fact-checked questions, validates them, and pushes to this repo.
