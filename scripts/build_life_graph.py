"""Build the life-graph dataset (nodes/edges + per-node stats) from data/toggl.db.

Deterministic: same DB in, same JSON out. Output: data/life-graph.json
"""
from __future__ import annotations
import sqlite3, re, json, collections, itertools, math
from pathlib import Path

DB = Path("data/toggl.db")
OUT = Path("data/life-graph.json")

STOP = set("""the a an and or of to to in on for with at by from is are was were be been being it its this that these those i my me mine we our you your he she they them as up out off no not do did does done get got go going gone new more most all any some very just about into over under after before then than so if but re vs via per etc am pm hrs hr hour hours min mins minutes day days week weeks month months year years time times again still also can could would should will may might must have has had also one two three first second next last other another each both few many much lot lots thing things stuff way ways make made making take took taken give gave put set use used using try tried keep kept let back down out here there when where which who what how why now today tomorrow yesterday morning evening night afternoon good great nice ok okay bad done completed complete finish finished start started begin began end ended continue continued quick short long early late final update updated check checked review reviewed plan planning planned prep prepare work working worked task tasks daily weekly monthly session sessions""".split())

# Vertical lanes: x already encodes when, so y encodes which part of life a node belongs to.
# Work sits above the year spine, self below, family/home on it.
LANES = {
    "work": -1.0, "other": -0.3, "home": 0.45, "self": 1.0,
}
FAMILY = {
    "Work": "work", "Project Management": "work", "Development": "work", "CompSus": "work",
    "YPP Program": "work", "Carbon Trust": "work", "Green Infrastructure": "work",
    "Green Supply Chain": "work", "Net Zero Target": "work", "Assessment Tools": "work",
    "General EAM": "work", "Land/Water Management": "work", "STEM Education": "work",
    "PhD Migration": "work", "Alternate Income": "work",
    "Home": "home", "Linh": "home", "Kin": "home", "Housing": "home", "Wedding": "home",
    "Prenatal": "home", "Postnatal": "home", "Driving": "home",
    "Health": "self", "Intellect": "self", "Leisure": "self", "Wealth": "self",
    "Asset": "self", "Agentic": "self",
}


def lane_of(domain: str) -> float:
    return LANES[FAMILY.get(domain, "other")]


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()

