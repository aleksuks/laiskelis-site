// Builds laiskai/ — the public letter pages (rule 42 in the app repo).
//
//   node scripts/build-letters.mjs
//
// Node >= 20, no dependencies. Fetches get_public_letters (consented, approved,
// unreported, expired letters; a report or a withdrawal drops a letter from the
// result) and rewrites everything under laiskai/ from scratch, so a letter that
// is no longer returned loses its page at the next run. Output is
// deterministic: no timestamps, stable ordering. If the fetch fails nothing is
// touched.
//
// A link here is to a letter, never to a person: the archive is grouped by
// month, by the week's topic and by idea. There is no author index, and none
// may be added.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SUPABASE_URL = "https://fuskxhhwkanenwmmoytu.supabase.co";
// Public by design: this is the same anon key that ships inside the app bundle.
// get_public_letters is the only thing it is used for here.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1c2t4aGh3a2FuZW53bW1veXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDQyMTQsImV4cCI6MjA5ODM4MDIxNH0.zpfGW8G5kx5UVmVA-ypC_vZoFd5KnG1UTAyaDt9c6dw";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "laiskai");
const SITE = "https://laiskelis.lt";
const STORE = "https://apps.apple.com/lt/app/id6796757249";
const MONTHS = ["sausis", "vasaris", "kovas", "balandis", "gegužė", "birželis", "liepa", "rugpjūtis", "rugsėjis", "spalis", "lapkritis", "gruodis"];

// ---------------------------------------------------------------- text

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

// Port of lib/letter-format.ts (parseLetterFormat / stripLetterFormat): *bold*
// and /italic/ markers removed, everything else left exactly as typed.
const OPEN_AFTER = "\\s([{„“\"'«‚‘—–\\-";
const CLOSE_BEFORE = "\\s.,;:!?…)\\]}\"“”'»’—–\\-";
function spanRe(marker, other) {
  const m = `\\${marker}`;
  const o = `\\${other}`;
  return new RegExp(
    `(^|[${OPEN_AFTER}${o}])${m}(?=[^\\s${m}])([^\\n${m}]*?[^\\s${m}])${m}(?=$|[${CLOSE_BEFORE}${o}])`,
    "g"
  );
}
const BOLD = spanRe("*", "/");
const ITALIC = spanRe("/", "*");
function find(re, text, from) {
  re.lastIndex = Math.max(0, from - 1);
  for (;;) {
    const m = re.exec(text);
    if (!m) return null;
    const at = m.index + m[1].length;
    if (at >= from) return { at, inner: m[2] };
    re.lastIndex = m.index + 1;
  }
}
function strip(text) {
  let out = "";
  let pos = 0;
  while (pos < text.length) {
    const b = find(BOLD, text, pos);
    const i = find(ITALIC, text, pos);
    const hit = b && (!i || b.at <= i.at) ? b : i;
    if (!hit) break;
    out += text.slice(pos, hit.at) + strip(hit.inner);
    pos = hit.at + hit.inner.length + 2;
  }
  return out + text.slice(pos);
}

const oneLine = (s) => s.replace(/\s+/g, " ").trim();
const excerpt = (s, n) => {
  const t = oneLine(s);
  const chars = [...t];
  return chars.length <= n ? t : chars.slice(0, n).join("").replace(/\s+\S*$/, "") + "…";
};

// ---------------------------------------------------------------- drawing

// lib/drawing.ts CRAYON_COLORS; indices are never reordered in the app.
const CRAYONS = ["#2B2320", "#96150D", "#C2571A", "#D8A02B", "#5C7A33", "#2E6B63", "#2C4C7C", "#B5567F", "#FFFFFF"];
const PAPER = "#FBF7F0"; // the app's drawingBg (light theme)
const num = (n) => typeof n === "number" && Number.isFinite(n);
const pt = (p) => Array.isArray(p) && p.length === 2 && num(p[0]) && num(p[1]);
const pts = (p) => Array.isArray(p) && p.every(pt);

const r2 = (n) => Math.round(n * 100) / 100; // midpoints only; stored points stay as they are
// strokeToPath from lib/drawing.ts: quadratic curves through midpoints.
function linePath(p) {
  if (p.length < 2) return "";
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const [x, y] = p[i];
    const [nx, ny] = p[i + 1];
    d += ` Q ${x} ${y} ${r2((x + nx) / 2)} ${r2((y + ny) / 2)}`;
  }
  return d + ` L ${p[p.length - 1][0]} ${p[p.length - 1][1]}`;
}
// fillToPath from lib/drawing-fill.ts.
const ring = (r) => (r.length < 3 ? "" : `M${r[0][0]} ${r[0][1]}` + r.slice(1).map(([x, y]) => `L${x} ${y}`).join("") + "Z");

