"""Inject the graph dataset, findings and engine into the template.

Output: life-in-graph.html (self-contained; the artifact CSP forbids fetching data).
"""
from __future__ import annotations
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

tpl = (ROOT / "web/life-graph.template.html").read_text(encoding="utf-8")
data = (ROOT / "data/life-graph.json").read_text(encoding="utf-8")
eng = (ROOT / "web/life-graph.engine.js").read_text(encoding="utf-8")
fp = ROOT / "data/findings.json"
findings = fp.read_text(encoding="utf-8") if fp.exists() else "[]"

# re-dump with \uXXXX escapes: entities would not decode inside a <script>, but these do,
# and it fails loudly here rather than shipping a blank page
data = json.dumps(json.loads(data), separators=(",", ":"), ensure_ascii=True)
findings = json.dumps(json.loads(findings), ensure_ascii=True)

out = tpl.replace("__DATA__", data).replace("__INSIGHTS__", findings).replace("__ENGINE__", eng)
dest = ROOT / "life-in-graph.html"
dest.write_text(out, encoding="utf-8")
print(f"wrote {dest.name} ({dest.stat().st_size / 1024:.0f} KB)")
