"""Capture Obsidian's real graph view. Obsidian Publish runs Obsidian's own graph code,
so these are the genuine renderer's pixels, not a lookalike."""
from playwright.sync_api import sync_playwright

URL = "https://publish.obsidian.md/help/"

with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome", headless=True)
    for name, w, h in [("desktop", 1440, 900), ("mobile", 390, 844)]:
        pg = b.new_page(viewport={"width": w, "height": h})
        pg.goto(URL, wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(5000)
        # match our dark ground so the blind comparison is about the graph, not the theme
        # match our dark ground so the blind comparison is about the graph, not the theme
        pg.evaluate("""() => {
          document.body.classList.remove('theme-light');
          document.body.classList.add('theme-dark');
          document.documentElement.style.colorScheme = 'dark';
        }""")
        pg.wait_for_timeout(1200)
        print(name, "body classes:", pg.evaluate("() => document.body.className"))
        pg.screenshot(path=f"analysis/bar/help_note_{name}.png")
        box = pg.eval_on_selector(".graph-view-container",
                                  "e => {const r=e.getBoundingClientRect(); return [r.x,r.y,r.width,r.height];}")
        if box[2] == 0:
            print(name, "no graph panel at this viewport (Publish hides it)")
            pg.close(); continue
        pg.mouse.move(box[0] + box[2] / 2, box[1] + box[3] / 2)
        pg.wait_for_timeout(900)
        pg.screenshot(path=f"analysis/bar/help_panel_{name}.png")
        gb = pg.query_selector(".graph-global")
        r = gb.bounding_box() if gb else None
        if not r:
            print(name, "no global-graph control"); pg.close(); continue
        pg.mouse.click(r["x"] + r["width"] / 2, r["y"] + r["height"] / 2)
        pg.wait_for_timeout(16000)                       # let the force layout settle
        pg.screenshot(path=f"analysis/bar/help_graph_{name}.png")
        # hover a node to capture the highlight/dim behaviour
        pg.mouse.move(w / 2, h / 2); pg.wait_for_timeout(1200)
        pg.screenshot(path=f"analysis/bar/help_hover_{name}.png")
        print(name, "captured")
        pg.close()
    b.close()
print("done")
