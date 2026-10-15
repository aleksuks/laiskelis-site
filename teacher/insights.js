// The progress recap: a few plain sentences from a student's quiz history
// (teacher_student_stats / teacher_class_progress, migration 166). The
// student sees it on /mokinys, the teacher in Pamokos → Pažanga. Why it
// says what it says (and what it never says) is in the app repo's
// decisions.md, "Student progress recap".
//
// Every sentence is about the task, compares the student only with their
// own earlier results, and the weak spot comes with its rule card.

var MASTERY = 0.8;     // a section counts as known from 80 % right. Tuning knob.
var TREND_PTS = 8;     // percentage points before "better" / "worse".
var STALE_DAYS = 28;   // a not-yet-mastered topic untouched this long gets a nudge.

function ltPlural(n, one, few, many) {
  var t = n % 10, h = n % 100;
  if (t === 1 && h !== 11) return one;
  if (t >= 2 && h < 10 || t >= 2 && h > 20) return few;
  return many;
}

function partName(part, i) {
  if (part.name) return part.name;
  var m = /<p class="steps">([\s\S]*?)<\/p>/.exec(part.rule_html || "");
  return (m && m[1].replace(/<[^>]+>/g, "").trim()) || (i + 1) + " dalis";
}

function pctOf(c, n) { return n ? Math.round(100 * c / n) : 0; }

// stats: { runs: [{at, quiz, skill, n, correct, marks}], quizzes: {id: parts} }
// Returns { lines: [{kind: up|down|same|good|work|time|stale, text}], weak }
// where weak is the section to repeat ({skill, name, rule_html}) or null.
function progressRecap(stats, now) {
  var runs = stats.runs.slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; });
  var lines = [];
  if (!runs.length) return { lines: lines, weak: null, recent: null, trend: null };
  now = now || Date.now();

  // 1. Better or worse than before: the latest runs against the ones before.
  // ponytail: quizzes differ in difficulty, so this is rough; compare the
  // same quiz's reruns if it ever misleads.
  var share = function (list) {
    return Math.round(list.reduce(function (t, r) { return t + pctOf(r.correct, r.n); }, 0) / list.length);
  };
  var k = Math.min(3, Math.max(1, Math.floor(runs.length / 2)));
  var recent = share(runs.slice(-k));
  var earlier = runs.slice(-k - 5, -k);
  var label = k === 1 ? "Paskutinis testas" : "Paskutiniai " + k + " testai";
  if (!earlier.length) {
    lines.push({ kind: "same", text: "Pirmas testas: " + recent + " % teisingai." });
  } else {
    var before = share(earlier);
    var d = recent - before;
    lines.push(d >= TREND_PTS ? { kind: "up", text: label + ": " + recent + " % – geriau nei anksčiau (" + before + " %)." }
      : d <= -TREND_PTS ? { kind: "down", text: label + ": " + recent + " % – prasčiau nei anksčiau (" + before + " %)." }
      : { kind: "same", text: label + ": " + recent + " % – tiek pat, kiek anksčiau." });
  }

  // 2. Sections, from the latest run of each quiz: what they know now.
  var latest = {};
  runs.forEach(function (r) { latest[r.quiz] = r; });
  var sections = [];
  Object.keys(latest).forEach(function (id) {
    var r = latest[id];
    (stats.quizzes[id] || []).forEach(function (p, i) {
      var c = 0, t = 0;
      for (var q = p.from; q < p.to; q++) {
        var m = r.marks.charAt(q);
        if (m === "-" || !m) continue;
        t++;
        if (m === "1") c++;
      }
      if (t >= 2) sections.push({ skill: r.skill, name: partName(p, i), rule_html: p.rule_html, c: c, t: t, share: c / t });
    });
  });
  sections.sort(function (a, b) { return b.share - a.share || b.t - a.t; });
  var best = sections[0];
  var worst = sections[sections.length - 1];
  var named = function (s) { return s.skill + " – " + s.name + " (" + s.c + "/" + s.t + ")"; };
  if (best && best.share >= 0.5) lines.push({ kind: "good", text: "Stiprioji vieta: " + named(best) + "." });
  var weak = worst && worst !== best && worst.share < MASTERY ? worst : null;
  if (weak) lines.push({ kind: "work", text: "Daugiausia klaidų: " + named(weak) + "." });
  else if (sections.length) lines.push({ kind: "good", text: "Visos dalys – bent " + MASTERY * 100 + " % teisingai." });

  // 3. Questions left to the timer in the latest runs.
  var last = runs.slice(-3);
  var timeouts = last.reduce(function (t, r) { return t + (r.marks.match(/x/g) || []).length; }, 0);
  var asked = last.reduce(function (t, r) { return t + r.marks.replace(/-/g, "").length; }, 0);
  if (timeouts >= 2 && timeouts / asked >= 0.15) {
    lines.push({ kind: "time", text: "Nespėta atsakyti: " + timeouts + " " + ltPlural(timeouts, "klausimas", "klausimai", "klausimų") + " iš " + asked + "." });
  }

  // 4. A topic not mastered and not practised for a while (spacing).
  var bySkill = {};
  runs.forEach(function (r) { (bySkill[r.skill] = bySkill[r.skill] || []).push(r); });
  var stale = Object.keys(bySkill).map(function (s) {
    var list = bySkill[s], r = list[list.length - 1];
    return { skill: s, days: Math.floor((now - new Date(r.at).getTime()) / 864e5), share: r.correct / r.n };
  }).filter(function (s) { return s.days >= STALE_DAYS && s.share < 0.9; })
    .sort(function (a, b) { return b.days - a.days; })[0];
  if (stale) lines.push({ kind: "stale", text: "Seniai kartota: " + stale.skill + " (prieš " + stale.days + " d.)." });

  return { lines: lines, weak: weak, recent: recent, trend: lines[0].kind };
}

