import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildExterior, AREA_K } from './exterior.js';
import { buildInterior } from './interior.js';
import { CHAPTERS, SPLIT, renderChapters } from './story.js';
import './style.css';

gsap.registerPlugin(ScrollTrigger);

// ---------- Renderer ----------
const canvas = document.querySelector('#webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
const loaderEl = document.querySelector('.loader');
const loaderBar = document.querySelector('.loader__bar span');
manager.onProgress = (_, loaded, total) => { loaderBar.style.width = `${(loaded / total) * 100}%`; };
manager.onLoad = () => {
  gsap.to(loaderEl, { autoAlpha: 0, duration: 1.2, delay: 0.3, ease: 'power2.out' });
  document.body.classList.add('is-ready');
};

const exterior = buildExterior(renderer, loader);
const interior = buildInterior(renderer, loader);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1500);

// ---------- Post ----------
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(exterior.scene, camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.6, 0.86);
composer.addPass(renderPass);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- Camera paths (keyframes: position, look-at, fov) ----------
// Exterior: drone establishing shot -> orbit -> street level -> rise to the
// glowing loggia on floor 3 (the shrine glimpse in DJI_0087) -> through the glass.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const EXT = [
  { p: V(95, 85, 120), l: V(0, 8, -8), fov: 42 },
  { p: V(70, 55, 85), l: V(0, 8, -8), fov: 42 },
  { p: V(52, 34, 38), l: V(0, 9, -6), fov: 44 },   // DJI_0093-like oblique
  { p: V(34, 21, 26), l: V(0, 9, -4), fov: 46 },
  { p: V(18, 7.5, 28), l: V(1, 9, -3), fov: 48 },   // DJI_0087-like front-right
  { p: V(6, 6.5, 22), l: V(1.5, 8.5, -3), fov: 50 },
  { p: V(3.2, 8.6, 9), l: V(2.6, 8.8, -3), fov: 50 },
  { p: V(2.6, 8.75, 2.4), l: V(2.5, 8.8, -4), fov: 54 },
  { p: V(2.5, 8.8, -1.8), l: V(2.5, 8.8, -6), fov: 64 },
];
// Interior: through the doors, down the aisle, gaze at the mandala,
// turn to the thangkas, and come to rest before the altar.
const INT = [
  { p: V(0, 2.1, 17.5), l: V(0, 2.0, 0), fov: 62 },
  { p: V(0, 1.9, 13.0), l: V(0, 1.9, -5), fov: 56 },
  { p: V(0, 1.8, 8.0), l: V(0, 2.2, -8), fov: 54 },
  { p: V(0.6, 1.9, 4.0), l: V(0, 5.6, -1.5), fov: 58 },   // look up: mandala
  { p: V(0.4, 2.4, 1.0), l: V(-2.5, 4.6, -0.5), fov: 60 },
  { p: V(-2.5, 2.2, 1.0), l: V(-11, 2.6, -1), fov: 52 },   // thangka wall
  { p: V(-6.5, 2.4, -2.0), l: V(-11, 2.7, -3.6), fov: 48 },
  { p: V(-4.0, 1.9, -6.0), l: V(-3, 2.2, -15), fov: 50 },  // altar side niches
  { p: V(-0.8, 1.7, -7.4), l: V(0, 2.2, -15), fov: 48 },
  { p: V(0, 1.65, -8.9), l: V(0, 2.2, -15), fov: 44 },    // before the Buddha
  { p: V(0, 1.65, -9.5), l: V(0, 2.25, -15), fov: 38 },
];

function makePath(keys) {
  return {
    pos: new THREE.CatmullRomCurve3(keys.map(k => k.p), false, 'centripetal'),
    look: new THREE.CatmullRomCurve3(keys.map(k => k.l), false, 'centripetal'),
    fov: keys.map(k => k.fov),
  };
}
// exterior layout is spread by AREA_K horizontally, so the flight path follows
const extPath = makePath(EXT.map(k => ({ ...k, p: V(k.p.x * AREA_K, k.p.y, k.p.z * AREA_K), l: V(k.l.x * AREA_K, k.l.y, k.l.z * AREA_K) })));
const intPath = makePath(INT);

const sampleFov = (arr, u) => {
  const f = u * (arr.length - 1);
  const i = Math.min(Math.floor(f), arr.length - 2);
  const t = f - i;
  return THREE.MathUtils.lerp(arr[i], arr[i + 1], t * t * (3 - 2 * t));
};

// ---------- Scroll ----------
const state = { progress: 0 };
gsap.to(state, {
  progress: 1,
  ease: 'none',
  scrollTrigger: { trigger: '#scroll', start: 'top top', end: 'bottom bottom', scrub: 1.4 },
});

