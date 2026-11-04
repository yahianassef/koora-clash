"""Check data/questions.json before committing new questions.

Usage:  python tools/validate_questions.py
Exits non-zero and lists problems if anything is wrong. Also prints bank size.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from game import norm  # noqa: E402

PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "questions.json")


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

    if errors:
        print(f"{len(errors)} problem(s):")
        print("\n".join("  - " + e for e in errors))
        return 1
    print(f"OK  career={len(data['career'])}  rondo={len(data['rondo'])}  "
          f"words={len(data['words'])}  quickfire={len(data['quickfire'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
