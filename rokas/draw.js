// Drawings, stored as strokes rather than pixels — the same idea as the
// crayon canvas in Laiškelis. A drawing is { s: [{ c, w, p }] }: c an
// index into PALETTE, w an index into WIDTHS, p a flat [x, y, x, y, ...]
// list of integers on a 1000 x 1000 square. Small enough to send as JSON,
// and redrawn crisp at any size: on a phone, on the TV, in the PDF.

const PALETTE = [
  "#1d1a16", "#d7322b", "#2f6fd1", "#2e9c4a", "#f2c230",
  "#8a5a32", "#ec7fb0", "#f08a24", "#ffffff",
];
const ERASER = PALETTE.length - 1;
const WIDTHS = [7, 16, 36];
const MAX_POINTS = 15000;

function isEmptyDrawing(d) {
  return !d || !Array.isArray(d.s) || d.s.length === 0;
}

// Paints a drawing into a size x size square at (x, y) on a 2D context.
function renderDrawing(ctx, drawing, x, y, size) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, size, size);
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  const k = size / 1000;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const st of (drawing && drawing.s) || []) {
    const p = st.p || [];
    if (p.length < 2) continue;
    const color = PALETTE[st.c] || PALETTE[0];
    const w = (WIDTHS[st.w] || WIDTHS[1]) * k;
    if (p.length === 2) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + p[0] * k, y + p[1] * k, w / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x + p[0] * k, y + p[1] * k);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(x + p[i] * k, y + p[i + 1] * k);
    ctx.stroke();
  }
  ctx.restore();
}

// A canvas element showing a drawing, sized to its container's width.
function drawingCanvas(drawing, cssSize) {
  const c = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  c.width = Math.round(cssSize * dpr);
  c.height = Math.round(cssSize * dpr);
  c.style.width = cssSize + "px";
  c.style.height = cssSize + "px";
  c.className = "drawing";
  renderDrawing(c.getContext("2d"), drawing, 0, 0, c.width);
  return c;
}

// The pad on the phone. `host` is an empty element; the pad fills its
// width as a square. onChange fires after every stroke, undo and clear.
class DrawPad {
  constructor(host, onChange) {
    this.host = host;
    this.onChange = onChange || (() => {});
    this.strokes = [];
    this.history = [];
    this.color = 0;
    this.width = 1;
    this.current = null;

    this.canvas = document.createElement("canvas");
    this.canvas.className = "pad";
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();

    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => this.down(e));
    c.addEventListener("pointermove", (e) => this.move(e));
    c.addEventListener("pointerup", (e) => this.up(e));
    c.addEventListener("pointercancel", (e) => this.up(e));
    // iOS Safari still scrolls on a touch that pointer events claim unless
    // the touch itself is cancelled.
    c.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
    c.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  }

  destroy() {
    window.removeEventListener("resize", this.resize);
  }

  resize() {
    const size = this.host.clientWidth;
    if (!size) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.canvas.style.width = size + "px";
    this.canvas.style.height = size + "px";
    this.redraw();
  }

  redraw() {
    renderDrawing(this.ctx, { s: this.strokes }, 0, 0, this.canvas.width);
    if (this.current) renderDrawing(this.ctx, { s: this.strokes.concat([this.current]) }, 0, 0, this.canvas.width);
  }

  point(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000);
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000);
    return [Math.max(0, Math.min(1000, x)), Math.max(0, Math.min(1000, y))];
  }

  totalPoints() {
    let n = 0;
    for (const s of this.strokes) n += s.p.length / 2;
    return n;
  }

  down(e) {
    if (this.current) return;
    if (this.totalPoints() > MAX_POINTS) return;
    e.preventDefault();
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* fine */ }
    const [x, y] = this.point(e);
    this.pointerId = e.pointerId;
    this.current = { c: this.color, w: this.width, p: [x, y] };
    this.paintSegment(x, y, x, y);
  }

  move(e) {
    if (!this.current || e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events.length ? events : [e]) {
      const [x, y] = this.point(ev);
      const p = this.current.p;
      const lx = p[p.length - 2];
      const ly = p[p.length - 1];
      if (Math.abs(x - lx) + Math.abs(y - ly) < 4) continue;
      p.push(x, y);
      this.paintSegment(lx, ly, x, y);
    }
  }

  up(e) {
    if (!this.current || e.pointerId !== this.pointerId) return;
    this.history.push(this.strokes);
    this.strokes = this.strokes.concat([this.current]);
    this.current = null;
    this.onChange();
  }

  paintSegment(x1, y1, x2, y2) {
    const k = this.canvas.width / 1000;
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = PALETTE[this.current.c];
    ctx.lineWidth = WIDTHS[this.current.w] * k;
    ctx.beginPath();
    ctx.moveTo(x1 * k, y1 * k);
    ctx.lineTo(x2 * k + (x1 === x2 && y1 === y2 ? 0.01 : 0), y2 * k);
    ctx.stroke();
    ctx.restore();
  }

  undo() {
    if (!this.history.length) return;
    this.strokes = this.history.pop();
    this.redraw();
    this.onChange();
  }

  clear() {
    if (!this.strokes.length) return;
    this.history.push(this.strokes);
    this.strokes = [];
    this.redraw();
    this.onChange();
  }

  load(strokes) {
    this.strokes = Array.isArray(strokes) ? strokes : [];
    this.history = [];
    this.redraw();
  }

  value() {
    return { s: this.strokes };
  }
}