// The recap as a list; withRule adds the weak section's rule card under it.
function recapList(recap, withRule) {
  var ul = document.createElement("ul");
  ul.className = "recap";
  recap.lines.forEach(function (l) {
    var li = document.createElement("li");
    li.className = l.kind;
    li.textContent = l.text;
    if (withRule && l.kind === "work" && recap.weak.rule_html) {
      var d = document.createElement("details");
      var sum = document.createElement("summary");
      sum.textContent = "Pažiūrėk taisyklę";
      var body = document.createElement("div");
      body.className = "rule";
      body.innerHTML = recap.weak.rule_html;   // authored in a migration, never by a student
      d.append(sum, body);
      li.appendChild(d);
    }
    ul.appendChild(li);
  });
  return ul;
}

// The teacher's lines for the whole class: who went up or down, and the
// section most of them got wrong (the one to reteach). recaps: [{name, recap}].
function classRecap(recaps) {
  var lines = [];
  var who = function (kind) {
    return recaps.filter(function (x) { return x.recap.trend === kind; }).map(function (x) { return x.name.split(" ")[0]; });
  };
  var up = who("up"), down = who("down");
  if (up.length) lines.push({ kind: "up", text: "Geriau nei anksčiau: " + up.join(", ") + "." });
  if (down.length) lines.push({ kind: "down", text: "Prasčiau nei anksčiau: " + down.join(", ") + "." });
  var weak = {};
  recaps.forEach(function (x) {
    var w = x.recap.weak;
    if (w) (weak[w.skill + " – " + w.name] = weak[w.skill + " – " + w.name] || []).push(x.name.split(" ")[0]);
  });
  var top = Object.keys(weak).sort(function (a, b) { return weak[b].length - weak[a].length; })[0];
  if (top && weak[top].length >= 2) {
    var n = weak[top].length;
    lines.push({ kind: "work", text: "Verta pakartoti su klase: " + top + " (daugiausia klaidų " + n + " " + ltPlural(n, "mokiniui", "mokiniams", "mokinių") + ")." });
  }
  return { lines: lines };
}

if (typeof module !== "undefined") module.exports = { progressRecap: progressRecap, ltPlural: ltPlural, classRecap: classRecap };
