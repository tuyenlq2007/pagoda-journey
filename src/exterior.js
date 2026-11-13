import * as THREE from 'three';
import * as T from './textures.js';

// Exterior: the corner townhouse dharma centre seen in the drone shots
// (DJI_0084, DJI_0086, DJI_0087, DJI_0093) and the surrounding Saigon-style
// neighbourhood. Units are metres. The main building's front faces +Z,
// its side faces +X (corner lot). Front street runs along X, side street along Z.

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const AREA_K = Math.SQRT2;

export function buildExterior(renderer, loader) {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  scene.add(group);
  // Whole outdoor layout (lot, building footprint, streets, neighbourhood) is
  // spread by sqrt(2) horizontally => twice the ground area; heights unchanged.
  group.scale.set(AREA_K, 1, AREA_K);

  // ---------- Sky & environment ----------
  const skyTex = T.skyTexture();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky.clone());
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.55;
  scene.fog = new THREE.FogExp2(0xd9c2ad, 0.0028);
  scene.background = new THREE.Color(0xd9c2ad);

  // ---------- Lights (dusk) ----------
  const hemi = new THREE.HemisphereLight(0xc7cfe6, 0x5d4a3a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc28a, 2.4);
  sun.position.set(-99, 38, 78);
  sun.target.position.set(0, 0, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -64, right: 64, top: 64, bottom: -64, near: 10, far: 260 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  // ---------- Materials ----------
  const M = {
    white: new THREE.MeshStandardMaterial({ color: 0xeeebe4, roughness: 0.85 }),
    whiteTrim: new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.7 }),
    darkFin: new THREE.MeshStandardMaterial({ color: 0x5c5f63, roughness: 0.8 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.5, metalness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1b232b, roughness: 0.08, metalness: 0.6 }),
    glassWarm: new THREE.MeshStandardMaterial({ color: 0x2a1a0c, emissive: 0xffa95a, emissiveIntensity: 0.95, roughness: 0.2 }),
    glassCurtain: new THREE.MeshStandardMaterial({ color: 0xcfc6b8, emissive: 0xffd8a8, emissiveIntensity: 0.35, roughness: 0.6 }),
    canopy: new THREE.MeshPhysicalMaterial({ color: 0x9fb6bf, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.38, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ color: 0x6d6f73, roughness: 0.45, metalness: 0.7 }),
    brick: new THREE.MeshStandardMaterial({ color: 0x9b5f4a, roughness: 0.95 }),
    slat: new THREE.MeshStandardMaterial({ map: T.slatTexture(), roughness: 0.8 }),
    roofTop: new THREE.MeshStandardMaterial({ color: 0x8c8f93, roughness: 0.6, metalness: 0.3 }),
    tank: new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.25, metalness: 0.85 }),
    asphalt: new THREE.MeshStandardMaterial({ map: T.asphaltTexture(), roughness: 0.95 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: 0xa9a59d, roughness: 0.9 }),
    grass: new THREE.MeshStandardMaterial({ map: T.grassTexture(), roughness: 1 }),
    paving: new THREE.MeshStandardMaterial({ color: 0x8d8478, roughness: 0.9 }),
    line: new THREE.MeshBasicMaterial({ color: 0xe8e4da }),
  };

  const add = (geo, mat, x, y, z, { cast = true, receive = true, parent = group } = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast; m.receiveShadow = receive;
    parent.add(m);
    return m;
  };
  // box by min/max corners
  const boxMM = (x0, y0, z0, x1, y1, z1, mat, opts) =>
    add(box(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, opts);

  // ---------- Ground, roads ----------
  const ground = add(new THREE.PlaneGeometry(900, 900), M.grass, 0, -0.02, 0, { cast: false });
  ground.rotation.x = -Math.PI / 2;

  const road = (x0, z0, x1, z1, alongX) => {
    const r = boxMM(x0, -0.01, z0, x1, 0.01, z1, M.asphalt, { cast: false });
    const tex = M.asphalt.map;
    r.material = M.asphalt;
    // dashed centre line
    const len = alongX ? x1 - x0 : z1 - z0;
    for (let s = 0; s < len; s += 6) {
      if (alongX) boxMM(x0 + s, 0.012, (z0 + z1) / 2 - 0.06, x0 + s + 3, 0.02, (z0 + z1) / 2 + 0.06, M.line, { cast: false });
      else boxMM((x0 + x1) / 2 - 0.06, 0.012, z0 + s, (x0 + x1) / 2 + 0.06, 0.02, z0 + s + 3, M.line, { cast: false });
    }
    return r;
  };
  road(-140, 5, 140, 12, true);        // front street
  road(9, -140, 16, 5, false);         // side street (north of junction)
  road(9, 12, 16, 140, false);         // side street (south)
  boxMM(9, -0.01, 5, 16, 0.011, 12, M.asphalt, { cast: false }); // junction
  road(-56, -140, -44, 140, false);    // the wide boulevard on the left of DJI_0084
  road(-140, -52, 140, -46, true);     // back street
  // sidewalks
  boxMM(-140, 0, 3, 9, 0.12, 5, M.sidewalk, { cast: false });
  boxMM(7, 0, -140, 9, 0.12, 3, M.sidewalk, { cast: false });
  boxMM(16, 0, -140, 18, 0.12, 5, M.sidewalk, { cast: false });
  boxMM(-140, 0, 12, 9, 0.12, 14, M.sidewalk, { cast: false });
  boxMM(16, 0, 12, 140, 0.12, 14, M.sidewalk, { cast: false });
  boxMM(18, 0, 3, 140, 0.12, 5, M.sidewalk, { cast: false });
  // the main lot's forecourt paving
  boxMM(-5, 0, -16, 7, 0.13, 3, M.paving, { cast: false });

  // ---------- Main building ----------
  const main = new THREE.Group();
  group.add(main);
  const o = { parent: main };
  const B = (x0, y0, z0, x1, y1, z1, mat, extra = {}) => boxMM(x0, y0, z0, x1, y1, z1, mat, { ...o, ...extra });

  // core volume
  B(-5, 0, -16, 5, 13.4, -2.65, M.white);
  B(-5, 10.4, -2.65, 5, 11.25, -0.2, M.white);  // band under the floor-4 planter
  B(-5, 3.5, -2.65, 5, 7.0, -1.2, M.white);
  B(-5, 11.25, -2.65, 5, 13.4, -2.2, M.white);
  // left dark vertical fin wall (full height)
  B(-5.6, 0, -16, -5.0, 14.4, 0.7, M.darkFin);
  // roof slab
  B(-5.0, 13.4, -16, 5.0, 13.7, -0.6, M.whiteTrim);

  // --- ground floor: recessed glass shopfront with warm light, brick base wall
  B(-4.9, 0.1, -1.6, 4.9, 3.5, -1.4, M.glassWarm, { cast: false });
  for (let x = -4.5; x <= 4.6; x += 1.5) B(x - 0.04, 0.1, -1.38, x + 0.04, 3.5, -1.3, M.frame);
  B(-5.0, 0.1, 1.6, -0.6, 1.9, 2.0, M.brick); // brick garden wall (DJI_0093)
  B(-5.0, 0.1, -1.3, -4.6, 1.9, 2.0, M.brick);
  // glass canopy wrapping the corner + steel frame
  const canopyFront = B(-3.4, 3.25, -1.4, 5.6, 3.3, 2.4, M.canopy, { cast: false });
  canopyFront.rotation.x = 0.06;
  const canopySide = B(5.0, 3.15, -13, 7.4, 3.2, 2.4, M.canopy, { cast: false });
  canopySide.rotation.z = -0.06;
  for (let x = -3.4; x <= 5.6; x += 1.5) B(x - 0.04, 3.2, -1.4, x + 0.04, 3.32, 2.45, M.steel);
  for (let z = -13; z <= 2.4; z += 1.6) B(5.0, 3.12, z - 0.04, 7.45, 3.22, z + 0.04, M.steel);
  B(-3.4, 3.1, 2.38, 7.45, 3.35, 2.48, M.steel);
  B(7.35, 0, 2.3, 7.45, 3.3, 2.4, M.steel);
  B(7.35, 0, -12.9, 7.45, 3.1, -12.8, M.steel);

  // --- floor 2 (3.6 – 7.0)
  B(-5, 3.5, -1.2, 5, 7.0, 0, M.white);
  const win = (x0, y0, x1, y1, z, mat = M.glass, depth = 0.12) => {
    B(x0 - 0.08, y0 - 0.08, z, x1 + 0.08, y1 + 0.08, z + depth + 0.04, M.frame);
    B(x0, y0, z + 0.02, x1, y1, z + depth + 0.06, mat, { cast: false });
  };
  win(-3.7, 4.0, -3.1, 6.6, 0.0, M.glass);
  win(-2.6, 4.0, -2.0, 6.6, 0.0, M.glassCurtain);
  win(0.3, 4.3, 3.6, 6.3, 0.0, M.glassCurtain);
  B(-4.4, 3.6, 0, -1.6, 4.0, 0.7, M.whiteTrim); // small planter ledge
  // side windows floor 2
  for (let z = -3; z > -15; z -= 4) {
    B(5.0, 4.2, z - 1.2, 5.12, 6.3, z, M.frame); B(5.1, 4.3, z - 1.1, 5.16, 6.2, z - 0.1, M.glassCurtain, { cast: false });
  }

  // --- floor 3 (7.0 – 10.4): the whole floor is the shrine hall, glazed on the front
  // and on the side so the golden hall shows through across the full storey
  B(-5.0, 6.95, -2.4, 5.0, 7.35, 1.25, M.whiteTrim);   // cantilevered slab, full width
  B(4.85, 7.35, -2.4, 5.0, 10.4, 0.4, M.white);        // right cheek
  B(-5.0, 10.1, -2.4, 5.0, 10.4, 0.2, M.whiteTrim);    // head
  B(-5.0, 7.35, -2.45, 4.85, 7.39, -2.3, M.frame);
  // glass wall + the shrine room behind it (photo of the hall, p1)
  const shrineTex = loader.load('/photos/p1.jpg');
  shrineTex.colorSpace = THREE.SRGBColorSpace;
  shrineTex.repeat.set(0.94, 0.42); shrineTex.offset.set(0.03, 0.33);
  const shrineMat = new THREE.MeshBasicMaterial({ map: shrineTex, color: 0xffd2a0 });
  add(new THREE.PlaneGeometry(9.85, 3.0), shrineMat, -0.08, 8.85, -2.55, { parent: main, cast: false, receive: false });
  for (let x = -4.95; x <= 4.9; x += 1.64) B(x - 0.04, 7.35, -2.48, x + 0.04, 10.1, -2.4, M.frame);
  B(-5.0, 9.4, -2.48, 4.85, 9.46, -2.4, M.frame);
  // side elevation: shrine hall seen through a continuous glass strip (photo p5)
  const sideTex = loader.load('/photos/p5.jpg');
  sideTex.colorSpace = THREE.SRGBColorSpace;
  sideTex.repeat.set(1, 0.5); sideTex.offset.set(0, 0.3);
  const sideMat = new THREE.MeshBasicMaterial({ map: sideTex, color: 0xffd2a0 });
  const sideGlass = add(new THREE.PlaneGeometry(12.8, 2.75), sideMat, 5.03, 8.75, -9.2, { parent: main, cast: false, receive: false });
  sideGlass.rotation.y = Math.PI / 2;
  B(5.0, 7.0, -15.8, 5.25, 7.38, -2.4, M.whiteTrim);   // side sill
  B(5.0, 10.12, -15.8, 5.25, 10.4, -2.4, M.whiteTrim); // side head
  for (let z = -15.6; z <= -2.6; z += 1.6) B(5.02, 7.38, z - 0.04, 5.1, 10.12, z + 0.04, M.frame);
  const loggiaLight = new THREE.PointLight(0xffb35c, 30, 11, 1.6);
  loggiaLight.position.set(0, 9, -1.2); main.add(loggiaLight);
  const sideLight = new THREE.PointLight(0xffb35c, 18, 8, 1.6);
  sideLight.position.set(6.2, 9, -9); main.add(sideLight);
  // glass balustrade, full width
  B(-5.0, 7.35, 1.18, 5.0, 8.4, 1.22, M.canopy, { cast: false });

  // --- floor 4 (10.4 – 13.4): full-width planter band, setback wall
  B(-5.2, 10.4, -0.2, 5.2, 11.25, 1.35, M.whiteTrim);
  B(-5, 11.25, -2.2, 5, 13.4, -1.2, M.white);
  win(-3.8, 11.6, -2.2, 13.0, -1.2, M.glass);
  win(-0.6, 11.6, 0.8, 13.0, -1.2, M.glassWarm);
  win(2.2, 11.6, 3.8, 13.0, -1.2, M.glass);

  // --- rooftop pergola on tree-like steel struts (DJI_0086/87)
  const perg = new THREE.Group();
  main.add(perg);
  perg.position.set(0.3, 15.0, -6.2);
  perg.rotation.x = 0.07; perg.rotation.z = -0.05;
  const roofPlane = add(box(12.4, 0.14, 12.8), M.roofTop, 0, 0.1, 0, { parent: perg });
  const under = add(new THREE.PlaneGeometry(12.2, 12.6), M.slat, 0, 0.02, 0, { parent: perg, cast: false });
  under.rotation.x = Math.PI / 2;
  add(box(12.6, 0.3, 0.2), M.roofTop, 0, 0, 6.4, { parent: perg });
  // struts: trunk + three branches
  const strut = (a, b, r = 0.07) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), M.steel);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    m.castShadow = true; main.add(m);
  };
  for (const [tx, tz] of [[-2.6, -3.2], [2.8, -3.2], [-2.6, -9], [2.8, -9]]) {
    const base = new THREE.Vector3(tx, 13.7, tz);
    const knee = new THREE.Vector3(tx, 14.3, tz);
    strut(base, knee, 0.1);
    for (const [dx, dz] of [[-1.4, 1.2], [1.4, 1.2], [0, -1.6]]) strut(knee, new THREE.Vector3(tx + dx, 15.0 + dz * 0.07, tz + dz), 0.06);
  }
  // stainless water tank on its stand (top-right)
  const tank = add(new THREE.CylinderGeometry(0.75, 0.75, 2.0, 24), M.tank, 3.4, 17.0, -10, { parent: main });
  tank.rotation.z = Math.PI / 2;
  B(2.4, 15.3, -10.5, 4.4, 16.25, -9.5, M.steel);
  const tankBand = add(new THREE.CylinderGeometry(0.76, 0.76, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0x2c5fa8, roughness: 0.4 }), 3.4, 17.0, -10, { parent: main });
  tankBand.rotation.z = Math.PI / 2;

  // side facade details
  for (let z = -3; z > -15; z -= 4) {
    B(5.0, 11.6, z - 1.2, 5.12, 13.0, z, M.frame); B(5.1, 11.7, z - 1.1, 5.16, 12.9, z - 0.1, M.glass, { cast: false });
  }
  B(5.0, 10.4, -14, 5.9, 11.0, 0.0, M.whiteTrim); // side planter continuation

  // ---------- Planters: greenery, hanging vines ----------
  const leafGeo = new THREE.IcosahedronGeometry(0.28, 1);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const leafM = [], leafC = [];
  const vineGeo = box(0.08, 1, 0.08);
  const vineM = [];
  const tmp = new THREE.Object3D();
  const col = new THREE.Color();
  const shrub = (x, y, z, s) => {
    tmp.position.set(x, y, z); tmp.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    tmp.scale.set(s, s * (1 + Math.random()), s); tmp.updateMatrix(); leafM.push(tmp.matrix.clone());
    leafC.push(col.setHSL(0.24 + Math.random() * 0.08, 0.45, 0.18 + Math.random() * 0.14).clone());
  };
  const vine = (x, y, z, len) => {
    tmp.position.set(x, y - len / 2, z); tmp.rotation.set(0, 0, (Math.random() - 0.5) * 0.2); tmp.scale.set(1, len, 1);
    tmp.updateMatrix(); vineM.push(tmp.matrix.clone());
  };
  const planter = (x0, x1, y, z0, z1, density = 3, vines = true) => {
    const n = Math.floor((x1 - x0) * density);
    for (let i = 0; i < n; i++) {
      const x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0);
      shrub(x, y + 0.2, z, 0.8 + Math.random() * 0.9);
      if (Math.random() < 0.3) shrub(x, y + 0.7, z, 0.5); // cone-like topiary
    }
    if (vines) for (let i = 0; i < n * 0.6; i++) vine(x0 + Math.random() * (x1 - x0), y + 0.05, z1 + 0.05, 0.5 + Math.random() * 1.6);
  };
  planter(-5.1, 5.1, 11.25, 0.0, 1.25, 3.5);
  planter(-4.3, -1.7, 4.0, 0.1, 0.6, 3, true);
  planter(-3.0, 4.5, 13.7, -2.0, -0.8, 1.2, false);
  // climbing vine up the dark fin (DJI_0087)
  for (let y = 4; y < 14; y += 0.6) shrub(-4.95 + Math.random() * 0.3, y, 0.4 + Math.random() * 0.3, 0.5 + Math.random() * 0.6);

  // ---------- Trees ----------
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1, 6);
  const trunkM = [];
  const tree = (x, z, h = 6, r = 2.2) => {
    tmp.position.set(x, h * 0.35, z); tmp.rotation.set(0, 0, 0); tmp.scale.set(1, h * 0.7, 1); tmp.updateMatrix(); trunkM.push(tmp.matrix.clone());
    const blobs = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < blobs; i++) {
      tmp.position.set(x + (Math.random() - 0.5) * r * 1.4, h * 0.6 + Math.random() * h * 0.45, z + (Math.random() - 0.5) * r * 1.4);
      tmp.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      const s = r * (2.2 + Math.random() * 1.8);
      tmp.scale.set(s, s * 0.8, s); tmp.updateMatrix(); leafM.push(tmp.matrix.clone());
      leafC.push(col.setHSL(0.26 + Math.random() * 0.07, 0.4, 0.14 + Math.random() * 0.1).clone());
    }
  };
  tree(7.6, 3.8, 6.0, 1.5);      // tree at the front corner (DJI_0087)
  tree(-8, 4.2, 7, 2);
  tree(8.2, -6, 5.5, 1.6);
  for (let z = -130; z < 130; z += 9) { tree(-37 + Math.random() * 4, z + Math.random() * 3, 6 + Math.random() * 4); tree(-62 + Math.random() * 3, z, 5 + Math.random() * 3); }
  for (let i = 0; i < 45; i++) tree(-42 + Math.random() * 44, 18 + Math.random() * 40, 4 + Math.random() * 5, 1.5 + Math.random() * 1.5);
  for (let i = 0; i < 70; i++) {
    const x = (Math.random() - 0.5) * 260, z = (Math.random() - 0.5) * 260;
    if (Math.abs(x) < 30 && Math.abs(z) < 30) continue;
    tree(x, z, 4 + Math.random() * 5, 1.4 + Math.random() * 1.6);
  }

  const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, leafM.length);
  leafM.forEach((m, i) => { leafMesh.setMatrixAt(i, m); leafMesh.setColorAt(i, leafC[i]); });
  leafMesh.castShadow = true; leafMesh.receiveShadow = true;
  group.add(leafMesh);
  const vineMesh = new THREE.InstancedMesh(vineGeo, new THREE.MeshStandardMaterial({ color: 0x3f6a2c, roughness: 0.9 }), vineM.length);
  vineM.forEach((m, i) => vineMesh.setMatrixAt(i, m));
  group.add(vineMesh);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 }), trunkM.length);
  trunkM.forEach((m, i) => trunkMesh.setMatrixAt(i, m));
  trunkMesh.castShadow = true;
  group.add(trunkMesh);

  // ---------- Neighbourhood ----------
  const facadeMats = [];
  for (let i = 0; i < 6; i++) {
    const map = T.facadeTexture(i, false);
    const em = T.facadeTexture(i, true);
    facadeMats.push(new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffc27a, emissiveIntensity: 0.9, roughness: 0.85 }));
  }
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xbdb7ac, roughness: 0.95 });
  const terracotta = new THREE.MeshStandardMaterial({ color: 0xa8664a, roughness: 0.9 });
  const breeze = new THREE.MeshStandardMaterial({ map: T.breezeBlockTexture(), roughness: 0.8 });
  const tankMat = M.tank;

  const house = (x0, z0, x1, z1, floors, special) => {
    const h = floors * 3.4;
    const fm = facadeMats[Math.floor(Math.random() * facadeMats.length)];
    const fmat = fm.clone();
    fmat.map = fm.map.clone(); fmat.map.repeat.set(1, floors / 5); fmat.map.needsUpdate = true;
    fmat.emissiveMap = fm.emissiveMap.clone(); fmat.emissiveMap.repeat.set(1, floors / 5); fmat.emissiveMap.needsUpdate = true;
    const mats = [fmat, fmat, Math.random() < 0.2 ? terracotta : roofMat, roofMat, special === 'breeze' ? breeze : fmat, fmat];
    const m = new THREE.Mesh(box(x1 - x0, h, z1 - z0), mats);
    m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    // parapet + rooftop clutter: water tanks, stair box
    if (Math.random() < 0.8) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.3, 14), tankMat);
      t.position.set(x0 + 1 + Math.random() * (x1 - x0 - 2), h + 0.9, z0 + 1 + Math.random() * 3);
      t.rotation.z = Math.random() < 0.5 ? Math.PI / 2 : 0;
      t.castShadow = true; group.add(t);
    }
    if (Math.random() < 0.6) {
      const s = new THREE.Mesh(box(2.4, 2.4, 3), M.white);
      s.position.set(x0 + 1.5 + Math.random() * (x1 - x0 - 3), h + 1.2, (z0 + z1) / 2);
      s.castShadow = true; group.add(s);
    }
  };

  // row along the front street, left of the main building (neighbours share walls)
  let x = -5.6;
  while (x > -43) {
    const w = 4 + Math.random() * 4;
    const tall = x > -12 ? 5 : 3 + Math.floor(Math.random() * 3);
    if (Math.random() < 0.12 && x < -15) { x -= w; continue; } // empty lot
    house(x - w, -16, x, -0.5 - Math.random(), tall);
    x -= w;
  }
  // behind
  x = 8;
  while (x > -43) { const w = 4 + Math.random() * 5; house(x - w, -40, x, -21, 3 + Math.floor(Math.random() * 3)); x -= w; }
  // across the side street
  let z = 3;
  let first = true;
  while (z > -44) {
    const d = 5 + Math.random() * 4;
    house(19, z - d, 34, z, first ? 4 : 3 + Math.floor(Math.random() * 3), first ? 'breeze' : null);
    first = false; z -= d;
  }
  // across the front street: a few houses among empty green lots (DJI_0084)
  x = 2; // the corner lots across the junction stay empty: the camera flies over them
  while (x > -43) {
    const w = 5 + Math.random() * 6;
    if (Math.random() < 0.45) house(x - w, 16, x, 32, 2 + Math.floor(Math.random() * 4));
    x -= w + Math.random() * 4;
  }
  // far filler blocks (fade into fog)
  for (let i = 0; i < 160; i++) {
    const bx = (Math.random() - 0.5) * 360, bz = (Math.random() - 0.5) * 360;
    if (Math.abs(bx) < 45 && Math.abs(bz) < 50) continue;
    if (bx > -58 && bx < -42) continue;
    const w = 5 + Math.random() * 8, d = 10 + Math.random() * 10;
    house(bx, bz, bx + w, bz + d, 2 + Math.floor(Math.random() * 6));
  }

  // ---------- Small details ----------
  // red car parked by the side wall (DJI_0093)
  const car = new THREE.Group();
  const carMat = new THREE.MeshStandardMaterial({ color: 0x8c1418, roughness: 0.3, metalness: 0.5 });
  const c1 = new THREE.Mesh(box(1.8, 0.7, 4.2), carMat); c1.position.y = 0.6;
  const c2 = new THREE.Mesh(box(1.6, 0.6, 2.2), M.glass); c2.position.set(0, 1.2, -0.2);
  car.add(c1, c2); car.position.set(6.3, 0.1, -6); car.traverse(m => (m.castShadow = true));
  group.add(car);
  // street lamps
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
  for (const [lx, lz] of [[8.4, 4.5], [-12, 4.5], [-30, 4.5], [17, -14], [17, -32]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 7, 6), M.steel);
    pole.position.set(lx, 3.5, lz); group.add(pole);
    const arm = new THREE.Mesh(box(1.4, 0.06, 0.06), M.steel); arm.position.set(lx + (lx > 10 ? -0.7 : 0.7) * (lx > 0 && lx < 10 ? -1 : 1), 7, lz); group.add(arm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lampMat); bulb.position.set(arm.position.x + (arm.position.x - lx), 6.9, lz); group.add(bulb);
  }
  const doorLight = new THREE.PointLight(0xffb070, 30, 14, 1.5);
  doorLight.position.set(1.5, 2.6, 0.8); main.add(doorLight);

  return {
    scene,
    sun,
    shrineMat,
    update(t) {
      // gentle breeze in the foliage is too costly with instancing; animate light flicker instead
      loggiaLight.intensity = 25 + Math.sin(t * 3.1) * 1.5 + Math.sin(t * 7.3) * 0.8;
    },
  };
}
