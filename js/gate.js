import * as THREE from "https://unpkg.com/three@0.160.1/build/three.module.js";

const gate = document.getElementById("gate");
const canvas = document.getElementById("gate-canvas");

if (!gate || !canvas) {
  document.body.classList.remove("is-gated");
} else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  openSite();
} else {
  boot().catch(() => openSite());
}

let opened = false;

function openSite() {
  if (opened) return;
  opened = true;
  document.body.classList.remove("is-gated");
  if (!gate) return;
  gate.classList.add("is-out");
  window.setTimeout(() => gate.remove(), 550);
}

async function boot() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.z = 7.4;

  const count = window.innerWidth < 700 ? 280 : 480;
  const radius = 1.48;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * ring;
    const z = Math.sin(theta) * ring;
    positions[i * 3] = x * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = z * radius;

    const spread = 0.32 + Math.random() * 0.9;
    velocities[i * 3] = x * spread * 3.6 + (Math.random() - 0.5) * 0.7;
    velocities[i * 3 + 1] = y * spread * 3.6 + Math.random() * 1.05;
    velocities[i * 3 + 2] = z * spread * 3.6 + (Math.random() - 0.5) * 0.7;
    seeds[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aVel", new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uSize: { value: 1 },
    uTime: { value: 0 },
    uExplode: { value: 0 },
    uHover: { value: 0 },
    uMouse: { value: new THREE.Vector3(0, 0, radius) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uSize;
      uniform float uTime;
      uniform float uExplode;
      uniform float uHover;
      uniform vec3 uMouse;
      attribute vec3 aVel;
      attribute float aSeed;
      varying float vAlpha;

      void main() {
        vec3 p = position;
        float breathe = 1.0 + sin(uTime * 0.7 + aSeed * 6.283) * 0.012;
        p *= breathe;

        float d = length(p - uMouse);
        float pull = uHover * 0.28 * exp(-d * d * 3.4);
        p += normalize(p + 0.0001) * pull;

        p += aVel * uExplode;
        p.y += uExplode * aSeed * 0.8;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (1.0 - uExplode * 0.78) * (58.0 / -mv.z);
        vAlpha = 1.0 - smoothstep(0.52, 1.0, uExplode);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float r = length(c);
        if (r > 0.5) discard;
        float edge = smoothstep(0.5, 0.28, r);
        vec3 red = vec3(0.902, 0.224, 0.224);
        vec3 hot = vec3(1.0, 0.176, 0.176);
        vec3 col = mix(red, hot, edge * 0.35);
        gl_FragColor = vec4(col, vAlpha * edge);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const hitSphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.08, 16, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  scene.add(hitSphere);

  const pointer = new THREE.Vector2(0, 0);
  const targetRot = new THREE.Vector2(0, 0);
  const look = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  let exploding = false;
  let explodeStart = 0;
  let hover = 0;
  let spin = 0;
  const clock = new THREE.Clock();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uSize.value = Math.max(2.6, Math.min(w, h) * 0.004);
  }

  function onPointer(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    pointer.x = (x / window.innerWidth) * 2 - 1;
    pointer.y = -(y / window.innerHeight) * 2 + 1;
    targetRot.y = pointer.x * 0.55;
    targetRot.x = pointer.y * 0.32;
  }

  function explode() {
    if (exploding) return;
    exploding = true;
    explodeStart = clock.getElapsedTime();
  }

  function frame() {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    if (!exploding) {
      spin += 0.0024;
      look.x += (targetRot.x - look.x) * 0.07;
      look.y += (targetRot.y - look.y) * 0.07;
      points.rotation.set(look.x, spin + look.y, 0);
      hitSphere.rotation.copy(points.rotation);
      hitSphere.updateMatrixWorld();
    } else {
      const k = Math.min(1, (t - explodeStart) / 1.35);
      const eased = 1 - Math.pow(1 - k, 3);
      uniforms.uExplode.value = eased;
      points.rotation.y += 0.012 * (1 - k);
      if (k > 0.16) {
        gate.classList.add("is-revealing");
        document.body.classList.remove("is-gated");
      }
      if (k > 0.78) gate.classList.add("is-out");
      if (k >= 1) {
        openSite();
        return;
      }
    }

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(hitSphere);
    const over = hits.length > 0;
    hover += ((over ? 1 : 0.18) - hover) * 0.1;
    uniforms.uHover.value = hover * (1 - uniforms.uExplode.value);
    if (hits[0]) uniforms.uMouse.value.copy(hits[0].point);
    else {
      uniforms.uMouse.value.set(pointer.x * radius, pointer.y * radius, radius * 0.4);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("touchmove", onPointer, { passive: true });
  gate.addEventListener("click", explode);
  document.querySelector(".skip")?.addEventListener("click", () => openSite());
  gate.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      explode();
    }
  });
  gate.focus({ preventScroll: true });
  requestAnimationFrame(frame);
}
