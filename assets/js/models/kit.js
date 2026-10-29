import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Parts shared by the concept robot. Lengths are metres; profiles are drawn in millimetres and scaled by MM.
export const MM = 0.001;
const TAU = Math.PI * 2;

export function makeMaterials(team) {
  const std = (name, o) => Object.assign(new THREE.MeshStandardMaterial(o), { name });
  const phys = (name, o) => Object.assign(new THREE.MeshPhysicalMaterial(o), { name });
  return {
    alu: std('Anodized aluminium', { color: 0xbcc1c7, metalness: 1, roughness: 0.3 }),
    sheet: std('Aluminium sheet', { color: 0x8f959b, metalness: 0.75, roughness: 0.58 }),
    steel: std('Stainless steel', { color: 0xe1e3e6, metalness: 1, roughness: 0.18 }),
    black: std('Black anodized', { color: 0x1c1e21, metalness: 0.6, roughness: 0.4 }),
    plastic: std('Black plastic', { color: 0x141517, metalness: 0, roughness: 0.5 }),
    rubber: std('Rubber', { color: 0x2b2c2f, metalness: 0, roughness: 0.88 }),
    pink: std('Sakura anodized', { color: 0xe9a3b7, metalness: 0.55, roughness: 0.3 }),
    panel: phys('Black composite panel', { color: 0x111214, metalness: 0.1, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    pom: std('POM gear', { color: 0x232427, metalness: 0, roughness: 0.38 }),
    yellow: std('E-stop yellow', { color: 0xf2c014, metalness: 0, roughness: 0.42 }),
    red: phys('E-stop red', { color: 0xc8121e, metalness: 0, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 }),
    grey: std('Grey plastic', { color: 0x8d9196, metalness: 0, roughness: 0.5 }),
    pcb: std('Circuit board', { color: 0x175a3b, metalness: 0.15, roughness: 0.45 }),
    pcbBlue: std('Driver board', { color: 0x1b3f8f, metalness: 0.15, roughness: 0.45 }),
    chip: std('Chip', { color: 0x1a1a1c, metalness: 0.2, roughness: 0.35 }),
    gold: std('Contacts', { color: 0xd9b25a, metalness: 1, roughness: 0.3 }),
    wrap: phys('Battery wrap', { color: 0x1d1f23, metalness: 0, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.3 }),
    label: std('Battery label', { color: 0x3f6fb5, metalness: 0, roughness: 0.4 }),
    xt: std('Yellow connector', { color: 0xf0b81c, metalness: 0, roughness: 0.4 }),
    wireRed: std('Red wire', { color: 0xc4161c, metalness: 0, roughness: 0.4 }),
    wireBlack: std('Black wire', { color: 0x1b1b1d, metalness: 0, roughness: 0.4 }),
    wireGrey: std('Signal cable', { color: 0x9a9ea4, metalness: 0, roughness: 0.5 }),
    white: std('White plastic', { color: 0xf2f0ec, metalness: 0, roughness: 0.4 }),
    lens: phys('Signal lens', { color: 0xffe0ea, metalness: 0, roughness: 0.25, transmission: 0.6, thickness: 0.004, emissive: 0xff4f8b, emissiveIntensity: 0.25 }),
    diffuser: phys('Signal diffuser', { color: 0xf7f7f7, metalness: 0, roughness: 0.3, transmission: 0.5, thickness: 0.004 }),
    pet: phys('PET bottle', { color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 1, thickness: 0.0008, ior: 1.57, specularIntensity: 1, side: THREE.DoubleSide }),
    cap: std('Bottle cap', { color: 0xf4f4f2, metalness: 0, roughness: 0.4 }),
    tape: phys('Team tape', { color: team === 'blue' ? 0x2559d9 : 0xd7263d, metalness: 0, roughness: 0.28, clearcoat: 0.6 }),
    balls: [0xf06292, 0xffd23f, 0x3fa9f5, 0x5bd17f, 0xff8a3d, 0xa77bf3].map((c, i) =>
      phys(`Super ball ${i + 1}`, { color: c, metalness: 0, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 })),
  };
}

/* ---------- placing ---------- */
const euler = new THREE.Euler();
export function put(parent, geometry, material, [x = 0, y = 0, z = 0] = [], [rx = 0, ry = 0, rz = 0] = [], name) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (rx || ry || rz) mesh.quaternion.setFromEuler(euler.set(rx, ry, rz));
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}
export function group(parent, name, [x = 0, y = 0, z = 0] = [], userData) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  if (userData) Object.assign(g.userData, userData);
  parent.add(g);
  return g;
}
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// A cylinder whose axis runs along x, y or z.
export function cyl(r, len, axis = 'y', seg = 24, r2 = r) {
  const g = new THREE.CylinderGeometry(r2, r, len, seg);
  if (axis === 'x') g.rotateZ(-Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
}

/* ---------- 2D shapes ---------- */
export function rectPath(path, cx, cy, w, h, r = 0) {
  const x0 = cx - w / 2, y0 = cy - h / 2;
  r = Math.min(r, w / 2, h / 2);
  path.moveTo(x0 + r, y0);
  path.lineTo(x0 + w - r, y0);
  if (r) path.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  path.lineTo(x0 + w, y0 + h - r);
  if (r) path.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  path.lineTo(x0 + r, y0 + h);
  if (r) path.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  path.lineTo(x0, y0 + r);
  if (r) path.quadraticCurveTo(x0, y0, x0 + r, y0);
  return path;
}
export const hole = (x, y, r) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, TAU, true); return p; };
export const slot = (cx, cy, w, h) => rectPath(new THREE.Path(), cx, cy, w, h, Math.min(w, h) / 2);
export function extrude(shape, depth, segments = 8) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: segments });
}
// A flat plate lying in the XZ plane; shape coordinates (sx, sy) land at world (sx, -sy). Top face at y = 0.
export function flatPlate(shape, thickness) {
  const g = extrude(shape, thickness);
  g.rotateX(-Math.PI / 2);
  g.translate(0, -thickness, 0);
  return g;
}

