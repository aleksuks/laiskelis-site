// Minimal sounds for the dashboard and the student page, synthesized with
// Web Audio: no audio files, nothing to load. Each sound is a few short
// tones or a breath of filtered noise, quiet enough for a classroom.
//
// A magnet moved to a camp is announced on purpose (teacher's call, 2026-10):
// praise cheers, a note buzzes, both loud enough for the back row.
//
// The on/off choice is per device (localStorage), and the browser only lets
// audio start after the first tap, which is when the context is created.

var Sound = (function () {
  var KEY = "teacher.sound";
  var ctx = null;
  var on = true;
  try { on = localStorage.getItem(KEY) !== "off"; } catch (e) {}

  function ac() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // One enveloped oscillator: fast attack, exponential decay.
  function tone(c, freq, at, dur, type, gain, slideTo) {
    var t = c.currentTime + at;
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Filtered noise, swept: the eraser on the board, a magnet's clack.
  function noise(c, at, dur, gain, from, to, q) {
    var t = c.currentTime + at;
    var n = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource();
    src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }

  function play(fn) {
    return function () {
      if (!on) return;
      var c = ac();
      if (c) fn(c);
    };
  }

  // Ticks for a CSS-eased spin: the wheel's own cubic-bezier, sampled, and a
  // tick each time a slice boundary passes the pointer.
  function bezier(x1, y1, x2, y2) {
    function at(a, b, t) { return 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t; }
    return function (x) {
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 24; i++) {
        t = (lo + hi) / 2;
        if (at(x1, x2, t) < x) lo = t; else hi = t;
      }
      return at(y1, y2, t);
    };
  }

  return {
    enabled: function () { return on; },
    toggle: function () {
      on = !on;
      try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {}
      if (on) ac();
      return on;
    },
    clack: play(function (c) {            // a magnet set down
      noise(c, 0, 0.05, 0.22, 1800, 900, 2.5);
      tone(c, 170, 0, 0.06, "sine", 0.12);
    }),
    coin: play(function (c) {             // +1
      tone(c, 1320, 0, 0.09, "triangle", 0.12);
      tone(c, 1976, 0.07, 0.24, "triangle", 0.1);
    }),
    chime: play(function (c) {            // praise
      tone(c, 784, 0, 0.3, "sine", 0.14);
      tone(c, 1175, 0.08, 0.4, "sine", 0.12);
      tone(c, 1568, 0.16, 0.55, "sine", 0.08);
    }),
    swish: play(function (c) {            // the eraser
      noise(c, 0, 0.42, 0.1, 500, 2600, 0.9);
    }),
    roll: play(function (c) {             // a screen rolling down
      noise(c, 0, 0.3, 0.05, 300, 1200, 0.7);
    }),
    fanfare: play(function (c) {          // the wheel lands
      [523, 659, 784, 1047].forEach(function (f, i) { tone(c, f, i * 0.075, 0.28, "triangle", 0.1); });
    }),
    right: play(function (c) {
      tone(c, 880, 0, 0.12, "triangle", 0.11);
      tone(c, 1320, 0.08, 0.22, "triangle", 0.1);
    }),
    wrong: play(function (c) {
      tone(c, 260, 0, 0.22, "sine", 0.12, 190);
    }),
    sparkle: play(function (c) {          // a milestone sticker
      [1047, 1319, 1568, 2093].forEach(function (f, i) { tone(c, f, i * 0.06, 0.3, "sine", 0.07); });
    }),
    cheer: play(function (c) {            // into ЛУЧШИЕ: big rising fanfare + chord
      [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(c, f, i * 0.09, 0.35, "triangle", 0.3); });
      [523, 784, 1047].forEach(function (f) { tone(c, f, 0.5, 1.1, "sawtooth", 0.12); tone(c, f, 0.5, 1.1, "triangle", 0.25); });
    }),
    buzz: play(function (c) {             // into Спят / Шумят: loud "uh-oh" buzzer, twice
      [0, 0.45].forEach(function (at) {
        tone(c, 330, at, 0.18, "sawtooth", 0.3, 300);
        tone(c, 220, at + 0.2, 0.32, "sawtooth", 0.3, 180);
      });
    }),
    pop: play(function (c) {              // a mood picked
      tone(c, 520, 0, 0.08, "sine", 0.12, 900);
    }),
    // spinTicks(seconds, slices, turnDegrees, [x1, y1, x2, y2])
    spinTicks: function (seconds, slices, turn, curve) {
      if (!on || slices < 2) return;
      var c = ac();
      if (!c) return;
      var ease = bezier(curve[0], curve[1], curve[2], curve[3]);
      var step = 360 / slices;
      var last = 0;
      for (var i = 1; i <= 600; i++) {
        var x = i / 600;
        var k = Math.floor((ease(x) * turn) / step);
        if (k > last) {
          last = k;
          tone(c, 2300, x * seconds, 0.03, "square", 0.035);
        }
      }
    },
  };
})();
