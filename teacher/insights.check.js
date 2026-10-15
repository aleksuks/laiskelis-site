// node teacher/insights.check.js — throws if the recap logic breaks.
var assert = require("assert");
var R = require("./insights.js");

assert.deepStrictEqual([1, 2, 5, 10, 11, 12, 21, 22].map(function (n) { return R.ltPlural(n, "a", "b", "c"); }),
  ["a", "b", "b", "c", "c", "c", "a", "b"]);

var parts = { q: [{ name: "Galūnės", from: 0, to: 4, rule_html: "<p>A</p>" }, { name: "-ся", from: 4, to: 8, rule_html: "<p>B</p>" }] };
var run = function (at, marks) {
  return { at: at, quiz: "q", skill: "Būtasis laikas", n: marks.length, correct: (marks.match(/1/g) || []).length, marks: marks };
};
var now = new Date("2026-10-15").getTime();

assert.deepStrictEqual(R.progressRecap({ runs: [], quizzes: parts }, now), { lines: [], weak: null, recent: null, trend: null });

// Getting better; the latest run decides the sections; -ся is the weak spot.
var r = R.progressRecap({ quizzes: parts, runs: [
  run("2026-10-01", "00000000"), run("2026-10-08", "10000000"),
  run("2026-10-14", "1111xxx0"), run("2026-10-15", "111110x-"),
] }, now);
assert.strictEqual(r.lines[0].kind, "up");
assert.strictEqual(r.weak.name, "-ся");
assert.ok(r.lines.some(function (l) { return l.text === "Stiprioji vieta: Būtasis laikas – Galūnės (4/4)."; }));
assert.ok(r.lines.some(function (l) { return l.text === "Daugiausia klaidų: Būtasis laikas – -ся (1/3)."; }));
assert.ok(r.lines.some(function (l) { return l.kind === "time"; }));

// All mastered, long ago: no weak spot, a spacing nudge only below 90 %.
r = R.progressRecap({ quizzes: { q: [{ name: "A", from: 0, to: 5 }, { name: "B", from: 5, to: 10 }] },
  runs: [run("2026-08-01", "1111011110")] }, now);
assert.strictEqual(r.weak, null);
assert.deepStrictEqual(r.lines.map(function (l) { return l.kind; }), ["same", "good", "good", "stale"]);

var c = R.classRecap([
  { name: "Ona A", recap: { trend: "up", weak: { skill: "S", name: "-ся" } } },
  { name: "Jonas B", recap: { trend: "down", weak: { skill: "S", name: "-ся" } } },
  { name: "Eglė C", recap: { trend: "same", weak: null } },
]);
assert.deepStrictEqual(c.lines.map(function (l) { return l.text; }),
  ["Geriau nei anksčiau: Ona.", "Prasčiau nei anksčiau: Jonas.", "Verta pakartoti su klase: S – -ся (daugiausia klaidų 2 mokiniams)."]);

console.log("insights ok");
