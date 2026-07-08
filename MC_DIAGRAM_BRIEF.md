# MC Diagram Brief — Cast Test, Mechanical Concepts

A design brief for the 60 Mechanical Concepts question diagrams. Real CAST MC items are **captioned pictures** — the student reasons from the figure, not from text alone. These diagrams are the biggest remaining authenticity gap in the app.

---

## 1. Technical constraints (non-negotiable)

- **Format:** inline SVG only. No raster images, no external files, no fonts loaded inside the SVG. Each diagram ships as a JS template string in `app.js`, keyed by question id (same pattern as the existing GA drawings — see `renderShopFloor()` in app.js).
- **ViewBox:** `0 0 700 420` (landscape). Rendered at `width:100%` inside a white `.drawing-box` card with a `FIG. 1` caption bar underneath. Must stay legible at 340px wide (phone).
- **Text inside SVG:** font-family `'IBM Plex Sans'` for object labels, `'IBM Plex Mono'` for measurements/tags. Minimum 11px at full size (scales down on mobile — nothing critical below 10px).
- **Stroke-based line art**, not filled illustrations. Stroke `#23303A` at 1.5–2px for objects, `#4A5560` 1px for dimension/leader lines.
- **No animation, no interactivity.** Static figure.

## 2. Visual language (match the existing app)