// debug: ?p=0.42 freezes the journey at a given progress
const debugP = new URLSearchParams(location.search).get('p');
if (debugP !== null) { ScrollTrigger.getAll().forEach(s => s.kill()); state.progress = parseFloat(debugP); }
window.__journey = state;

const progressBar =document.querySelector('.progress span');
const flash = document.querySelector('.flash');
renderChapters(document.querySelector('.chapters'));
const chapterEls = CHAPTERS.map(c => document.querySelector(`[data-chapter="${c.id}"]`));
const hint = document.querySelector('.scroll-hint');

// mouse parallax
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
window.addEventListener('pointermove', e => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

const tmpP = new THREE.Vector3();
const tmpL = new THREE.Vector3();
const side = new THREE.Vector3();
const clock = new THREE.Clock();
let currentScene = null;

const smooth = t => t * t * (3 - 2 * t);

// ---------- Mouse / touch: look, pan, zoom (works while autoplay keeps flying) ----------
const UP = new THREE.Vector3(0, 1, 0);
const dirV = new THREE.Vector3(), rightV = new THREE.Vector3(), upV = new THREE.Vector3();
const vt = { yaw: 0, pitch: 0, panX: 0, panY: 0, zoom: 1 }; // targets
const vc = { yaw: 0, pitch: 0, panX: 0, panY: 0, zoom: 1 }; // eased current values
const clamp = THREE.MathUtils.clamp;
const pointers = new Map();
let dragMode = null;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  dragMode = e.button === 2 || e.shiftKey ? 'pan' : 'look';
  document.body.classList.add('is-dragging');
});
canvas.addEventListener('pointermove', e => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const cur = { x: e.clientX, y: e.clientY };
  if (pointers.size === 2) { // pinch zoom
    const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)[1];
    const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(cur.x - other.x, cur.y - other.y);
    if (d0 > 0 && d1 > 0) vt.zoom = clamp(vt.zoom * (d0 / d1), 0.35, 1.5);
  } else {
    const dx = cur.x - prev.x, dy = cur.y - prev.y;
    if (dragMode === 'pan') {
      const rate = currentScene === 'ext' ? 0.06 : 0.012, lim = currentScene === 'ext' ? 30 : 1.6;
      vt.panX = clamp(vt.panX - dx * rate, -lim, lim);
      vt.panY = clamp(vt.panY + dy * rate, -lim, lim);
    } else {
      vt.yaw = clamp(vt.yaw + dx * 0.004, -1.7, 1.7);
      vt.pitch = clamp(vt.pitch + dy * 0.004, -1.1, 1.1);
    }
  }
  pointers.set(e.pointerId, cur);
});
const endPointer = e => { pointers.delete(e.pointerId); if (!pointers.size) document.body.classList.remove('is-dragging'); };
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
window.addEventListener('wheel', e => { e.preventDefault(); vt.zoom = clamp(vt.zoom * Math.exp(-e.deltaY * 0.0012), 0.35, 1.5); }, { passive: false });
canvas.addEventListener('dblclick', () => Object.assign(vt, { yaw: 0, pitch: 0, panX: 0, panY: 0, zoom: 1 }));