/* ---------- 20-series T-slot extrusion ---------- */
const SLOT = [[-3.1, 0], [-3.1, 1.8], [-5.6, 1.8], [-5.6, 3.6], [-3.2, 6.1], [3.2, 6.1], [5.6, 3.6], [5.6, 1.8], [3.1, 1.8], [3.1, 0]];
const profileCache = new Map();
function profileShape(w, h) {
  const key = `${w}x${h}`;
  if (profileCache.has(key)) return profileCache.get(key);
  const faces = [
    { o: [-w / 2, -h / 2], u: [1, 0], n: [0, 1], len: w },
    { o: [w / 2, -h / 2], u: [0, 1], n: [-1, 0], len: h },
    { o: [w / 2, h / 2], u: [-1, 0], n: [0, -1], len: w },
    { o: [-w / 2, h / 2], u: [0, -1], n: [1, 0], len: h },
  ];
  const pts = [], c = 0.9;
  for (const f of faces) {
    const at = (u, v) => new THREE.Vector2((f.o[0] + f.u[0] * u + f.n[0] * v) * MM, (f.o[1] + f.u[1] * u + f.n[1] * v) * MM);
    pts.push(at(c, 0));
    for (let k = 0; k < f.len / 20; k++) for (const [du, dv] of SLOT) pts.push(at(10 + 20 * k + du, dv));
    pts.push(at(f.len - c, 0));
  }
  const shape = new THREE.Shape(pts);
  for (let x = -w / 2 + 10; x < w / 2; x += 20) for (let y = -h / 2 + 10; y < h / 2; y += 20) shape.holes.push(hole(x * MM, y * MM, 2.1 * MM));
  profileCache.set(key, shape);
  return shape;
}
// Extrusion of the given length, centred on the origin and running along `axis`.
// The w side (mm) stays horizontal; for vertical members it lies along x.
export function profile(len, axis = 'x', w = 20, h = 20) {
  const g = extrude(profileShape(w, h), len, 4);
  g.translate(0, 0, -len / 2);
  if (axis === 'x') g.rotateY(Math.PI / 2);
  if (axis === 'y') g.rotateX(-Math.PI / 2);
  return g;
}

/* ---------- small hardware ---------- */
export function boltHead(r = 4.6 * MM) {
  const g = new THREE.SphereGeometry(r, 14, 5, 0, TAU, 0, Math.PI / 2);
  g.scale(1, 0.55, 1);
  return g;
}
export function gear(radius, teeth, depth, toothDepth = 2 * MM, boreR = 0) {
  const shape = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU;
    const r = (i % 4 === 1 || i % 4 === 2) ? radius : radius - toothDepth;
    const p = [Math.cos(a) * r, Math.sin(a) * r];
    i ? shape.lineTo(...p) : shape.moveTo(...p);
  }
  if (boreR) shape.holes.push(hole(0, 0, boreR));
  return flatPlate(shape, depth);
}
// Lathe from [radius, height] pairs in millimetres.
export const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * MM, y * MM)), seg);