// Returns an inline <svg> string, or "" when the jsonb isn't a valid drawing.
// Fills go under every line, as in toCrayonStrokes. No filters.
function drawingSvg(d) {
  if (!d || d.v !== 1 || !num(d.w) || !num(d.h) || d.w <= 0 || d.h <= 0 || !Array.isArray(d.strokes)) return "";
  const fills = [];
  const lines = [];
  for (const s of d.strokes) {
    if (!s || !num(s.c) || !num(s.s) || !pts(s.p)) return "";
    if (s.h != null && !(Array.isArray(s.h) && s.h.every(pts))) return "";
    const color = typeof s.k === "string" && /^#[0-9a-fA-F]{6}$/.test(s.k) ? s.k : CRAYONS[s.c] ?? CRAYONS[0];
    if (s.f === 1) {
      const dd = ring(s.p) + (s.h ?? []).map(ring).join("");
      if (dd) fills.push(`<path d="${dd}" fill="${color}" fill-rule="evenodd"/>`);
    } else if (s.p.length === 1) {
      lines.push(`<circle cx="${s.p[0][0]}" cy="${s.p[0][1]}" r="${s.s / 2}" fill="${color}"/>`);
    } else if (s.p.length > 1) {
      lines.push(`<path d="${linePath(s.p)}" stroke="${color}" stroke-width="${s.s}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`);
    }
  }
  if (!fills.length && !lines.length) return "";
  return (
    `<svg class="drawing" viewBox="0 0 ${d.w} ${d.h}" role="img" aria-label="Piešinys prie laiško">` +
    `<rect width="${d.w}" height="${d.h}" fill="${PAPER}"/>${fills.join("")}${lines.join("")}</svg>`
  );
}

// ---------------------------------------------------------------- data

async function load() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_letters`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`get_public_letters: HTTP ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("get_public_letters: not an array");
  return rows;
}

const vilnius = (iso) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vilnius", year: "numeric", month: "2-digit" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value])
  );
  return { y: +p.year, m: +p.month };
};
const monthKey = ({ y, m }) => `${y}-${String(m).padStart(2, "0")}`;
const monthLabel = ({ y, m }) => `${y} m. ${MONTHS[m - 1]}`;

// ---------------------------------------------------------------- pages

const UUID = /^[0-9a-f-]{36}$/i;

function page({ title, description, path, body, type = "article" }) {
  const url = `${SITE}/laiskai/${path}`;
  return `<!doctype html>
<html lang="lt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#e7dec8">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Laiškelis">
<meta property="og:locale" content="lt_LT">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITE}/feature-graphic.png">
<link rel="icon" href="../favicon.png">
<link rel="apple-touch-icon" href="../icon.png">
<link rel="preload" href="../fonts/SpecialElite-Regular.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="laiskai.css">
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="../"><img src="../img/mark.webp" alt="" width="30" height="30">Laiškelis</a>
<nav aria-label="Pagrindinė"><a href="./">Laiškai iš Kapinių</a><a class="btn" href="${STORE}">Atsisiųsti</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">
<p>„Laiškelis“ — programėlė, kurioje laiškeliai keliauja pas nepažįstamuosius. <a href="${STORE}">Atsisiųsk iš „App Store“</a> ir parašyk savo.</p>
</div></footer>
</body>
</html>
`;
}

