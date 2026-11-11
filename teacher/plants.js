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

// One pot. stage 0 = not tried yet (an empty outline), 1 seed … 4 in bloom.
function skPlant(stage, colour, drop, grew) {
  var stem = "#2f9a57", leaf = "#63c184";
  var o = ' stroke="#22272b" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"';
  var pair = function (y, rx) {
    return [-1, 1].map(function (side) {
      var x = 50 + side * rx;
      return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + rx * 0.45 + '" fill="' + leaf + '"' + o +
        ' transform="rotate(' + side * 24 + " " + x + " " + y + ')"/>';
    }).join("");
  };
  var line = function (d) { return '<path d="' + d + '" fill="none" stroke="' + stem + '" stroke-width="5" stroke-linecap="round"/>'; };
  var plant = "";
  if (stage === 1) {
    plant = '<path d="M50 96c0-6 3-9 7-10" fill="none" stroke="' + stem + '" stroke-width="4" stroke-linecap="round"/>' +
      '<ellipse cx="49" cy="96" rx="8" ry="5.5" fill="#a9743f"' + o + "/>";
  } else if (stage === 2) {
    plant = line("M50 102C51 94 49 86 50 78") + pair(75, 10);
  } else if (stage === 3) {
    plant = line("M50 102C53 86 47 68 50 52") + pair(82, 13) + pair(65, 9) +
      '<ellipse cx="50" cy="42" rx="9" ry="12" fill="' + leaf + '"' + o + "/>" +
      '<path d="M44 37Q50 20 56 37Q50 33 44 37Z" fill="' + colour + '"' + o + "/>";
  } else if (stage === 4) {
    plant = line("M50 102C54 84 46 62 50 42") + pair(84, 14) + pair(66, 10);
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3;
      plant += '<circle cx="' + (50 + 12.5 * Math.sin(a)).toFixed(1) + '" cy="' + (31 - 12.5 * Math.cos(a)).toFixed(1) + '" r="9" fill="' + colour + '"' + o + "/>";
    }
    plant += '<circle cx="50" cy="31" r="7.5" fill="#f2c014"' + o + "/>";
  }
  var pot = stage
    ? '<path d="M28 108h44l-6 35a4 4 0 0 1-4 3H38a4 4 0 0 1-4-3z" fill="' + colour + '"' + o + "/>" +
      '<rect x="22" y="99" width="56" height="12" rx="4" fill="' + colour + '"' + o + "/>"
    : '<path d="M28 111h44l-6 32a4 4 0 0 1-4 3H38a4 4 0 0 1-4-3zM22 99h56v12H22z" fill="none" stroke="#a3abaf" stroke-width="2.5" stroke-dasharray="5 6" stroke-linejoin="round"/>';
  return '<svg viewBox="0 0 100 150" aria-hidden="true"><g class="sk-plant">' + plant + "</g>" + pot +
    (drop ? SK_DROP : "") + (grew ? SK_GREW : "") + "</svg>";
}
