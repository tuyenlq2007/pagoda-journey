import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as T from './textures.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Statue models (optimised copies of the user's Vajrasattva and Tara files, see README).
// `up` is the model's up axis; hi = close-up niches, lo = small side niches.
const STATUE_MODELS = {
  vajrasattva: { hi: '/models/vajrasattva_hi.glb', lo: '/models/vajrasattva_lo.glb', up: 'y', rotY: 0, gilded: false },
  vajrasattva_full: { hi: '/models/vajrasattva_full_hi.glb', lo: '/models/vajrasattva_full_hi.glb', up: 'y', rotY: 0, gilded: true },
  tara: { hi: '/models/tara_retopo_hi.glb', lo: '/models/tara_retopo_lo.glb', up: 'y', rotY: 0, gilded: true }, // from Retopology.fbx
};

// Interior: the shrine hall from the renders p1–p5.
// Orange walls & ceiling, red dado with blue/green bands, green cornice,
// medallion frieze, mandala ceiling panel, wooden altar wall with ogee niches
// and gilded Buddhas, thangkas on the side wall, rows of low tables & cushions.
// Hall coordinates: X ∈ [-11, 11], Z ∈ [-15, 15], ceiling 5.6 m.
// Entrance doors at +Z, altar wall at -Z.

export const HALL = { w: 22, d: 30, h: 5.6 };

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

function ogeeShape(path, cx, y0, w, h, archH) {
  // rectangle with an ogee (onion) arch on top, drawn as a closed path
  const x0 = cx - w / 2, x1 = cx + w / 2, top = y0 + h;
  path.moveTo(x0, y0);
  path.lineTo(x1, y0);
  path.lineTo(x1, top);
  path.bezierCurveTo(x1, top + archH * 0.55, cx + w * 0.08, top + archH * 0.45, cx, top + archH);
  path.bezierCurveTo(cx - w * 0.08, top + archH * 0.45, x0, top + archH * 0.55, x0, top);
  path.lineTo(x0, y0);
  return path;
}

