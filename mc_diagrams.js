// ─────────────────────────────────────────────
// MC FIGURE LIBRARY — CAST-R Prep, Mechanical Concepts
// Batch 1: Levers (q1–q5) + Pulleys (q6–q10)
// Each entry is a standalone SVG string (viewBox 0 0 700 420),
// keyed by question id, ready to drop into app.js.
// Palette + rules per MC_DIAGRAM_BRIEF.md.
// ─────────────────────────────────────────────
(function () {
  const INK = '#23303A', STEEL = '#4A5560', FILL = '#F4F6F8', COPPER = '#B87333', AMBER = '#F2A900';

  // ── shared drafting primitives (compose to standalone markup) ──
  const sans = (x, y, t, size = 11, fill = STEEL, anchor = 'middle', w = 400) =>
    `<text x="${x}" y="${y}" font-family="'IBM Plex Sans',sans-serif" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${w}">${t}</text>`;
  const mono = (x, y, t, size = 11, fill = STEEL, anchor = 'middle', w = 400) =>
    `<text x="${x}" y="${y}" font-family="'IBM Plex Mono',monospace" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${w}" letter-spacing="0.06em">${t}</text>`;
  const panelTag = (x, y, t) => mono(x, y, t, 15, INK, 'start', 600);

  const ground = (x1, x2, y) => {
    let s = `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${STEEL}" stroke-width="1.25"/>`;
    for (let x = x1 + 6; x < x2 - 8; x += 26)
      s += `<line x1="${x + 8}" y1="${y}" x2="${x}" y2="${y + 8}" stroke="${STEEL}" stroke-width="1"/>`;
    return s;
  };

  const beam = (x1, x2, y1, y2) => {
    let s = `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="${FILL}" stroke="${INK}" stroke-width="1.5"/>`;
    for (let x = x1 + 14; x < x2 - 20; x += 42)
      s += `<line x1="${x}" y1="${y2 - 2}" x2="${x + 16}" y2="${y1 + 2}" stroke="${STEEL}" stroke-width="1"/>`;
    return s;
  };

  const mitt = (cx, cy) =>
    `<circle cx="${cx}" cy="${cy}" r="9" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="${INK}"/>`;

  const crateBox = (x, y, w, h, label) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
    (label ? sans(x + w / 2, y + h / 2 + 4, label, 10.5) : '');

  const dimTick = (x, y) =>
    `<line x1="${x - 4}" y1="${y + 4}" x2="${x + 4}" y2="${y - 4}" stroke="${COPPER}" stroke-width="1.25"/>`;
  const dimLine = (x1, x2, y, label, labelY) =>
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${STEEL}" stroke-width="1"/>` +
    dimTick(x1, y) + dimTick(x2, y) + mono((x1 + x2) / 2, labelY ?? y - 6, label, 12, COPPER, 'middle', 600);
  const ext = (x, y1, y2) =>
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${STEEL}" stroke-width="0.75"/>`;
  const divider = (x) =>
    `<line x1="${x}" y1="30" x2="${x}" y2="392" stroke="${STEEL}" stroke-width="1" stroke-dasharray="1 4"/>`;

  // arrowhead pointing along unit direction (dx,dy) from (x,y)
  const head = (x, y, dx, dy, color = STEEL) => {
    const px = -dy, py = dx;
    return `<polygon points="${x + 11 * dx},${y + 11 * dy} ${x + 5 * px},${y + 5 * py} ${x - 5 * px},${y - 5 * py}" fill="${color}"/>`;
  };

  // clockwise rotation arrow (amber) — INPUT motion only, per leak rules
  const rotArrowCW = (cx, cy, r) => {
    const x1 = cx - 0.94 * r, y1 = cy - 0.342 * r, x2 = cx + 0.94 * r, y2 = cy - 0.342 * r;
    return `<path d="M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}" fill="none" stroke="${AMBER}" stroke-width="3"/>` +
      head(x2, y2, 0.342, 0.94, AMBER);
  };

  const gear = (cx, cy, r, hub = true) => {
    let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${FILL}" stroke="${INK}" stroke-width="2"/>`;
    const n = Math.max(10, Math.round((2 * Math.PI * r) / 17));
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n, ca = Math.cos(a), sa = Math.sin(a);
      s += `<line x1="${(cx + (r - 3) * ca).toFixed(1)}" y1="${(cy + (r - 3) * sa).toFixed(1)}" x2="${(cx + (r + 5) * ca).toFixed(1)}" y2="${(cy + (r + 5) * sa).toFixed(1)}" stroke="${INK}" stroke-width="1.5"/>`;
    }
    if (hub) s += `<circle cx="${cx}" cy="${cy}" r="6" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="${INK}"/>`;
    return s;
  };

  // labelled white chip (for text over hatch/dashes)
  const chip = (x, y, w) => `<rect x="${x - w / 2}" y="${y - 10}" width="${w}" height="13" fill="#fff"/>`;

  // ── schematic symbols (circuits) ──
  // battery on a VERTICAL wire: long plate (+) above short thick plate (−)
  const battery = (x, y) =>
    `<line x1="${x - 18}" y1="${y}" x2="${x + 18}" y2="${y}" stroke="${INK}" stroke-width="2"/>` +
    `<line x1="${x - 9}" y1="${y + 11}" x2="${x + 9}" y2="${y + 11}" stroke="${INK}" stroke-width="4"/>` +
    mono(x + 26, y + 3, '+', 12, INK, 'start', 600);
  // open knife switch on a horizontal wire, 46px gap, lever up-left
  const swOpen = (x, y) =>
    `<circle cx="${x}" cy="${y}" r="3.5" fill="${INK}"/><circle cx="${x + 46}" cy="${y}" r="3.5" fill="${INK}"/>` +
    `<line x1="${x}" y1="${y}" x2="${x + 38}" y2="${y - 22}" stroke="${INK}" stroke-width="2"/>`;
  // schematic lamp: circle with X
  const bulbSym = (cx, cy, r = 14) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
    `<line x1="${cx - 0.62 * r}" y1="${cy - 0.62 * r}" x2="${cx + 0.62 * r}" y2="${cy + 0.62 * r}" stroke="${INK}" stroke-width="1.75"/>` +
    `<line x1="${cx - 0.62 * r}" y1="${cy + 0.62 * r}" x2="${cx + 0.62 * r}" y2="${cy - 0.62 * r}" stroke="${INK}" stroke-width="1.75"/>`;

  // ── fluids / pressure primitives ──
  const WATER = 'rgba(10,61,98,0.08)';
  // waterline with ripple ticks
  const waterTop = (x1, x2, y) => {
    let s = `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${STEEL}" stroke-width="1.5"/>`;
    [0.25, 0.5, 0.75].forEach(f => {
      const x = x1 + f * (x2 - x1);
      s += `<line x1="${x - 9}" y1="${y + 7}" x2="${x + 9}" y2="${y + 7}" stroke="${STEEL}" stroke-width="1"/>`;
    });
    return s;
  };
  // BLANK pressure gauge — tick marks, center pin, NO needle (leak rule)
  const gauge = (cx, cy) => {
    let s = `<circle cx="${cx}" cy="${cy}" r="15" fill="#fff" stroke="${INK}" stroke-width="2"/>`;
    for (let a = 200; a <= 340; a += 35) {
      const rad = (a * Math.PI) / 180, ca = Math.cos(rad), sa = Math.sin(rad);
      s += `<line x1="${(cx + 10 * ca).toFixed(1)}" y1="${(cy + 10 * sa).toFixed(1)}" x2="${(cx + 13.5 * ca).toFixed(1)}" y2="${(cy + 13.5 * sa).toFixed(1)}" stroke="${STEEL}" stroke-width="1"/>`;
    }
    return s + `<circle cx="${cx}" cy="${cy}" r="2" fill="${STEEL}"/>`;
  };
  // sparse 45° tick hatch over a rect area (trapped/compressed gas)
  const hatchArea = (x1, y1, x2, y2) => {
    let s = '';
    for (let y = y1 + 20; y < y2; y += 26)
      for (let x = x1 + 8; x < x2 - 14; x += 28)
        s += `<line x1="${x}" y1="${y}" x2="${x + 12}" y2="${y - 12}" stroke="${STEEL}" stroke-width="1"/>`;
    return s;
  };
  // zigzag compression spring between x1–x2 (same coil count = honest comparison)
  const springPath = (x1, x2, y, coils, amp, sw) => {
    const n = coils * 2, step = (x2 - x1) / (n + 1);
    let d = `M ${x1} ${y}`;
    for (let i = 1; i <= n; i++) d += ` L ${(x1 + i * step).toFixed(1)} ${y + (i % 2 ? -amp : amp)}`;
    d += ` L ${x2} ${y}`;
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  };

  // horizontal pipe that narrows midway (q36/q37), inlet arrow only
  const narrowingPipe = () =>
    `<polygon points="100,160 280,160 320,190 600,190 600,230 320,230 280,260 100,260" fill="${WATER}"/>` +
    `<path d="M 100 160 L 280 160 L 320 190 L 600 190" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
    `<path d="M 100 260 L 280 260 L 320 230 L 600 230" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
    `<line x1="118" y1="210" x2="182" y2="210" stroke="${AMBER}" stroke-width="3"/>` +
    head(182, 210, 1, 0, AMBER) +
    mono(150, 194, 'FLOW IN', 10.5);

  const svg = (inner) => `<svg viewBox="0 0 700 420" width="100%" role="img">${inner}</svg>`;

  window.MC_DIAGRAMS = {

    // ── mc_q1: levers — 36" pry bar, grip positions, no force arrows ──
    mc_q1: svg(
      ground(50, 660, 345) +
      // pry bar (drawn first; crate fill covers the tip)
      `<line x1="172" y1="342" x2="640" y2="212" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
      `<polygon points="224,330 204,345 244,345" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      crateBox(70, 233, 110, 112, 'CRATE') +
      sans(252, 341, 'FULCRUM', 12, STEEL, 'start') +
      // grip marks (positions only — no force arrows)
      `<circle cx="406" cy="277" r="7" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="402" y1="284" x2="394" y2="306" stroke="${STEEL}" stroke-width="1"/>` +
      mono(392, 320, 'GRIP 1 · MID-BAR', 12.5) +
      `<circle cx="628" cy="215" r="7" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="624" y1="208" x2="614" y2="184" stroke="${STEEL}" stroke-width="1"/>` +
      mono(600, 172, 'GRIP 2 · FAR END', 12.5) +
      // dimensions
      ext(172, 348, 386) + ext(224, 348, 368) + ext(640, 222, 386) +
      `<line x1="172" y1="362" x2="224" y2="362" stroke="${STEEL}" stroke-width="1"/>` +
      dimTick(172, 362) + dimTick(224, 362) +
      `<rect x="178" y="346" width="40" height="13" fill="#fff"/>` +
      mono(198, 356, '4 IN', 12, COPPER, 'middle', 600) +
      dimLine(172, 640, 380, 'PRY BAR · 36 IN', 374)
    ),

    // ── mc_q2: levers — fulcrum position, WORKER A vs WORKER B ──
    mc_q2: svg(
      divider(350) +
      panelTag(28, 48, 'WORKER A') + panelTag(378, 48, 'WORKER B') +
      // panel A — fulcrum farther from crate
      ground(25, 330, 330) +
      `<line x1="126" y1="322" x2="322" y2="247" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
      `<polygon points="210,296 192,330 228,330" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      crateBox(40, 240, 80, 90, 'CRATE') +
      mitt(322, 247) + mono(322, 224, 'GRIP', 11) +
      // panel B — fulcrum nearer the crate
      ground(378, 682, 330) +
      `<line x1="478" y1="322" x2="649" y2="200" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
      `<polygon points="520,298 502,330 538,330" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      crateBox(392, 240, 80, 90, 'CRATE') +
      mitt(649, 200) + mono(649, 177, 'GRIP', 11)
    ),

    // ── mc_q3: levers — wheelbarrow, two dashed brick-stack positions ──
    mc_q3: svg(
      ground(60, 640, 353) +
      // wheel (left) + frame + leg + handle
      `<circle cx="155" cy="315" r="38" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="155" cy="315" r="5" fill="${INK}"/>` +
      `<line x1="150" y1="268" x2="155" y2="313" stroke="${INK}" stroke-width="2.5"/>` +
      `<line x1="330" y1="268" x2="352" y2="353" stroke="${INK}" stroke-width="2.5"/>` +
      `<polygon points="110,185 350,185 330,268 150,268" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="350" y1="185" x2="468" y2="156" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>` +
      `<line x1="452" y1="160" x2="468" y2="156" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
      sans(497, 168, 'HANDLES', 12, STEEL, 'start') +
      // two candidate stack positions — identical dashed outlines
      `<rect x="150" y="155" width="80" height="105" fill="none" stroke="${STEEL}" stroke-width="1.5" stroke-dasharray="6 4"/>` +
      `<rect x="250" y="155" width="80" height="105" fill="none" stroke="${STEEL}" stroke-width="1.5" stroke-dasharray="6 4"/>` +
      mono(190, 140, 'NEAR WHEEL', 12.5) +
      mono(290, 140, 'NEAR HANDLES', 12.5)
    ),

    // ── mc_q4: levers — torque balance (EQUAL-ANSWER: beam perfectly level) ──
    mc_q4: svg(
      ground(240, 460, 300) +
      `<polygon points="350,216 318,300 382,300" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="110" y1="212" x2="590" y2="212" stroke="${INK}" stroke-width="5"/>` +
      crateBox(138, 158, 64, 50) + mono(170, 188, '60 LB', 13, COPPER, 'middle', 600) +
      crateBox(449, 152, 72, 58) + mono(485, 186, '80 LB', 13, COPPER, 'middle', 600) +
      sans(350, 320, 'PIVOT', 11) +
      // distances above the beam (weights + distances only — never the products)
      ext(170, 128, 152) + ext(350, 128, 208) + ext(485, 128, 146) +
      dimLine(170, 350, 134, '4 FT', 126) +
      dimLine(350, 485, 134, '3 FT', 126)
    ),

    // ── mc_q5: levers — HAMMER A (short) vs HAMMER B (long), identical nails ──
    // Nail-pulling pose: head face rests on the board (fulcrum), claw hooks the
    // nail head, handle leans up-and-right. Panels identical except handle length.
    mc_q5: svg(
      divider(350) +
      panelTag(28, 48, 'HAMMER A') + panelTag(378, 48, 'HAMMER B') +
      // panel A — board + nail + claw hammer, SHORT handle
      `<rect x="40" y="310" width="280" height="30" fill="${FILL}" stroke="${INK}" stroke-width="1.5"/>` +
      `<line x1="70" y1="336" x2="86" y2="314" stroke="${STEEL}" stroke-width="1"/>` +
      `<line x1="120" y1="336" x2="136" y2="314" stroke="${STEEL}" stroke-width="1"/>` +
      `<line x1="250" y1="336" x2="266" y2="314" stroke="${STEEL}" stroke-width="1"/>` +
      `<line x1="180" y1="296" x2="180" y2="330" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="173" y1="296" x2="187" y2="296" stroke="${INK}" stroke-width="3"/>` +
      // handle (from head midpoint, ~50° up-right) + grip at the end
      `<line x1="201" y1="299" x2="265" y2="222" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
      // head bar: claw end high, striking face resting on the board
      `<line x1="188" y1="288" x2="214" y2="310" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>` +
      // claw hooking under the nail head
      `<path d="M 189 288 Q 180 290 176 297" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>` +
      mitt(265, 222) + mono(265, 200, 'GRIP', 11) +
      sans(180, 360, 'NAIL', 11) +
      // panel B — identical board, nail, head, angle — LONGER handle only
      `<rect x="390" y="310" width="280" height="30" fill="${FILL}" stroke="${INK}" stroke-width="1.5"/>` +
      `<line x1="420" y1="336" x2="436" y2="314" stroke="${STEEL}" stroke-width="1"/>` +
      `<line x1="470" y1="336" x2="486" y2="314" stroke="${STEEL}" stroke-width="1"/>` +
      `<line x1="600" y1="336" x2="616" y2="314" stroke="${STEEL}" stroke-width="1"/>` +
      `<line x1="530" y1="296" x2="530" y2="330" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="523" y1="296" x2="537" y2="296" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="551" y1="299" x2="657" y2="173" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
      `<line x1="538" y1="288" x2="564" y2="310" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>` +
      `<path d="M 539 288 Q 530 290 526 297" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>` +
      mitt(657, 173) + mono(657, 151, 'GRIP', 11) +
      sans(530, 360, 'NAIL', 11)
    ),

    // ── mc_q6: pulleys — RIG A movable vs RIG B fixed, identical blocks ──
    mc_q6: svg(
      beam(30, 670, 40, 62) +
      divider(350) +
      panelTag(30, 95, 'RIG A') + panelTag(380, 95, 'RIG B') +
      // RIG A — movable pulley (rope anchored to beam)
      `<rect x="130" y="62" width="16" height="7" fill="${INK}"/>` +
      `<path d="M 138 69 L 138 252 A 22 22 0 0 1 182 252 L 182 118" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      `<circle cx="160" cy="252" r="22" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="160" cy="252" r="3" fill="${INK}"/>` +
      `<line x1="160" y1="274" x2="160" y2="290" stroke="${INK}" stroke-width="2"/>` +
      crateBox(105, 290, 110, 72, 'ENGINE') +
      mitt(182, 109) + mono(182, 88, 'GRIP', 11) +
      sans(110, 260, 'MOVABLE', 10, STEEL, 'end') +
      // RIG B — fixed pulley on the beam
      `<line x1="510" y1="62" x2="510" y2="74" stroke="${INK}" stroke-width="2.5"/>` +
      `<circle cx="510" cy="96" r="22" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="510" cy="96" r="3" fill="${INK}"/>` +
      `<path d="M 488 290 L 488 96 A 22 22 0 0 1 532 96 L 532 230" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      crateBox(455, 290, 110, 72, 'ENGINE') +
      mitt(532, 239) + mono(561, 243, 'GRIP', 11, STEEL, 'start') +
      sans(545, 78, 'FIXED', 10, STEEL, 'start')
    ),

    // ── mc_q7: pulleys — block & tackle, two countable strands, 120 LB motor ──
    mc_q7: svg(
      beam(30, 670, 40, 62) +
      `<line x1="355" y1="62" x2="355" y2="71" stroke="${INK}" stroke-width="2.5"/>` +
      // rope: becket → around lower sheave → over upper sheave → out to grip
      `<path d="M 341 130 L 341 245 A 14 14 0 0 1 369 245 L 375 96 A 20 20 0 0 0 335 96 L 240 205" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      // upper block
      `<rect x="326" y="71" width="58" height="50" rx="6" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="355" cy="96" r="20" fill="${FILL}" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="355" cy="96" r="3" fill="${INK}"/>` +
      `<line x1="341" y1="121" x2="341" y2="126" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="341" cy="129" r="4" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      // lower block
      `<rect x="333" y="228" width="44" height="40" rx="5" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="355" cy="245" r="14" fill="${FILL}" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="355" cy="245" r="2.5" fill="${INK}"/>` +
      `<line x1="355" y1="268" x2="355" y2="284" stroke="${INK}" stroke-width="2"/>` +
      // strand counters
      `<circle cx="314" cy="185" r="9" fill="#fff" stroke="${STEEL}" stroke-width="1"/>` + mono(314, 189, '1', 11) +
      `<line x1="323" y1="185" x2="337" y2="185" stroke="${STEEL}" stroke-width="0.75"/>` +
      `<circle cx="398" cy="185" r="9" fill="#fff" stroke="${STEEL}" stroke-width="1"/>` + mono(398, 189, '2', 11) +
      `<line x1="389" y1="185" x2="375" y2="185" stroke="${STEEL}" stroke-width="0.75"/>` +
      mono(414, 189, '2 SUPPORTING STRANDS', 12, STEEL, 'start') +
      // motor
      crateBox(300, 284, 110, 72) + sans(355, 312, 'MOTOR', 11) +
      mono(355, 336, '120 LB', 13, COPPER, 'middle', 600) +
      mitt(233, 213) + mono(233, 236, 'GRIP', 11)
    ),

    // ── mc_q8: pulleys — same hoist, 2 strands vs 4 strands ──
    mc_q8: svg(
      divider(350) +
      mono(64, 40, 'BEFORE', 12, STEEL, 'start') + mono(414, 40, 'AFTER', 12, STEEL, 'start') +
      beam(60, 290, 50, 70) + beam(410, 640, 50, 70) +
      // 2 strands
      `<rect x="130" y="70" width="90" height="22" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="155" y1="92" x2="155" y2="230" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="195" y1="92" x2="195" y2="230" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="130" y="230" width="90" height="22" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="175" y1="252" x2="175" y2="264" stroke="${INK}" stroke-width="2"/>` +
      crateBox(120, 264, 110, 80, 'CRATE') +
      `<line x1="220" y1="81" x2="266" y2="128" stroke="${INK}" stroke-width="1.75"/>` + mitt(271, 134) +
      mono(175, 380, '2 STRANDS', 13, COPPER, 'middle', 600) +
      // 4 strands
      `<rect x="475" y="70" width="100" height="22" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="489" y1="92" x2="489" y2="230" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="513" y1="92" x2="513" y2="230" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="537" y1="92" x2="537" y2="230" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="561" y1="92" x2="561" y2="230" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="475" y="230" width="100" height="22" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="525" y1="252" x2="525" y2="264" stroke="${INK}" stroke-width="2"/>` +
      crateBox(470, 264, 110, 80, 'CRATE') +
      `<line x1="575" y1="81" x2="618" y2="128" stroke="${INK}" stroke-width="1.75"/>` + mitt(623, 134) +
      mono(525, 380, '4 STRANDS', 13, COPPER, 'middle', 600)
    ),

    // ── mc_q9: pulleys — fixed pulley vs straight lift (EQUAL-ANSWER: no arrows, honest angles) ──
    mc_q9: svg(
      divider(430) +
      panelTag(28, 48, 'WITH PULLEY') + panelTag(458, 48, 'BY HAND') +
      // left — pole-top fixed pulley
      ground(40, 410, 360) +
      `<line x1="225" y1="360" x2="225" y2="84" stroke="${INK}" stroke-width="3.5"/>` +
      `<path d="M 209 84 L 209 264 M 241 84 L 241 300" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      `<path d="M 209 84 A 16 16 0 0 1 241 84" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      `<circle cx="225" cy="84" r="16" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="225" cy="84" r="3" fill="${INK}"/>` +
      `<path d="M 186 282 Q 209 258 232 282" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="209" y1="264" x2="209" y2="268" stroke="${INK}" stroke-width="1.75"/>` +
      `<polygon points="184,282 234,282 228,330 190,330" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      sans(209, 348, 'BUCKET', 10) +
      mitt(241, 309) + mono(272, 313, 'GRIP', 11, STEEL, 'start') +
      // right — same bucket, straight lift
      ground(450, 690, 360) +
      `<line x1="560" y1="140" x2="560" y2="264" stroke="${INK}" stroke-width="1.75"/>` +
      mitt(560, 131) + mono(560, 110, 'GRIP', 11) +
      `<path d="M 537 282 Q 560 258 583 282" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="560" y1="264" x2="560" y2="270" stroke="${INK}" stroke-width="1.75"/>` +
      `<polygon points="535,282 585,282 579,330 541,330" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      sans(560, 348, 'BUCKET', 10)
    ),

    // ── mc_q10: pulleys — 1 / 2 / 4 supporting strands, same crate ──
    mc_q10: svg(
      divider(233) + divider(466) +
      beam(30, 203, 60, 78) + beam(263, 436, 60, 78) + beam(496, 669, 60, 78) +
      // 1 strand
      `<line x1="116" y1="78" x2="116" y2="240" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="86" y="240" width="60" height="18" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      crateBox(71, 258, 90, 70, 'CRATE') +
      mono(116, 375, '1 STRAND', 13, COPPER, 'middle', 600) +
      // 2 strands
      `<line x1="335" y1="78" x2="335" y2="240" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="364" y1="78" x2="364" y2="240" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="319" y="240" width="60" height="18" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      crateBox(304, 258, 90, 70, 'CRATE') +
      mono(349, 375, '2 STRANDS', 13, COPPER, 'middle', 600) +
      // 4 strands
      `<line x1="549" y1="78" x2="549" y2="240" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="571" y1="78" x2="571" y2="240" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="593" y1="78" x2="593" y2="240" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="615" y1="78" x2="615" y2="240" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="537" y="240" width="90" height="18" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      crateBox(537, 258, 90, 70, 'CRATE') +
      mono(582, 375, '4 STRANDS', 13, COPPER, 'middle', 600)
    ),

    // ── mc_q11: gears — two meshed gears, CW input arrow on LEFT gear only ──
    mc_q11: svg(
      gear(275, 225, 70) + gear(415, 225, 70) +
      rotArrowCW(275, 225, 44) +
      mono(275, 334, 'LEFT GEAR', 12) + mono(415, 334, 'RIGHT GEAR', 12)
    ),

    // ── mc_q12: gears — three in a row, CW input arrow on GEAR 1 only ──
    mc_q12: svg(
      gear(236, 225, 58) + gear(352, 225, 58) + gear(468, 225, 58) +
      rotArrowCW(236, 225, 36) +
      mono(236, 322, 'GEAR 1', 12) + mono(352, 322, 'GEAR 2', 12) + mono(468, 322, 'GEAR 3', 12)
    ),

    // ── mc_q13: gears — 12T drives 36T, NO rotation arrows ──
    mc_q13: svg(
      gear(240, 240, 42, false) + gear(408, 240, 126, false) +
      mono(240, 245, '12T', 14, COPPER, 'middle', 600) +
      mono(408, 245, '36T', 14, COPPER, 'middle', 600) +
      sans(240, 306, 'DRIVER', 11) + sans(408, 388, 'DRIVEN', 11)
    ),

    // ── mc_q14: gears — small / medium / large train, no arrows ──
    mc_q14: svg(
      gear(210, 250, 38) + gear(310, 250, 62) + gear(467, 250, 95) +
      mono(210, 372, 'SMALL', 11.5) + mono(310, 372, 'MEDIUM', 11.5) + mono(467, 372, 'LARGE', 11.5)
    ),

    // ── mc_q15: belts — straight (uncrossed) belt, CW input arrow on LEFT wheel only ──
    mc_q15: svg(
      `<path d="M 230 144 L 470 144 A 71 71 0 0 1 470 286 L 230 286 A 71 71 0 0 1 230 144" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      `<circle cx="230" cy="215" r="65" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="230" cy="215" r="6" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="230" cy="215" r="2.5" fill="${INK}"/>` +
      `<circle cx="470" cy="215" r="65" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="470" cy="215" r="6" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="470" cy="215" r="2.5" fill="${INK}"/>` +
      rotArrowCW(230, 215, 40) +
      sans(350, 128, 'UNCROSSED BELT', 11) +
      mono(230, 330, 'LEFT WHEEL', 12) + mono(470, 330, 'RIGHT WHEEL', 12)
    ),

    // ── mc_q16: inclines — 6-ft vs 12-ft ramp to the same truck bed ──
    mc_q16: svg(
      divider(350) +
      mono(28, 48, '6-FT RAMP', 14, COPPER, 'start', 600) +
      mono(378, 48, '12-FT RAMP', 14, COPPER, 'start', 600) +
      ground(40, 335, 340) + ground(360, 695, 340) +
      // shared bed-height reference
      `<line x1="60" y1="260" x2="692" y2="260" stroke="${STEEL}" stroke-width="1" stroke-dasharray="7 5"/>` +
      chip(350, 254, 118) + mono(350, 250, 'SAME BED HEIGHT', 10.5) +
      // panel A — short steep ramp
      `<polygon points="120,340 225,260 225,340" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="225" y="260" width="56" height="80" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      sans(253, 304, 'BED', 10) +
      `<circle cx="100" cy="322" r="15" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="100" cy="322" r="6" fill="none" stroke="${INK}" stroke-width="1.25"/>` +
      mono(152, 284, '6 FT', 12, COPPER, 'middle', 600) +
      // panel B — ramp twice as long, same rise
      `<polygon points="384,340 636,260 636,340" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="636" y="260" width="56" height="80" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      sans(664, 304, 'BED', 10) +
      `<circle cx="368" cy="322" r="15" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="368" cy="322" r="6" fill="none" stroke="${INK}" stroke-width="1.25"/>` +
      mono(492, 282, '12 FT', 12, COPPER, 'middle', 600)
    ),

    // ── mc_q17: inclines — RAMP A steeper vs RAMP B shallower, same height ──
    mc_q17: svg(
      divider(350) +
      panelTag(28, 48, 'RAMP A') + panelTag(378, 48, 'RAMP B') +
      ground(50, 335, 340) + ground(360, 690, 340) +
      `<line x1="60" y1="250" x2="688" y2="250" stroke="${STEEL}" stroke-width="1" stroke-dasharray="7 5"/>` +
      chip(350, 246, 92) + mono(350, 242, 'SAME HEIGHT', 10.5) +
      // A — steep
      `<polygon points="130,340 230,250 230,340" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="230" y="250" width="60" height="90" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="74" y="306" width="52" height="20" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="86" cy="333" r="6" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/><circle cx="114" cy="333" r="6" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/>` +
      sans(100, 296, 'CART', 10) +
      // B — shallow, identical cart
      `<polygon points="410,340 620,250 620,340" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="620" y="250" width="60" height="90" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="354" y="306" width="52" height="20" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="366" cy="333" r="6" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/><circle cx="394" cy="333" r="6" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/>` +
      sans(380, 296, 'CART', 10)
    ),

    // ── mc_q18: inclines — before/after, ramp replaced by one 2× longer ──
    mc_q18: svg(
      divider(350) +
      mono(28, 40, 'BEFORE', 12, STEEL, 'start') + mono(378, 40, 'AFTER', 12, STEEL, 'start') +
      ground(46, 335, 340) + ground(360, 692, 340) +
      `<line x1="56" y1="270" x2="690" y2="270" stroke="${STEEL}" stroke-width="1" stroke-dasharray="7 5"/>` +
      chip(350, 266, 92) + mono(350, 262, 'SAME HEIGHT', 10.5) +
      // before — original ramp
      `<polygon points="120,340 218,270 218,340" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="218" y="270" width="56" height="70" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      crateBox(72, 306, 40, 34) +
      mono(152, 290, 'L', 13, COPPER, 'middle', 600) +
      // after — twice the length, same rise, identical load
      `<polygon points="400,340 630,270 630,340" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="630" y="270" width="56" height="70" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      crateBox(352, 306, 40, 34) +
      mono(498, 288, '2 × L', 13, COPPER, 'middle', 600)
    ),

    // ── mc_q19: inclines — ramp path vs straight lift, equal-weight route arrows ──
    mc_q19: svg(
      ground(60, 660, 340) +
      `<rect x="470" y="220" width="150" height="120" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      sans(545, 285, 'PLATFORM', 11) +
      `<polygon points="250,340 470,220 470,340" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      // barrel at the base of both routes
      `<rect x="200" y="292" width="50" height="48" rx="10" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="202" y1="306" x2="248" y2="306" stroke="${STEEL}" stroke-width="1"/>` +
      `<line x1="202" y1="326" x2="248" y2="326" stroke="${STEEL}" stroke-width="1"/>` +
      sans(225, 362, 'BARREL', 10) +
      // route 1 — up the ramp (dashed, no effort annotation)
      `<line x1="273" y1="307" x2="426" y2="224" stroke="${STEEL}" stroke-width="1.75" stroke-dasharray="6 5"/>` +
      head(426, 224, 0.878, -0.479) +
      mono(318, 248, 'UP THE RAMP', 11) +
      // route 2 — straight lift (dashed, equal weight, rising from the barrel)
      `<line x1="225" y1="284" x2="225" y2="222" stroke="${STEEL}" stroke-width="1.75" stroke-dasharray="6 5"/>` +
      head(225, 222, 0, -1) +
      mono(225, 196, 'STRAIGHT LIFT', 11)
    ),

    // ── mc_q47: circuits — battery + two switches in SERIES + bulb, switches open ──
    mc_q47: svg(
      // loop with component gaps
      `<line x1="150" y1="140" x2="250" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="296" y1="140" x2="390" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="436" y1="140" x2="550" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="550" y1="140" x2="550" y2="300" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="550" y1="300" x2="364" y2="300" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="336" y1="300" x2="150" y2="300" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="150" y1="300" x2="150" y2="222" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="150" y1="210" x2="150" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      battery(150, 210) + sans(108, 218, 'BATTERY', 10.5, STEEL, 'end') +
      swOpen(250, 140) + mono(273, 106, 'SWITCH 1', 11) +
      swOpen(390, 140) + mono(413, 106, 'SWITCH 2', 11) +
      bulbSym(350, 300) + sans(350, 340, 'BULB', 10.5)
    ),

    // ── mc_q48: circuits — two switches on PARALLEL branches + bulb, switches open ──
    mc_q48: svg(
      `<line x1="160" y1="140" x2="260" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="460" y1="140" x2="560" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      // branch 1 (upper)
      `<path d="M 260 140 L 260 100 L 330 100 M 376 100 L 460 100 L 460 140" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      swOpen(330, 100) + mono(353, 64, 'SWITCH 1', 11) +
      // branch 2 (lower) — identical geometry
      `<path d="M 260 140 L 260 180 L 330 180 M 376 180 L 460 180 L 460 140" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      swOpen(330, 180) + mono(353, 216, 'SWITCH 2', 11) +
      `<circle cx="260" cy="140" r="3.5" fill="${INK}"/><circle cx="460" cy="140" r="3.5" fill="${INK}"/>` +
      // right side: bulb, bottom return, battery
      `<line x1="560" y1="140" x2="560" y2="206" stroke="${INK}" stroke-width="1.75"/>` +
      bulbSym(560, 220) + sans(586, 224, 'BULB', 10.5, STEEL, 'start') +
      `<line x1="560" y1="234" x2="560" y2="300" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="560" y1="300" x2="160" y2="300" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="160" y1="300" x2="160" y2="222" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="160" y1="210" x2="160" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      battery(160, 210) + sans(118, 218, 'BATTERY', 10.5, STEEL, 'end')
    ),

    // ── mc_q49: circuits — string of 4 series lamps, one broken filament ──
    mc_q49: svg(
      `<line x1="140" y1="160" x2="224" y2="160" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="256" y1="160" x2="324" y2="160" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="356" y1="160" x2="424" y2="160" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="456" y1="160" x2="524" y2="160" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="556" y1="160" x2="620" y2="160" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="620" y1="160" x2="620" y2="320" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="620" y1="320" x2="140" y2="320" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="140" y1="320" x2="140" y2="252" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="140" y1="240" x2="140" y2="160" stroke="${INK}" stroke-width="1.75"/>` +
      battery(140, 240) + sans(100, 248, 'BATTERY', 10.5, STEEL, 'end') +
      bulbSym(240, 160, 16) + mono(240, 202, 'LAMP 1', 10.5) +
      bulbSym(340, 160, 16) + mono(340, 202, 'LAMP 2', 10.5) +
      // lamp 3 — broken filament: zigzag with a gap + burst marks (no X)
      `<circle cx="440" cy="160" r="16" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M 427 160 L 431 153 L 435 165" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      `<path d="M 445 165 L 449 153 L 453 160" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="437" y1="152" x2="434" y2="146" stroke="${AMBER}" stroke-width="2"/>` +
      `<line x1="443" y1="152" x2="446" y2="146" stroke="${AMBER}" stroke-width="2"/>` +
      `<line x1="440" y1="170" x2="440" y2="176" stroke="${AMBER}" stroke-width="2"/>` +
      mono(440, 202, 'LAMP 3', 10.5) +
      `<line x1="440" y1="138" x2="440" y2="116" stroke="${STEEL}" stroke-width="0.75"/>` +
      mono(440, 106, 'BROKEN FILAMENT', 10.5) +
      bulbSym(540, 160, 16) + mono(540, 202, 'LAMP 4', 10.5)
    ),

    // ── mc_q50: circuits — one-line panel: supply → master → bus → 3 branches → tools ──
    mc_q50: svg(
      `<line x1="100" y1="210" x2="190" y2="210" stroke="${INK}" stroke-width="1.75"/>` +
      mono(100, 192, 'SUPPLY', 11, STEEL, 'start') +
      swOpen(190, 210) + mono(212, 176, 'MASTER', 10.5) +
      `<line x1="236" y1="210" x2="340" y2="210" stroke="${INK}" stroke-width="1.75"/>` +
      // bus bar
      `<line x1="340" y1="140" x2="340" y2="280" stroke="${INK}" stroke-width="4"/>` +
      mono(340, 128, 'BUS', 10.5) +
      `<circle cx="340" cy="160" r="3.5" fill="${INK}"/><circle cx="340" cy="210" r="3.5" fill="${INK}"/><circle cx="340" cy="260" r="3.5" fill="${INK}"/>` +
      // branch 1
      `<line x1="340" y1="160" x2="420" y2="160" stroke="${INK}" stroke-width="1.75"/>` +
      swOpen(420, 160) + mono(443, 128, 'BRANCH 1', 10.5) +
      `<line x1="466" y1="160" x2="530" y2="160" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="530" y="144" width="92" height="32" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` + mono(576, 164, 'SAW', 11) +
      // branch 2
      `<line x1="340" y1="210" x2="420" y2="210" stroke="${INK}" stroke-width="1.75"/>` +
      swOpen(420, 210) + mono(443, 178, 'BRANCH 2', 10.5) +
      `<line x1="466" y1="210" x2="530" y2="210" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="530" y="194" width="92" height="32" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` + mono(576, 214, 'DRILL', 11) +
      // branch 3
      `<line x1="340" y1="260" x2="420" y2="260" stroke="${INK}" stroke-width="1.75"/>` +
      swOpen(420, 260) + mono(443, 228, 'BRANCH 3', 10.5) +
      `<line x1="466" y1="260" x2="530" y2="260" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="530" y="244" width="92" height="32" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` + mono(576, 264, 'GRINDER', 11)
    ),

    // ── mc_q51: circuits — simple loop with a BLOWN fuse (gap + burst marks) ──
    mc_q51: svg(
      `<line x1="170" y1="140" x2="310" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="310" y="126" width="80" height="28" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="310" y1="140" x2="338" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="362" y1="140" x2="390" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="344" y1="133" x2="340" y2="127" stroke="${AMBER}" stroke-width="2"/>` +
      `<line x1="356" y1="133" x2="360" y2="127" stroke="${AMBER}" stroke-width="2"/>` +
      `<line x1="344" y1="147" x2="340" y2="153" stroke="${AMBER}" stroke-width="2"/>` +
      `<line x1="356" y1="147" x2="360" y2="153" stroke="${AMBER}" stroke-width="2"/>` +
      mono(350, 106, 'BLOWN FUSE', 11) +
      `<line x1="390" y1="140" x2="530" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="530" y1="140" x2="530" y2="211" stroke="${INK}" stroke-width="1.75"/>` +
      bulbSym(530, 225) + sans(556, 229, 'BULB', 10.5, STEEL, 'start') +
      `<line x1="530" y1="239" x2="530" y2="310" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="530" y1="310" x2="170" y2="310" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="170" y1="310" x2="170" y2="237" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="170" y1="225" x2="170" y2="140" stroke="${INK}" stroke-width="1.75"/>` +
      battery(170, 225) + sans(130, 233, 'BATTERY', 10.5, STEEL, 'end')
    ),

    // ── mc_q30: gas pressure — same air, large tank → small tank, BLANK gauges ──
    mc_q30: svg(
      // transfer pipe with input-direction arrow
      `<path d="M 210 160 L 210 110 L 510 110 L 510 210" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="324" y="94" width="52" height="32" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      sans(350, 84, 'COMPRESSOR LINE', 10.5) +
      `<line x1="420" y1="110" x2="446" y2="110" stroke="${STEEL}" stroke-width="1.75"/>` + head(452, 110, 1, 0) +
      // large tank
      `<rect x="120" y="160" width="180" height="150" rx="14" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="150" y1="150" x2="150" y2="160" stroke="${INK}" stroke-width="2"/>` + gauge(150, 134) +
      mono(210, 336, 'LARGE TANK', 12) +
      // small tank
      `<rect x="460" y="210" width="100" height="100" rx="12" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="480" y1="200" x2="480" y2="210" stroke="${INK}" stroke-width="2"/>` + gauge(480, 184) +
      mono(510, 336, 'SMALL TANK', 12) +
      mono(350, 378, 'SAME AMOUNT OF AIR', 11.5)
    ),

    // ── mc_q31: gas pressure — sealed cylinder heated, BLANK gauge ──
    mc_q31: svg(
      `<rect x="300" y="110" width="100" height="170" rx="10" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      mono(350, 98, 'SEALED', 10.5) +
      `<line x1="400" y1="160" x2="416" y2="160" stroke="${INK}" stroke-width="2"/>` + gauge(431, 160) +
      // burner + flame (single amber accent — the stated input)
      `<line x1="322" y1="330" x2="378" y2="330" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M 340 326 Q 334 306 350 290 Q 366 306 360 326 Z" fill="${AMBER}"/>` +
      `<path d="M 330 326 Q 327 314 334 306" fill="none" stroke="${AMBER}" stroke-width="2"/>` +
      `<path d="M 370 326 Q 373 314 366 306" fill="none" stroke="${AMBER}" stroke-width="2"/>` +
      mono(350, 356, 'HEAT', 11)
    ),

    // ── mc_q32: gas pressure — rigid tank, valve open, half the air released ──
    mc_q32: svg(
      `<rect x="240" y="140" width="220" height="160" rx="14" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="300" y1="130" x2="300" y2="140" stroke="${INK}" stroke-width="2"/>` + gauge(300, 114) +
      mono(350, 330, 'RIGID TANK', 12) +
      // open valve on the outlet
      `<line x1="460" y1="190" x2="495" y2="190" stroke="${INK}" stroke-width="1.75"/>` +
      `<polygon points="495,182 495,198 515,190" fill="#fff" stroke="${INK}" stroke-width="1.75"/>` +
      `<polygon points="535,182 535,198 515,190" fill="#fff" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="515" y1="190" x2="515" y2="172" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="535" y1="190" x2="545" y2="190" stroke="${INK}" stroke-width="1.75"/>` +
      // escaping-air dashes
      `<line x1="552" y1="184" x2="566" y2="180" stroke="${STEEL}" stroke-width="1.5"/>` +
      `<line x1="552" y1="190" x2="570" y2="190" stroke="${STEEL}" stroke-width="1.5"/>` +
      `<line x1="552" y1="196" x2="566" y2="200" stroke="${STEEL}" stroke-width="1.5"/>` +
      `<line x1="576" y1="186" x2="588" y2="183" stroke="${STEEL}" stroke-width="1.5"/>` +
      `<line x1="578" y1="194" x2="590" y2="197" stroke="${STEEL}" stroke-width="1.5"/>` +
      mono(586, 224, 'HALF THE AIR RELEASED', 10.5, STEEL, 'middle')
    ),

    // ── mc_q33: pistons — ignition beneath piston, NO motion arrow ──
    mc_q33: svg(
      `<line x1="300" y1="110" x2="300" y2="330" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="400" y1="110" x2="400" y2="330" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="300" y1="330" x2="400" y2="330" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="350" y1="180" x2="350" y2="110" stroke="${INK}" stroke-width="6"/>` +
      `<rect x="304" y="180" width="92" height="34" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="304" y1="191" x2="396" y2="191" stroke="${STEEL}" stroke-width="1"/>` +
      `<line x1="304" y1="202" x2="396" y2="202" stroke="${STEEL}" stroke-width="1"/>` +
      // combustion sparks (amber burst — the stated input)
      (() => { let s = ''; for (let a = 0; a < 360; a += 60) {
        const r1 = 8, r2 = 20, rad = (a * Math.PI) / 180;
        s += `<line x1="${(350 + r1 * Math.cos(rad)).toFixed(1)}" y1="${(272 + r1 * Math.sin(rad)).toFixed(1)}" x2="${(350 + r2 * Math.cos(rad)).toFixed(1)}" y2="${(272 + r2 * Math.sin(rad)).toFixed(1)}" stroke="${AMBER}" stroke-width="2.5"/>`;
      } return s; })() +
      sans(452, 200, 'PISTON', 10.5, STEEL, 'start') +
      `<line x1="400" y1="197" x2="446" y2="197" stroke="${STEEL}" stroke-width="0.75"/>` +
      sans(248, 224, 'CYLINDER', 10.5, STEEL, 'end') +
      `<line x1="254" y1="220" x2="296" y2="220" stroke="${STEEL}" stroke-width="0.75"/>` +
      mono(350, 356, 'IGNITION', 11)
    ),

    // ── mc_q34: pistons — piston pressed inward, input arrow on rod only ──
    mc_q34: svg(
      `<line x1="180" y1="160" x2="520" y2="160" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="180" y1="260" x2="520" y2="260" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="520" y1="160" x2="520" y2="260" stroke="${INK}" stroke-width="3"/>` +
      sans(520, 148, 'SEALED END', 10) +
      hatchArea(342, 162, 518, 258) +
      chip(430, 214, 92) + mono(430, 210, 'TRAPPED AIR', 10.5) +
      `<line x1="190" y1="210" x2="300" y2="210" stroke="${INK}" stroke-width="6"/>` +
      `<rect x="300" y="164" width="40" height="92" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      // input push (amber, on the rod side only)
      `<line x1="212" y1="188" x2="266" y2="188" stroke="${AMBER}" stroke-width="3"/>` + head(266, 188, 1, 0, AMBER) +
      mono(238, 174, 'PUSH', 10.5) +
      sans(320, 290, 'PISTON', 10.5)
    ),

    // ── mc_q35: pistons — hydraulic jack, down-push arrow on small piston only ──
    mc_q35: svg(
      `<polygon points="164,220 216,220 216,304 424,304 424,250 556,250 556,336 164,336" fill="${WATER}"/>` +
      `<line x1="160" y1="170" x2="160" y2="340" stroke="${INK}" stroke-width="2.5"/>` +
      `<line x1="220" y1="170" x2="220" y2="300" stroke="${INK}" stroke-width="2.5"/>` +
      `<line x1="220" y1="300" x2="420" y2="300" stroke="${INK}" stroke-width="2.5"/>` +
      `<line x1="420" y1="170" x2="420" y2="300" stroke="${INK}" stroke-width="2.5"/>` +
      `<line x1="560" y1="170" x2="560" y2="340" stroke="${INK}" stroke-width="2.5"/>` +
      `<line x1="160" y1="340" x2="560" y2="340" stroke="${INK}" stroke-width="2.5"/>` +
      `<line x1="191" y1="190" x2="191" y2="130" stroke="${INK}" stroke-width="5"/>` +
      `<rect x="162" y="190" width="56" height="26" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="491" y1="218" x2="491" y2="150" stroke="${INK}" stroke-width="7"/>` +
      `<rect x="422" y="218" width="136" height="28" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      // input push (amber, small side only)
      `<line x1="140" y1="138" x2="140" y2="178" stroke="${AMBER}" stroke-width="3"/>` + head(140, 178, 0, 1, AMBER) +
      mono(140, 124, 'PUSH', 10.5) +
      sans(252, 184, 'SMALL PISTON', 10.5, STEEL, 'start') +
      `<line x1="248" y1="188" x2="222" y2="196" stroke="${STEEL}" stroke-width="0.75"/>` +
      sans(491, 138, 'LARGE PISTON', 10.5) +
      sans(320, 326, 'FLUID', 10.5)
    ),

    // ── mc_q36: fluid flow — pipe narrows midway, single inlet arrow ──
    mc_q36: svg(narrowingPipe()),

    // ── mc_q37: fluid flow — same pipe, WIDE / NARROW tags, inlet arrow only ──
    mc_q37: svg(
      narrowingPipe() +
      mono(190, 146, 'WIDE', 12) +
      mono(460, 176, 'NARROW', 12)
    ),

    // ── mc_q38: fluid flow — hose end, thumb over half the opening, NO stream ──
    mc_q38: svg(
      `<rect x="143" y="193" width="277" height="54" fill="${WATER}"/>` +
      `<line x1="140" y1="190" x2="420" y2="190" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="140" y1="250" x2="420" y2="250" stroke="${INK}" stroke-width="3"/>` +
      `<rect x="420" y="182" width="30" height="76" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      sans(280, 174, 'GARDEN HOSE', 10.5) +
      // thumb covering the upper half of the opening
      `<path d="M 448 182 L 448 220 L 500 220 Q 516 200 508 176 Q 488 160 462 170 Z" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      sans(524, 172, 'THUMB', 10.5, STEEL, 'start') +
      `<line x1="520" y1="176" x2="506" y2="184" stroke="${STEEL}" stroke-width="0.75"/>` +
      `<line x1="450" y1="220" x2="450" y2="258" stroke="${INK}" stroke-width="2"/>` +
      mono(470, 296, 'HALF-COVERED OPENING', 10.5) +
      `<line x1="470" y1="286" x2="454" y2="242" stroke="${STEEL}" stroke-width="0.75"/>`
    ),

    // ── mc_q39: fluid flow — identical tanks, same level, different hole widths ──
    mc_q39: svg(
      `<path d="M 120 140 L 120 320 L 200 320 M 212 320 L 300 320 L 300 140" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      `<rect x="123" y="172" width="174" height="146" fill="${WATER}"/>` +
      waterTop(123, 297, 172) +
      `<path d="M 400 140 L 400 320 L 478 320 M 510 320 L 580 320 L 580 140" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      `<rect x="403" y="172" width="174" height="146" fill="${WATER}"/>` +
      waterTop(403, 577, 172) +
      `<line x1="106" y1="172" x2="594" y2="172" stroke="${STEEL}" stroke-width="1" stroke-dasharray="7 5"/>` +
      chip(350, 132, 128) + mono(350, 128, 'SAME WATER LEVEL', 10.5) +
      `<line x1="350" y1="136" x2="350" y2="168" stroke="${STEEL}" stroke-width="0.75"/>` +
      mono(206, 352, 'NARROW HOLE', 11) +
      mono(494, 352, 'WIDE HOLE', 11)
    ),

    // ── mc_q40: buoyancy — fresh water vs seawater, IDENTICAL waterlines ──
    mc_q40: svg(
      `<path d="M 110 180 L 110 330 L 310 330 L 310 180" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      crateBox(175, 178, 70, 56, 'CRATE') +
      `<rect x="113" y="210" width="194" height="117" fill="${WATER}"/>` +
      waterTop(113, 307, 210) +
      `<path d="M 390 180 L 390 330 L 590 330 L 590 180" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      crateBox(455, 178, 70, 56, 'CRATE') +
      `<rect x="393" y="210" width="194" height="117" fill="${WATER}"/>` +
      waterTop(393, 587, 210) +
      mono(210, 362, 'FRESH WATER', 12) +
      mono(490, 362, 'SEAWATER', 12)
    ),

    // ── mc_q41: buoyancy — cork ball vs steel ball, same size, mid-drop ──
    mc_q41: svg(
      `<path d="M 200 230 L 200 350 L 500 350 L 500 230" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      `<rect x="203" y="262" width="294" height="86" fill="${WATER}"/>` +
      waterTop(203, 497, 262) +
      `<circle cx="290" cy="150" r="26" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="282" cy="144" r="1.5" fill="${STEEL}"/><circle cx="296" cy="152" r="1.5" fill="${STEEL}"/><circle cx="288" cy="160" r="1.5" fill="${STEEL}"/><circle cx="298" cy="140" r="1.5" fill="${STEEL}"/>` +
      mono(290, 108, 'CORK', 11) +
      `<circle cx="410" cy="150" r="26" fill="${STEEL}" stroke="${INK}" stroke-width="2"/>` +
      mono(410, 108, 'STEEL', 11) +
      sans(350, 384, 'SAME DIAMETER · DROPPED TOGETHER', 10.5)
    ),

    // ── mc_q42: buoyancy — barge being loaded, waterline at CURRENT level only ──
    mc_q42: svg(
      `<rect x="60" y="282" width="580" height="68" fill="${WATER}"/>` +
      waterTop(60, 640, 282) +
      mono(62, 268, 'WATERLINE', 10.5, STEEL, 'start') +
      `<line x1="75" y1="272" x2="75" y2="280" stroke="${STEEL}" stroke-width="0.75"/>` +
      // barge hull + deck cargo
      `<polygon points="150,240 450,240 435,305 165,305" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      crateBox(200, 206, 50, 34) + crateBox(260, 206, 50, 34) +
      sans(360, 268, 'BARGE', 10.5) +
      // dock + crane loading a pallet
      `<rect x="500" y="240" width="140" height="42" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="520" y1="282" x2="520" y2="348" stroke="${INK}" stroke-width="4"/>` +
      `<line x1="610" y1="282" x2="610" y2="348" stroke="${INK}" stroke-width="4"/>` +
      sans(570, 264, 'DOCK', 10.5) +
      `<line x1="560" y1="240" x2="560" y2="86" stroke="${INK}" stroke-width="4"/>` +
      `<line x1="560" y1="86" x2="380" y2="112" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="384" y1="112" x2="384" y2="182" stroke="${INK}" stroke-width="1.5"/>` +
      crateBox(359, 182, 50, 34) +
      sans(330, 158, 'CARGO IN', 10.5, STEEL, 'end')
    ),

    // ── mc_q43: buoyancy — block held above tank, DENSER THAN WATER tag ──
    mc_q43: svg(
      mono(350, 82, 'DENSER THAN WATER', 11.5) +
      `<line x1="330" y1="102" x2="330" y2="110" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="370" y1="102" x2="370" y2="110" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="326" y1="102" x2="374" y2="102" stroke="${INK}" stroke-width="3"/>` +
      `<rect x="310" y="110" width="80" height="60" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      sans(350, 144, 'BLOCK', 10.5) +
      `<path d="M 220 200 L 220 350 L 480 350 L 480 200" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      `<rect x="223" y="242" width="254" height="106" fill="${WATER}"/>` +
      waterTop(223, 477, 242) +
      sans(350, 384, 'HELD ABOVE THE TANK', 10.5)
    ),

    // ── mc_q44: water pressure — wide tank vs narrow standpipe, both 15 FT (EQUAL-ANSWER) ──
    mc_q44: svg(
      mono(240, 366, 'WIDE TANK', 12) + mono(510, 366, 'STANDPIPE', 12) +
      `<path d="M 120 160 L 120 330 L 360 330 L 360 160" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      `<rect x="123" y="190" width="234" height="138" fill="${WATER}"/>` +
      waterTop(123, 357, 190) +
      `<path d="M 480 160 L 480 330 L 540 330 L 540 160" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      `<rect x="483" y="190" width="54" height="138" fill="${WATER}"/>` +
      waterTop(483, 537, 190) +
      `<line x1="60" y1="190" x2="640" y2="190" stroke="${STEEL}" stroke-width="1" stroke-dasharray="7 5"/>` +
      chip(420, 180, 134) + mono(420, 176, 'SAME WATER DEPTH', 10.5) +
      // depth dimensions (stated number, copper)
      ext(95, 190, 330) + dimTick(95, 190) + dimTick(95, 330) +
      mono(68, 264, '15 FT', 12, COPPER, 'middle', 600) +
      ext(575, 190, 330) + dimTick(575, 190) + dimTick(575, 330) +
      mono(606, 264, '15 FT', 12, COPPER, 'middle', 600) +
      ground(80, 620, 336)
    ),

    // ── mc_q45: water pressure — identical tanks, tall stand vs short stand ──
    mc_q45: svg(
      ground(60, 650, 350) +
      // Tank A — tall stand
      `<rect x="120" y="90" width="140" height="80" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="124" y="112" width="132" height="54" fill="${WATER}"/>` +
      mono(190, 80, 'TANK A', 12, INK, 'middle', 600) +
      `<line x1="135" y1="170" x2="135" y2="350" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="245" y1="170" x2="245" y2="350" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="135" y1="230" x2="245" y2="310" stroke="${STEEL}" stroke-width="1.25"/>` +
      `<line x1="245" y1="230" x2="135" y2="310" stroke="${STEEL}" stroke-width="1.25"/>` +
      `<path d="M 190 170 L 190 260 Q 190 344 296 344" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      `<rect x="296" y="338" width="18" height="12" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/>` +
      // Tank B — short stand, identical tank + hose outlet
      `<rect x="420" y="210" width="140" height="80" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="424" y="232" width="132" height="54" fill="${WATER}"/>` +
      mono(490, 200, 'TANK B', 12, INK, 'middle', 600) +
      `<line x1="435" y1="290" x2="435" y2="350" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="545" y1="290" x2="545" y2="350" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="435" y1="305" x2="545" y2="338" stroke="${STEEL}" stroke-width="1.25"/>` +
      `<line x1="545" y1="305" x2="435" y2="338" stroke="${STEEL}" stroke-width="1.25"/>` +
      `<path d="M 490 290 L 490 314 Q 490 344 596 344" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      `<rect x="596" y="338" width="18" height="12" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/>` +
      sans(350, 384, 'IDENTICAL TANKS · IDENTICAL HOSES AT GROUND LEVEL', 10.5)
    ),

    // ── mc_q46: water pressure — barrel, two holes, NO streams drawn ──
    mc_q46: svg(
      mono(350, 104, 'FULL OF WATER', 10.5) +
      `<rect x="280" y="120" width="140" height="220" rx="18" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="286" y="140" width="128" height="194" fill="${WATER}"/>` +
      `<line x1="280" y1="152" x2="420" y2="152" stroke="${STEEL}" stroke-width="1.5"/>` +
      `<line x1="280" y1="230" x2="420" y2="230" stroke="${STEEL}" stroke-width="1.5"/>` +
      `<line x1="280" y1="308" x2="420" y2="308" stroke="${STEEL}" stroke-width="1.5"/>` +
      `<circle cx="420" cy="190" r="4.5" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
      mono(452, 194, 'TOP HOLE', 10.5, STEEL, 'start') +
      `<line x1="427" y1="190" x2="446" y2="190" stroke="${STEEL}" stroke-width="0.75"/>` +
      `<circle cx="420" cy="290" r="4.5" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
      mono(452, 294, 'BOTTOM HOLE', 10.5, STEEL, 'start') +
      `<line x1="427" y1="290" x2="446" y2="290" stroke="${STEEL}" stroke-width="0.75"/>` +
      ground(220, 490, 340)
    ),

    // ── mc_q20: friction — same crate, wide face vs narrow end (EQUAL-ANSWER) ──
    mc_q20: svg(
      divider(350) +
      panelTag(28, 48, 'ON WIDE FACE') + panelTag(378, 48, 'ON NARROW END') +
      ground(50, 335, 330) + ground(360, 690, 330) +
      crateBox(90, 260, 120, 70, 'CRATE') +
      `<line x1="210" y1="282" x2="322" y2="244" stroke="${INK}" stroke-width="1.75"/>` +
      mitt(322, 244) +
      crateBox(430, 210, 70, 120, 'CRATE') +
      `<line x1="500" y1="232" x2="612" y2="194" stroke="${INK}" stroke-width="1.75"/>` +
      mitt(612, 194)
    ),

    // ── mc_q21: friction — crate mid-slide, sand ahead, input pull arrow only ──
    mc_q21: svg(
      `<line x1="60" y1="320" x2="640" y2="320" stroke="${STEEL}" stroke-width="1.25"/>` +
      sans(150, 348, 'SMOOTH FLOOR', 10.5) +
      crateBox(200, 230, 120, 90, 'CRATE') +
      `<line x1="320" y1="255" x2="472" y2="225" stroke="${INK}" stroke-width="1.75"/>` +
      mitt(472, 225) +
      `<line x1="352" y1="198" x2="410" y2="184" stroke="${AMBER}" stroke-width="3"/>` + head(410, 184, 0.972, -0.235, AMBER) +
      mono(376, 168, 'PULL', 10.5) +
      `<circle cx="360" cy="312" r="2" fill="${STEEL}"/><circle cx="378" cy="306" r="2" fill="${STEEL}"/><circle cx="394" cy="315" r="2" fill="${STEEL}"/><circle cx="410" cy="308" r="2" fill="${STEEL}"/><circle cx="430" cy="313" r="2" fill="${STEEL}"/><circle cx="448" cy="306" r="2" fill="${STEEL}"/><circle cx="468" cy="312" r="2" fill="${STEEL}"/><circle cx="486" cy="308" r="2" fill="${STEEL}"/><circle cx="504" cy="314" r="2" fill="${STEEL}"/><circle cx="522" cy="309" r="2" fill="${STEEL}"/>` +
      mono(450, 346, 'SAND', 11) +
      `<line x1="450" y1="336" x2="445" y2="320" stroke="${STEEL}" stroke-width="0.75"/>`
    ),

    // ── mc_q22: friction — cabinet slid vs on dollies, identical cabinets ──
    mc_q22: svg(
      divider(350) +
      panelTag(28, 48, 'SLID ON FLOOR') + panelTag(378, 48, 'ON DOLLIES') +
      ground(50, 335, 330) + ground(360, 690, 330) +
      `<rect x="100" y="180" width="120" height="150" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="160" y1="180" x2="160" y2="330" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="152" cy="255" r="2.5" fill="${INK}"/><circle cx="168" cy="255" r="2.5" fill="${INK}"/>` +
      `<rect x="450" y="158" width="120" height="150" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="510" y1="158" x2="510" y2="308" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="502" cy="233" r="2.5" fill="${INK}"/><circle cx="518" cy="233" r="2.5" fill="${INK}"/>` +
      `<rect x="452" y="308" width="54" height="10" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="514" y="308" width="54" height="10" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/>` +
      `<circle cx="464" cy="323" r="7" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/><circle cx="494" cy="323" r="7" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/>` +
      `<circle cx="526" cy="323" r="7" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/><circle cx="556" cy="323" r="7" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/>` +
      sans(160, 362, 'CABINET', 10.5) + sans(510, 362, 'SAME CABINET', 10.5)
    ),

    // ── mc_q23: friction — boot over wet ice vs dry rubber mat ──
    mc_q23: svg(
      divider(350) +
      // boot A
      `<path d="M 110 272 L 110 225 Q 110 208 128 208 L 172 208 L 188 226 L 196 246 Q 230 252 252 258 L 260 272 Z" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="106" y="272" width="158" height="16" rx="3" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="126" y1="288" x2="126" y2="280" stroke="${STEEL}" stroke-width="1.25"/><line x1="150" y1="288" x2="150" y2="280" stroke="${STEEL}" stroke-width="1.25"/><line x1="174" y1="288" x2="174" y2="280" stroke="${STEEL}" stroke-width="1.25"/><line x1="198" y1="288" x2="198" y2="280" stroke="${STEEL}" stroke-width="1.25"/><line x1="222" y1="288" x2="222" y2="280" stroke="${STEEL}" stroke-width="1.25"/><line x1="246" y1="288" x2="246" y2="280" stroke="${STEEL}" stroke-width="1.25"/>` +
      // wet ice: tinted slab, shine lines, drip marks
      `<rect x="60" y="302" width="250" height="26" fill="${WATER}" stroke="${INK}" stroke-width="1.5"/>` +
      `<line x1="100" y1="310" x2="130" y2="306" stroke="${STEEL}" stroke-width="1"/><line x1="200" y1="312" x2="236" y2="307" stroke="${STEEL}" stroke-width="1"/>` +
      `<line x1="110" y1="328" x2="110" y2="338" stroke="${STEEL}" stroke-width="1.25"/><circle cx="110" cy="341" r="1.5" fill="${STEEL}"/>` +
      `<line x1="180" y1="328" x2="180" y2="334" stroke="${STEEL}" stroke-width="1.25"/><circle cx="180" cy="337" r="1.5" fill="${STEEL}"/>` +
      `<line x1="250" y1="328" x2="250" y2="336" stroke="${STEEL}" stroke-width="1.25"/><circle cx="250" cy="339" r="1.5" fill="${STEEL}"/>` +
      mono(185, 368, 'WET ICE', 12) +
      // boot B (identical, +350)
      `<path d="M 460 272 L 460 225 Q 460 208 478 208 L 522 208 L 538 226 L 546 246 Q 580 252 602 258 L 610 272 Z" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="456" y="272" width="158" height="16" rx="3" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="476" y1="288" x2="476" y2="280" stroke="${STEEL}" stroke-width="1.25"/><line x1="500" y1="288" x2="500" y2="280" stroke="${STEEL}" stroke-width="1.25"/><line x1="524" y1="288" x2="524" y2="280" stroke="${STEEL}" stroke-width="1.25"/><line x1="548" y1="288" x2="548" y2="280" stroke="${STEEL}" stroke-width="1.25"/><line x1="572" y1="288" x2="572" y2="280" stroke="${STEEL}" stroke-width="1.25"/><line x1="596" y1="288" x2="596" y2="280" stroke="${STEEL}" stroke-width="1.25"/>` +
      // dry rubber mat: cross-hatch texture
      `<rect x="410" y="302" width="250" height="26" fill="${FILL}" stroke="${INK}" stroke-width="1.5"/>` +
      (() => { let s = ''; for (let x = 420; x < 646; x += 24)
        s += `<line x1="${x}" y1="306" x2="${x + 10}" y2="324" stroke="${STEEL}" stroke-width="1"/><line x1="${x + 10}" y1="306" x2="${x}" y2="324" stroke="${STEEL}" stroke-width="1"/>`;
        return s; })() +
      mono(535, 368, 'DRY RUBBER MAT', 12)
    ),

    // ── mc_q24: momentum — loaded dump truck vs empty pickup, identical speed arrows ──
    mc_q24: svg(
      ground(60, 640, 324) +
      mono(350, 124, 'SAME SPEED', 11.5) +
      `<line x1="105" y1="150" x2="185" y2="150" stroke="${STEEL}" stroke-width="2.5"/>` + head(191, 150, 1, 0) +
      `<line x1="450" y1="150" x2="530" y2="150" stroke="${STEEL}" stroke-width="2.5"/>` + head(536, 150, 1, 0) +
      // dump truck, loaded
      `<path d="M 85 210 Q 115 182 145 202 Q 175 180 205 198 Q 225 188 235 210" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="85" y="210" width="150" height="80" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="235" y="238" width="62" height="52" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="245" y="246" width="28" height="20" fill="#fff" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="125" cy="307" r="17" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="195" cy="307" r="17" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="268" cy="307" r="17" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      mono(190, 368, 'LOADED DUMP TRUCK', 11.5) +
      // pickup, empty bed
      `<path d="M 420 290 L 420 264 L 505 264 L 512 238 L 552 238 L 566 264 L 570 264 L 570 290 Z" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="426" y1="272" x2="500" y2="272" stroke="${STEEL}" stroke-width="1"/>` +
      `<rect x="518" y="244" width="22" height="16" fill="#fff" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="455" cy="311" r="13" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="540" cy="311" r="13" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      mono(495, 368, 'EMPTY PICKUP', 11.5)
    ),

    // ── mc_q25: momentum — head-on carts, equal approach arrows, no outcome ──
    mc_q25: svg(
      ground(60, 640, 318) +
      crateBox(140, 214, 130, 80) +
      `<circle cx="172" cy="306" r="12" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="240" cy="306" r="12" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      crateBox(450, 244, 100, 50) +
      `<circle cx="475" cy="306" r="12" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="525" cy="306" r="12" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="282" y1="180" x2="342" y2="180" stroke="${STEEL}" stroke-width="2.5"/>` + head(348, 180, 1, 0) +
      `<line x1="438" y1="180" x2="378" y2="180" stroke="${STEEL}" stroke-width="2.5"/>` + head(372, 180, -1, 0) +
      mono(205, 360, 'CART A · 2× WEIGHT', 11.5) +
      mono(500, 360, 'CART B', 11.5)
    ),

    // ── mc_q26: momentum — 2 TONS · 25 MPH vs 1 TON · 50 MPH, NO arrows (EQUAL-ANSWER) ──
    mc_q26: svg(
      ground(60, 640, 322) +
      `<rect x="90" y="190" width="160" height="100" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="250" y="242" width="58" height="48" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="258" y="250" width="24" height="18" fill="#fff" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="130" cy="306" r="16" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="210" cy="306" r="16" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="276" cy="306" r="16" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      mono(198, 360, '2 TONS · 25 MPH', 12.5, COPPER, 'middle', 600) +
      `<path d="M 420 310 L 420 292 Q 445 270 480 270 L 520 270 Q 555 275 565 295 L 565 310 Z" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="450" cy="310" r="12" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="535" cy="310" r="12" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      mono(492, 360, '1 TON · 50 MPH', 12.5, COPPER, 'middle', 600)
    ),

    // ── mc_q27: center of mass — ladder + bucket nearer Worker B ──
    mc_q27: svg(
      ground(60, 640, 340) +
      `<line x1="120" y1="176" x2="580" y2="176" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="120" y1="188" x2="580" y2="188" stroke="${INK}" stroke-width="2"/>` +
      (() => { let s = ''; for (let x = 160; x <= 560; x += 40)
        s += `<line x1="${x}" y1="176" x2="${x}" y2="188" stroke="${INK}" stroke-width="1.5"/>`; return s; })() +
      // workers (identical silhouettes)
      `<circle cx="130" cy="152" r="11" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="130" y1="163" x2="130" y2="285" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="130" y1="285" x2="114" y2="340" stroke="${INK}" stroke-width="3"/><line x1="130" y1="285" x2="146" y2="340" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="130" y1="200" x2="140" y2="182" stroke="${INK}" stroke-width="2.5"/>` +
      `<circle cx="570" cy="152" r="11" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="570" y1="163" x2="570" y2="285" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="570" y1="285" x2="554" y2="340" stroke="${INK}" stroke-width="3"/><line x1="570" y1="285" x2="586" y2="340" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="570" y1="200" x2="560" y2="182" stroke="${INK}" stroke-width="2.5"/>` +
      // bucket, clearly nearer Worker B
      `<line x1="490" y1="188" x2="490" y2="214" stroke="${INK}" stroke-width="1.75"/>` +
      `<path d="M 474 214 Q 490 196 506 214" fill="none" stroke="${INK}" stroke-width="1.75"/>` +
      `<polygon points="472,214 508,214 502,254 478,254" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      mono(490, 278, 'PAINT BUCKET', 10.5) +
      mono(130, 374, 'WORKER A', 12) + mono(570, 374, 'WORKER B', 12)
    ),

    // ── mc_q28: center of mass — top-heavy vs bottom-heavy shelving ──
    mc_q28: svg(
      divider(350) +
      ground(60, 335, 330) + ground(370, 650, 330) +
      `<rect x="110" y="140" width="150" height="190" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="110" y1="190" x2="260" y2="190" stroke="${INK}" stroke-width="1.5"/><line x1="110" y1="240" x2="260" y2="240" stroke="${INK}" stroke-width="1.5"/><line x1="110" y1="290" x2="260" y2="290" stroke="${INK}" stroke-width="1.5"/>` +
      `<rect x="116" y="162" width="34" height="28" fill="#fff" stroke="${INK}" stroke-width="1.75"/><rect x="152" y="162" width="34" height="28" fill="#fff" stroke="${INK}" stroke-width="1.75"/><rect x="188" y="162" width="34" height="28" fill="#fff" stroke="${INK}" stroke-width="1.75"/><rect x="224" y="162" width="34" height="28" fill="#fff" stroke="${INK}" stroke-width="1.75"/>` +
      `<rect x="440" y="140" width="150" height="190" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="440" y1="190" x2="590" y2="190" stroke="${INK}" stroke-width="1.5"/><line x1="440" y1="240" x2="590" y2="240" stroke="${INK}" stroke-width="1.5"/><line x1="440" y1="290" x2="590" y2="290" stroke="${INK}" stroke-width="1.5"/>` +
      `<rect x="446" y="302" width="34" height="28" fill="#fff" stroke="${INK}" stroke-width="1.75"/><rect x="482" y="302" width="34" height="28" fill="#fff" stroke="${INK}" stroke-width="1.75"/><rect x="518" y="302" width="34" height="28" fill="#fff" stroke="${INK}" stroke-width="1.75"/><rect x="554" y="302" width="34" height="28" fill="#fff" stroke="${INK}" stroke-width="1.75"/>` +
      mono(185, 368, 'TOP-HEAVY', 12) + mono(515, 368, 'BOTTOM-HEAVY', 12)
    ),

    // ── mc_q29: center of mass — uniform pipe, clamp marks at MIDDLE / NEAR END ──
    mc_q29: svg(
      `<rect x="120" y="222" width="460" height="14" rx="7" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M 336 250 L 336 212 L 364 212 L 364 250" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      mono(350, 196, 'MIDDLE', 11) +
      `<path d="M 531 250 L 531 212 L 559 212 L 559 250" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
      mono(545, 196, 'NEAR END', 11) +
      sans(350, 272, 'UNIFORM PIPE', 10.5)
    ),

    // ── mc_q52: rotation — flywheel, rim + halfway marks, equal-weight dashed paths ──
    mc_q52: svg(
      `<circle cx="350" cy="215" r="130" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="350" cy="215" r="126" fill="none" stroke="${STEEL}" stroke-width="1.25" stroke-dasharray="6 6"/>` +
      `<circle cx="350" cy="215" r="63" fill="none" stroke="${STEEL}" stroke-width="1.25" stroke-dasharray="6 6"/>` +
      `<circle cx="350" cy="215" r="10" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="350" cy="215" r="3" fill="${INK}"/>` +
      `<circle cx="459" cy="152" r="5" fill="${INK}"/>` +
      `<circle cx="405" cy="184" r="5" fill="${INK}"/>` +
      mono(524, 150, 'RIM MARK', 10.5, STEEL, 'start') +
      `<line x1="466" y1="151" x2="518" y2="150" stroke="${STEEL}" stroke-width="0.75"/>` +
      mono(524, 186, 'HALFWAY MARK', 10.5, STEEL, 'start') +
      `<line x1="411" y1="185" x2="518" y2="185" stroke="${STEEL}" stroke-width="0.75"/>` +
      mono(350, 388, 'FLYWHEEL · ONE ROTATION', 11)
    ),

    // ── mc_q53: rotation — large vs small wheels, ONE REVOLUTION, no distance marks ──
    mc_q53: svg(
      ground(60, 640, 324) +
      mono(350, 120, 'ONE REVOLUTION EACH', 11.5) +
      `<rect x="100" y="230" width="160" height="26" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="140" cy="290" r="34" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="220" cy="290" r="34" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="140" cy="290" r="3" fill="${INK}"/><circle cx="220" cy="290" r="3" fill="${INK}"/>` +
      `<line x1="220" y1="290" x2="220" y2="256" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="440" y="262" width="160" height="26" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="480" cy="306" r="18" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="560" cy="306" r="18" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="480" cy="306" r="3" fill="${INK}"/><circle cx="560" cy="306" r="3" fill="${INK}"/>` +
      `<line x1="560" y1="306" x2="560" y2="288" stroke="${INK}" stroke-width="2"/>` +
      mono(180, 368, 'LARGE WHEELS', 12) + mono(520, 368, 'SMALL WHEELS', 12)
    ),

    // ── mc_q54: rotation — shaft end view, two dots on one radius (EQUAL-ANSWER) ──
    mc_q54: svg(
      `<circle cx="350" cy="215" r="110" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="350" cy="215" r="6" fill="${INK}"/>` +
      `<line x1="350" y1="215" x2="434" y2="144" stroke="${STEEL}" stroke-width="1.25"/>` +
      `<circle cx="373" cy="196" r="5" fill="${INK}"/>` +
      `<circle cx="430" cy="148" r="5" fill="${INK}"/>` +
      mono(480, 200, 'NEAR CENTER', 10.5, STEEL, 'start') +
      `<line x1="379" y1="197" x2="474" y2="198" stroke="${STEEL}" stroke-width="0.75"/>` +
      mono(480, 148, 'AT EDGE', 10.5, STEEL, 'start') +
      `<line x1="437" y1="147" x2="474" y2="146" stroke="${STEEL}" stroke-width="0.75"/>` +
      mono(350, 376, 'SPINNING SHAFT · END VIEW', 11)
    ),

    // ── mc_q55: projectiles — bolt arc over trench, position marks, NO velocity arrows ──
    mc_q55: svg(
      ground(60, 280, 320) + ground(420, 640, 320) +
      `<line x1="280" y1="320" x2="280" y2="388" stroke="${INK}" stroke-width="1.5"/>` +
      `<line x1="420" y1="320" x2="420" y2="388" stroke="${INK}" stroke-width="1.5"/>` +
      `<line x1="280" y1="388" x2="420" y2="388" stroke="${STEEL}" stroke-width="1"/>` +
      mono(350, 376, 'TRENCH', 10.5) +
      `<path d="M 140 300 Q 350 -20 560 300" fill="none" stroke="${STEEL}" stroke-width="1.5" stroke-dasharray="7 6"/>` +
      `<circle cx="140" cy="300" r="5" fill="${INK}"/>` + mono(140, 282, 'LAUNCH', 10.5) +
      `<circle cx="350" cy="140" r="5" fill="${INK}"/>` + mono(350, 120, 'APEX', 10.5) +
      `<circle cx="560" cy="300" r="5" fill="${INK}"/>` + mono(560, 282, 'LANDING', 10.5)
    ),

    // ── mc_q56: projectiles — wrench + bolt released together, SAME height (EQUAL-ANSWER) ──
    mc_q56: svg(
      ground(60, 650, 388) +
      `<rect x="80" y="120" width="220" height="14" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="100" y1="134" x2="100" y2="388" stroke="${INK}" stroke-width="3"/><line x1="280" y1="134" x2="280" y2="388" stroke="${INK}" stroke-width="3"/>` +
      `<line x1="100" y1="180" x2="280" y2="300" stroke="${STEEL}" stroke-width="1.25"/><line x1="280" y1="180" x2="100" y2="300" stroke="${STEEL}" stroke-width="1.25"/>` +
      sans(190, 108, 'SCAFFOLD', 10.5) +
      mono(487, 150, 'RELEASED TOGETHER', 11) +
      `<line x1="330" y1="248" x2="630" y2="248" stroke="${STEEL}" stroke-width="1" stroke-dasharray="7 5"/>` +
      // identical motion dashes
      `<line x1="387" y1="176" x2="387" y2="186" stroke="${STEEL}" stroke-width="1.5"/><line x1="387" y1="196" x2="387" y2="208" stroke="${STEEL}" stroke-width="1.5"/>` +
      `<line x1="490" y1="176" x2="490" y2="186" stroke="${STEEL}" stroke-width="1.5"/><line x1="490" y1="196" x2="490" y2="208" stroke="${STEEL}" stroke-width="1.5"/>` +
      // wrench (large)
      `<circle cx="387" cy="218" r="14" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<polygon points="379,202 395,202 387,218" fill="#fff"/>` +
      `<rect x="380" y="228" width="14" height="52" rx="6" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      mono(387, 312, 'WRENCH · HEAVY', 10.5) +
      // bolt (small)
      `<polygon points="490,230 499,235 499,245 490,250 481,245 481,235" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="485" y="250" width="10" height="18" fill="${FILL}" stroke="${INK}" stroke-width="1.75"/>` +
      `<line x1="485" y1="256" x2="495" y2="256" stroke="${STEEL}" stroke-width="1"/><line x1="485" y1="261" x2="495" y2="261" stroke="${STEEL}" stroke-width="1"/>` +
      mono(490, 330, 'BOLT · LIGHT', 10.5)
    ),

    // ── mc_q57: springs — identical launchers, 2 IN vs 4 IN compression ──
    mc_q57: svg(
      divider(350) +
      panelTag(28, 48, 'LAUNCHER A') + panelTag(378, 48, 'LAUNCHER B') +
      // A — 2 IN compression
      `<rect x="60" y="224" width="12" height="76" fill="${INK}"/>` +
      springPath(72, 230, 262, 7, 15, 2) +
      `<rect x="230" y="232" width="10" height="60" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="254" cy="262" r="12" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="290" y1="220" x2="290" y2="304" stroke="${STEEL}" stroke-width="1" stroke-dasharray="5 4"/>` +
      mono(290, 318, 'FREE POSITION', 10) +
      `<line x1="230" y1="206" x2="290" y2="206" stroke="${STEEL}" stroke-width="1"/>` +
      dimTick(230, 206) + dimTick(290, 206) + mono(260, 198, '2 IN', 12, COPPER, 'middle', 600) +
      // B — 4 IN compression, same coil count
      `<rect x="410" y="224" width="12" height="76" fill="${INK}"/>` +
      springPath(422, 520, 262, 7, 15, 2) +
      `<rect x="520" y="232" width="10" height="60" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="544" cy="262" r="12" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="640" y1="220" x2="640" y2="304" stroke="${STEEL}" stroke-width="1" stroke-dasharray="5 4"/>` +
      mono(640, 318, 'FREE POSITION', 10) +
      `<line x1="520" y1="206" x2="640" y2="206" stroke="${STEEL}" stroke-width="1"/>` +
      dimTick(520, 206) + dimTick(640, 206) + mono(580, 198, '4 IN', 12, COPPER, 'middle', 600) +
      sans(350, 380, 'IDENTICAL LAUNCHERS · IDENTICAL PARTS', 10.5)
    ),

    // ── mc_q58: springs — stiff vs soft, same compression distance ──
    mc_q58: svg(
      divider(350) +
      panelTag(28, 48, 'STIFF SPRING') + panelTag(378, 48, 'SOFT SPRING') +
      `<rect x="60" y="224" width="12" height="76" fill="${INK}"/>` +
      springPath(72, 250, 262, 9, 14, 3.5) +
      `<rect x="250" y="232" width="10" height="60" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="310" y1="220" x2="310" y2="304" stroke="${STEEL}" stroke-width="1" stroke-dasharray="5 4"/>` +
      `<line x1="250" y1="206" x2="310" y2="206" stroke="${STEEL}" stroke-width="1"/>` +
      dimTick(250, 206) + dimTick(310, 206) + mono(280, 198, 'd', 12, COPPER, 'middle', 600) +
      `<rect x="410" y="224" width="12" height="76" fill="${INK}"/>` +
      springPath(422, 600, 262, 6, 14, 1.5) +
      `<rect x="600" y="232" width="10" height="60" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="660" y1="220" x2="660" y2="304" stroke="${STEEL}" stroke-width="1" stroke-dasharray="5 4"/>` +
      `<line x1="600" y1="206" x2="660" y2="206" stroke="${STEEL}" stroke-width="1"/>` +
      dimTick(600, 206) + dimTick(660, 206) + mono(630, 198, 'd', 12, COPPER, 'middle', 600) +
      sans(350, 380, 'COMPRESSED THE SAME DISTANCE', 10.5)
    ),

    // ── mc_q59: stability — forklift mid-turn, pallet high vs low (both dashed) ──
    mc_q59: svg(
      ground(140, 600, 344) +
      `<rect x="255" y="232" width="135" height="78" rx="6" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="270" y1="232" x2="270" y2="176" stroke="${INK}" stroke-width="2.5"/><line x1="378" y1="232" x2="378" y2="176" stroke="${INK}" stroke-width="2.5"/><line x1="266" y1="176" x2="382" y2="176" stroke="${INK}" stroke-width="2.5"/>` +
      `<circle cx="292" cy="327" r="17" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="372" cy="327" r="17" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<line x1="396" y1="344" x2="396" y2="96" stroke="${INK}" stroke-width="2.5"/><line x1="408" y1="344" x2="408" y2="96" stroke="${INK}" stroke-width="2.5"/>` +
      `<line x1="396" y1="130" x2="408" y2="122" stroke="${STEEL}" stroke-width="1"/><line x1="396" y1="200" x2="408" y2="192" stroke="${STEEL}" stroke-width="1"/><line x1="396" y1="270" x2="408" y2="262" stroke="${STEEL}" stroke-width="1"/>` +
      // candidate pallet positions — equal-weight dashed
      `<line x1="408" y1="152" x2="505" y2="152" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5"/>` +
      `<rect x="412" y="112" width="88" height="38" fill="none" stroke="${STEEL}" stroke-width="1.5" stroke-dasharray="6 4"/>` +
      mono(456, 102, 'RAISED HIGH', 11) +
      `<line x1="408" y1="300" x2="505" y2="300" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5"/>` +
      `<rect x="412" y="260" width="88" height="38" fill="none" stroke="${STEEL}" stroke-width="1.5" stroke-dasharray="6 4"/>` +
      mono(456, 250, 'KEPT LOW', 11) +
      // turning path on the ground
      `<path d="M 150 380 Q 350 348 550 380" fill="none" stroke="${STEEL}" stroke-width="1.75"/>` + head(550, 380, 0.97, 0.24) +
      mono(350, 404, 'TURNING', 10.5)
    ),

    // ── mc_q60: stability — tall single stack vs spread-low load, equal boxes ──
    mc_q60: svg(
      divider(350) +
      ground(60, 330, 304) + ground(390, 660, 304) +
      `<rect x="110" y="250" width="180" height="18" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="135" cy="287" r="17" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="265" cy="287" r="17" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      (() => { let s = ''; [220, 190, 160, 130, 100, 70].forEach(y => {
        s += `<rect x="185" y="${y}" width="30" height="30" fill="#fff" stroke="${INK}" stroke-width="1.75"/>`; }); return s; })() +
      `<path d="M 130 350 Q 200 328 270 350" fill="none" stroke="${STEEL}" stroke-width="1.75"/>` + head(270, 350, 0.95, 0.31) +
      mono(200, 384, 'TALL SINGLE STACK', 12) +
      `<rect x="410" y="250" width="180" height="18" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="435" cy="287" r="17" fill="${FILL}" stroke="${INK}" stroke-width="2"/><circle cx="565" cy="287" r="17" fill="${FILL}" stroke="${INK}" stroke-width="2"/>` +
      (() => { let s = ''; [220, 190].forEach(y => { [435, 470, 505].forEach(x => {
        s += `<rect x="${x}" y="${y}" width="30" height="30" fill="#fff" stroke="${INK}" stroke-width="1.75"/>`; }); }); return s; })() +
      `<path d="M 460 350 Q 530 328 600 350" fill="none" stroke="${STEEL}" stroke-width="1.75"/>` + head(600, 350, 0.95, 0.31) +
      mono(530, 384, 'SPREAD LOW', 12)
    )
  };
})();