/* ---------- NEMA 17 stepper (axis along +y, face plate at y = 0) ---------- */
export function stepper(parent, m, name = 'Stepper motor', len = 40 * MM) {
  const g = group(parent, name);
  const s = new THREE.Shape();
  const a = 21 * MM, c = 4 * MM;
  s.moveTo(-a + c, -a); s.lineTo(a - c, -a); s.lineTo(a, -a + c); s.lineTo(a, a - c); s.lineTo(a - c, a); s.lineTo(-a + c, a); s.lineTo(-a, a - c); s.lineTo(-a, -a + c); s.closePath();
  const body = extrude(s, len - 8 * MM, 2);
  body.rotateX(Math.PI / 2);
  body.translate(0, -4 * MM, 0);
  put(g, body, m.black);
  const cap = extrude(s, 4 * MM, 2);
  cap.rotateX(Math.PI / 2);
  put(g, cap, m.alu);
  const cap2 = cap.clone();
  cap2.translate(0, -len + 4 * MM, 0);
  put(g, cap2, m.alu);
  put(g, cyl(11 * MM, 2 * MM), m.alu, [0, 1 * MM, 0]);
  put(g, cyl(2.5 * MM, 20 * MM, 'y', 12), m.steel, [0, 10 * MM, 0]);
  for (const [x, z] of [[-15.5, -15.5], [15.5, -15.5], [-15.5, 15.5], [15.5, 15.5]]) put(g, cyl(2.8 * MM, 1.2 * MM, 'y', 10), m.steel, [x * MM, 0.6 * MM, z * MM]);
  return g;
}
// Geared DC motor (axis along +x, output shaft at x = 0).
export function gearMotor(parent, m, name = 'Drive motor') {
  const g = group(parent, name);
  put(g, cyl(18.5 * MM, 34 * MM, 'x'), m.black, [-17 * MM, 0, 0]);
  put(g, cyl(17 * MM, 52 * MM, 'x', 28), m.alu, [-60 * MM, 0, 0]);
  put(g, cyl(12 * MM, 6 * MM, 'x'), m.plastic, [-89 * MM, 0, 0]);
  put(g, box(4 * MM, 8 * MM, 3 * MM), m.gold, [-92 * MM, 8 * MM, 0]);
  put(g, cyl(3 * MM, 12 * MM, 'x', 12), m.steel, [6 * MM, 0, 0]);
  return g;
}

/* ---------- mecanum wheel (axle along x, 100 mm) ---------- */
export function mecanum(parent, m, hand, name = 'Mecanum wheel', R = 63.5 * MM) {
  const g = group(parent, name, undefined, { joint: true });
  const k = R / (50 * MM), Rc = 37.5 * MM * k, l = 46 * MM * k, s45 = Math.SQRT1_2;
  const prof = [];
  for (let i = 0; i <= 12; i++) {
    const u = -l / 2 + l * i / 12;
    prof.push([(R - Math.hypot(Rc, u * s45)) / MM, u / MM]);
  }
  prof.unshift([4.5, -l / 2 / MM]);
  prof.push([4.5, l / 2 / MM]);
  const roller = lathe(prof, 18);
  const pin = cyl(2 * MM, l + 8 * MM, 'y', 8);
  const disc = new THREE.Shape();
  disc.absarc(0, 0, 39 * MM * k, 0, TAU, false);
  for (let i = 0; i < 6; i++) disc.holes.push(hole(Math.cos(i * TAU / 6) * 24 * MM * k, Math.sin(i * TAU / 6) * 24 * MM * k, 6.5 * MM * k));
  disc.holes.push(hole(0, 0, 6 * MM));
  const plate = extrude(disc, 3 * MM, 24);
  plate.rotateY(Math.PI / 2);
  for (const side of [-1, 1]) {
    const p = plate.clone();
    p.translate(side * 20.5 * MM - 1.5 * MM, 0, 0);
    put(g, p, m.alu);
  }
  put(g, cyl(13 * MM, 44 * MM, 'x', 6), m.alu);
  put(g, cyl(4 * MM, 46 * MM, 'x', 6), m.black);
  const n = 10, Y = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
  const tab = box(5 * MM, 8 * MM, 8 * MM);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    const radial = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
    const tangent = new THREE.Vector3(0, -Math.sin(a), Math.cos(a));
    const dir = new THREE.Vector3(hand * s45, 0, 0).addScaledVector(tangent, s45).normalize();
    q.setFromUnitVectors(Y, dir);
    const centre = radial.clone().multiplyScalar(Rc);
    const r = put(g, roller, m.rubber, centre.toArray());
    r.quaternion.copy(q);
    put(g, pin, m.steel, centre.toArray()).quaternion.copy(q);
    for (const end of [-1, 1]) {
      const p = centre.clone().addScaledVector(dir, end * (l / 2 + 2 * MM));
      p.x = Math.sign(p.x) * 18 * MM;
      put(g, tab, m.alu, p.toArray());
    }
  }
  return g;
}

/* ---------- 500 ml PET bottle with super balls (origin at the base) ---------- */
const BODY = [[0, 4.5], [7, 4.3], [13, 3.2], [18, 1.2], [21.5, 0], [25, 0.6], [28.5, 3.2], [31, 7], [32.5, 12], [32.5, 40], [31.4, 43.5], [32.5, 47],
  [32.5, 71], [31.4, 74.5], [32.5, 78], [32.5, 108], [32.1, 116], [30.8, 125], [28, 136], [23.8, 149], [19.5, 159.5], [16, 168], [14.2, 175],
  [14.2, 178], [17.2, 178.6], [17.2, 180.6], [14.2, 181.2], [14.2, 187]];