function buddhaGeometry() {
  // Seated figure as a lathe profile: lotus throne, crossed legs, torso, neck.
  const p = [
    [0, 0], [0.52, 0], [0.56, 0.05], [0.5, 0.09], [0.58, 0.13], [0.5, 0.19], // lotus base
    [0.44, 0.2], [0.5, 0.26], [0.5, 0.33], [0.36, 0.38],                       // folded legs
    [0.27, 0.4], [0.26, 0.5], [0.24, 0.6], [0.22, 0.68], [0.16, 0.73],          // torso / shoulders
    [0.075, 0.76], [0.07, 0.8], [0, 0.8],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(p, 40);
  return g;
}

export function buildInterior(renderer, loader) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  scene.background = new THREE.Color(0x1a0d06);
  scene.fog = new THREE.Fog(0x2a1408, 18, 46);

  const { w, d, h } = HALL;
  const hw = w / 2, hd = d / 2;

  // ---------- Materials ----------
  const plasterMap = T.plasterTexture();
  const M = {
    wall: new THREE.MeshStandardMaterial({ map: plasterMap, roughness: 0.9 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xe3872c, roughness: 0.95 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb0141a, roughness: 0.7 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2b4fa0, roughness: 0.7 }),
    green: new THREE.MeshStandardMaterial({ color: 0x1f6b45, roughness: 0.6 }),
    frieze: new THREE.MeshStandardMaterial({ map: T.friezeTexture(), roughness: 0.6, emissive: 0x2a1004, emissiveIntensity: 0.4 }),
    marble: new THREE.MeshStandardMaterial({ map: T.marbleTexture(), roughness: 0.25, metalness: 0.0 }),
    herring: new THREE.MeshStandardMaterial({ map: T.herringboneTexture(), roughness: 0.55 }),
    wood: new THREE.MeshStandardMaterial({ map: T.woodTexture('#6b4a2f'), roughness: 0.6 }),
    woodDark: new THREE.MeshStandardMaterial({ map: T.woodTexture('#4b3020'), roughness: 0.55 }),
    woodLight: new THREE.MeshStandardMaterial({ map: T.woodTexture('#86603d'), roughness: 0.55 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9a84e, metalness: 1, roughness: 0.26, emissive: 0x3a2004, emissiveIntensity: 0.2 }),
    nicheGlow: new THREE.MeshBasicMaterial({ map: T.nicheGlowTexture(), color: 0xc09070 }),
    curtain: new THREE.MeshBasicMaterial({ map: T.curtainTexture(), color: 0xffe2b8 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffe6b0 }),
    flame: new THREE.MeshBasicMaterial({ color: 0xffc46a }),
    maroon: new THREE.MeshStandardMaterial({ color: 0x5e0d14, roughness: 0.85 }),
    cushionTop: new THREE.MeshStandardMaterial({ map: T.cushionTexture(), roughness: 0.85 }),
    glassStain: new THREE.MeshStandardMaterial({ color: 0x3a5a4a, emissive: 0x8a5a2a, emissiveIntensity: 0.6, roughness: 0.2 }),
  };
  M.wall.map.repeat.set(8, 2);

  const add = (geo, mat, x, y, z, parent = scene) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
  };
  const boxMM = (x0, y0, z0, x1, y1, z1, mat, parent = scene) =>
    add(box(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, parent);

  // ---------- Floor ----------
  const floor = add(new THREE.PlaneGeometry(w, d), M.marble, 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;
  const wood = add(new THREE.PlaneGeometry(19, 23), M.herring, 0, 0.01, 0.5);
  wood.rotation.x = -Math.PI / 2;

  // ---------- Walls ----------
  const wallPlane = (cx, cz, len, rotY) => {
    const m = add(new THREE.PlaneGeometry(len, h), M.wall, cx, h / 2, cz);
    m.rotation.y = rotY; return m;
  };
  wallPlane(0, -hd, w, 0);                 // altar wall
  wallPlane(0, hd, w, Math.PI);            // entrance wall
  wallPlane(-hw, 0, d, Math.PI / 2);       // thangka wall
  wallPlane(hw, 0, d, -Math.PI / 2);       // window wall

  // dado (red) + stripes, per wall; the thangka wall gets wood wainscot instead (p3)
  const dado = (along, fixed, from, to, inward, mat = M.red, hgt = 1.1) => {
    const t = 0.06;
    if (along === 'x') boxMM(from, 0, fixed + (inward > 0 ? 0 : -t), to, hgt, fixed + (inward > 0 ? t : 0), mat);
    else boxMM(fixed + (inward > 0 ? 0 : -t), 0, from, fixed + (inward > 0 ? t : 0), hgt, to, mat);
    const stripe = (y0, y1, m, off) => {
      if (along === 'x') boxMM(from, y0, fixed + (inward > 0 ? 0 : -off), to, y1, fixed + (inward > 0 ? off : 0), m);
      else boxMM(fixed + (inward > 0 ? 0 : -off), y0, from, fixed + (inward > 0 ? off : 0), y1, to, m);
    };
    stripe(hgt, hgt + 0.06, M.blue, 0.07);
    stripe(hgt + 0.06, hgt + 0.1, M.red, 0.07);
    stripe(hgt + 0.1, hgt + 0.16, M.green, 0.07);
  };
  dado('x', hd, -hw, hw, -1);
  dado('z', hw, -hd, hd, -1);
  dado('z', -hw, -hd, hd, 1, M.woodDark, 1.4);

  // frieze + green cornice around the top of the walls
  const friezeY0 = 4.45, friezeY1 = 4.95;
  const fz = (len, x, z, ry) => {
    const m = add(new THREE.PlaneGeometry(len, friezeY1 - friezeY0), M.frieze.clone(), x, (friezeY0 + friezeY1) / 2, z);
    m.material.map = M.frieze.map.clone(); m.material.map.repeat.set(len / 1.9, 1); m.material.map.needsUpdate = true;
    m.rotation.y = ry;
  };
  fz(w, 0, -hd + 0.02, 0); fz(w, 0, hd - 0.02, Math.PI); fz(d, -hw + 0.02, 0, Math.PI / 2); fz(d, hw - 0.02, 0, -Math.PI / 2);
  // soffit (dropped ceiling perimeter) with green edge
  const sof = 1.4, sy = 5.0;
  boxMM(-hw, sy, -hd, hw, h, -hd + sof, M.ceiling);
  boxMM(-hw, sy, hd - sof, hw, h, hd, M.ceiling);
  boxMM(-hw, sy, -hd, -hw + sof, h, hd, M.ceiling);
  boxMM(hw - sof, sy, -hd, hw, h, hd, M.ceiling);
  boxMM(-hw, 4.95, -hd, hw, 5.05, -hd + 0.18, M.green);
  boxMM(-hw, 4.95, hd - 0.18, hw, 5.05, hd, M.green);
  boxMM(-hw, 4.95, -hd, -hw + 0.18, 5.05, hd, M.green);
  boxMM(hw - 0.18, 4.95, -hd, hw, 5.05, hd, M.green);
  const si = { x0: -hw + sof, x1: hw - sof, z0: -hd + sof, z1: hd - sof };
  boxMM(si.x0, 4.92, si.z0 - 0.06, si.x1, 5.0, si.z0 + 0.04, M.green);
  boxMM(si.x0, 4.92, si.z1 - 0.04, si.x1, 5.0, si.z1 + 0.06, M.green);
  boxMM(si.x0 - 0.06, 4.92, si.z0, si.x0 + 0.04, 5.0, si.z1, M.green);
  boxMM(si.x1 - 0.04, 4.92, si.z0, si.x1 + 0.06, 5.0, si.z1, M.green);
  // cove light strip above soffit edge
  const cove = new THREE.MeshBasicMaterial({ color: 0xffc070 });
  boxMM(si.x0 + 0.1, 5.02, si.z0 + 0.05, si.x1 - 0.1, 5.05, si.z0 + 0.12, cove);
  boxMM(si.x0 + 0.1, 5.02, si.z1 - 0.12, si.x1 - 0.1, 5.05, si.z1 - 0.05, cove);
  boxMM(si.x0 + 0.05, 5.02, si.z0 + 0.1, si.x0 + 0.12, 5.05, si.z1 - 0.1, cove);
  boxMM(si.x1 - 0.12, 5.02, si.z0 + 0.1, si.x1 - 0.05, 5.05, si.z1 - 0.1, cove);
  // main ceiling
  const ceil = add(new THREE.PlaneGeometry(w, d), M.ceiling, 0, h, 0);
  ceil.rotation.x = Math.PI / 2;

  // mandala panel with green frame
  const mand = add(new THREE.PlaneGeometry(6.4, 4.0), new THREE.MeshStandardMaterial({ map: T.mandalaTexture(), roughness: 0.6, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 }), 0, h - 0.18, 0.5);
  mand.rotation.x = Math.PI / 2;
  mand.material.emissive = new THREE.Color(0x3a1a0a);
  boxMM(-3.5, h - 0.2, 0.5 - 2.1, 3.5, h, 0.5 - 1.9, M.green);
  boxMM(-3.5, h - 0.2, 0.5 + 1.9, 3.5, h, 0.5 + 2.1, M.green);
  boxMM(-3.5, h - 0.2, 0.5 - 2.1, -3.3, h, 0.5 + 2.1, M.green);
  boxMM(3.3, h - 0.2, 0.5 - 2.1, 3.5, h, 0.5 + 2.1, M.green);

  // downlights (instanced emissive discs)
  const dl = [];
  for (let x = -7.5; x <= 7.5; x += 2.5) for (let z = -11; z <= 12; z += 2.6) {
    if (Math.abs(x) < 3.8 && Math.abs(z - 0.5) < 2.4) continue;
    dl.push([x, h - 0.01, z]);
  }
  for (let z = -13; z <= 13; z += 2.2) { dl.push([-hw + 0.7, sy - 0.01, z]); dl.push([hw - 0.7, sy - 0.01, z]); }
  const dlMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.07, 12), M.lamp, dl.length);
  const o3 = new THREE.Object3D();
  dl.forEach(([x, y, z], i) => { o3.position.set(x, y, z); o3.rotation.set(Math.PI / 2, 0, 0); o3.updateMatrix(); dlMesh.setMatrixAt(i, o3.matrix); });
  scene.add(dlMesh);

  // ---------- Window wall (right): curtained windows + door ----------
  for (const z of [-10, -6, 2, 6, 10]) {
    boxMM(hw - 0.12, 1.5, z - 1.4, hw - 0.04, 3.9, z + 1.4, M.woodDark);
    const c = add(new THREE.PlaneGeometry(2.6, 2.2), M.curtain, hw - 0.13, 2.7, z); c.rotation.y = -Math.PI / 2;
  }
  const door = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    boxMM(-1.0, 0, -0.08, 1.0, 2.9, 0.0, M.woodDark, g);
    for (const dx of [-0.75, -0.3, 0.3, 0.75]) boxMM(dx - 0.13, 1.0, 0.0, dx + 0.13, 2.5, 0.03, M.glassStain, g);
    boxMM(-0.03, 0, 0, 0.03, 2.9, 0.04, M.wood, g);
    return g;
  };
  door(hw - 0.05, -2, -Math.PI / 2);
  door(0, hd - 0.05, Math.PI);       // main entrance
  door(-hw + 0.05, 12.5, Math.PI / 2);
  // entrance wall windows
  for (const x of [-7.5, -4, 4, 7.5]) {
    boxMM(x - 1.3, 1.5, hd - 0.1, x + 1.3, 3.9, hd - 0.04, M.woodDark);
    const c = add(new THREE.PlaneGeometry(2.4, 2.2), M.curtain, x, 2.7, hd - 0.11); c.rotation.y = Math.PI;
  }
  // wall sconces
  for (const [x, z, ry] of [[-1.6, hd - 0.1, 0], [1.6, hd - 0.1, 0], [hw - 0.1, -3.6, 0], [hw - 0.1, -0.4, 0]]) {
    add(new THREE.SphereGeometry(0.1, 12, 8), M.lamp, x, 3.3, z);
  }

  // ---------- Thangka wall (left), using paintings cropped from p3 ----------
  const thangkas = [];
  for (let i = 0; i < 8; i++) {
    const tex = loader.load(`/textures/thangka_${i + 1}.jpg`);
    tex.colorSpace = THREE.SRGBColorSpace;
    const z = -9.6 + i * 2.6 + (i >= 4 ? 0.6 : 0);
    boxMM(-hw + 0.06, 1.85, z - 0.55, -hw + 0.1, 3.55, z + 0.55, M.woodDark);
    const m = add(new THREE.PlaneGeometry(1.0, 1.55), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.18 }), -hw + 0.11, 2.7, z);
    m.rotation.y = Math.PI / 2;
    add(new THREE.SphereGeometry(0.07, 10, 6), M.lamp, -hw + 0.25, 3.85, z);
    // painted light pool on the wall above each painting
    const pool = add(new THREE.PlaneGeometry(1.4, 1.8), new THREE.MeshBasicMaterial({ map: T.softDot(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), -hw + 0.08, 3.4, z);
    pool.rotation.y = Math.PI / 2;
    thangkas.push(m);
  }

  // ---------- Altar wall (front, -Z) ----------
  const az = -hd;
  // base cabinets with drawers
  boxMM(-10.2, 0, az, 10.2, 1.12, az + 1.4, M.woodDark);
  boxMM(-10.3, 1.12, az, 10.3, 1.2, az + 1.48, M.woodLight);
  for (let x = -9.6; x <= 9.6; x += 0.8) {
    boxMM(x - 0.36, 0.15, az + 1.4, x + 0.36, 0.95, az + 1.43, M.wood);
    add(new THREE.SphereGeometry(0.03, 8, 6), M.gold, x, 0.75, az + 1.45);
  }
  // niche panel: one shape with ogee holes, extruded
  const panelShape = new THREE.Shape();
  const PX0 = -10.2, PX1 = 10.2, PY0 = 1.2, PY1 = 4.4;
  panelShape.moveTo(PX0, PY0); panelShape.lineTo(PX1, PY0); panelShape.lineTo(PX1, PY1); panelShape.lineTo(PX0, PY1); panelShape.lineTo(PX0, PY0);
  const niches = [];
  const N = (cx, y0, nw, nh, ah, statue) => { niches.push({ cx, y0, nw, nh, statue }); panelShape.holes.push(ogeeShape(new THREE.Path(), cx, y0, nw, nh, ah)); };
  N(0, 1.3, 1.9, 2.3, 0.6, 1.5);
  for (const s of [-1, 1]) {
    N(s * 2.0, 1.3, 1.3, 1.55, 0.45, 1.0);
    N(s * 3.7, 1.3, 1.3, 1.55, 0.45, 1.0);
    N(s * 2.85, 3.35, 0.6, 0.5, 0.22, 0);
    N(s * 2.0, 3.35, 0.6, 0.5, 0.22, 0);
    N(s * 3.7, 3.35, 0.6, 0.5, 0.22, 0);
    for (let cx = 5.0; cx <= 9.6; cx += 0.95) {
      N(s * cx, 1.35, 0.68, 0.78, 0.25, 0.48);
      N(s * cx, 2.55, 0.68, 0.62, 0.25, 0);
      N(s * cx, 3.55, 0.68, 0.42, 0.2, 0);
    }
  }
  const panelGeo = new THREE.ExtrudeGeometry(panelShape, { depth: 0.22, bevelEnabled: false, curveSegments: 10 });
  const woodPanelMat = M.wood.clone();
  woodPanelMat.map = M.wood.map.clone(); woodPanelMat.map.repeat.set(0.5, 0.5); woodPanelMat.map.needsUpdate = true;
  const panel = add(panelGeo, woodPanelMat, 0, 0, az + 0.42);
  // warm glowing recess behind
  const back = add(new THREE.PlaneGeometry(20.4, 3.2), M.nicheGlow, 0, 2.8, az + 0.12);
  // niche top lamps
  for (const n of niches) add(new THREE.SphereGeometry(0.035, 8, 6), M.lamp, n.cx, n.y0 + n.nh + 0.02, az + 0.3);

  // gilded Buddhas
  const bGeo = buddhaGeometry();
  const headGeo = new THREE.SphereGeometry(0.105, 24, 16);
  const crownGeo = new THREE.ConeGeometry(0.05, 0.14, 12);
  const haloGeo = new THREE.CircleGeometry(0.42, 40);
  const haloMat = new THREE.MeshBasicMaterial({ map: T.softDot(), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const buddha = (x, y, z, s, halo = true) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g);
    // simple lathe figure, shown until the real model has loaded
    const ph = new THREE.Group(); g.add(ph); g.userData.placeholder = ph;
    add(bGeo, M.gold, 0, 0, 0, ph);
    const hd2 = add(headGeo, M.gold, 0, 0.9, 0, ph); hd2.scale.set(1, 1.15, 0.95);
    add(crownGeo, M.gold, 0, 1.04, 0, ph);
    const hands = add(new THREE.TorusGeometry(0.16, 0.05, 8, 20, Math.PI), M.gold, 0, 0.42, 0.2, ph);
    hands.rotation.x = Math.PI / 2 + 0.3; hands.rotation.z = Math.PI;
    if (halo) { const hl = add(haloGeo, haloMat, 0, 0.88, -0.25, g); hl.scale.setScalar(1.2); }
    return g;
  };
  const statues = [];
  for (const n of niches) if (n.statue) {
    const g = buddha(n.cx, 1.2, az + 0.62, n.statue, n.statue >= 1);
        // centre niche: Vajrasattva_full.fbx (converted, gilded); every other niche: gilded Green Tara
    g.userData.kind = n.statue >= 1.5 ? 'vajrasattva_full' : 'tara';
    g.userData.lod = n.statue >= 1 ? 'hi' : 'lo';
    statues.push(g);
  }
  loadStatues(loader.manager, statues, M.gold);
  // small offerings in empty niches
  const offerGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.22, 10);
  for (const n of niches) if (!n.statue) add(offerGeo, M.gold, n.cx, n.y0 + 0.12, az + 0.3);
  // butter lamps along the counter
  const lampN = [];
  for (let x = -10; x <= 10; x += 0.22) if (Math.abs(x) > 0.15) lampN.push(x);
  const cupMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.025, 0.06, 8), M.gold, lampN.length);
  const flameMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 6, 4), M.flame, lampN.length);
  lampN.forEach((x, i) => {
    o3.rotation.set(0, 0, 0); o3.scale.set(1, 1, 1);
    o3.position.set(x, 1.23, az + 1.32); o3.updateMatrix(); cupMesh.setMatrixAt(i, o3.matrix);
    o3.position.set(x, 1.29, az + 1.32); o3.scale.set(1, 1.8, 1); o3.updateMatrix(); flameMesh.setMatrixAt(i, o3.matrix);
  });
  scene.add(cupMesh, flameMesh);

  // teacher's carved table + chair near the altar (p5)
  const TX = -3.2;
  boxMM(TX - 0.9, 0, az + 2.6, TX + 0.9, 0.95, az + 3.4, M.woodLight);
  boxMM(TX - 0.95, 0.95, az + 2.55, TX + 0.95, 1.02, az + 3.45, M.woodDark);
  boxMM(TX - 0.35, 0, az + 1.85, TX + 0.35, 0.5, az + 2.45, M.maroon);
  boxMM(TX - 0.35, 0.5, az + 1.85, TX + 0.35, 1.3, az + 1.95, M.maroon);

  // ---------- Rows of low tables + cushions ----------
  const tables = [], cushions = [];
  for (let z = -10.2; z <= 12.4; z += 1.45) {
    for (const s of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const x = s * (1.75 + k * 1.3);
        if (Math.abs(x) > 9.2) continue;
        tables.push([x, z]);
        cushions.push([x, z + 0.62]);
      }
    }
  }
  const tableMesh = new THREE.InstancedMesh(box(1.05, 0.42, 0.42), M.wood, tables.length);
  const topMesh = new THREE.InstancedMesh(box(1.12, 0.05, 0.48), M.woodLight, tables.length);
  const cushionMesh = new THREE.InstancedMesh(box(0.82, 0.09, 0.62), [M.maroon, M.maroon, M.cushionTop, M.maroon, M.maroon, M.maroon], cushions.length);
  tables.forEach(([x, z], i) => {
    o3.rotation.set(0, 0, 0); o3.scale.set(1, 1, 1);
    o3.position.set(x, 0.21, z); o3.updateMatrix(); tableMesh.setMatrixAt(i, o3.matrix);
    o3.position.set(x, 0.445, z); o3.updateMatrix(); topMesh.setMatrixAt(i, o3.matrix);
  });
  cushions.forEach(([x, z], i) => { o3.position.set(x, 0.05, z); o3.updateMatrix(); cushionMesh.setMatrixAt(i, o3.matrix); });
  scene.add(tableMesh, topMesh, cushionMesh);

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight(0xffd29a, 0x5a2410, 0.9));
  const pts = [];
  for (const [x, y, z, i, dist] of [
    [0, 3.6, -10, 30, 14], [-6, 3.6, -2, 18, 14], [6, 3.6, -2, 18, 14], [0, 3.6, 6, 22, 16], [0, 3.4, 12, 14, 12], [-9, 3.2, -4, 10, 10], [-9, 3.2, 6, 10, 10],
  ]) {
    const p = new THREE.PointLight(0xffb468, i, dist, 1.4); p.position.set(x, y, z); scene.add(p); pts.push(p);
  }
  const altarSpot = new THREE.SpotLight(0xffe0a8, 7, 18, 0.45, 0.6, 1.2);
  altarSpot.position.set(0, 5.2, -9);
  altarSpot.target.position.set(0, 2, az);
  scene.add(altarSpot, altarSpot.target);
  const altarFill = new THREE.PointLight(0xffa850, 3.5, 6, 1.5);
  altarFill.position.set(0, 1.6, az + 1.6); scene.add(altarFill);

  // ---------- Floating dust in the light ----------
  const dustN = 900;
  const dPos = new Float32Array(dustN * 3);
  const dSeed = new Float32Array(dustN);
  for (let i = 0; i < dustN; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * w * 0.9;
    dPos[i * 3 + 1] = Math.random() * h;
    dPos[i * 3 + 2] = (Math.random() - 0.5) * d * 0.9;
    dSeed[i] = Math.random() * 100;
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 0.05, map: T.softDot(), transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd9a0 }));
  scene.add(dust);

  return {
    scene,
    update(t, dt) {
      const p = dGeo.attributes.position.array;
      for (let i = 0; i < dustN; i++) {
        const s = dSeed[i];
        p[i * 3] += Math.sin(t * 0.2 + s) * 0.0015;
        p[i * 3 + 1] += 0.0016 + Math.sin(t * 0.5 + s) * 0.001;
        p[i * 3 + 2] += Math.cos(t * 0.17 + s) * 0.0015;
        if (p[i * 3 + 1] > h) p[i * 3 + 1] = 0;
      }
      dGeo.attributes.position.needsUpdate = true;
      // candle flicker
      altarFill.intensity = 3.5 + Math.sin(t * 9.0) * 0.6 + Math.sin(t * 13.7) * 0.4;
    },
  };
}