const letterFile = (l) => `${l.id}.html`;
const slugify = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// The topic's painted sign, as the app shows it: img/temos/<week>-<slug>.webp,
// copied from the app repo's assets/images/topic-signs. A topic without one
// keeps a plain text label.
const signFile = (l) => (l.topic_week && l.topic_title ? `img/temos/${l.topic_week}-${slugify(l.topic_title)}.webp` : null);
const signSrc = (l) => {
  const f = signFile(l);
  return f && existsSync(join(ROOT, f)) ? `../${f}` : null;
};
const signImg = (l, cls) => {
  const src = signSrc(l);
  return src ? `<img class="${cls}" src="${src}" alt="${esc(l.topic_title)}" loading="lazy">` : "";
};
// A WebP's pixel size from its header (VP8X, VP8 or VP8L), to size signs by shape.
function webpSize(file) {
  const b = readFileSync(file);
  const t = b.toString("ascii", 12, 16);
  if (t === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (t === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (t === "VP8L") { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  return null;
}
// Signs come in every shape, from a square label to a long ribbon. In a tile of
// aspect TILE_A each one gets the same painted area, capped by the tile's
// width and height, so they read as one size. Returns a width in % of the tile.
const TILE_A = 2.2, AREA = 0.4, MAX_W = 0.92, MAX_H = 0.88;
function signWidth(l) {
  const f = signFile(l);
  const size = f && existsSync(join(ROOT, f)) ? webpSize(join(ROOT, f)) : null;
  if (!size) return 70;
  const a = size[0] / size[1];
  let w = Math.sqrt((AREA * a) / TILE_A); // as a fraction of the tile width
  w = Math.min(w, MAX_W, (MAX_H * a) / TILE_A);
  return Math.round(w * 1000) / 10;
}
const laiskai = (n) =>
  `${n} ${n % 10 === 1 && n % 100 !== 11 ? "laiškas" : n % 10 === 0 || (n % 100 > 10 && n % 100 < 20) ? "laiškų" : "laiškai"}`;

// A small, steady tilt per letter (from its id), so the wall reads as paper.
const tilt = (l) => ((parseInt(l.id.slice(0, 4), 16) % 9) - 4) * 0.3;
const topicKey = (l) => l.topic_week || slugify(l.topic_title) || "tema";
const topicFile = (l) => `tema-${topicKey(l)}.html`;
// A short hash of the idea text, so a page keeps its address as ideas come and go.
const ideaFile = (l) => `ideja-${createHash("sha1").update(l.idea).digest("hex").slice(0, 8)}.html`;

function letterPage(l) {
  const text = strip(l.body);
  const svg = drawingSvg(l.drawing);
  const topic = l.topic_title
    ? `<a class="topic" href="${topicFile(l)}">${signImg(l, "sign-img") || `<span class="pill">${esc(l.topic_title)}</span>`}<span class="sr">Savaitės tema: ${esc(l.topic_title)}</span></a>`
    : "";
  const body = `<article class="letter">
<div class="sheet" style="--tilt:${tilt(l)}deg">
<div class="text">${esc(text)}</div>
${svg}
<p class="sign">— ${esc(l.author_nickname)}</p>
<p class="date">${esc(monthLabel(l._month))}</p>
</div>
<div class="about">
${topic}
${l.idea ? `<p>Parašyta pagal idėją: <a href="${ideaFile(l)}">„${esc(l.idea)}“</a></p>` : ""}
</div>
<p class="back"><a href="./">← Visi laiškai</a></p>
</article>`;
  return page({
    title: `Laiškas nuo ${l.author_nickname} — Laiškelis`,
    description: excerpt(text, 150) || "Laiškelis iš „Laiškelio“ Kapinių.",
    path: l.id,
    body,
  });
}

// Each letter as its own note: its words, its drawing, who signed it, and the
// week's sign it was written under.
function entries(list, { showTopic = true } = {}) {
  return `<ul class="wall">${list
    .map((l) => {
      const text = strip(l.body);
      const ex = excerpt(text, 220);
      const svg = drawingSvg(l.drawing);
      const sign = showTopic ? signImg(l, "mini") : "";
      return `<li class="note" style="--tilt:${tilt(l)}deg"><a href="${letterFile(l)}">` +
        (ex ? `<span class="ex">${esc(ex)}</span>` : "") +
        (svg ? `<span class="pic">${svg}</span>` : "") +
        `<span class="by">— ${esc(l.author_nickname)}</span>` +
        `<span class="foot"><span>${esc(monthLabel(l._month))}</span>${sign}</span>` +
        `</a></li>`;
    })
    .join("")}</ul>`;
}

function groupPage({ heading, kicker, path, list, title, sign = "" }) {
  const body = `<header class="head">${sign ? `<div class="big-sign">${sign}</div>` : ""}<p class="kicker">${esc(kicker)}</p><h1${sign ? ' class="sr"' : ""}>${esc(heading)}</h1><p class="count">${laiskai(list.length)}</p></header>
${entries(list, { showTopic: !sign })}
<p class="back"><a href="./">← Visi laiškai</a></p>`;
  return page({
    title: `${title} — Laiškelis`,
    description: `Laiškeliai iš „Laiškelio“ Kapinių: ${heading}. Trumpi tikri tekstai, kuriuos autoriai leido skelbti.`,
    path,
    body,
    type: "website",
  });
}

// ---------------------------------------------------------------- build

const rows = (await load()).filter(
  (r) => r && UUID.test(r.id) && typeof r.body === "string" && typeof r.author_nickname === "string" && r.created_at
);
rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : a.id < b.id ? -1 : 1));
for (const l of rows) l._month = vilnius(l.created_at);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
copyFileSync(join(ROOT, "scripts", "laiskai.css"), join(OUT, "laiskai.css"));
const write = (name, html) => writeFileSync(join(OUT, name), html);

for (const l of rows) write(letterFile(l), letterPage(l));

const months = new Map();
const topics = new Map();
const ideas = new Map();
const push = (m, k, v) => (m.get(k) ?? m.set(k, []).get(k)).push(v);
for (const l of rows) {
  push(months, monthKey(l._month), l);
  if (l.topic_title) push(topics, topicFile(l), l);
  if (l.idea) push(ideas, ideaFile(l), l);
}

for (const [file, list] of topics) {
  const t = list[0];
  write(file, groupPage({ heading: t.topic_title, kicker: "Savaitės tema", path: file.replace(/\.html$/, ""), list, title: `Savaitės tema: ${t.topic_title}`, sign: signImg(t, "sign-img") }));
}
for (const [file, list] of ideas) {
  const i = list[0].idea;
  write(file, groupPage({ heading: `„${i}“`, kicker: "Idėja, pagal kurią parašyta", path: file.replace(/\.html$/, ""), list, title: `Idėja: ${i}` }));
}

// Topics newest week first; ideas alphabetical.
const topicList = [...topics].sort((a, b) => (a[1][0].topic_week < b[1][0].topic_week ? 1 : a[1][0].topic_week > b[1][0].topic_week ? -1 : a[0] < b[0] ? -1 : 1));
const ideaList = [...ideas].sort((a, b) => (a[1][0].idea < b[1][0].idea ? -1 : a[1][0].idea > b[1][0].idea ? 1 : 0));
const monthList = [...months].sort((a, b) => (a[0] < b[0] ? 1 : -1));

// Topics: equal paper tiles in a grid, each with its sign (same area, centred)
// and how many letters it holds. Ideas stay pills.
const tiles = (items, label) =>
  items.length
    ? `<section class="browse"><h2>${label}</h2><ul class="tiles">${items
        .map(([f, list]) => {
          const l = list[0];
          const src = signSrc(l);
          const art = src
            ? `<img src="${src}" alt="${esc(l.topic_title)}" style="width:${signWidth(l)}%" loading="lazy">`
            : `<span class="pill">${esc(l.topic_title)}</span>`;
          return `<li><a class="tile" href="${f}"><span class="art">${art}</span><span class="n">${laiskai(list.length)}</span></a></li>`;
        })
        .join("")}</ul></section>`
    : "";
const chips = (items, label, pick) =>
  items.length
    ? `<section class="browse"><h2>${label}</h2><ul class="chips">${items
        .map(([f, list]) => `<li><a href="${f}"><span class="pill">${esc(pick(list[0]))}</span></a></li>`)
        .join("")}</ul></section>`
    : "";

const indexBody = `<header class="head">
<p class="kicker">Kapinės</p>
<h1>Laiškai iš Kapinių</h1>
<p class="lead">Čia guli laiškeliai, kurie jau baigė savo kelionę, o jų autoriai leido juos skelbti. Trumpi, tikri tekstai apie įvairiausius dalykus. Prie kiekvieno — tik slapyvardis, kuriuo jis pasirašytas.</p>
</header>
${tiles(topicList, "Savaitės temos")}
${chips(ideaList, "Idėjos", (l) => l.idea)}
${
  monthList.length
    ? monthList.map(([, list]) => `<section class="month"><h2>${esc(monthLabel(list[0]._month))}</h2>${entries(list)}</section>`).join("\n")
    : '<p class="muted">Kol kas čia tuščia.</p>'
}`;
write(
  "index.html",
  page({
    title: "Laiškai iš Kapinių — Laiškelis",
    description: "Trumpi tikri laiškeliai nepažįstamiesiems, kuriuos autoriai leido skelbti. Pagal mėnesį, savaitės temą ir idėją.",
    path: "",
    body: indexBody,
    type: "website",
  })
);

console.log(`${rows.length} letters, ${topics.size} topics, ${ideas.size} ideas, ${months.size} months -> ${rows.length + topics.size + ideas.size + 1} pages`);
