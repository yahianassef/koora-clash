"""Check data/questions.json and data/players.json before committing new content.

Usage:  python tools/validate_questions.py
Exits non-zero and lists problems if anything is wrong. Also prints bank size.
"""
import json
import os
import re
import sys
import unicodedata

_AR_MARKS = re.compile("[ً-ْٰـ]")
_AR_MAP = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي", "گ": "ج", "چ": "ج"})


def norm(text):
    """Same normalisation the game uses (static/game.js) for answer matching and duplicate checks."""
    s = _AR_MARKS.sub("", text.strip().lower()).translate(_AR_MAP)
    s = "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))
    words = [w[2:] if w.startswith("ال") and len(w) > 4 else w for w in re.split(r"[\s\-_.']+", s)]
    return re.sub(r"[^\w]|_", "", "".join(words))


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "data", "questions.json")
PLAYERS_PATH = os.path.join(ROOT, "data", "players.json")
CONTINENTS = {"europe", "south_america", "north_america", "africa", "asia", "oceania"}


def bilingual(x):
    return isinstance(x, dict) and isinstance(x.get("en"), str) and x["en"].strip() \
        and isinstance(x.get("ar"), str) and x["ar"].strip()


def main():
    errors = []
    with open(PATH, encoding="utf-8") as f:
        data = json.load(f)
    for key in ("career", "rondo", "words", "quickfire"):
        if not isinstance(data.get(key), list) or not data[key]:
            errors.append(f"'{key}' must be a non-empty list")
    if errors:
        print("\n".join(errors))
        return 1

    seen = set()
    for i, q in enumerate(data["career"]):
        tag = f"career[{i}]"
        if not bilingual(q.get("answer")):
            errors.append(f"{tag}: answer needs en+ar")
            continue
        if not isinstance(q.get("aliases"), list):
            errors.append(f"{tag}: aliases must be a list")
        clubs = q.get("clubs") or []
        if len(clubs) < 3 or not all(bilingual(c) for c in clubs):
            errors.append(f"{tag}: needs 3+ clubs, each with en+ar")
        k = norm(q["answer"]["en"])
        if k in seen:
            errors.append(f"{tag}: duplicate player {q['answer']['en']}")
        seen.add(k)

    seen = set()
    for i, c in enumerate(data["rondo"]):
        tag = f"rondo[{i}]"
        if not bilingual(c.get("prompt")):
            errors.append(f"{tag}: prompt needs en+ar")
            continue
        answers = c.get("answers") or []
        if len(answers) < 5:
            errors.append(f"{tag}: needs 5+ answers so a round lasts")
        names = set()
        for j, a in enumerate(answers):
            if not bilingual(a) or not isinstance(a.get("aliases"), list):
                errors.append(f"{tag}.answers[{j}]: needs en, ar and an aliases list")
                continue
            if norm(a["en"]) in names:
                errors.append(f"{tag}: duplicate answer {a['en']}")
            names.add(norm(a["en"]))
        k = norm(c["prompt"]["en"])
        if k in seen:
            errors.append(f"{tag}: duplicate category {c['prompt']['en']}")
        seen.add(k)

    seen = set()
    for i, w in enumerate(data["words"]):
        if not bilingual(w):
            errors.append(f"words[{i}]: needs en+ar")
            continue
        if norm(w["en"]) in seen:
            errors.append(f"words[{i}]: duplicate {w['en']}")
        seen.add(norm(w["en"]))

    seen = set()
    for i, q in enumerate(data["quickfire"]):
        tag = f"quickfire[{i}]"
        opts = q.get("options") or []
        if not bilingual(q.get("q")) or len(opts) != 4 or not all(bilingual(o) for o in opts):
            errors.append(f"{tag}: needs a bilingual q and exactly 4 bilingual options (first = correct)")
            continue
        if len({norm(o["en"]) for o in opts}) != 4:
            errors.append(f"{tag}: options must be distinct")
        if "img" in q and not str(q["img"]).startswith("https://"):
            errors.append(f"{tag}: img must be an https URL")
        k = norm(q["q"]["en"]) + "|" + str(q.get("img", ""))
        if k in seen:
            errors.append(f"{tag}: duplicate question {q['q']['en']}")
        seen.add(k)

    with open(PLAYERS_PATH, encoding="utf-8") as f:
        pdata = json.load(f)
    nations = pdata.get("nations", {})
    for code, n in nations.items():
        if not bilingual(n) or n.get("continent") not in CONTINENTS:
            errors.append(f"nations.{code}: needs en, ar and continent in {sorted(CONTINENTS)}")
    seen = set()
    for i, p in enumerate(pdata.get("players", [])):
        tag = f"players[{i}]"
        if not bilingual(p.get("name")):
            errors.append(f"{tag}: name needs en+ar")
            continue
        if p.get("nation") not in nations:
            errors.append(f"{tag}: nation '{p.get('nation')}' missing from nations")
        if p.get("pos") not in ("GK", "DF", "MF", "FW"):
            errors.append(f"{tag}: pos must be GK/DF/MF/FW")
        if not isinstance(p.get("born"), int) or not 1900 < p["born"] < 2015:
            errors.append(f"{tag}: born must be a year")
        if not p.get("clubs") or not all(isinstance(c, str) for c in p["clubs"]):
            errors.append(f"{tag}: clubs must be a non-empty list of English club names")
        if not isinstance(p.get("aliases"), list):
            errors.append(f"{tag}: aliases must be a list")
        if norm(p["name"]["en"]) in seen:
            errors.append(f"{tag}: duplicate player {p['name']['en']}")
        seen.add(norm(p["name"]["en"]))

    if errors:
        print(f"{len(errors)} problem(s):")
        print("\n".join("  - " + e for e in errors))
        return 1
    print(f"OK  career={len(data['career'])}  rondo={len(data['rondo'])}  "
          f"words={len(data['words'])}  quickfire={len(data['quickfire'])}  players={len(pdata['players'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