// ---------- Statue models ----------
function normalise(root, cfg, height) {
  // rotate to Y-up, sit the base on y = 0, centre on x/z, scale to `height`
  const pivot = new THREE.Group();
  pivot.add(root);
  if (cfg.up === 'z') root.rotation.x = -Math.PI / 2;
  pivot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(pivot);
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -box.min.y, -c.z);
  pivot.scale.setScalar(height / size.y);
  pivot.rotation.y = cfg.rotY;
  return pivot;
}

function loadStatues(manager, slots, goldMat) {
  const loader = new GLTFLoader(manager);
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gilded = goldMat.clone();
  gilded.emissiveIntensity = 0.12;
  gilded.roughness = 0.3;
  const cache = {};
  const need = new Set(slots.map(s => `${s.userData.kind}:${s.userData.lod}`));
  for (const key of need) {
    const [kind, lod] = key.split(':');
    const cfg = STATUE_MODELS[kind];
    loader.load(cfg[lod], gltf => {
      const root = gltf.scene;
      root.traverse(o => {
        if (!o.isMesh) return;
        if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
        if (cfg.gilded) o.material = gilded;
        else {
          // keep the model's painted texture, but warm it up for the shrine light
          o.material.envMapIntensity = 1.2;
          if (o.geometry.attributes.color && o.material.map) o.material.vertexColors = false;
        }
      });
      cache[key] = normalise(root, cfg, 1.11);
      for (const s of slots) if (`${s.userData.kind}:${s.userData.lod}` === key) {
        s.remove(s.userData.placeholder);
        s.add(cache[key].clone(true));
      }
    }, undefined, err => console.warn('statue model failed, keeping placeholder', cfg[lod], err));
  }
}