function setScene(which) {
  if (currentScene === which) return;
  currentScene = which;
  renderPass.scene = which === 'ext' ? exterior.scene : interior.scene;
  bloom.strength = which === 'ext' ? 0.45 : 0.5;
  bloom.threshold = which === 'ext' ? 0.86 : 0.88;
  renderer.toneMappingExposure = which === 'ext' ? 1.0 : 0.95;
  document.body.dataset.scene = which;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const p = state.progress;

  let path, u;
  if (p < SPLIT) { setScene('ext'); path = extPath; u = p / SPLIT; }
  else { setScene('int'); path = intPath; u = (p - SPLIT) / (1 - SPLIT); }
  u = THREE.MathUtils.clamp(u, 0, 1);

  path.pos.getPoint(u, tmpP);
  path.look.getPoint(u, tmpL);

  // idle drift + mouse parallax, damped
  mouse.sx += (mouse.x - mouse.sx) * 0.04;
  mouse.sy += (mouse.y - mouse.sy) * 0.04;
  const drift = currentScene === 'ext' ? 1 : 0.35;
  side.subVectors(tmpL, tmpP).normalize().cross(camera.up).normalize();
  tmpP.addScaledVector(side, (mouse.sx * 0.6 + Math.sin(t * 0.3) * 0.15) * drift);
  tmpP.y += (-mouse.sy * 0.35 + Math.sin(t * 0.45) * 0.08) * drift;

  // user offsets on top of the flight path: look around, pan, zoom (eased)
  for (const k of Object.keys(vc)) vc[k] += (vt[k] - vc[k]) * 0.12;
  if (vc.yaw || vc.pitch || vc.panX || vc.panY) {
    dirV.subVectors(tmpL, tmpP); const len = dirV.length(); dirV.normalize();
    rightV.crossVectors(dirV, UP).normalize();
    upV.crossVectors(rightV, dirV);
    tmpP.addScaledVector(rightV, vc.panX).addScaledVector(upV, vc.panY);
    dirV.applyAxisAngle(UP, vc.yaw);
    rightV.crossVectors(dirV, UP).normalize();
    dirV.applyAxisAngle(rightV, vc.pitch);
    tmpL.copy(tmpP).addScaledVector(dirV, len);
  }
  camera.position.copy(tmpP);
  camera.lookAt(tmpL);
  const fov = THREE.MathUtils.clamp(sampleFov(path.fov, u) * vc.zoom, 12, 100);
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

  // golden flash through the window: peaks at the scene switch
  const fw = 0.045;
  const f = Math.max(0, 1 - Math.abs(p - SPLIT) / fw);
  flash.style.opacity = smooth(f).toFixed(3);

  // chapters
  CHAPTERS.forEach((c, i) => {
    const fade = 0.018;
    let o = 0;
    if (p >= c.from && p <= c.to) o = Math.min(1, (p - c.from) / fade, (c.to - p) / fade);
    if (c.id === 'intro') o = Math.min(1, (c.to - p) / 0.03); // visible on load
    o = THREE.MathUtils.clamp(o, 0, 1);
    const el = chapterEls[i];
    el.style.opacity = o.toFixed(3);
    el.style.transform = `translate3d(0, ${(1 - o) * 24}px, 0)`;
    el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
  });
  progressBar.style.transform = `scaleX(${p})`;
  hint.style.opacity = 0; // autoplay: no "scroll down" hint needed

  exterior.update(t, dt);
  interior.update(t, dt);
  composer.render(dt);
  requestAnimationFrame(tick);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// chapter dots navigation
document.querySelectorAll('[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = parseFloat(btn.dataset.goto);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: target * max, behavior: 'smooth' });
  });
});

// ---------- Autoplay ----------
// Drives the page scroll, so the ScrollTrigger scrub stays the single source of
// truth. Any manual scrolling pauses it.
const AUTOPLAY_SECONDS = 110; // full journey length (the part after the start point is proportionally shorter)
const AUTOPLAY_START = 0.085; // progress where the city / street chapter begins
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const playBtn = document.querySelector('.play');
const playLabel = playBtn.querySelector('.play__label');
const auto = { p: 0 };
let autoTween = null;
let autoStarted = false;
const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

function setPlaying(on) {
  document.body.classList.toggle('is-playing', on);
  playLabel.textContent = on ? 'Tạm dừng' : 'Tự động';
  playBtn.setAttribute('aria-label', on ? 'Tạm dừng' : 'Tự động chạy');
}
function pauseAuto() {
  if (autoTween) { autoTween.kill(); autoTween = null; }
  setPlaying(false);
}
function playAuto() {
  if (autoTween) autoTween.kill();
  let start = window.scrollY / maxScroll();
  if (start > 0.995) { start = 0; window.scrollTo(0, 0); } // finished before: replay from the top
  auto.p = start;
  setPlaying(true);
  autoTween = gsap.to(auto, {
    p: 1,
    duration: AUTOPLAY_SECONDS * (1 - start),
    ease: 'none',
    onUpdate: () => window.scrollTo(0, auto.p * maxScroll()),
    onComplete: () => { autoTween = null; setPlaying(false); },
  });
}
playBtn.addEventListener('click', () => (autoTween ? pauseAuto() : playAuto()));
// keys, dragging the scrollbar and the nav buttons take over the timeline (mouse drag / wheel only adjust the view)
window.addEventListener('keydown', e => {
  if (e.key === ' ') { e.preventDefault(); autoTween ? pauseAuto() : playAuto(); }
  else if (autoTween && e.key.length > 1) pauseAuto(); // arrows, page keys, home/end
});
window.addEventListener('scroll', () => { if (autoTween && Math.abs(window.scrollY - auto.p * maxScroll()) > 8) pauseAuto(); }, { passive: true });
document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', pauseAuto));
setPlaying(false);

// start by itself once the scene is loaded (not when ?p= freezes the journey)
const prevOnLoad = manager.onLoad;
manager.onLoad = () => {
  prevOnLoad();
  if (autoStarted || debugP !== null) return;
  autoStarted = true;
  // begin straight at the street scene (skips the empty aerial intro) and keep flying on its own
  setTimeout(() => { window.scrollTo(0, AUTOPLAY_START * maxScroll()); playAuto(); }, 900);
};

requestAnimationFrame(tick);
