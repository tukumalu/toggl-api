"""Build an Obsidian wiki vault from the local Toggl SQLite database.

Implements Karpathy's LLM-Wiki pattern (https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
adapted to ten years of personal time-tracking data. Reads data/toggl.db,
emits interlinked markdown pages under obsidian-vault/.
"""

from __future__ import annotations

import json
import sqlite3
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "toggl.db"
VAULT = ROOT / "obsidian-vault"

MIN_ACTIVITY_HOURS = 15.0
TOP_ACTIVITIES_PER_DOMAIN = 14
TOP_ACTIVITIES_PER_YEAR = 10


def slug(name: str) -> str:
    bad = '/\\:*?"<>|#^[]'
    out = "".join("-" if c in bad else c for c in name).strip()
    while "--" in out:
        out = out.replace("--", "-")
    return out.strip("-") or "Untitled"


def fmt_hours(h: float) -> str:
    return f"{h:,.0f} h"


@dataclass
class Entity:
    name: str
    kind: str
    path: Path | None = None
    hours: float = 0.0
    entries: int = 0
    body_lines: list[str] = field(default_factory=list)
    frontmatter: dict = field(default_factory=dict)
    forward: set[str] = field(default_factory=set)


class VaultBuilder:
    def __init__(self, db_path: Path) -> None:
        con = sqlite3.connect(db_path)
        self.df = pd.read_sql_query(
            "SELECT * FROM time_entries WHERE duration_hours > 0", con)
        con.close()
        self.df["tags"] = self.df["tags"].fillna("[]").apply(json.loads)
        self.entities: dict[str, Entity] = {}
        self.backlinks: dict[str, set[str]] = defaultdict(set)
        self.domain_top: dict[str, list[str]] = {}
        self.year_top: dict[str, list[str]] = {}
        self.tag_top: dict[str, list[str]] = {}
        self.log: list[str] = []

    def register(self, ent: Entity) -> None:
        key = slug(ent.name)
        ent.name = key
        self.entities[key] = ent

    def link(self, src: str, dst: str) -> None:
        s, d = slug(src), slug(dst)
        if s != d and s in self.entities and d in self.entities:
            self.entities[s].forward.add(d)
            self.backlinks[d].add(s)

    def stats_block(self, ent: Entity, extra: list[tuple[str, str]]) -> list[str]:
        lines = [f"- **Total tracked:** {fmt_hours(ent.hours)}",
                 f"- **Entries:** {ent.entries:,}"]
        lines += [f"- **{k}:** {v}" for k, v in extra]
        return lines

    def write(self, ent: Entity) -> None:
        folder = {
            "hub": VAULT, "domain": VAULT / "Domains",
            "person": VAULT / "People", "year": VAULT / "Years",
            "activity": VAULT / "Activities", "concept": VAULT / "Concepts",
        }[ent.kind]
        folder.mkdir(parents=True, exist_ok=True)
        ent.path = folder / f"{ent.name}.md"
        fm = {"type": ent.kind, **ent.frontmatter}
        fm_lines = ["---"] + [f"{k}: {json.dumps(v, ensure_ascii=False)}"
                              for k, v in fm.items()] + ["---"]
        linked_from = sorted(self.backlinks.get(ent.name, set()))
        body = list(ent.body_lines)
        if linked_from:
            body += ["", "## Linked from",
                     ", ".join(f"[[{n}]]" for n in linked_from)]
        text = "\n".join(fm_lines) + "\n\n" + "\n".join(body).strip() + "\n"
        ent.path.write_text(text, encoding="utf-8")

    def finish(self) -> None:
        for ent in self.entities.values():
            self.write(ent)

    # ---------- entity extraction ----------

    def build_domains(self) -> None:
        g = (self.df.groupby("project_name")
             .agg(hours=("duration_hours", "sum"), n=("duration_hours", "size"),
                  first=("start_date", "min"), last=("start_date", "max"))
             .query("project_name != ''"))
        for name, row in g.iterrows():
            ent = Entity(slug(str(name)), "domain")
            ent.hours, ent.entries = float(row["hours"]), int(row["n"])
            ent.frontmatter = {"hours": round(ent.hours, 1),
                               "first": row["first"], "last": row["last"]}
            self.register(ent)

    def build_activities(self) -> None:
        d = self.df[self.df["description"].str.strip() != ""].copy()
        d["desc_clean"] = d["description"].str.strip()
        d = d[d["desc_clean"].str.len() <= 60]
        agg = (d.groupby("desc_clean")
               .agg(hours=("duration_hours", "sum"), n=("duration_hours", "size")))
        agg = agg[(agg["n"] >= 20) | (agg["hours"] >= 30)]
        for desc, row in agg.sort_values("hours", ascending=False).iterrows():
            ent = Entity(slug(str(desc)), "activity")
            ent.hours, ent.entries = float(row["hours"]), int(row["n"])
            rows = d[d["desc_clean"] == desc]
            proj_share = (rows.groupby("project_name")["duration_hours"].sum()
                          .sort_values(ascending=False))
            ent.frontmatter = {
                "hours": round(ent.hours, 1),
                "domains": [slug(p) for p in proj_share.index[:3] if p],
            }
            ent.body_lines.append(f"**{fmt_hours(ent.hours)}** across "
                                  f"{ent.entries:,} sessions.")
            self.register(ent)

    def build_years(self) -> None:
        g = self.df.groupby("start_year").agg(
            hours=("duration_hours", "sum"), n=("duration_hours", "size"))
        for year, row in g.iterrows():
            ent = Entity(str(year), "year")
            ent.hours, ent.entries = float(row["hours"]), int(row["n"])
            ent.frontmatter = {"hours": round(ent.hours, 1)}
            self.register(ent)

    def build_tags(self) -> None:
        counter: Counter = Counter()
        hours_by_tag: dict[str, float] = defaultdict(float)
        for tags, hrs in zip(self.df["tags"], self.df["duration_hours"]):
            for t in tags:
                counter[t] += 1
                hours_by_tag[t] += hrs
        for tag, n in counter.most_common():
            ent = Entity(tag, "concept")
            ent.hours, ent.entries = hours_by_tag[tag], n
            ent.frontmatter = {"hours": round(ent.hours, 1),
                               "tag": True}
            self.register(ent)

    CONCEPTS = {
        "Parenthood": {
            "members": ["Prenatal", "Postnatal", "Kin"],
            "blurb": "The arc from expecting a child to raising Kin.",
        },
        "Education Arc": {
            "members": ["RMIT", "Scholarship", "IELTS Prepare", "IELTS",
                        "PhD Migration"],
            "blurb": "Study, scholarships, and English testing as stepping stones.",
        },
        "Sustainability Work": {
            "members": ["CompSus", "Carbon Trust", "Net Zero Target",
                        "Green Infrastructure", "Green Supply Chain",
                        "STEM Education", "WWF", "Assessment Tools",
                        "Land-Water Management"],
            "blurb": "Professional work on climate, sustainability, and green systems.",
        },
        "Career Moves": {
            "members": ["New Job", "Job", "YPP Program", "VP LRP"],
            "blurb": "Job searches, transitions, and programs that shaped the working years.",
        },
        "Family Life": {
            "members": ["Linh", "Home", "Housing", "Wedding"],
            "blurb": "The domestic sphere: partnership, housing, wedding, and daily home life.",
        },
        "Self Care": {
            "members": ["Health", "Exercise", "Hygiene", "Rest"],
            "blurb": "Everything that keeps the machine running.",
        },
        "Games": {
            "members": ["Chess", "Leisure"],
            "blurb": "Play, chiefly chess.",
        },
    }

    def build_concepts(self) -> None:
        for cname, spec in self.CONCEPTS.items():
            if spec is None:
                continue
            ent = Entity(cname, "concept")
            members = []
            for m in spec["members"]:
                ms = slug(m)
                if ms in self.entities:
                    members.append(ms)
                    ent.hours += self.entities[ms].hours
            ent.frontmatter = {"hours": round(ent.hours, 1),
                               "members": len(members)}
            ent.body_lines.append(spec["blurb"])
            self.register(ent)

    # ---------- linking ----------

    def link_domains(self) -> None:
        d = self.df[self.df["project_name"] != ""]
        for pname, grp in d.groupby("project_name"):
            dom = slug(str(pname))
            ent = self.entities.get(dom)
            if not ent:
                continue
            g2 = grp[grp["description"].str.strip() != ""].copy()
            g2["desc_clean"] = g2["description"].str.strip()
            g2 = g2[g2["desc_clean"].str.len() <= 60]
            act_stats = (g2.groupby("desc_clean")
                         .agg(h=("duration_hours", "sum"), n=("duration_hours", "size")))
            top_acts = act_stats[(act_stats["n"] >= 8)]
            top_acts = (top_acts.sort_values("h", ascending=False)
                        [:TOP_ACTIVITIES_PER_DOMAIN]["h"])
            years = grp.groupby("start_year")["duration_hours"].sum().sort_values(
                ascending=False)[:4].index.tolist()
            ent.body_lines.append("A life domain tracked in Toggl.")
            ent.body_lines.append("")
            ent.body_lines.append("## Signature activities")
            for act, h in top_acts.items():
                self.link(dom, slug(act))
            ent.body_lines.append(", ".join(f"[[{slug(a)}]]" for a in top_acts.index))
            ent.body_lines.append("")
            ent.body_lines.append("## Peak years")
            for y in years:
                self.link(dom, str(y))
            ent.body_lines.append(", ".join(f"[[{y}]]" for y in years))
            self.domain_top[dom] = list(top_acts.index)

    def _chain(self, names: list[str]) -> None:
        slugs = [slug(n) for n in names]
        for i in range(len(slugs) - 1):
            for j in range(i + 1, min(i + 3, len(slugs))):
                self.link(slugs[i], slugs[j])
                self.link(slugs[j], slugs[i])

    def link_siblings(self) -> None:
        d = self.df[self.df["project_name"] != ""].copy()
        d["desc_clean"] = d["description"].str.strip()
        known = {e.name for e in self.entities.values() if e.kind == "activity"}
        for dom in self.domain_top:
            acts = (d[(d["project_name"] == dom) & (d["desc_clean"].str.len() <= 60)]
                    .groupby("desc_clean")["duration_hours"].sum()
                    .sort_values(ascending=False).index.tolist())
            acts = [slug(a) for a in acts if slug(a) in known]
            self._chain(acts)
        for acts in self.year_top.values():
            self._chain(acts)
        for acts in self.tag_top.values():
            self._chain(acts)
        doms = [e.name for e in self.entities.values() if e.kind == "domain"]
        act_sets = {d: set(self.domain_top.get(d, [])) for d in doms}
        for i, d1 in enumerate(doms):
            best, best_j = None, 0.0
            for d2 in doms[i + 1:]:
                union = act_sets[d1] | act_sets[d2]
                j = (len(act_sets[d1] & act_sets[d2]) / len(union)) if union else 0
                if j > best_j:
                    best, best_j = d2, j
            if best:
                self.link(d1, best)
                self.link(best, d1)

    def link_activities(self) -> None:
        d = self.df[self.df["description"].str.strip() != ""].copy()
        d["desc_clean"] = d["description"].str.strip()
        for ent in self.entities.values():
            if ent.kind != "activity":
                continue
            rows = d[d["desc_clean"] == ent.name]
            if rows.empty:
                rows = d[d["description"].map(lambda x: slug(str(x)) == ent.name)]
            years = sorted(rows["start_year"].unique())
            if not years:
                continue
            for y in dict.fromkeys([years[0], years[-1]]):
                self.link(ent.name, str(y))
            for p in ent.frontmatter.get("domains", []):
                self.link(ent.name, p)
            tags: Counter = Counter()
            for tl in rows["tags"]:
                for t in tl:
                    tags[t] += 1
            for t, _ in tags.most_common(2):
                self.link(ent.name, t)
            span = (f"Active {years[0]}–{years[-1]}" if len(years) > 1
                    else f"Active {years[0]}")
            ent.body_lines.insert(0,
                "Tracked under: " + ", ".join(f"[[{p}]]" for p in ent.frontmatter["domains"]))
            ent.body_lines.insert(1, "")
            ent.body_lines.insert(2, span)

    def link_years(self) -> None:
        d = self.df
        for year in sorted(e.name for e in self.entities.values() if e.kind == "year"):
            ent = self.entities[year]
            rows = d[d["start_year"] == int(year)]
            top_proj = (rows[rows["project_name"] != ""]
                        .groupby("project_name")["duration_hours"].sum()
                        .sort_values(ascending=False)[:5])
            r2 = rows[rows["description"].str.strip() != ""].copy()
            r2["desc_clean"] = r2["description"].str.strip()
            r2 = r2[r2["desc_clean"].str.len() <= 60]
            ya = (r2.groupby("desc_clean")
                  .agg(h=("duration_hours", "sum"), n=("duration_hours", "size")))
            top_acts = ya[ya["n"] >= 3].sort_values(
                "h", ascending=False)[:TOP_ACTIVITIES_PER_YEAR]["h"]
            if top_acts.empty:
                top_acts = ya.sort_values(
                    "h", ascending=False)[:TOP_ACTIVITIES_PER_YEAR]["h"]
            ent.body_lines.append(f"{fmt_hours(ent.hours)} tracked across "
                                  f"{ent.entries:,} entries.")
            ent.body_lines.append("")
            ent.body_lines.append("## Dominant domains")
            for p, h in top_proj.items():
                self.link(year, slug(str(p)))
            ent.body_lines.append(", ".join(f"[[{slug(str(p))}]]" for p in top_proj.index))
            ent.body_lines.append("")
            ent.body_lines.append("## Most-tracked activities")
            for a in top_acts.index:
                self.link(year, slug(a))
            ent.body_lines.append(", ".join(f"[[{slug(a)}]]" for a in top_acts.index))
            self.year_top[year] = list(top_acts.index)
            idx = int(year) - 2017
            prev_y, next_y = str(int(year) - 1), str(int(year) + 1)
            parts = []
            if prev_y in self.entities:
                parts.append(f"← [[{prev_y}]]")
            if next_y in self.entities:
                parts.append(f"[[{next_y}]] →")
            ent.body_lines.append("")
            ent.body_lines.append(" · ".join(parts))

    def link_concepts(self) -> None:
        tag_concepts = {"Deep": "Deep Work", "Highlight": "Highlights",
                        "Grind": "The Grind"}
        for tname, cname in tag_concepts.items():
            if tname not in self.entities:
                continue
            ent = self.entities[tname]
            rows = self.df[self.df["tags"].apply(lambda t: tname in t)]
            ent.frontmatter["alias"] = cname
            ent.body_lines.append(
                f"**{cname}** — the `{tname}` tag. {len(rows):,} sessions worth "
                f"{fmt_hours(float(rows['duration_hours'].sum()))}.")
            r2 = rows[rows["description"].str.strip() != ""].copy()
            r2["desc_clean"] = r2["description"].str.strip()
            r2 = r2[r2["desc_clean"].str.len() <= 60]
            top_acts = (r2.groupby("desc_clean")
                        .agg(h=("duration_hours", "sum"), n=("duration_hours", "size"))
                        .query("n >= 2").sort_values("h", ascending=False)[:12]["h"])
            if top_acts.empty:
                top_acts = (r2.groupby("desc_clean")
                            .agg(h=("duration_hours", "sum"))
                            .sort_values("h", ascending=False)[:12]["h"])
            for a in top_acts.index:
                self.link(tname, slug(str(a)))
            ent.body_lines.append("")
            ent.body_lines.append("## Where it happens")
            ent.body_lines.append(", ".join(f"[[{slug(str(a))}]]" for a in top_acts.index))
            self.tag_top[tname] = [slug(str(a)) for a in top_acts.index]
            top_dom = (rows[rows["project_name"] != ""]
                       .groupby("project_name")["duration_hours"].sum()
                       .sort_values(ascending=False)[:4])
            for p in top_dom.index:
                self.link(tname, slug(str(p)))
            ent.body_lines.append("")
            ent.body_lines.append("## Where it lives")
            ent.body_lines.append(", ".join(f"[[{slug(str(p))}]]" for p in top_dom.index))

        for cname, spec in self.CONCEPTS.items():
            cs = slug(cname)
            if cs not in self.entities:
                continue
            for m in spec["members"]:
                self.link(cs, slug(m))
                self.link(slug(m), cs)

    def build_home(self) -> None:
        home = Entity("Home", "hub")
        dom = self.entities.pop("Home", None)
        if dom:
            home.hours, home.entries = dom.hours, dom.entries
            self.backlinks.setdefault("Home", set()).update(
                n for n, e in self.entities.items() if "Home" in e.forward)
            for n, e in self.entities.items():
                e.forward.discard("Home")
            home.frontmatter = {"also": "life domain (domestic sphere)"}
        domains = sorted((e for e in self.entities.values() if e.kind == "domain"),
                         key=lambda e: -e.hours)
        years = sorted((e for e in self.entities.values() if e.kind == "year"),
                       key=lambda e: e.name)
        concepts = sorted(e.name for e in self.entities.values() if e.kind == "concept")
        activities = sorted((e for e in self.entities.values() if e.kind == "activity"),
                            key=lambda e: -e.hours)[:20]
        total_h = float(self.df["duration_hours"].sum())
        first = self.df["start_date"].min()[:10]
        last = self.df["start_date"].max()[:10]
        home.body_lines = [
            f"A decade of tracked time: **{fmt_hours(total_h)}** from "
            f"{first} to {last}, across {len(self.df):,} entries.",
            "",
            "## Life domains",
            " · ".join(f"[[{d.name}]]" for d in domains),
            "",
            "## Timeline",
            " · ".join(f"[[{y.name}]]" for y in years),
            "",
            "## Threads",
            " · ".join(f"[[{c}]]" for c in concepts),
            "",
            "## Recurring rituals",
            " · ".join(f"[[{a.name}]]" for a in activities),
        ]
        for d in domains:
            self.link("Home", d.name)
        for y in years:
            self.link("Home", y.name)
        for c in concepts:
            self.link("Home", c)
        for a in activities:
            self.link("Home", a.name)
        self.register(home)

    def add_people(self) -> None:
        people = {
            "Linh": ("Partner.", ["Wedding", "Prenatal", "Postnatal", "Family Life"]),
            "Kin": ("Child.", ["Parenthood", "Linh", "Home"]),
        }
        for pname, (blurb, rels) in people.items():
            ps = slug(pname)
            rows = self.df[self.df["project_name"] == pname]
            ent = Entity(ps, "person")
            ent.hours = float(rows["duration_hours"].sum())
            ent.entries = int(len(rows))
            ent.frontmatter = {"hours": round(ent.hours, 1)}
            ent.body_lines = [blurb]
            self.register(ent)
            for r in rels:
                self.link(ps, r)

    # ---------- meta files ----------

    def link_breadcrumbs(self) -> None:
        for ent in self.entities.values():
            if ent.kind != "hub":
                self.link(ent.name, "Home")

    def write_meta(self) -> None:
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        schema = [
            "---", 'title: "Vault Schema"', "---", "",
            "# Vault Schema (for the LLM maintainer)",
            "",
            "This vault is a persistent LLM-maintained wiki over raw Toggl data",
            "(data/toggl.db in the parent repo). Pattern source:",
            "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f",
            "",
            "## Layout",
            "- `Home.md` — the hub. Every new page must be reachable from here within 2 hops.",
            "- `Domains/` — one page per Toggl project (life domain). Hubs for their activities.",
            "- `People/` — humans appearing in the data.",
            "- `Years/` — annual summaries, chained chronologically.",
            "- `Activities/` — recurring named activities (>= 15 lifetime hours).",
            "- `Concepts/` — synthesized threads: tagged practices (Deep Work, Highlights,",
            "  The Grind) and cross-domain narratives (Parenthood, Education Arc, ...).",
            "",
            "## Conventions",
            "- Every page carries YAML frontmatter: `type`, `hours`, and domain-specific keys.",
            "- Link generously with `[[wikilinks]]`; the graph view is the point.",
            "- Never edit raw data; regenerate pages via `python scripts/build_vault.py`.",
            "- New ingests append an entry to `log.md` with prefix `## [date] op | subject`.",
        ]
        (VAULT / "AGENTS.md").write_text("\n".join(schema), encoding="utf-8")

        index = ["---", 'title: "Index"', "---", "", "# Index", ""]
        for kind in ("domain", "person", "year", "concept", "activity"):
            ents = sorted((e for e in self.entities.values() if e.kind == kind),
                          key=lambda e: e.name.lower())
            if not ents:
                continue
            index.append(f"## {kind.capitalize()}s ({len(ents)})")
            index += [f"- [[{e.name}]] — {fmt_hours(e.hours)}" for e in ents]
            index.append("")
        (VAULT / "index.md").write_text("\n".join(index), encoding="utf-8")

        log = ["# Log",
               "",
               f"## [{now}] ingest | Full Toggl history 2017–2026",
               f"Ingested {len(self.df):,} time entries; generated "
               f"{len(self.entities)} wiki pages across 5 categories."]
        (VAULT / "log.md").write_text("\n".join(log), encoding="utf-8")


def main() -> None:
    if VAULT.exists():
        import shutil
        shutil.rmtree(VAULT)
    b = VaultBuilder(DB_PATH)
    b.build_domains()
    b.build_activities()
    b.build_years()
    b.build_tags()
    b.build_concepts()
    b.add_people()
    b.build_home()
    b.link_years()
    b.link_domains()
    b.link_activities()
    b.link_concepts()
    b.link_siblings()
    b.link_breadcrumbs()
    b.finish()
    b.write_meta()

    n_edges = sum(len(e.forward) for e in b.entities.values())
    orphans = [e.name for e in b.entities.values()
               if not e.forward and not b.backlinks.get(e.name)]
    print(f"pages: {len(b.entities)}  directed links: {n_edges}")
    print(f"orphans: {orphans or 'none'}")
    hubs = sorted(b.entities.values(), key=lambda e: -len(b.backlinks.get(e.name, set())))[:8]
    print("top hubs:", [(e.name, len(b.backlinks.get(e.name, set()))) for e in hubs])


if __name__ == "__main__":
    main()
