// Crayon drawings for the drawing game "Piešiu ir spėju" (218), shared by
// the board (teacher/) and the phones (mokinys/).
//
// Ported from the letters app (letters-app lib/drawing.ts and
// components/crayon-path.tsx): the same stroke model, so a drawing is a few
// kilobytes of points, not pixels:
//   { v: 1, w: 320, h: 320, strokes: [{ c: crayon index, s: nib width, p: [[x, y], …] }] }
// the same nine crayons and three nibs, the same capture thinning, the same
// eraser (it cuts the strokes it touches; nothing is painted white), and the
// same quadratic smoothing through midpoints when drawn. Strokes are SVG
// paths; a single point (a tap) is a filled circle.
var Draw = (function () {
  "use strict";

  var SIZE = 320;
  var CRAYONS = ["#2B2320", "#96150D", "#C2571A", "#D8A02B", "#5C7A33", "#2E6B63", "#2C4C7C", "#B5567F", "#FFFFFF"];
  var WIDTHS = [4, 9, 16];
  var ERASER_RADII = [7, 14, 24];      // fatter than the nib in the same slot
  var MAX_STROKES = 900, MAX_POINTS = 12000, UNDO_STEPS = 40, MIN_STEP = 2.5;   // tuning knobs
  var NS = "http://www.w3.org/2000/svg";

  function empty() { return { v: 1, w: SIZE, h: SIZE, strokes: [] }; }

  // Junk from a hand-rolled client draws nothing rather than breaking the page.
  function isValid(d) {
    if (!d || typeof d !== "object" || d.v !== 1 || !Array.isArray(d.strokes)) return false;
    return d.strokes.every(function (s) {
      return s && typeof s.c === "number" && typeof s.s === "number" && Array.isArray(s.p) &&
        s.p.every(function (pt) { return Array.isArray(pt) && pt.length === 2 && typeof pt[0] === "number" && typeof pt[1] === "number"; });
    });
  }

  function color(s) { return CRAYONS[s.c] || CRAYONS[0]; }

  function toPath(p) {
    var d = "M " + p[0][0] + " " + p[0][1];
    for (var i = 1; i < p.length - 1; i++) {
      d += " Q " + p[i][0] + " " + p[i][1] + " " + (p[i][0] + p[i + 1][0]) / 2 + " " + (p[i][1] + p[i + 1][1]) / 2;
    }
    var last = p[p.length - 1];
    return d + " L " + last[0] + " " + last[1];
  }

  function mark(s) {
    var n;
    if (s.p.length === 1) {
      n = document.createElementNS(NS, "circle");
      n.setAttribute("cx", s.p[0][0]);
      n.setAttribute("cy", s.p[0][1]);
      n.setAttribute("r", Math.max(0.5, s.s / 2));
      n.setAttribute("fill", color(s));
      return n;
    }
    n = document.createElementNS(NS, "path");
    n.setAttribute("d", toPath(s.p));
    n.setAttribute("stroke", color(s));
    n.setAttribute("stroke-width", s.s);
    n.setAttribute("stroke-linecap", "round");
    n.setAttribute("stroke-linejoin", "round");
    n.setAttribute("fill", "none");
    return n;
  }

  // A read-only picture: an <svg> sized by CSS, the strokes inside.
  function svg(d) {
    var node = document.createElementNS(NS, "svg");
    node.setAttribute("viewBox", "0 0 " + SIZE + " " + SIZE);
    node.setAttribute("class", "drawing");
    paint(node, d);
    return node;
  }

  function paint(node, d) {
    while (node.firstChild) node.removeChild(node.firstChild);
    if (!isValid(d)) return;
    d.strokes.forEach(function (s) { if (s.p.length) node.appendChild(mark(s)); });
  }

  function countPoints(strokes) {
    var n = 0;
    for (var i = 0; i < strokes.length; i++) n += strokes[i].p.length;
    return n;
  }

  /* ---------- the eraser (letters-app eraseAt) ---------- */

  function round1(n) { return Math.round(n * 10) / 10; }

  function seg2(ax, ay, bx, by, px, py) {
    var dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    var t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var cx = px - (ax + dx * t), cy = py - (ay + dy * t);
    return cx * cx + cy * cy;
  }

  // Points are thinned on capture, so a fast line can have samples far
  // apart: the segments near the eraser are split into small steps first
  // (scaffolding, dropped again from what survives).
  function densify(points, ex, ey, reach) {
    var out = [points[0]], ins = [false], margin = (reach + MIN_STEP) * (reach + MIN_STEP);
    for (var i = 1; i < points.length; i++) {
      var x0 = points[i - 1][0], y0 = points[i - 1][1], x1 = points[i][0], y1 = points[i][1];
      if (seg2(x0, y0, x1, y1, ex, ey) <= margin) {
        var n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / MIN_STEP);
        for (var k = 1; k < n; k++) { out.push([round1(x0 + (x1 - x0) * k / n), round1(y0 + (y1 - y0) * k / n)]); ins.push(true); }
      }
      out.push(points[i]);
      ins.push(false);
    }
    return { points: out, ins: ins };
  }

  function trim(run, ins) {
    if (run.length <= 2) return run;
    var out = [run[0]];
    for (var i = 1; i < run.length - 1; i++) if (!ins[i]) out.push(run[i]);
    out.push(run[run.length - 1]);
    return out;
  }

  // One dab: every stroke the disc meets loses the points under it and
  // survives as the pieces either side. null when nothing was touched.
  function eraseAt(strokes, ex, ey, radius) {
    var next = [], changed = false;
    for (var i = 0; i < strokes.length; i++) {
      var s = strokes[i], reach = radius + s.s / 2;
      var d = densify(s.p, ex, ey, reach), runs = [], run = [], runIns = [], cut = false;
      for (var k = 0; k < d.points.length; k++) {
        var dx = d.points[k][0] - ex, dy = d.points[k][1] - ey;
        if (dx * dx + dy * dy <= reach * reach) {
          cut = true;
          if (run.length) runs.push(trim(run, runIns));
          run = []; runIns = [];
        } else { run.push(d.points[k]); runIns.push(d.ins[k]); }
      }
      if (run.length) runs.push(trim(run, runIns));
      if (!cut) { next.push(s); continue; }
      changed = true;
      if (next.length + runs.length + strokes.length - i - 1 > MAX_STROKES) continue;
      runs.forEach(function (p) { next.push({ c: s.c, s: s.s, p: p }); });
    }
    return changed ? next : null;
  }

  /* ---------- the pad ---------- */

  // A crayon pad on an <svg>: one finger draws (or rubs out), a second
  // finger is ignored. opts.onChange(drawing) after every finished stroke,
  // rub, undo or clear.
  function pad(node, opts) {
    var strokes = [], history = [], tool = "draw", crayon = 0, width = WIDTHS[1], locked = false;
    var live = null, liveNode = null, pointer = null, rubBase = null;
    node.setAttribute("viewBox", "0 0 " + SIZE + " " + SIZE);
    node.style.touchAction = "none";
    // iPhone Safari ignores touch-action on an SVG and scrolls the page instead of drawing:
    // the touches themselves must be cancelled (non-passive, or Safari ignores that too).
    function noScroll(e) { if (!locked) e.preventDefault(); }
    node.addEventListener("touchstart", noScroll, { passive: false });
    node.addEventListener("touchmove", noScroll, { passive: false });

    function changed() { if (opts && opts.onChange) opts.onChange(get()); }
    function get() { return { v: 1, w: SIZE, h: SIZE, strokes: strokes }; }
    function redraw() { paint(node, get()); }
    function remember() { history.push(strokes); if (history.length > UNDO_STEPS) history.shift(); }

    function at(e) {
      var r = node.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * SIZE, y = (e.clientY - r.top) / r.height * SIZE;
      return [round1(Math.max(0, Math.min(SIZE, x))), round1(Math.max(0, Math.min(SIZE, y)))];
    }

    function rub(pt) {
      var next = eraseAt(strokes, pt[0], pt[1], ERASER_RADII[WIDTHS.indexOf(width)] || ERASER_RADII[1]);
      if (next) { strokes = next; redraw(); }
    }

    node.addEventListener("pointerdown", function (e) {
      if (locked || pointer !== null) return;
      e.preventDefault();
      pointer = e.pointerId;
      try { node.setPointerCapture(e.pointerId); } catch (err) {}
      var pt = at(e);
      if (tool === "erase") { rubBase = strokes; rub(pt); return; }
      if (strokes.length >= MAX_STROKES || countPoints(strokes) >= MAX_POINTS) return;
      live = { c: crayon, s: width, p: [pt] };
      liveNode = mark(live);
      node.appendChild(liveNode);
    });

    node.addEventListener("pointermove", function (e) {
      if (e.pointerId !== pointer) return;
      e.preventDefault();
      var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      if (!list.length) list = [e];
      for (var i = 0; i < list.length; i++) {
        var pt = at(list[i]);
        if (tool === "erase") { rub(pt); continue; }
        if (!live) return;
        var last = live.p[live.p.length - 1];
        if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) < MIN_STEP) continue;
        live.p.push(pt);
      }
      if (live) {
        var n = mark(live);
        node.replaceChild(n, liveNode);
        liveNode = n;
      }
    });

    function end(e) {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (tool === "erase") {
        if (rubBase && rubBase !== strokes) { history.push(rubBase); changed(); }
        rubBase = null;
        return;
      }
      if (!live) return;
      remember();
      strokes = strokes.concat([live]);
      live = null; liveNode = null;
      redraw();
      changed();
    }
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);

    return {
      get: get,
      set: function (d) { strokes = isValid(d) ? d.strokes.slice() : []; history = []; redraw(); },
      undo: function () { if (!history.length || locked) return; strokes = history.pop(); redraw(); changed(); },
      clear: function () { if (!strokes.length || locked) return; remember(); strokes = []; redraw(); changed(); },
      crayon: function (i) { crayon = i; tool = "draw"; },
      width: function (w) { width = w; },
      tool: function (t) { tool = t; },
      lock: function (on) { locked = on; },
      count: function () { return strokes.length; },
    };
  }

  /* ---------- names ---------- */

  // A Lithuanian first name in Cyrillic, for the Russian sentence:
  // Ernestas → Эрнестас, Gabija → Габия, Justė → Юсте, Gabrielius → Габриелюс.
  var LETTERS = { a: "а", "ą": "а", b: "б", c: "ц", "č": "ч", d: "д", e: "е", "ę": "е", "ė": "е", f: "ф", g: "г", h: "х",
    i: "и", "į": "и", y: "и", j: "й", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "к", r: "р", s: "с", "š": "ш",
    t: "т", u: "у", "ų": "у", "ū": "у", v: "в", w: "в", x: "кс", z: "з", "ž": "ж" };
  var VOWELS = "aąeęėiįyouųū";
  var SOFT = { a: "я", "ą": "я", u: "ю", "ų": "ю", "ū": "ю", o: "ё" };

  function cyr(name) {
    return String(name || "").split(/(\s+)/).map(function (word) {
      var w = word.toLowerCase(), out = "";
      for (var i = 0; i < w.length; i++) {
        var ch = w[i], nx = w[i + 1], prev = w[i - 1];
        var startOrVowel = i === 0 || VOWELS.indexOf(prev) >= 0;
        if (ch === "c" && nx === "h") { out += "х"; i++; continue; }
        if (ch === "j" && nx && (SOFT[nx] && nx !== "o" || "eęė".indexOf(nx) >= 0)) { out += SOFT[nx] || "е"; i++; continue; }
        if (ch === "i" && !startOrVowel && nx && SOFT[nx] && nx !== "o") { out += SOFT[nx]; i++; continue; }
        if (ch === "i" && i > 0 && "aeouė".indexOf(prev) >= 0 && (!nx || VOWELS.indexOf(nx) < 0)) { out += "й"; continue; }   // Deimantas → Деймантас
        if ((ch === "e" || ch === "ė") && startOrVowel && "iįy".indexOf(prev) < 0) { out += "э"; continue; }
        out += LETTERS[ch] !== undefined ? LETTERS[ch] : ch;
      }
      return out ? out[0].toUpperCase() + out.slice(1) : out;
    }).join("");
  }

  // The sentence with the classmate in it: Cyrillic in the Russian, as is in the Lithuanian.
  function fill(text, name, ru) { return String(text || "").split("{N}").join(ru ? cyr(name) : name || ""); }

  return { SIZE: SIZE, CRAYONS: CRAYONS, WIDTHS: WIDTHS, empty: empty, isValid: isValid, svg: svg, paint: paint,
           pad: pad, eraseAt: eraseAt, cyr: cyr, fill: fill };
})();
