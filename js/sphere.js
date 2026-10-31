// Red dot-matrix sphere for the homepage hero. Plain 2D canvas, no
// dependencies. The page is fully readable without it; a CSS dot field
// stands in until the first frame is drawn.
const canvas = document.getElementById("sphere");
const holder = canvas && canvas.parentElement;
const ctx = canvas && canvas.getContext("2d");

if (ctx) start();

function start() {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = window.innerWidth < 700 ? 280 : 480;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const base = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    base[i * 3] = Math.cos(golden * i) * ring;
    base[i * 3 + 1] = y;
    base[i * 3 + 2] = Math.sin(golden * i) * ring;
  }
  const order = Array.from({ length: count }, (_, i) => i);
  const proj = new Float32Array(count * 4);

  // Rotation matrix, row-major; starts slightly tilted so the poles read.
  let m = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  m = mul(rot(0, 0.35), m);

  const dot = document.createElement("canvas");
  let size = 0;
  let dpr = 1;
  let velX = 0;
  let velY = 0;
  let velZ = 0;
  let last = null;
  let visible = true;
  let running = false;

  function paintDot(px) {
    const d = Math.ceil(px * 2);
    dot.width = dot.height = d;
    const g = dot.getContext("2d");
    const grad = g.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, d / 2);
    grad.addColorStop(0, "#ff4a4a");
    grad.addColorStop(0.56, "#e63939");
    grad.addColorStop(1, "rgba(230, 57, 57, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, d, d);
  }

  function resize() {
    const box = holder.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = Math.max(1, Math.min(box.width, box.height));
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    paintDot(size * 0.0165 * dpr);
    if (!running) draw();
  }

  function draw() {
    const w = canvas.width;
    const c = w / 2;
    const r = w * 0.4;
    const cam = 4.2;
    for (let i = 0; i < count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const rx = m[0] * x + m[1] * y + m[2] * z;
      const ry = m[3] * x + m[4] * y + m[5] * z;
      const rz = m[6] * x + m[7] * y + m[8] * z;
      const k = cam / (cam - rz);
      proj[i * 4] = c + rx * r * k;
      proj[i * 4 + 1] = c - ry * r * k;
      proj[i * 4 + 2] = k;
      proj[i * 4 + 3] = rz;
    }
    order.sort((a, b) => proj[a * 4 + 3] - proj[b * 4 + 3]);
    ctx.clearRect(0, 0, w, w);
    const d = dot.width;
    for (const i of order) {
      const s = d * proj[i * 4 + 2];
      ctx.drawImage(dot, proj[i * 4] - s / 2, proj[i * 4 + 1] - s / 2, s, s);
    }
  }

  function frame() {
    if (!visible) {
      running = false;
      return;
    }
    velX *= 0.9;
    velY *= 0.9;
    velZ *= 0.9;
    m = mul(rot(1, 0.0016 + velY), m);
    if (velX) m = mul(rot(0, velX), m);
    if (velZ) m = mul(rot(2, velZ), m);
    draw();
    requestAnimationFrame(frame);
  }

  function run() {
    if (running || still) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function onPointer(e) {
    const box = holder.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * 2 - 1;
    const py = -((e.clientY - box.top) / box.height) * 2 + 1;
    if (last) {
      const dx = px - last[0];
      const dy = py - last[1];
      velX = clamp(velX - dy * 0.12, 0.04);
      velY = clamp(velY + dx * 0.12, 0.04);
      velZ = clamp(velZ + (last[0] * dy - last[1] * dx) * 0.06, 0.03);
    }
    last = [px, py];
  }

  resize();
  holder.classList.add("is-live");
  window.addEventListener("resize", resize);

  if (still) return;

  const hero = holder.closest("section") || holder;
  hero.addEventListener("pointermove", onPointer, { passive: true });
  hero.addEventListener("pointerleave", () => (last = null));
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) run();
  }).observe(holder);
  run();
}

function clamp(v, max) {
  return Math.max(-max, Math.min(max, v));
}

function rot(axis, a) {
  const c = Math.cos(a), s = Math.sin(a);
  if (axis === 0) return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === 1) return [c, 0, s, 0, 1, 0, -s, 0, c];
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

function mul(a, b) {
  const o = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return o;
}
