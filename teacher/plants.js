// The level plants: seed, sprout, bud, bloom. One drawing for the class
// board (Lygiai in index.html) and for the student's own page (/mokinys), so
// a student and their parents read at home what the class saw on the wall.
// A plant grows toward its student's own goal (goalNeed in api.js, 241), not
// toward 10.

var SK_STAGES = [0.45, 0.75, 1];   // sprout, bud, flower from this part of the way to the goal. Tuning knob.
var SK_COLOURS = ["#1f4fb5", "#e8871e", "#8a4fc7", "#e0559b", "#17a3a3", "#f2c014", "#8b5e3c"];
var SK_WORDS = ["", "pradžia", "auga", "beveik", "pasiekta!"];
var SK_DROP = '<path class="sk-badge" d="M84 54c5 8 10 13 10 19a10 10 0 0 1-20 0c0-6 5-11 10-19z" fill="#49aef0" stroke="#22272b" stroke-width="2.5" stroke-linejoin="round"/>';
var SK_GREW = '<g class="sk-badge"><circle cx="15" cy="70" r="11" fill="#1c844b" stroke="#22272b" stroke-width="2.5"/>' +
  '<path d="M15 77V64M9.5 69.5 15 64l5.5 5.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>';

function skStage(r, goal) {
  var s = r.correct / r.n / goalNeed(goal);
  return s >= SK_STAGES[2] ? 4 : s >= SK_STAGES[1] ? 3 : s >= SK_STAGES[0] ? 2 : 1;
}

// "Mokausi (я учу, ты учишь)" -> name + example
function skLabel(lt) {
  var m = /^(.*?)\s*\((.*)\)\s*$/.exec(lt);
  return m ? { name: m[1], ex: m[2] } : { name: lt, ex: "" };
}

// The painted kinds (242), from letters-app scripts/ui-art/teacher_flowers.py.
// The index is teacher_students.flower: append new kinds, never reorder.
var SK_KINDS = [["ramune", "Ramunė"], ["tulpe", "Tulpė"], ["saulegraza", "Saulėgrąža"], ["aguona", "Aguona"],
  ["rugiagele", "Rugiagėlė"], ["levanda", "Levanda"], ["pakalnute", "Pakalnutė"], ["roze", "Rožė"],
  ["kaktusas", "Kaktusas"], ["bijunas", "Bijūnas"], ["ruta", "Rūta"], ["naslaite", "Našlaitė"]];
// teacher/art/, wherever the page loading this file lives
var SK_ART = (function () {
  var src = document.currentScript && document.currentScript.src;
  return src ? src.replace(/[^\/]*$/, "") + "art/" : "art/";
})();

// A student's kind: their own choice, or until they make one, a kind picked
// from their id, so the board is mixed from the first day. st: { id, flower }.
function skKind(st) {
  if (st && st.flower != null && st.flower >= 0 && st.flower < SK_KINDS.length) return st.flower;
  var h = 0, id = String((st && st.id) || "");
  for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % SK_KINDS.length;
}

// One pot. stage 0 = not tried yet (an empty pot), 1 seed … 4 in bloom.
// Two painted layers on one 100 x 150 frame: the flower, then the pot over
// its foot. The pot's colour is the rule (one of SK_COLOURS), the flower is
// the student's. The badges sit on the pot, clear of every kind's leaves.
function skPlant(stage, colour, drop, grew, kind) {
  var img = function (name) { return '<image href="' + SK_ART + name + '.png" width="100" height="150"/>'; };
  var pot = Math.max(0, SK_COLOURS.indexOf(colour));
  var k = SK_KINDS[kind] ? kind : 0;
  return '<svg viewBox="0 0 100 150" aria-hidden="true">' +
    (stage ? '<g class="sk-plant">' + img("flower-" + SK_KINDS[k][0] + "-" + stage) + "</g>" + img("pot-" + pot) : img("pot-empty")) +
    (drop ? '<g transform="translate(0 58)">' + SK_DROP + "</g>" : "") +
    (grew ? '<g transform="translate(0 52)">' + SK_GREW + "</g>" : "") + "</svg>";
}