Palette (already in the app's design system):
- **Ink:** `#23303A` — primary object outlines
- **Steel:** `#4A5560` — secondary lines, labels, hatching
- **Blueprint White:** `#F4F6F8` — object fills (light, flat)
- **Signal Amber:** `#F2A900` — the single "attention" accent: force arrows, the load being lifted, the moving part. Use ONCE per figure, only when the question needs the eye drawn somewhere.
- **Conductor Copper:** `#B87333` — measurement callouts (weights, distances) when the question states numbers
- **Breaker Green:** `#2E7D46` — reserved, avoid in MC figures

Style references already in the app: the GA technical drawings (shop floor, job site, bracket) — dimension lines with end ticks, white label chips over lines, mono annotations. MC figures should read as the same drafting hand: clean orthographic/side-view line drawings, subtle ground hatching (short 45° steel ticks), no perspective, no shadows, no gradients, no cartoon faces.

## 3. Composition rules

- **Two-scenario questions** (most items): side-by-side panels labeled with large mono tags matching the prompt's names — `A` / `B` boxes top-left of each panel (e.g., "RIG A" / "RIG B", "RAMP A" / "RAMP B"). A thin vertical divider line between panels. The panel tags must match the scenario names in the prompt text, NOT the answer-option letters.
- **Single-scenario questions:** one centered figure.
- **Stated numbers go on the figure** in copper mono (e.g., "60 LB" on a weight, "6 FT" with a dimension line, "12T"/"36T" on gears). Numbers in the prompt and figure must agree exactly.
- **Caption bar** (already rendered by the app below the SVG): keep figures self-explanatory without it.

## 4. ⚠️ Answer-leak rules (most important)

The figure must set up the question **without revealing the answer**:
- **Never draw the outcome.** No motion arrows showing the direction that is the answer (gears q11–12, piston q33, collision q25). Draw the *input* motion only (the driven gear's arrow, the approach arrows before collision), never the *output*.
- **Never size or emphasize the correct choice.** Two compared scenarios get identical visual weight, identical loads drawn identically.
- **Never annotate derived quantities.** For the torque-balance item (q4), show the weights and distances — never the products.
- **Equal-answer items (q4, q9, q20, q26, q44, q54, q56) get zero visual hints** that the scenarios are equivalent — draw them as contrasting as the non-equal items so "they look different" doesn't become a tell in reverse.

## 5. Inventory — 60 items in 17 concept families

Numbers/names below must match the question data in `index.html` exactly.

### Levers (q1–q5)
| id | Figure |
|---|---|
| q1 | Single panel: 36″ pry bar over a fulcrum block, load (crate corner) at one end, fulcrum 4″ from load (dimension line). Two hand-position marks on the bar: one mid-bar, one at the far end, tagged in mono. No force arrows. |
| q2 | Two panels: WORKER A / WORKER B, same crate + same bar; fulcrum block visibly farther from crate in A, nearer in B. Stick-figure-free — show gloved-hand grip symbol only. |
| q3 | Single wheelbarrow side view, wheel at left. Two dashed brick-stack outlines: one over the wheel, one near the handles, tagged "NEAR WHEEL" / "NEAR HANDLES". |
| q4 | Balance beam on center pivot. Left: box "60 LB" with "4 FT" dimension to pivot. Right: box "80 LB" with "3 FT". Beam drawn perfectly level. (Equal-answer item — no tilt!) |
| q5 | Two panels: HAMMER A (short handle) / HAMMER B (long handle), each claw on an identical nail in a board. Same nail depth. |

### Pulleys (q6–q10)
| id | Figure |
|---|---|
| q6 | Two panels: RIG A = movable pulley attached to engine block, rope end anchored to beam; RIG B = fixed pulley on beam, rope straight down to block. Identical engine blocks. |
| q7 | Block-and-tackle: upper fixed block + lower movable block, **two supporting strands** clearly countable, motor tagged "120 LB" in copper. Pull rope exits to the side. |
| q8 | One hoist shown twice (before/after): 2 strands vs 4 strands supporting the same crate. Tag strand counts "2 STRANDS" / "4 STRANDS". |
| q9 | Pole top with single fixed pulley, bucket on one side, worker's pull rope down the other. Second mini-panel: same bucket hauled straight up by hand. (Equal-answer — same rope angles drawn honestly.) |
| q10 | Three mini-panels: 1, 2, 4 supporting strands over the same crate, tagged with strand counts. |

### Gears & belts (q11–q15)
| id | Figure |
|---|---|
| q11 | Two meshed gears, similar size. Curved arrow ON THE LEFT GEAR ONLY (clockwise). Right gear: no arrow — that's the question. |
| q12 | Three meshed gears in a row. Curved CW arrow on gear 1 only. Gears 2–3 unmarked. |
| q13 | Small gear (tag "12T") meshing large gear ("36T"). No rotation arrows at all. |
| q14 | Three meshed gears: small/medium/large, no arrows, size difference obvious. |
| q15 | Two wheels joined by a straight (uncrossed) belt. CW arrow on left wheel only. |

### Inclined planes (q16–q19)
| id | Figure |
|---|---|
| q16 | Two panels: 6-ft ramp and 12-ft ramp to the same truck-bed height (equal height emphasized with a shared horizontal dashed line). Identical drums at the base. Length dimensions in copper. |
| q17 | Two panels: RAMP A steeper, RAMP B shallower, same platform height, identical carts. |
| q18 | Before/after: original ramp and one 2× longer, same height line. Identical load. |
| q19 | One platform, two paths drawn: vertical lift arrow path and ramp path, same barrel at base. No effort annotations. |

### Friction (q20–q23)
| id | Figure |
|---|---|
| q20 | Same crate twice on the same hatched concrete: lying on wide face vs standing on narrow end. Identical pull-rope angle. (Equal-answer.) |
| q21 | Crate mid-slide on smooth floor; scattered sand dots ahead of it. Pull direction arrow on the rope (input, not outcome). |
| q22 | Two panels: cabinet flat on floor vs cabinet on two dollies (small wheels). Identical cabinets. |
| q23 | Two ground close-ups: boot sole over wet ice (drip marks) vs boot sole over rubber mat (cross-hatch texture). |

### Momentum & collisions (q24–q26)
| id | Figure |
|---|---|
| q24 | Loaded dump truck and small empty pickup side by side, both with identical speed arrows ("SAME SPEED" tag). |
| q25 | Two carts approaching head-on, arrows toward each other, tags "CART A (2×WEIGHT)" and "CART B". Equal arrow lengths (same speed). No post-collision arrow. |
| q26 | Truck tagged "2 TONS · 25 MPH" and car tagged "1 TON · 50 MPH", drawn to honest size difference, no motion-arrow length difference implying more momentum either way. (Equal-answer.) |

### Center of mass / load carry (q27–q29)
| id | Figure |
|---|---|
| q27 | Long ladder carried between two workers (simple silhouettes), paint bucket hanging clearly nearer Worker B. Tags "WORKER A" / "WORKER B". |
| q28 | Two identical shelving units: boxes stacked on top shelves vs boxes on bottom shelves. |
| q29 | Long uniform pipe with three grip marks: middle, near-end, and a "?" — show hand positions as small clamp symbols tagged MIDDLE / END. |

### Gas pressure (q30–q32)
| id | Figure |
|---|---|
| q30 | Large tank and small tank, same compressor line into both, tag "SAME AMOUNT OF AIR". Gauges drawn blank (no needle positions!). |
| q31 | Sealed cylinder over a flame/heat symbol. Blank gauge. |
| q32 | Rigid tank with valve open, escaping-air dashes, tag "HALF THE AIR RELEASED". Blank gauge. |
| — | Note: blank gauges are the leak-rule in action — a needle position would answer the question. |

### Pistons & hydraulics (q33–q35)
| id | Figure |
|---|---|
| q33 | Cylinder cross-section, piston mid-bore, combustion sparks below it. NO motion arrow on the piston. |
| q34 | Cylinder with piston pressed inward (input arrow on the piston rod only), trapped air region hatched. |
| q35 | Hydraulic jack cross-section: small piston left, large piston right, connected fluid chamber. Down-push arrow on small piston only. |

### Fluid flow (q36–q39)
| id | Figure |
|---|---|
| q36 | Pipe with a visible narrowing at midspan, flow entering left (single input arrow at inlet only). |
| q37 | Same pipe, sections tagged "WIDE" / "NARROW", inlet arrow only. |
| q38 | Garden hose end with thumb pressed over half the opening. |
| q39 | Two identical tanks, bottom holes of visibly different diameter, water level equal. |

### Buoyancy (q40–q43)
| id | Figure |
|---|---|
| q40 | Two tubs tagged "FRESH WATER" / "SEAWATER", identical crates floating — **drawn at identical waterline** (leak rule: floating height IS the answer). |
| q41 | Cork ball and steel ball (same diameter) above a water tank, both mid-drop. Tags "CORK" / "STEEL". |
| q42 | Barge at dock, crane loading pallets; waterline drawn at current level only. |
| q43 | Solid block held above tank, tag "DENSER THAN WATER". |

### Water pressure (q44–q46)
| id | Figure |
|---|---|
| q44 | Wide tank and narrow standpipe side by side, water depth in both marked "15 FT" with a shared dashed depth line. Same bottom level. (Equal-answer.) |
| q45 | Two elevated tanks: TANK A on tall stand, TANK B on short stand, identical hoses reaching the same ground line. |
| q46 | Barrel with two small holes (top third, bottom third) — **no water streams drawn** (stream arcs would answer it). Just hole marks. |

### Circuits (q47–q51)
| id | Figure |
|---|---|
| q47 | Battery, two switch symbols in series, bulb. Standard schematic symbols, switches drawn open. |
| q48 | Battery, two switches on parallel branches, bulb. Switches open. |
| q49 | String of 4 bulbs in series, one bulb with a broken-filament zigzag ✕. |
| q50 | Panel one-line diagram: supply → MASTER switch → bus → three branch switches → tool symbols. Mono tags. |
| q51 | Simple circuit with fuse symbol blown (gap + burst marks). |

### Rotational motion (q52–q54)
| id | Figure |
|---|---|
| q52 | Flywheel disc, two dot marks: rim and half-radius, with their circular dashed paths drawn as *equal-weight* dashed circles. |
| q53 | Two carts, large wheels vs small wheels, tagged "ONE REVOLUTION" with an equal rotation tick on each wheel — no distance marks on the ground. |
| q54 | Rotating shaft end-view: two dots (near center, at edge) on the same radius line. (Equal-answer.) |
| q55 | Bolt arc over a trench: dashed parabola with three position marks (launch, apex, landing) — **no velocity arrows**. |
| q56 | Scaffold edge, wrench (large) and bolt (small) released together, both at the same height mid-fall, tag "RELEASED TOGETHER" — drawn at the same height (equal-answer; unequal heights would leak). |

### Springs (q57–q58)
| id | Figure |
|---|---|
| q57 | Two identical spring launchers: one compressed to a "2 IN" mark, one to "4 IN" (dimension lines), same part loaded. |
| q58 | Two springs compressed the same distance: heavy-coil (thick wire, tight) vs light-coil (thin wire), tagged "STIFF" / "SOFT", identical compression dimension. |

### Vehicle stability (q59–q60)
| id | Figure |
|---|---|
| q59 | Forklift side/rear view mid-turn (curved path line on ground), pallet shown at two dashed height positions: raised high and kept low. |
| q60 | Two flatbed rears: tall single-column stack vs low spread load, equal total boxes, curve arrow on the road. |

## 6. Delivery format

For each figure, deliver an SVG snippet (`<svg viewBox="0 0 700 420">…</svg>`) with:
- A comment header: `<!-- mc_qN: concept -->`
- No external references, ids namespaced `mcN-*` to avoid collisions when multiple figures are in the DOM
- Shared primitives are fine to repeat inline (each SVG must stand alone)

Suggested batching (build + review in this order):
1. **Pulleys + levers** (q1–q10) — highest reasoning benefit from a figure
2. **Gears/belts + inclines** (q11–q19)
3. **Circuits** (q47–q51) — schematic symbols, fast batch
4. **Fluids/pressure/buoyancy** (q30–q46)
5. **The rest** (q20–q29, q52–q60)

Every figure gets QA'd against Section 4 (answer-leak rules) before merge.