let ballPositions;
function superBalls() {
  if (ballPositions) return ballPositions;
  ballPositions = [];
  const r = 9 * MM;
  for (let layer = 0; layer < 5; layer++) {
    const y = 6 * MM + r + layer * 14.5 * MM, turn = layer % 2 ? Math.PI / 6 : 0;
    ballPositions.push([0.9 * MM * (layer % 3 - 1), y + 1.5 * MM, 0.7 * MM * ((layer + 1) % 3 - 1)]);
    for (let k = 0; k < 6; k++) {
      const a = turn + k * TAU / 6, rr = 19.5 * MM + (k % 2) * 0.8 * MM;
      ballPositions.push([Math.cos(a) * rr, y + ((k * 7 + layer * 3) % 5) * 0.5 * MM, Math.sin(a) * rr]);
    }
  }
  ballPositions.push([4 * MM, 6 * MM + r + 5 * 14.5 * MM - 4 * MM, -3 * MM]);
  return ballPositions;
}
const bottleGeometry = {};
export function bottle(parent, m, name = 'Sakura bottle', seed = 0) {
  const g = group(parent, name);
  bottleGeometry.body ||= lathe(BODY, 40);
  bottleGeometry.cap ||= lathe([[0, 205], [14.6, 205], [15.2, 204.2], [15.2, 186], [14.4, 185.5], [14.4, 187]], 40);
  bottleGeometry.tape ||= cyl(15.45 * MM, 16 * MM, 'y', 40).translate(0, 195.2 * MM, 0);
  bottleGeometry.ball ||= new THREE.SphereGeometry(9 * MM, 14, 10);
  const body = put(g, bottleGeometry.body, m.pet, [], [], 'PET bottle');
  body.userData.clear = true;
  put(g, bottleGeometry.cap, m.cap, [], [], 'Cap');
  put(g, bottleGeometry.tape, m.tape, [], [], 'Team colour tape');
  superBalls().forEach((p, i) => put(g, bottleGeometry.ball, m.balls[(i * 5 + seed * 3 + (i >> 2)) % m.balls.length], p));
  return g;
}

/* ---------- drag chain link (long axis along y) ---------- */
export function chainLink(pitch = 15 * MM, width = 24 * MM, height = 20 * MM) {
  const side = new THREE.Shape();
  rectPath(side, 0, 0, height, pitch + 3 * MM, 4 * MM);
  side.holes.push(hole(0, pitch / 2 - 1 * MM, 2 * MM));
  const parts = [];
  // Side plates face x; the link's height runs along z and its pitch along y.
  for (const s of [-1, 1]) parts.push(extrude(side, 2.4 * MM, 3).rotateY(Math.PI / 2).translate(s * width / 2 - 1.2 * MM, 0, 0));
  for (const s of [-1, 1]) parts.push(box(width, 3 * MM, 3 * MM).translate(0, 0, s * (height / 2 - 1.5 * MM)));
  return mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p));
}

/* ---------- merging rigid parts ---------- */
const partOf = o => { while (o && !o.userData.part) o = o.parent; return o ? o.userData.part : 'robot'; };
// Merge every mesh that moves with `root` (stopping at children marked as joints) into one mesh per part and material.
export function bake(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map(), done = [];
  const visit = node => {
    for (const child of [...node.children]) {
      if (child.userData.joint || child.userData.keep) continue;
      if (child.isMesh && !child.isInstancedMesh) {
        const part = partOf(child);
        const key = `${child.material.uuid}|${part}|${child.userData.clear ? 1 : 0}`;
        let geometry = child.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, child.matrixWorld));
        if (geometry.index) geometry = geometry.toNonIndexed();
        for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
        geometry.clearGroups();
        if (!buckets.has(key)) buckets.set(key, { material: child.material, part, clear: child.userData.clear, list: [] });
        buckets.get(key).list.push(geometry);
        done.push(child);
      }
      visit(child);
    }
  };
  visit(root);
  for (const mesh of done) mesh.removeFromParent();
  const prune = node => { for (const child of [...node.children]) { if (child.userData.joint || child.userData.keep) continue; prune(child); if (!child.isMesh && !child.children.length && child.type === 'Group') child.removeFromParent(); } };
  prune(root);
  for (const { material, part, clear, list } of buckets.values()) {
    const mesh = new THREE.Mesh(mergeGeometries(list), material);
    list.forEach(g => g.dispose());
    mesh.name = `${root.name} · ${material.name}`;
    mesh.userData.part = part;
    mesh.castShadow = !clear;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
