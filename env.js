// The envelope on the front page: the app's own painted layers (letters-app
// assets/images/envelopes/cream) assembled in 3D. It rests open in the hero,
// and the #kelione section's scroll drives its ceremony: the sheet slides in,
// the flap closes, the seal goes on, it turns over for the stamp and the
// postmark, and flies off. Native scroll only; the canvas never takes input.
// Without WebGL, under reduced motion, or if this module fails, the page
// keeps the still picture (img.env-still) and the steps read as plain text.
import * as T from "./vendor/three.min.js";

const canvas = document.getElementById("env");
const flight = document.getElementById("kelione");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
if (canvas && flight && !reduced.matches) start().catch((e) => console.warn("envelope:", e));

async function start() {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NeutralToneMapping;
  renderer.shadowMap.enabled = true;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  scene.add(new T.HemisphereLight(0xfff6e6, 0x8a7a60, 1.5));
  const sun = new T.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(-3, 4, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 6;
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  scene.add(sun);

  // The page under the envelope: only its shadow is drawn.
  const ground = new T.Mesh(new T.PlaneGeometry(40, 40), new T.ShadowMaterial({ opacity: 0.13 }));
  ground.position.z = -0.7;
  ground.receiveShadow = true;
  scene.add(ground);

  const loader = new T.TextureLoader();
  const tex = (url) =>
    loader.loadAsync(url).then((t) => {
      t.colorSpace = T.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    });
  await document.fonts.load('40px "Special Elite"').catch(() => {});
  const [pocket, flapOut, flapIn, interior, paper, stamp, postmark, seal] = await Promise.all(
    ["env-pocket", "env-flap", "env-flap-in", "env-interior", "paper", "stamp", "postmark", "seal"].map((n) => tex(`img/${n}.webp`))
  );

  // Envelope proportions are the art's: 980 x 728, flap 456 deep.
  const W = 1.9, H = (W * 728) / 980, FH = (W * 456) / 980;

  // Paper flutter: z pushed by a wave along x only, so every layer (and the
  // closed flap, whose local x is the envelope's) bends as one sheet.
  const flutter = { amp: { value: 0 }, time: { value: 0 } };
  // Every layer, the postmark and the seal included, must bend the same way,
  // or a flat layer cuts in and out of the waving paper under it (flicker).
  const withFlutter = (m) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uAmp = flutter.amp;
      sh.uniforms.uTime = flutter.time;
      sh.vertexShader = "uniform float uAmp; uniform float uTime;\n" + sh.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.z += uAmp * sin(transformed.x * 2.6 + uTime * 9.0) * (0.35 + 0.65 * abs(transformed.x));"
      );
    };
    m.customProgramCacheKey = () => "flutter";
    return m;
  };
  // alphaToCoverage: the painted ink outline sits right on the cut-out edge,
  // and a hard alpha test makes it shimmer once the envelope is small.
  const paperMat = (opts) =>
    withFlutter(new T.MeshStandardMaterial({ roughness: 0.92, metalness: 0, alphaTest: 0.5, alphaToCoverage: true, ...opts }));
  const plane = (w, h, mat, segs = 24) => {
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h, segs, 1), mat);
    mesh.castShadow = true;
    return mesh;
  };
  // A texture seen from behind is mirrored; flip it back.
  const mirrored = (t) => {
    const c = t.clone();
    c.wrapS = T.RepeatWrapping;
    c.repeat.x = -1;
    c.needsUpdate = true;
    return c;
  };

  const env = new T.Group();
  scene.add(env);

  // The art is painted inside a transparent margin: x 38-941 of 980, y 35-690
  // of 728. The address side and the letter are sized to that, not the quad.
  const PW = (W * 903) / 980, PH = (H * 655) / 728;
  const PBOTTOM = H / 2 - (H * 690) / 728;

  // Back of the envelope (the flap side) faces the camera at rest.
  const inside = plane(W, H, paperMat({ map: interior }));
  inside.position.z = -0.004;
  const pocketMesh = plane(W, H, paperMat({ map: pocket }));
  pocketMesh.position.z = 0.006;

  // The address side: paper, the owl stamp, two typed lines; the postmark is
  // its own layer so it can land.
  const front = document.createElement("canvas");
  front.width = 1024;
  front.height = Math.round((1024 * PH) / PW);
  {
    const g = front.getContext("2d");
    const ptn = g.createPattern(paper.image, "repeat");
    g.fillStyle = ptn;
    g.fillRect(0, 0, front.width, front.height);
    // The same dark ink edge the painted back has.
    g.strokeStyle = "rgba(43,38,32,.85)";
    g.lineWidth = 5;
    g.strokeRect(3, 3, front.width - 6, front.height - 6);
    g.drawImage(stamp.image, front.width - 200, 44, 150, 188);
    g.fillStyle = "#2b2620";
    g.font = '46px "Special Elite"';
    g.fillText("Nepažįstamajam", 330, 450);
    g.font = '34px "Special Elite"';
    g.fillText("kažkur Lietuvoje", 330, 510);
    g.strokeStyle = "rgba(43,38,32,.35)";
    g.lineWidth = 2;
    for (const y of [470, 530]) { g.beginPath(); g.moveTo(320, y); g.lineTo(820, y); g.stroke(); }
  }
  const frontTex = new T.CanvasTexture(front);
  frontTex.colorSpace = T.SRGBColorSpace;
  const frontMesh = plane(PW, PH, paperMat({ map: mirrored(frontTex), side: T.BackSide }));
  frontMesh.position.z = -0.01;

  // White postmark art, inked dark.
  const pm = plane((W * 0.5), (W * 0.5 * 244) / 446, withFlutter(new T.MeshBasicMaterial({ map: mirrored(postmark), color: 0x2a2440, transparent: true, opacity: 0, side: T.BackSide, depthWrite: false })), 8);
  pm.castShadow = false;
  // Seen from behind local x runs right to left: the stamp is at -x.
  // Placed in its geometry, not its transform, so its x is the envelope's
  // and it ripples exactly with the paper under it.
  pm.geometry.rotateZ(0.12).translate(-PW * 0.2, PH * 0.3, 0);
  pm.position.z = -0.016;

  // The letter itself, typed.
  const sheetC = document.createElement("canvas");
  // Narrower and shorter than the painted body, so once in it never shows
  // past the envelope's bottom or sides.
  const SW = PW * 0.88, SH = PH * 0.86;
  sheetC.width = 768;
  sheetC.height = Math.round((768 * SH) / SW);
  {
    const g = sheetC.getContext("2d");
    g.fillStyle = g.createPattern(paper.image, "repeat");
    g.fillRect(0, 0, sheetC.width, sheetC.height);
    g.fillStyle = "#2b2620";
    g.font = '40px "Special Elite"';
    g.fillText("Labas, nepažįstamasis,", 56, 104);
    g.fillStyle = "rgba(43,38,32,.28)";
    for (let i = 0; i < 6; i++) g.fillRect(56, 160 + i * 56, i === 5 ? 380 : 640 - (i % 2) * 70, 16);
  }
  const sheetTex = new T.CanvasTexture(sheetC);
  sheetTex.colorSpace = T.SRGBColorSpace;
  // Tucked in: its bottom a little above the painted bottom edge.
  const SHEET_IN = PBOTTOM + H * 0.03 + SH / 2;
  const sheet = plane(SW, SH, paperMat({ map: sheetTex }), 12);
  sheet.position.z = 0.001;

  // Flap, hinged on the painted top edge (35 px under the art's own top, in
  // both the pocket and the flap art), so it opens without a gap.
  const EDGE = (W * 35) / 980;
  const flap = new T.Group();
  flap.position.set(0, H / 2 - EDGE, 0.012);
  const flapGeo = new T.PlaneGeometry(W, FH, 24, 1);
  flapGeo.translate(0, -FH / 2 + EDGE, 0);
  const flapA = new T.Mesh(flapGeo, paperMat({ map: flapOut }));
  const flapB = new T.Mesh(flapGeo, paperMat({ map: mirrored(flapIn), side: T.BackSide }));
  flapA.castShadow = flapB.castShadow = true;
  flap.add(flapA, flapB);

  const sealMesh = plane(W * 0.26, W * 0.26, withFlutter(new T.MeshStandardMaterial({ map: seal, roughness: 0.45, alphaTest: 0.5, alphaToCoverage: true })), 8);
  sealMesh.position.set(0, -FH + EDGE + W * 0.05, 0.004);
  flap.add(sealMesh);

  env.add(inside, sheet, pocketMesh, flap, frontMesh, pm);

  // ---------------------------------------------------------------- layout
  let vw = 0, vh = 0, phone = false, visH = 1, visW = 1;
  function resize() {
    vw = innerWidth;
    vh = innerHeight;
    phone = vw < 768;
    renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 2));
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    visH = 2 * camera.position.z * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    visW = visH * camera.aspect;
  }
  resize();
  addEventListener("resize", resize);

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  
  let pointerX = 0, pointerY = 0;
  addEventListener("pointermove", (e) => { pointerX = e.clientX / vw - 0.5; pointerY = e.clientY / vh - 0.5; }, { passive: true });

  // Progress through #kelione: 0 as it reaches the top, 1 as it leaves.
  function progress() {
    const r = flight.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - vh), -1, 1.2);
  }

  const steps = [...flight.querySelectorAll("[data-step]")];
  let shown = -1;
  const timer = { last: performance.now(), t: 0 };
  let smooth = progress();

  function frame(now) {
    const dt = Math.min(0.05, (now - timer.last) / 1000);
    timer.last = now;
    timer.t += dt;
    const raw = progress();
    smooth += (raw - smooth) * (1 - Math.exp(-dt * 10));
    const p = clamp(smooth, 0, 1);

    const active = raw < 0.02 ? -1 : raw < 0.34 ? 0 : raw < 0.66 ? 1 : 2;
    if (active !== shown) {
      shown = active;
      steps.forEach((s, i) => s.classList.toggle("on", i === Math.max(0, active)));
    }

    const sIn = ease(span(p, 0.02, 0.26));
    const close = ease(span(p, 0.26, 0.42));
    const sealOn = span(p, 0.4, 0.47);
    const turn = ease(span(p, 0.48, 0.64));
    const mark = span(p, 0.62, 0.67);
    const fly = span(p, 0.68, 0.97);

    sheet.position.y = SHEET_IN + (1 - sIn) * SH * 0.62;
    sheet.visible = close < 0.98;
    // Open: standing up, leaning ~17 degrees back, behind the letter. Closing
    // folds it forward over the letter (through -90 degrees, towards the
    // viewer), never back through the envelope.
    flap.rotation.x = (1 - close) * -(Math.PI + 0.3);
    // Open, it leans back from a hinge in front of the letter (z 0.001), so
    // its base cut through the raised sheet. Hinge it behind the letter until
    // the letter is in (then the sheet sits below the hinge) and closing starts.
    flap.position.z = close > 0 ? 0.012 + (1 - close) * 0.004 : -0.002;
    sealMesh.visible = sealOn > 0;
    sealMesh.scale.setScalar(1 + (1 - sealOn) * 0.6);
    pm.material.opacity = mark * 0.85;
    pm.scale.setScalar(1 + (1 - mark) * 0.35);

    // Where it rests: right of the words on a wide screen, above them on a phone.
    const baseX = phone ? 0 : visW * 0.2;
    const baseY = phone ? visH * 0.13 : -visH * 0.05;
    const scale = phone ? Math.min(0.85, (visW * 0.62) / W) : 1.12;
    const idle = 1 - fly;
    const bob = Math.sin(timer.t * 1.3) * 0.04 * idle;

    // The flight: up and off to the left, banking, coming a little towards you.
    const f = fly * fly;
    env.position.set(
      baseX - f * visW * 1.15 + pointerX * 0.12 * idle,
      baseY + bob + f * visH * 0.55 - Math.sin(fly * Math.PI) * 0.4,
      f * 2.2
    );
    env.scale.setScalar(scale);
    env.rotation.set(
      -0.22 + (1 - turn) * 0.1 + pointerY * 0.08 * idle - fly * 0.5,
      (phone ? 0 : -0.32) * (1 - turn) + turn * Math.PI + pointerX * 0.16 * idle + fly * 0.9,
      0.06 * (1 - turn) - 0.08 * turn + f * 0.9 + Math.sin(timer.t * 0.9) * 0.02 * idle
    );
    // A little dip as the postmark lands.
    env.position.z -= Math.sin(mark * Math.PI) * 0.08;
    // Paper only flutters in flight: at rest the open flap would wave on its own.
    flutter.amp.value = fly * 0.09;
    flutter.time.value = timer.t;

    canvas.style.opacity = raw > 1.02 ? "0" : "1";
    renderer.render(scene, camera);
  }

  // Draw only while the hero or the flight is on screen.
  let running = false;
  const area = document.querySelector("[data-env-area]") || flight;
  new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    renderer.setAnimationLoop(running ? frame : null);
    canvas.style.visibility = running ? "visible" : "hidden";
  }).observe(area);

  document.documentElement.classList.add("env-live");
}