def main() -> None:
    con = sqlite3.connect(DB)
    rows = con.execute(
        "select description, duration, coalesce(nullif(project_name,''),'Unfiled') p, "
        "substr(start,1,4) y, substr(start,1,10) d, tags "
        "from time_entries where duration>0 and description is not null"
    ).fetchall()

    # ---- domains -------------------------------------------------------
    dom_h = collections.Counter(); dom_n = collections.Counter()
    dom_year = collections.defaultdict(collections.Counter)
    dom_span = {}
    for desc, dur, p, y, d, tags in rows:
        h = dur / 3600
        dom_h[p] += h; dom_n[p] += 1; dom_year[p][y] += h
        lo, hi = dom_span.get(p, (d, d))
        dom_span[p] = (min(lo, d), max(hi, d))
    domains = [p for p, h in dom_h.items() if h >= 20]

    # ---- themes (tokens) ----------------------------------------------
    dom_lower = {p.lower() for p in domains}
    tok_h = collections.Counter(); tok_n = collections.Counter()
    tok_year = collections.defaultdict(collections.Counter)
    tok_dom = collections.defaultdict(collections.Counter)
    tok_span = {}
    day_tokens = collections.defaultdict(set)
    tok_examples = collections.defaultdict(list)

    for desc, dur, p, y, d, tags in rows:
        h = dur / 3600
        ws = {w for w in re.findall(r"[a-z][a-z0-9'/-]{2,}", desc.lower())
              if w not in STOP and w not in dom_lower and not w.isdigit()}
        for w in ws:
            tok_h[w] += h; tok_n[w] += 1
            tok_year[w][y] += h; tok_dom[w][p] += h
            lo, hi = tok_span.get(w, (d, d))
            tok_span[w] = (min(lo, d), max(hi, d))
            if len(tok_examples[w]) < 6 and dur > 900:
                tok_examples[w].append({"d": d, "h": round(h, 1), "t": norm(desc)[:90]})
        day_tokens[d] |= ws

    themes = [w for w, n in tok_n.items() if n >= 30 and tok_h[w] >= 25]
    themes.sort(key=lambda w: -tok_h[w])
    themes = themes[:200]
    # terms that carry the story even when they are small: keep them in the graph
    KEEP = ["claude", "agentic", "chess", "nanny", "newborn", "gemini", "copilot", "cursor"]
    for w in KEEP:
        if w not in themes and tok_n.get(w, 0) >= 20:
            themes.append(w)
    tset = set(themes)

    # ---- co-occurrence (same day) -------------------------------------
    co = collections.Counter()
    for d, ws in day_tokens.items():
        ws = sorted(ws & tset)
        for a, b in itertools.combinations(ws, 2):
            co[(a, b)] += 1
    ndays = len(day_tokens)
    edges = []
    seen = set()
    for (a, b), c in co.items():
        if c < 12:
            continue
        # lift over independence, keeps era-specific pairs and drops generic ones
        exp = tok_n[a] * tok_n[b] / max(ndays, 1) * 0.35
        lift = c / max(exp, 1e-9)
        if lift < 1.35:
            continue
        edges.append({"s": f"t:{a}", "t": f"t:{b}", "w": round(min(c / 40, 3), 2), "k": "theme"})
        seen.add((a, b))

    # cap theme-theme edges to the strongest, keep graph readable
    edges.sort(key=lambda e: -e["w"])
    edges = edges[:900]

    years = sorted({y for _, _, _, y, _, _ in rows})

    nodes = []
    for p in domains:
        yy = dom_year[p]
        nodes.append({
            "id": f"d:{p}", "name": p, "kind": "domain",
            "h": round(dom_h[p], 1), "n": dom_n[p],
            "first": dom_span[p][0], "last": dom_span[p][1],
            "years": {y: round(yy.get(y, 0), 1) for y in years},
            "lane": lane_of(p),
        })
    for y in years:
        h = sum(dom_year[p].get(y, 0) for p in dom_h)
        nodes.append({
            "id": f"y:{y}", "name": y, "kind": "year",
            "h": round(h, 1), "n": sum(1 for r in rows if r[3] == y),
            "first": f"{y}-01-01", "last": f"{y}-12-31", "years": {y: round(h, 1)},
            "lane": 0,
        })
    for w in themes:
        yy = tok_year[w]
        top = tok_dom[w].most_common(4)
        nodes.append({
            "id": f"t:{w}", "name": w, "kind": "theme",
            "h": round(tok_h[w], 1), "n": tok_n[w],
            "first": tok_span[w][0], "last": tok_span[w][1],
            "years": {y: round(yy.get(y, 0), 1) for y in years},
            "doms": [[d, round(h, 1)] for d, h in top],
            "lane": lane_of(top[0][0]) if top else 0,
            "ex": tok_examples[w],
        })

    # theme -> domain, theme -> year, domain -> year
    for w in themes:
        tot = tok_h[w]
        for d, h in tok_dom[w].items():
            if d in dom_h and h / tot >= 0.18 and h >= 15:
                edges.append({"s": f"t:{w}", "t": f"d:{d}", "w": round(1 + 2 * h / tot, 2), "k": "dom"})
        for y, h in tok_year[w].items():
            if h / tot >= 0.30:
                edges.append({"s": f"t:{w}", "t": f"y:{y}", "w": round(1 + h / tot, 2), "k": "year"})
    for p in domains:
        yrs = dom_year[p]
        peak = max(yrs, key=lambda y: yrs[y])
        for y, h in yrs.items():
            if h >= 50 or y == peak:  # every domain anchors to at least its peak year
                edges.append({"s": f"d:{p}", "t": f"y:{y}", "w": 1.5, "k": "year"})
    for a, b in zip(years, years[1:]):
        edges.append({"s": f"y:{a}", "t": f"y:{b}", "w": 2.5, "k": "spine"})

    ids = {n["id"] for n in nodes}
    edges = [e for e in edges if e["s"] in ids and e["t"] in ids]

    deg = collections.Counter()
    for e in edges:
        deg[e["s"]] += 1; deg[e["t"]] += 1
    for n in nodes:
        n["deg"] = deg[n["id"]]

    OUT.write_text(json.dumps({"nodes": nodes, "edges": edges,
                               "meta": {"days": ndays, "entries": len(rows),
                                        "hours": round(sum(r[1] for r in rows) / 3600, 1),
                                        "years": years}}, indent=None), encoding="utf-8")
    print(f"nodes={len(nodes)} edges={len(edges)} bytes={OUT.stat().st_size}")
    orphans = [n["id"] for n in nodes if deg[n["id"]] == 0]
    print("orphans:", len(orphans), orphans[:10])

if __name__ == "__main__":
    main()
