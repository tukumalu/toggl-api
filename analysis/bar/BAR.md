# The bar: Obsidian's own graph view

Obsidian desktop is not installed on this machine, so the bar was captured from
**Obsidian Publish**, which runs Obsidian's own graph renderer in the browser. These are
the genuine renderer's pixels, not a lookalike.

Captured 2026-08-31 with `scripts/capture_bar.py` (Playwright driving installed Chrome).

- `help_graph_desktop.png` - global graph, Obsidian Help vault (~250 notes, comparable in
  scale to our 245 nodes). **This is the bar used for the blind rounds.**
- `help_panel_desktop.png` - the local graph as it sits in a note's sidebar.
- `obsidian_graph_desktop.png` / `obsidian_graph_zoom.png` - the Obsidian Hub vault
  (several thousand notes), captured first and set aside: too large to compare fairly.
- `help_note_mobile.png` - the mobile note view.

## What it actually does, from what was observed

**Ground and colour.** Publish defaults to a light theme; forcing `theme-dark` gives the
familiar near-black ground. Nodes are a flat mid-grey with no hue, identical for every
node - colour carries *no* variable. Edges are near-white hairlines at high opacity.
In a dense vault this inverts the usual figure/ground: the link layer is the brightest
thing on screen and the nodes sit beneath it.

**Node sizing.** Radius scales with link count. In the Help vault the spread is narrow, so
hubs and leaves look similar until you look closely; a handful of large nodes are visible
near the centre.

**Edges.** Straight hairlines, uniform weight, no direction, no weight encoding. At ~250
nodes they read as a white mesh; at Hub scale (thousands) they become a solid grey haze.

**Labels.** Small, low-contrast grey, drawn for every node with no collision handling, so
in dense regions they overlap and become unreadable. They fade out as you zoom out and in.

**Interaction.** Scroll to zoom, drag to pan, drag a node to pull it (the layout re-settles
elastically), hover to highlight a node and its neighbours while everything else dims.
An expand control opens the panel graph into the global graph modal.

**Controls.** The Publish embed exposes only expand and global-graph. The desktop app's
graph settings (filters, groups, display, forces) are not present here.

**Mobile.** Obsidian Publish **hides the graph entirely** at a 390px viewport - there is no
graph panel and no global-graph control. This is worth stating plainly: at phone width the
bar has no graph view at all, so any mobile comparison is ours against nothing.

## What this means for beating it

Its strength is the hairball itself: dense, kinetic, unmistakable. Its weaknesses are that
colour and position encode nothing, labels collide freely, and the graph answers no
question - it shows that structure exists, not what the structure means.
