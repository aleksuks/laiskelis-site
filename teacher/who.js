// "Kas tai?" (251): the icons beside the words and the Russian description,
// shared by the board (teacher/) and the phone (mokinys/). A word of the
// list: { k, g, m, f, lt, ic }; m / f = the form for он / она.
var Who = (function () {
  var SKIN = "#ffdcbc", INK = "#3a3a3a", BLUE = "#2f6fd6", GREY = "#c9ced6";
  var HAIR = { light: "#f0cf6a", dark: "#3b2a20", red: "#d6602a", brown: "#a0754c" };

  function head(hair, extra) {
    return (hair || "") +
      '<circle cx="24" cy="27" r="11" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="1.6"/>' +
      (extra || '<circle cx="20" cy="26" r="1.4" fill="' + INK + '"/><circle cx="28" cy="26" r="1.4" fill="' + INK + '"/>' +
        '<path d="M20 31 Q24 34 28 31" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>');
  }
  function shortHair(c) { return '<path d="M12 26 Q11 12 24 12 Q37 12 36 26 Q33 18 24 18 Q15 18 12 26Z" fill="' + c + '" stroke="' + INK + '" stroke-width="1.2"/>'; }
  function longHair(c) { return '<path d="M12 27 Q10 11 24 11 Q38 11 36 27 L38 43 L31 43 L32 24 Q24 17 16 24 L17 43 L10 43Z" fill="' + c + '" stroke="' + INK + '" stroke-width="1.2"/>'; }
  function person(x, h, fill) {   // a figure standing on y = 45, h tall
    var top = 45 - h, r = h * 0.13;
    return '<circle cx="' + x + '" cy="' + (top + r) + '" r="' + r + '" fill="' + fill + '"/>' +
      '<rect x="' + (x - r * 1.1) + '" y="' + (top + r * 2.3) + '" width="' + r * 2.2 + '" height="' + (h - r * 2.3) + '" rx="' + r * 0.9 + '" fill="' + fill + '"/>';
  }
  function eye(c) {
    return '<path d="M5 24 Q24 6 43 24 Q24 42 5 24Z" fill="#fff" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="24" cy="24" r="8" fill="' + c + '"/><circle cx="24" cy="24" r="3.4" fill="#1d1d1d"/><circle cx="26.5" cy="21.5" r="1.4" fill="#fff"/>';
  }
  var line = 'fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

  var ICONS = {
    tall: person(17, 38, BLUE) + person(33, 22, GREY),
    short: person(17, 38, GREY) + person(33, 22, BLUE),
    mid: person(12, 38, GREY) + person(24, 29, BLUE) + person(36, 20, GREY),
    slim: person(24, 38, BLUE).replace(/width="([\d.]+)"/, function (m, w) { return 'width="' + w * 0.6 + '"'; })
      .replace(/<rect x="([\d.]+)"/, function (m, x) { return '<rect x="' + (Number(x) + 2) + '"'; }),
    sporty: '<rect x="6" y="16" width="6" height="16" rx="2" fill="' + BLUE + '"/><rect x="36" y="16" width="6" height="16" rx="2" fill="' + BLUE + '"/>' +
      '<rect x="12" y="20" width="4" height="8" rx="1" fill="' + INK + '"/><rect x="32" y="20" width="4" height="8" rx="1" fill="' + INK + '"/>' +
      '<rect x="16" y="22.5" width="16" height="3" fill="' + INK + '"/>',
    "hair-long": head(longHair(HAIR.brown)),
    "hair-short": head(shortHair(HAIR.brown)),
    "col-light": head(shortHair(HAIR.light)),
    "col-dark": head(shortHair(HAIR.dark)),
    "col-red": head(shortHair(HAIR.red)),
    "col-brown": head(shortHair(HAIR.brown)),
    curly: head([12, 16, 20, 24, 28, 32, 36].map(function (x, i) {
      return '<circle cx="' + x + '" cy="' + (i === 0 || i === 6 ? 21 : 15 - (i % 2) * 2) + '" r="4.6" fill="' + HAIR.brown + '" stroke="' + INK + '" stroke-width="1"/>';
    }).join("") + '<circle cx="11" cy="27" r="4" fill="' + HAIR.brown + '" stroke="' + INK + '" stroke-width="1"/><circle cx="37" cy="27" r="4" fill="' + HAIR.brown + '" stroke="' + INK + '" stroke-width="1"/>'),
    straight: head(longHair(HAIR.brown) + '<path d="M15 26 L15 42 M33 26 L33 42 M19 20 L13 41 M29 20 L35 41" stroke="#7a5535" stroke-width="1.2"/>'),
    wavy: head(longHair(HAIR.brown) + '<path d="M14 28 q2 3 0 6 q-2 3 0 6 M34 28 q2 3 0 6 q-2 3 0 6" fill="none" stroke="#7a5535" stroke-width="1.4"/>'),
    "eye-blue": eye("#5aa9e6"),
    "eye-grey": eye("#9aa3ab"),
    "eye-green": eye("#4caf50"),
    "eye-brown": eye("#7b4a2a"),
    glasses: head(shortHair(HAIR.dark), '<circle cx="19.5" cy="26" r="4.2" fill="#e9f3ff" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="28.5" cy="26" r="4.2" fill="#e9f3ff" stroke="' + INK + '" stroke-width="1.8"/><path d="M23.7 26 H24.3" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="19.5" cy="26" r="1.2" fill="' + INK + '"/><circle cx="28.5" cy="26" r="1.2" fill="' + INK + '"/>' +
      '<path d="M20 32 Q24 34.5 28 32" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>'),
    freckles: head(shortHair(HAIR.red), '<circle cx="20" cy="25" r="1.4" fill="' + INK + '"/><circle cx="28" cy="25" r="1.4" fill="' + INK + '"/>' +
      [[16, 29], [18.5, 30.5], [17, 32], [32, 29], [29.5, 30.5], [31, 32]].map(function (p) {
        return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="0.9" fill="#b5651d"/>';
      }).join("") + '<path d="M21 32 Q24 34 27 32" fill="none" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>'),
    smile: head(shortHair(HAIR.brown), '<circle cx="20" cy="25" r="1.4" fill="' + INK + '"/><circle cx="28" cy="25" r="1.4" fill="' + INK + '"/>' +
      '<path d="M17.5 29 Q24 37.5 30.5 29 Z" fill="#fff" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>'),
    "c-happy": '<circle cx="24" cy="24" r="17" fill="#ffd54a" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="18" cy="20" r="2" fill="' + INK + '"/><circle cx="30" cy="20" r="2" fill="' + INK + '"/>' +
      '<path d="M14.5 27 Q24 39 33.5 27 Z" fill="#c0392b" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>',
    "c-kind": '<path d="M24 41 C8 30 6 20 11 14 C16 8 22 11 24 16 C26 11 32 8 37 14 C42 20 40 30 24 41Z" fill="#e8505b" stroke="' + INK + '" stroke-width="1.6"/>',
    "c-calm": '<circle cx="24" cy="24" r="17" fill="#bfe3c8" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M15 21 Q18 24 21 21 M27 21 Q30 24 33 21 M19 30 H29" ' + line + '/>',
    "c-smart": '<path d="M24 6 C15 6 11 13 11 18 C11 24 16 27 17 32 H31 C32 27 37 24 37 18 C37 13 33 6 24 6Z" fill="#ffe066" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<rect x="17.5" y="33" width="13" height="4" rx="1.5" fill="' + GREY + '" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<rect x="19.5" y="38" width="9" height="4" rx="1.5" fill="' + GREY + '" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M20 22 L24 26 L28 22 M24 26 V32" fill="none" stroke="#b08900" stroke-width="1.4"/>',
    "c-brave": '<path d="M4 20 Q24 12 44 20 Q44 34 32 32 Q27 31 24 27 Q21 31 16 32 Q4 34 4 20Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<ellipse cx="15" cy="23" rx="4.5" ry="3" fill="#fff"/><ellipse cx="33" cy="23" rx="4.5" ry="3" fill="#fff"/>',
    "c-honest": '<path d="M8 8 H40 Q43 8 43 11 V30 Q43 33 40 33 H20 L12 41 V33 H8 Q5 33 5 30 V11 Q5 8 8 8Z" fill="#fff" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M15 20 L21 26 L33 14" fill="none" stroke="#2e9e4f" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
    "c-reliable": '<path d="M24 5 L40 11 V22 C40 32 33 39 24 43 C15 39 8 32 8 22 V11Z" fill="#7aa7e8" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M24 11 L34 15 V22 C34 29 30 33 24 36Z" fill="#fff" opacity="0.5"/>',
    "c-polite": '<rect x="14" y="8" width="20" height="24" rx="2" fill="#333"/><rect x="14" y="25" width="20" height="4" fill="#c0392b"/>' +
      '<ellipse cx="24" cy="33" rx="19" ry="5" fill="#333"/>',
    "c-helpful": '<path d="M24 25 C15 19 14 13 17 10 C20 7 23 9 24 12 C25 9 28 7 31 10 C34 13 33 19 24 25Z" fill="#e8505b" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M5 30 Q12 28 18 31 L28 31 Q31 31 31 34 Q31 36 28 36 H20 M31 34 L40 29 Q43 28 44 31 Q44 33 41 35 L30 42 Q26 44 22 43 L5 40Z" fill="' + SKIN + '" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>',
    "c-generous": '<rect x="8" y="20" width="32" height="22" rx="2" fill="#e8505b" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<rect x="6" y="14" width="36" height="8" rx="2" fill="#f26d78" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<rect x="21" y="14" width="6" height="28" fill="#ffd54a"/>' +
      '<path d="M24 14 C18 6 11 9 15 13 C17 15 24 14 24 14 C24 14 31 15 33 13 C37 9 30 6 24 14Z" fill="#ffd54a" stroke="' + INK + '" stroke-width="1.4"/>',
    "c-social": '<path d="M5 9 H27 Q30 9 30 12 V23 Q30 26 27 26 H14 L8 31 V26 H5 Q2 26 2 23 V12 Q2 9 5 9Z" fill="#7aa7e8" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M21 20 H43 Q46 20 46 23 V34 Q46 37 43 37 H40 V42 L34 37 H21 Q18 37 18 34 V23 Q18 20 21 20Z" fill="#ffd54a" stroke="' + INK + '" stroke-width="1.6"/>',
    "c-hardworking": '<rect x="7" y="33" width="34" height="8" rx="1.5" fill="#e8505b" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<rect x="10" y="25" width="30" height="8" rx="1.5" fill="#7aa7e8" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<rect x="8" y="17" width="28" height="8" rx="1.5" fill="#4caf50" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M30 5 L42 15 L39 18 L27 8Z" fill="#ffd54a" stroke="' + INK + '" stroke-width="1.4"/>',
    "c-humor": '<circle cx="24" cy="24" r="17" fill="#ffd54a" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M14 21 L18 18 L22 21 M26 21 L30 18 L34 21" ' + line + '/>' +
      '<path d="M14 26 Q24 41 34 26 Z" fill="#c0392b" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M8 22 q-3 5 0 7 q3 -2 0 -7Z M40 22 q3 5 0 7 q-3 -2 0 -7Z" fill="#5aa9e6"/>',
  };

  // ICONS are constants of this file, never text from the database.
  function icon(key) {
    var ns = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", "0 0 48 48");
    s.setAttribute("class", "who-ic");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICONS[key] || "";
    return s;
  }

  function form(w, gender) { return gender === "f" ? w.f : w.m; }

  function joinRu(list) {
    if (list.length < 2) return list.join("");
    return list.slice(0, -1).join(", ") + " и " + list[list.length - 1];
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // The description as sentences, in the order of the list's groups.
  function describe(list, gender, picks) {
    var by = {};
    (list.words || []).forEach(function (w) { by[w.k] = w; });
    var g = {};
    (picks || []).forEach(function (k) {
      var w = by[k];
      if (w) (g[w.g] = g[w.g] || []).push(w);
    });
    var he = gender === "f" ? "она" : "он", has = gender === "f" ? "у неё" : "у него";
    var f = function (ws) { return (ws || []).map(function (w) { return form(w, gender); }); };
    var out = [];
    var body = f(g.rost).concat(f(g.fig));
    if (body.length) out.push(cap(he) + " " + joinRu(body) + ".");
    var hair = f(g.hlen).concat(f(g.hcol), f(g.htype));
    if (hair.length) out.push(cap(has) + " " + hair.join(" ") + " волосы.");
    if (g.eyes) out.push(cap(has) + " " + f(g.eyes).join(" ") + " глаза.");
    var more = g.more || [];
    if (more.some(function (w) { return w.k === "ochki"; })) out.push(cap(he) + " носит очки.");
    var face = more.filter(function (w) { return w.k !== "ochki"; });
    if (face.length) out.push(cap(has) + " " + joinRu(f(face)) + ".");
    var chars = (g.char || []).filter(function (w) { return w.k !== "yumor"; });
    if (chars.length) out.push(cap(he) + " " + joinRu(f(chars)) + ".");
    if ((g.char || []).some(function (w) { return w.k === "yumor"; })) out.push(cap(has) + " есть чувство юмора.");
    return out;
  }

  return { icon: icon, form: form, describe: describe };
})();
