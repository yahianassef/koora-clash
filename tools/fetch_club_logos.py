"""Fill data/clubs.json with a crest URL for every club named in the content files.

Usage:  python tools/fetch_club_logos.py
Looks up only clubs that aren't in data/clubs.json yet, using TheSportsDB's free
API (test key "123", ~30 requests/minute), and prints anything it couldn't find.
For a club it gets wrong or misses, set the URL by hand in data/clubs.json, or add
a better search name / country to QUERY / COUNTRY below and delete its entry.
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLUBS = os.path.join(ROOT, "data", "clubs.json")
API = "https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t="

# Search name when it differs from the name used in our content.
QUERY = {
    "Inter": "Inter Milan", "Paris Saint-Germain": "Paris Saint Germain", "Al Ahli": "Al Ahli Jeddah",
    "Atlético Madrid": "Atletico Madrid", "Al Mokawloon": "Al Mokawloon", "Malmö": "Malmo",
    "Grêmio": "Gremio", "Fenerbahçe": "Fenerbahce", "Beşiktaş": "Besiktas", "Leganés": "Leganes",
    "Inter Zaprešić": "Inter Zapresic", "São Paulo": "Sao Paulo", "Querétaro": "Queretaro",
    "Lech Poznań": "Lech Poznan", "Znicz Pruszków": "Znicz Pruszkow", "St. Pauli": "St Pauli",
    "Atlético Mineiro": "Atletico Mineiro", "Al Ittihad": "Al Ittihad Club", "Al Hilal": "Al Hilal Saudi",
    "Al Nassr": "Al Nassr", "Al Shamal": "Al Shamal", "Al Sadd": "Al Sadd", "Al Jazira": "Al Jazira",
    "Bolton": "Bolton Wanderers", "West Brom": "West Bromwich Albion", "Tottenham": "Tottenham Hotspur",
    "Leicester City": "Leicester City", "Montreal Impact": "CF Montreal", "Anzhi": "Anzhi Makhachkala",
    "Zrinjski Mostar": "Zrinjski", "Shanghai Shenhua": "Shanghai Shenhua", "Mumbai City": "Mumbai City",
    "Nacional": "Nacional Montevideo", "Karlsruher SC": "Karlsruher SC", "Werder Bremen": "Werder Bremen",
    "Bayer Leverkusen": "Bayer Leverkusen", "Borussia Dortmund": "Borussia Dortmund",
    "RB Salzburg": "Red Bull Salzburg", "Eintracht Frankfurt": "Eintracht Frankfurt",
}
# Country to prefer when several teams share a name.
COUNTRY = {
    "Nacional": "Uruguay", "Al Ahli": "Saudi Arabia", "Al Ittihad": "Saudi Arabia", "Al Hilal": "Saudi Arabia",
    "Al Nassr": "Saudi Arabia", "Al Shamal": "Qatar", "Al Sadd": "Qatar", "Qatar SC": "Qatar",
    "Al Jazira": "United Arab Emirates", "Baniyas": "United Arab Emirates", "Emirates Club": "United Arab Emirates",
    "Al Mokawloon": "Egypt", "Al Ahly": "Egypt", "Tersana": "Egypt", "Wadi Degla": "Egypt",
    "River Plate": "Argentina", "Inter": "Italy", "Valencia": "Spain", "Santos": "Brazil", "Celtic": "Scotland",
    "Everton": "England", "Monaco": "France", "Sporting CP": "Portugal", "Millonarios": "Colombia",
}


def content_clubs():
    names = []
    with open(os.path.join(ROOT, "data", "questions.json"), encoding="utf-8") as f:
        for q in json.load(f)["career"]:
            names += [c["en"] for c in q["clubs"]]
    with open(os.path.join(ROOT, "data", "players.json"), encoding="utf-8") as f:
        for p in json.load(f)["players"]:
            names += p["clubs"]
    return sorted(set(names))


def lookup(name):
    url = API + urllib.parse.quote(QUERY.get(name, name))
    req = urllib.request.Request(url, headers={"User-Agent": "koora-clash-logo-fetch"})
    with urllib.request.urlopen(req, timeout=20) as r:
        teams = json.load(r).get("teams") or []
    teams = [t for t in teams if t.get("strSport") == "Soccer" and t.get("strGender", "Male") != "Female" and t.get("strBadge")
             and not re.search(r"\b(U\d\d|Women|Reserves|II|B)$", t.get("strTeam", ""))]
    want = COUNTRY.get(name)
    if want:
        # A same-name club in another country is worse than no crest at all.
        teams = [t for t in teams if t.get("strCountry") == want]
    return teams[0] if teams else None


def main():
    try:
        with open(CLUBS, encoding="utf-8") as f:
            logos = json.load(f)
    except (OSError, ValueError):
        logos = {}
    missing = []
    for name in content_clubs():
        if name in logos:
            continue
        try:
            team = lookup(name)
        except Exception as e:  # network hiccup or rate limit: leave it for the next run
            print(f"  ! {name}: {e}")
            time.sleep(5)
            continue
        if team:
            logos[name] = team["strBadge"]
            print(f"  + {name}  ->  {team['strTeam']} ({team.get('strCountry')})")
        else:
            missing.append(name)
        time.sleep(2.2)
    with open(CLUBS, "w", encoding="utf-8") as f:
        json.dump(dict(sorted(logos.items())), f, ensure_ascii=False, indent=2)
    print(f"{len(logos)} clubs with logos; not found: {', '.join(missing) or 'none'}")


if __name__ == "__main__":
    main()
