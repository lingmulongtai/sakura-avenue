import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MM, makeMaterials, put, group, box, cyl, rectPath, hole, slot, extrude, flatPlate, profile, boltHead, gear, lathe, stepper, gearMotor, mecanum, bottle, chainLink, bake } from './kit.js';

// A concept robot for SAKURA AVENUE, modelled at real scale in metres. It is an illustrative study:
// the layout is plausible, but nothing here is an engineered or tested design.

// Control ranges [min, max, default]: sizes in mm, angles in degrees, grip in percent.
export const RANGES = {
  width: [540, 640, 560], depth: [540, 640, 600], bottles: [0, 6, 6],
  lift: [320, 640, 540], reach: [0, 260, 150], yaw: [-180, 180, -45], grip: [0, 100, 60], turn: [0, 359, 0],
};
export const BUILD_KEYS = ['width', 'depth', 'bottles'];
export const POSE_KEYS = ['lift', 'reach', 'yaw', 'grip', 'turn'];

const DEG = Math.PI / 180;
const DECK = 0.274;   // top of the mast deck plate
const SEAT = 0.2485;  // carousel bottle seats
const RING = 0.105;   // radius of the bottle circle on the carousel
const OX = -0.068;    // the arm runs beside the mast, offset sideways
const LZ0 = 0.15;     // gripper centre ahead of the mast axis at zero reach
const DROP = 0.2;     // arm centre line to gripper centre
const GRAB = 0.12;    // the gripper holds a bottle this far above its base
const AXLE = 0.0635;  // 127 mm mecanum wheels
const CHAIN = { x: 0.068, za: 0.022, zb: -0.028, r: 0.025, fixed: 0.26, straight: 0.17, pitch: 0.0155 };

function logoMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 160;
  const g = canvas.getContext('2d');
  g.fillStyle = '#eda7bb';
  g.font = '600 112px "Azeret Mono", "Helvetica Neue", Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = '58px';
  g.fillText('SAKURA', 512 + 29, 84);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return Object.assign(new THREE.MeshStandardMaterial({ map, transparent: true, metalness: 0.2, roughness: 0.45, polygonOffset: true, polygonOffsetFactor: -2 }), { name: 'SAKURA wordmark' });
}

// A plate drawn in (u, v) on a frame face: u along the face, v up, extruded outward along the face normal n.
function facePlate(parent, shape, material, origin, u, n, t = 3 * MM) {
  const geometry = extrude(shape, t, 4);
  geometry.applyMatrix4(new THREE.Matrix4().makeBasis(u, new THREE.Vector3(0, 1, 0), n).setPosition(origin));
  return put(parent, geometry, material);
}
const Y = new THREE.Vector3(0, 1, 0);
function bolt(parent, m, position, normal) {
  const b = put(parent, boltHead(), m.steel, position.toArray());
  b.quaternion.setFromUnitVectors(Y, normal);
  return b;
}

export function buildConcept({ width, depth, bottles: loaded, team }) {
  const m = makeMaterials(team);
  const W = width * MM, D = depth * MM;
  const C = { x: W / 2 - 0.19, z: -(D / 2 - 0.19) };   // carousel axis
  const M = { x: C.x - 0.235, z: C.z + 0.255 };        // turret axis
  const Xa = C.x - 0.2, Za = C.z + 0.2, Zd = M.z - 0.13;
  const root = new THREE.Group();
  root.name = 'SAKURA concept robot';

  /* ---------- chassis frame ---------- */
  const frame = group(root, 'Chassis frame', [], { part: 'frame' });
  const yLow = 0.095, yTop = 0.25, postLen = 0.125, yPost = 0.105 + postLen / 2;
  for (const s of [-1, 1]) {
    put(frame, profile(W, 'x'), m.alu, [0, yLow, s * (D / 2 - 0.01)]);
    put(frame, profile(D - 0.04, 'z'), m.alu, [s * (W / 2 - 0.01), yLow, 0]);
    put(frame, profile(W, 'x', 20, 40), m.alu, [0, yTop, s * (D / 2 - 0.01)]);
    put(frame, profile(D - 0.04, 'z', 20, 40), m.alu, [s * (W / 2 - 0.01), yTop, 0]);
    for (const t of [-1, 0, 1]) put(frame, profile(postLen, 'y'), m.alu, [s * (W / 2 - 0.01), yPost, t * (D / 2 - 0.01)]);
  }
  put(frame, profile(D - 0.04, 'z', 20, 40), m.alu, [Xa + 0.01, yTop, 0]);
  put(frame, profile(W / 2 - Xa - 0.04, 'x', 20, 40), m.alu, [(Xa + W / 2) / 2, yTop, Za - 0.01]);
  put(frame, profile(Xa + W / 2 - 0.02, 'x', 20, 40), m.alu, [(Xa - W / 2 + 0.02) / 2, yTop, Zd + 0.01]);
  put(frame, profile(postLen, 'y'), m.alu, [Xa + 0.01, yPost, -(D / 2 - 0.01)]);
  put(frame, box(W - 0.004, 0.002, D - 0.004), m.sheet, [0, 0.106, 0]);
  // Mast deck (front left) and carousel plate (rear right, hung under the top rails).
  const deck = rectPath(new THREE.Shape(), (Xa + 0.03 - W / 2) / 2, -(Zd + D / 2) / 2, Xa + 0.03 + W / 2, D / 2 - Zd, 0.006);
  deck.holes.push(hole(M.x, -M.z, 0.022), slot(-W / 2 + 0.04, -(Zd + D / 2) / 2, 0.022, Math.max(0.05, D / 2 - Zd - 0.1)));
  for (const k of [0, 1, 2]) deck.holes.push(hole(M.x - 0.03 + k * 0.03, -(D / 2 - 0.03), 0.008));
  put(frame, flatPlate(deck, 0.004), m.sheet, [0, DECK, 0]);
  const tray = rectPath(new THREE.Shape(), (Xa + W / 2) / 2, -(Za - D / 2) / 2, W / 2 - Xa, Za + D / 2, 0.004);
  tray.holes.push(hole(C.x, -C.z, 0.028));
  put(frame, flatPlate(tray, 0.004), m.sheet, [0, 0.23, 0]);
  // Front panel with a wordmark (within the 100 mm logo limit).
  put(frame, box(W - 0.04, postLen, 0.003), m.panel, [0, yPost, D / 2 + 0.0015], [], 'Front panel');
  put(frame, new THREE.PlaneGeometry(0.1, 0.0156), logoMaterial(), [-W / 2 + 0.15, 0.192, D / 2 + 0.0032], [], 'Wordmark');
  // Pink corner plates and their screws.
  const faces = [
    { o: new THREE.Vector3(0, 0, D / 2), u: new THREE.Vector3(1, 0, 0), n: new THREE.Vector3(0, 0, 1), half: W / 2, mid: false, low: true },
    { o: new THREE.Vector3(0, 0, -D / 2), u: new THREE.Vector3(-1, 0, 0), n: new THREE.Vector3(0, 0, -1), half: W / 2, mid: false, low: true },
    { o: new THREE.Vector3(W / 2, 0, 0), u: new THREE.Vector3(0, 0, -1), n: new THREE.Vector3(1, 0, 0), half: D / 2, mid: true, low: false },
    { o: new THREE.Vector3(-W / 2, 0, 0), u: new THREE.Vector3(0, 0, 1), n: new THREE.Vector3(-1, 0, 0), half: D / 2, mid: true, low: false },
  ];
  const arm = 0.034, pw = 0.02;
  for (const f of faces) {
    const joints = [];
    for (const su of [-1, 1]) {
      joints.push({ u0: su * f.half, su: -su, top: true });
      if (f.low) joints.push({ u0: su * f.half, su: -su, top: false });
      if (f.mid) joints.push({ u0: su * 0.01, su, top: true, mid: true }, { u0: su * 0.01, su, top: false, mid: true });
    }
    for (const j of joints) {
      const rh = j.top ? 0.04 : 0.02, sv = j.top ? -1 : 1, v0 = j.top ? 0.27 : 0.085;
      const P = (u, v) => new THREE.Vector2(j.su * u, sv * v);
      const outline = j.mid
        ? [P(-pw / 2, 0), P(arm, 0), P(arm, rh), P(0, rh), P(0, rh + arm * 0.7), P(-pw / 2, rh + arm * 0.7)]
        : [P(0, 0), P(pw + arm, 0), P(pw + arm, rh), P(pw, rh), P(pw, rh + arm), P(0, rh + arm)];
      const shape = new THREE.Shape(outline);
      const rows = j.top ? [0.01, 0.03] : [0.01];
      const holes = j.mid
        ? rows.map(v => [arm - 0.01, v])
        : [...rows.flatMap(v => [[pw / 2, v], [pw + arm - 0.011, v]]), [pw / 2, rh + arm - 0.011]];
      const origin = f.o.clone().addScaledVector(f.u, j.u0).setY(v0);
      facePlate(frame, shape, m.pink, origin, f.u, f.n);
      for (const [hu, hv] of holes) bolt(frame, m, origin.clone().addScaledVector(f.u, j.su * hu).setY(v0 + sv * hv).addScaledVector(f.n, 3 * MM), f.n);
    }
  }
  bake(frame);

  /* ---------- mecanum drive ---------- */
  const drive = group(root, 'Mecanum drive', [], { part: 'drive' });
  const wheels = [];
  for (const [sx, sz, label] of [[-1, 1, 'front left'], [1, 1, 'front right'], [-1, -1, 'rear left'], [1, -1, 'rear right']]) {
    const z = sz * (D / 2 - 0.07);
    const hub = group(drive, `Wheel ${label}`, [sx * (W / 2 + 0.035), AXLE, z]);
    const wheel = bake(mecanum(hub, m, sx * sz, `Mecanum wheel ${label}`));
    wheels.push({ wheel, spin: -sx * sz });
    put(drive, box(0.005, 0.075, 0.075), m.black, [sx * (W / 2 + 0.0025), 0.0675, z]);
    put(drive, cyl(0.012, 0.009, 'x'), m.alu, [sx * (W / 2 + 0.009), AXLE, z]);
    for (const dz of [-0.026, 0.026]) for (const y of [0.09, 0.1]) bolt(drive, m, new THREE.Vector3(sx * (W / 2 + 0.005), y, z + dz), new THREE.Vector3(sx, 0, 0));
    const motor = gearMotor(drive, m);
    motor.position.set(sx * W / 2, AXLE, z);
    if (sx < 0) motor.rotation.y = Math.PI;
  }
  bake(drive);

  /* ---------- turret and lift mast ---------- */
  const base = group(root, 'Turret base', [M.x, DECK, M.z], { part: 'lift' });
  put(base, cyl(0.058, 0.004, 'y', 48), m.black, [0, 0.002, 0]);
  const pinion = [Math.cos(225 * DEG) * 0.067, Math.sin(225 * DEG) * 0.067];
  put(base, gear(0.0115, 12, 0.008, 0.002, 0.0025), m.pom, [pinion[0], 0.012, pinion[1]]);
  stepper(base, m, 'Turret motor').position.set(pinion[0], -0.004, pinion[1]);
  bake(base);
  const turret = group(base, 'Turret', [], { joint: true, part: 'lift' });
  put(turret, gear(0.055, 44, 0.008, 0.0022, 0.02), m.pom, [0, 0.012, 0]);
  put(turret, cyl(0.06, 0.006, 'y', 48), m.alu, [0, 0.015, 0]);
  for (let k = 0; k < 8; k++) bolt(turret, m, new THREE.Vector3(Math.cos(k * 45 * DEG) * 0.05, 0.018, Math.sin(k * 45 * DEG) * 0.05), Y);
  put(turret, box(0.12, 0.008, 0.065), m.black, [0, 0.022, -0.0125]);
  const mastLen = 0.39, mastY = 0.026 + mastLen / 2;
  for (const s of [-1, 1]) {
    put(turret, profile(mastLen, 'y'), m.alu, [s * 0.035, mastY, -0.005]);
    put(turret, box(0.012, 0.36, 0.008), m.steel, [s * 0.035, 0.215, 0.009]);
    const gusset = new THREE.Shape([[-0.045, 0], [0.018, 0], [0.005, 0.022], [0.005, 0.085], [-0.015, 0.085], [-0.045, 0.03]].map(([z, y]) => new THREE.Vector2(s > 0 ? -z : z, y)));
    gusset.holes.push(hole(s > 0 ? 0.005 : -0.005, 0.07, 0.0035), hole(s > 0 ? 0.028 : -0.028, 0.011, 0.0035), hole(s > 0 ? 0.004 : -0.004, 0.035, 0.006));
    facePlate(turret, gusset, m.pink, new THREE.Vector3(s * 0.045, 0.026, 0), new THREE.Vector3(0, 0, -s), new THREE.Vector3(s, 0, 0));
  }
  put(turret, box(0.11, 0.006, 0.05), m.alu, [0, 0.419, -0.01]);
  for (const y of [0.05, 0.398]) {
    put(turret, cyl(0.0115, 0.011, 'x'), m.alu, [0, y, -0.005]);
    for (const s of [-1, 1]) put(turret, cyl(0.0145, 0.0012, 'x'), m.alu, [s * 0.006, y, -0.005]);
    put(turret, cyl(0.004, 0.05, 'x', 10), m.steel, [0, y, -0.005]);
  }
  for (const z of [0.0073, -0.0173]) put(turret, box(0.009, 0.348, 0.0015), m.rubber, [0, 0.224, z]);
  for (const [y, start] of [[0.398, 0], [0.05, Math.PI]]) {
    const arc = new THREE.Shape();
    arc.absarc(0, 0, 0.0138, start, start + Math.PI, false);
    arc.absarc(0, 0, 0.0123, start + Math.PI, start, true);
    const g = extrude(arc, 0.009, 12).rotateY(Math.PI / 2).translate(-0.0045, y, -0.005);
    put(turret, g, m.rubber);
  }
  const liftMotor = stepper(turret, m, 'Lift motor');
  liftMotor.rotation.z = -Math.PI / 2;
  liftMotor.position.set(0.02, 0.05, -0.05);
  put(turret, box(0.024, 0.02, 0.012), m.black, [0.057, CHAIN.fixed + 0.01, CHAIN.zb]);
  bake(turret);
  const chainCount = Math.round((CHAIN.straight + Math.PI * CHAIN.r) / CHAIN.pitch);
  const chain = new THREE.InstancedMesh(chainLink(CHAIN.pitch), m.plastic, chainCount);
  chain.name = 'Drag chain';
  Object.assign(chain.userData, { keep: true, part: 'lift' });
  chain.castShadow = chain.receiveShadow = true;
  turret.add(chain);

  /* ---------- carriage, telescoping arm and gripper ---------- */
  const carriage = group(turret, 'Lift carriage', [], { joint: true, part: 'arm' });
  put(carriage, box(0.11, 0.075, 0.006), m.alu, [0, 0.012, 0.029]);
  put(carriage, box(0.005, 0.08, 0.065), m.alu, [-0.0555, 0.01, -0.0005]);
  put(carriage, box(0.05, 0.03, 0.003), m.pink, [0.022, 0.014, 0.0335]);
  for (const [x, y] of [[0.004, 0.003], [0.04, 0.003], [0.004, 0.025], [0.04, 0.025]]) bolt(carriage, m, new THREE.Vector3(x, y, 0.035), new THREE.Vector3(0, 0, 1));
  for (const s of [-1, 1]) for (const dy of [-0.018, 0.018]) {
    put(carriage, box(0.027, 0.026, 0.013), m.steel, [s * 0.035, 0.012 + dy, 0.0195]);
    for (const e of [-1, 1]) put(carriage, box(0.025, 0.003, 0.012), m.plastic, [s * 0.035, 0.012 + dy + e * 0.0145, 0.0195]);
  }
  put(carriage, box(0.016, 0.02, 0.018), m.black, [0, 0.012, 0.017]);
  put(carriage, box(0.02, 0.012, 0.012), m.black, [0.062, 0.045, CHAIN.za]);
  put(carriage, profile(0.275, 'z', 20, 40), m.alu, [OX, 0, 0.0075]);
  put(carriage, box(0.009, 0.0015, 0.255), m.rubber, [OX, 0.0208, 0.0075]);
  put(carriage, box(0.009, 0.0065, 0.27), m.steel, [OX, -0.0233, 0.0075]);
  const armMotor = stepper(carriage, m, 'Arm motor');
  armMotor.rotation.x = Math.PI / 2;
  armMotor.position.set(OX, 0, -0.13);
  put(carriage, box(0.044, 0.044, 0.003), m.pink, [OX, 0, -0.1715]);
  bake(carriage);

  const inner = group(carriage, 'Arm slide', [], { joint: true, part: 'arm' });
  const wz = LZ0 - 0.205;  // wrist parts are drawn for a 205 mm gripper offset and shifted to LZ0
  put(inner, box(0.02, 0.008, 0.03), m.steel, [OX, -0.0305, -0.122]);
  put(inner, profile(0.22, 'z'), m.alu, [OX, -0.0445, wz - 0.02]);
  put(inner, new RoundedBoxGeometry(0.04, 0.048, 0.036, 2, 0.003), m.black, [OX, -0.045, wz + 0.108]);
  put(inner, box(0.044, 0.052, 0.003), m.pink, [OX, -0.045, wz + 0.1275]);
  put(inner, cyl(0.009, 0.004, 'z'), m.alu, [OX, -0.045, wz + 0.131]);
  put(inner, profile(0.13, 'y'), m.alu, [OX, -0.134, wz + 0.115]);
  for (const s of [-1, 1]) {
    const brace = new THREE.Shape([[0.088, -0.022], [0.128, -0.022], [0.15, -0.185], [0.15, -0.214], [0.106, -0.214], [0.096, -0.12]].map(([z, y]) => new THREE.Vector2(s > 0 ? -(z + wz) : z + wz, y)));
    for (const [z, y, r] of [[0.118, -0.07, 0.008], [0.124, -0.125, 0.009], [0.131, -0.18, 0.006]]) brace.holes.push(hole(s > 0 ? -(z + wz) : z + wz, y, r));
    facePlate(inner, brace, m.pink, new THREE.Vector3(OX + s * 0.0115, 0, 0), new THREE.Vector3(0, 0, -s), new THREE.Vector3(s, 0, 0));
  }
  bake(inner);
  const gripper = group(inner, 'Gripper', [OX, -DROP, LZ0], { joint: true, part: 'arm' });
  put(gripper, new RoundedBoxGeometry(0.084, 0.032, 0.03, 2, 0.003), m.black, [0, 0, -0.072]);
  for (const y of [-0.009, 0.009]) put(gripper, cyl(0.0025, 0.13, 'x', 10), m.steel, [0, y, -0.052]);
  bake(gripper);
  const fingers = [-1, 1].map(side => {
    const f = group(gripper, side < 0 ? 'Finger left' : 'Finger right', [], { joint: true, side });
    put(f, box(0.006, 0.026, 0.075), m.rubber, [side * 0.003, 0, -0.0025]);
    put(f, box(0.004, 0.032, 0.09), m.pink, [side * 0.008, 0, -0.015]);
    put(f, box(0.014, 0.03, 0.02), m.black, [side * 0.012, 0, -0.052]);
    return bake(f);
  });
  const holder = new THREE.Object3D();
  holder.name = 'Bottle holder';
  holder.position.y = -GRAB;
  gripper.add(holder);

  /* ---------- carousel ---------- */
  const carousel = group(root, 'Carousel', [], { part: 'carousel' });
  put(carousel, cyl(0.078, 0.012, 'y', 48), m.black, [C.x, 0.236, C.z]);
  put(carousel, cyl(0.066, 0.0126, 'y', 48), m.alu, [C.x, 0.236, C.z]);
  stepper(carousel, m, 'Carousel motor').position.set(C.x, 0.226, C.z);
  bake(carousel);
  const table = group(carousel, 'Turntable', [C.x, 0.242, C.z], { joint: true, part: 'carousel' });
  const disc = new THREE.Shape();
  disc.absarc(0, 0, 0.165, 0, Math.PI * 2, false);
  disc.holes.push(hole(0, 0, 0.012));
  const at = (r, deg) => [Math.sin(deg * DEG) * r, Math.cos(deg * DEG) * r];
  for (let k = 0; k < 6; k++) { const [x, z] = at(0.052, k * 60); disc.holes.push(hole(x, -z, 0.011)); }
  put(table, flatPlate(disc, 0.005), m.alu, [0, 0.005, 0]);
  for (let k = 0; k < 6; k++) {
    const [x, z] = at(RING, k * 60);
    put(table, cyl(0.036, 0.0015, 'y', 40), m.pink, [x, 0.00575, z]);
    const [fx, fz] = at(0.1175, k * 60 + 30);
    put(table, new RoundedBoxGeometry(0.003, 0.05, 0.085, 1, 0.0012), m.black, [fx, 0.03, fz], [0, (k * 60 + 30) * DEG, 0]);
  }
  put(table, cyl(0.04, 0.055, 'y', 40), m.black, [0, 0.0325, 0]);
  put(table, cyl(0.03, 0.004, 'y', 40), m.pink, [0, 0.062, 0]);
  for (let k = 0; k < 6; k++) { const [x, z] = at(0.022, k * 60 + 30); bolt(table, m, new THREE.Vector3(x, 0.064, z), Y); }
  bake(table);
  const slots = Array.from({ length: 6 }, (_, k) => {
    const anchor = new THREE.Object3D();
    anchor.name = `Bottle slot ${k + 1}`;
    const [x, z] = at(RING, k * 60);
    anchor.position.set(x, 0.0065, z);
    table.add(anchor);
    return anchor;
  });
  const bottles = [];
  for (let k = 0; k < loaded; k++) {
    const b = bottle(slots[k], m, `Sakura bottle ${k + 1}`, k);
    b.userData.part = 'bottles';
    bottles.push(bake(b));
  }

  /* ---------- electronics ---------- */
  const power = group(root, 'Electronics', [], { part: 'power' });
  const floorY = 0.107;
  const tube = (points, r, material) => put(power, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 40, r, 8), material);
  for (const [k, x] of [[0, W / 2 - 0.065], [1, W / 2 - 0.145]]) {
    const z = D / 2 - 0.13;
    put(power, new RoundedBoxGeometry(0.07, 0.048, 0.15, 3, 0.006), m.wrap, [x, floorY + 0.024, z], [], `Battery ${k + 1}`);
    put(power, new RoundedBoxGeometry(0.0712, 0.0492, 0.05, 3, 0.006), m.label, [x, floorY + 0.024, z + 0.02]);
    put(power, box(0.016, 0.008, 0.016), m.xt, [x - 0.018, floorY + 0.052, z - 0.08]);
    tube([[x - 0.01, floorY + 0.04, z - 0.074], [x - 0.012, floorY + 0.06, z - 0.085], [x - 0.018, floorY + 0.054, z - 0.08]], 0.0024, m.wireRed);
    tube([[x + 0.004, floorY + 0.04, z - 0.074], [x - 0.002, floorY + 0.064, z - 0.09], [x - 0.018, floorY + 0.054, z - 0.082]], 0.0024, m.wireBlack);
  }
  // Breaker on the base plate, power distribution box under the carousel.
  const bx = W / 2 - 0.08, bz = D / 2 - 0.255;
  put(power, new RoundedBoxGeometry(0.075, 0.05, 0.022, 2, 0.003), m.plastic, [bx, floorY + 0.025, bz], [], 'Main breaker');
  put(power, box(0.012, 0.016, 0.008), m.white, [bx - 0.015, floorY + 0.054, bz], [0.3, 0, 0]);
  put(power, box(0.012, 0.016, 0.008), m.white, [bx + 0.012, floorY + 0.054, bz], [0.3, 0, 0]);
  const pz = C.z + 0.115, px = W / 2 - 0.075;
  put(power, box(0.09, 0.055, 0.08), m.sheet, [px, floorY + 0.0275, pz], [], 'Power distribution');
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) put(power, cyl(0.0032, 0.001, 'y', 10), m.plastic, [px - 0.03 + i * 0.02, floorY + 0.0555, pz - 0.028 + j * 0.014]);
  for (const s of [-1, 1]) put(power, box(0.016, 0.01, 0.006), m.xt, [px + s * 0.025, floorY + 0.03, pz + 0.043]);
  tube([[bx - 0.02, floorY + 0.03, bz - 0.012], [bx - 0.02, floorY + 0.06, bz - 0.06], [px + 0.025, floorY + 0.045, pz + 0.07], [px + 0.025, floorY + 0.03, pz + 0.046]], 0.003, m.wireRed);
  tube([[bx + 0.02, floorY + 0.03, bz - 0.012], [bx + 0.025, floorY + 0.055, bz - 0.06], [px - 0.025, floorY + 0.04, pz + 0.07], [px - 0.025, floorY + 0.03, pz + 0.046]], 0.003, m.wireBlack);
  tube([[W / 2 - 0.105, floorY + 0.052, D / 2 - 0.21], [W / 2 - 0.1, floorY + 0.07, bz + 0.03], [bx, floorY + 0.03, bz + 0.012]], 0.003, m.wireRed);
  // Controller and motor drivers at the rear left.
  const cx = -W / 2 + 0.085, cz = -D / 2 + 0.1;
  for (const [dx, dz] of [[-0.04, -0.03], [0.04, -0.03], [-0.04, 0.03], [0.04, 0.03]]) put(power, cyl(0.003, 0.012, 'y', 6), m.gold, [cx + dx, floorY + 0.006, cz + dz]);
  put(power, box(0.095, 0.0016, 0.07), m.pcb, [cx, floorY + 0.0128, cz], [], 'Controller');
  put(power, box(0.022, 0.004, 0.022), m.chip, [cx - 0.012, floorY + 0.0156, cz - 0.005]);
  put(power, box(0.03, 0.006, 0.018), m.pcbBlue, [cx + 0.026, floorY + 0.0165, cz + 0.018]);
  for (let i = 0; i < 12; i++) put(power, box(0.0018, 0.008, 0.0018), m.gold, [cx - 0.04 + i * 0.0025, floorY + 0.018, cz + 0.031]);
  put(power, box(0.04, 0.009, 0.006), m.plastic, [cx + 0.02, floorY + 0.018, cz - 0.03]);
  for (let k = 0; k < 2; k++) {
    const dx = -W / 2 + 0.07 + k * 0.08, dz = -D / 2 + 0.215;
    put(power, box(0.06, 0.0016, 0.05), m.pcbBlue, [dx, floorY + 0.008, dz], [], `Motor driver ${k + 1}`);
    put(power, box(0.04, 0.008, 0.032), m.black, [dx, floorY + 0.013, dz]);
    for (let i = 0; i < 6; i++) put(power, box(0.0018, 0.018, 0.032), m.black, [dx - 0.0175 + i * 0.007, floorY + 0.026, dz]);
    for (let i = 0; i < 3; i++) put(power, box(0.007, 0.01, 0.008), m.chip, [dx - 0.02 + i * 0.02, floorY + 0.006, dz + 0.03]);
  }
  tube([[cx + 0.03, floorY + 0.02, cz + 0.03], [cx + 0.03, floorY + 0.04, cz + 0.09], [-W / 2 + 0.07, floorY + 0.03, -D / 2 + 0.19]], 0.0035, m.wireGrey);
  tube([[px - 0.04, floorY + 0.012, pz - 0.04], [0, floorY + 0.012, -D / 2 + 0.2], [-W / 2 + 0.15, floorY + 0.012, -D / 2 + 0.21]], 0.004, m.wireBlack);
  tube([[px - 0.045, floorY + 0.02, pz - 0.03], [0.02, floorY + 0.02, -D / 2 + 0.23], [-W / 2 + 0.15, floorY + 0.02, -D / 2 + 0.23]], 0.004, m.wireRed);
  tube([[cx + 0.04, floorY + 0.02, cz], [M.x, 0.16, M.z - 0.06], [M.x, DECK - 0.01, M.z]], 0.005, m.wireBlack);
  bake(power);

  /* ---------- safety: emergency stop and signal tower ---------- */
  const safety = group(root, 'Safety', [], { part: 'safety' });
  const ex = W / 2 - 0.034, ez = -D / 2 + 0.034;
  put(safety, box(0.074, 0.003, 0.074), m.pink, [ex, 0.2715, ez]);
  put(safety, new RoundedBoxGeometry(0.068, 0.058, 0.068, 3, 0.005), m.yellow, [ex, 0.302, ez], [], 'Emergency stop housing');
  put(safety, cyl(0.023, 0.006, 'y', 32), m.grey, [ex, 0.334, ez]);
  put(safety, lathe([[0, 0], [11, 0], [12, 8.5], [19.5, 9.5], [20.5, 12], [19, 15.5], [13.5, 17.6], [0, 18]], 40), m.red, [ex, 0.337, ez], [], 'Emergency stop button');
  const tx = -W / 2 + 0.022, tz = -D / 2 + 0.022;
  put(safety, box(0.05, 0.003, 0.05), m.pink, [tx, 0.2715, tz]);
  put(safety, cyl(0.007, 0.07, 'y', 16), m.black, [tx, 0.308, tz]);
  put(safety, cyl(0.02, 0.02, 'y', 32), m.plastic, [tx, 0.35, tz]);
  put(safety, cyl(0.018, 0.034, 'y', 32), m.diffuser, [tx, 0.377, tz], [], 'Signal tower');
  put(safety, cyl(0.018, 0.034, 'y', 32), m.lens, [tx, 0.411, tz]);
  put(safety, cyl(0.0185, 0.006, 'y', 32), m.plastic, [tx, 0.431, tz]);
  put(safety, new THREE.SphereGeometry(0.012, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.plastic, [tx, 0.434, tz]);
  bake(safety);

  /* ---------- dice tool on the front slide ---------- */
  const dice = group(root, 'Dice slide', [], { part: 'dice' });
  const fz = D / 2 + 0.003;
  put(dice, box(0.32, 0.009, 0.0065), m.steel, [0, 0.13, fz + 0.00325]);
  for (const s of [-1, 1]) put(dice, box(0.012, 0.022, 0.012), m.black, [s * 0.166, 0.13, fz + 0.006]);
  put(dice, box(0.022, 0.02, 0.01), m.steel, [0.07, 0.13, fz + 0.0115]);
  put(dice, box(0.032, 0.038, 0.003), m.pink, [0.07, 0.13, fz + 0.018]);
  for (const [dx, dy] of [[-0.01, -0.012], [0.01, -0.012], [-0.01, 0.012], [0.01, 0.012]]) bolt(dice, m, new THREE.Vector3(0.07 + dx, 0.13 + dy, fz + 0.0195), new THREE.Vector3(0, 0, 1));
  put(dice, box(0.016, 0.012, 0.026), m.black, [0.07, 0.118, fz + 0.032]);
  put(dice, box(0.022, 0.016, 0.008), m.rubber, [0.07, 0.116, fz + 0.048]);
  bake(dice);

  /* ---------- rig ---------- */
  const link = new THREE.Object3D();
  function updateChain(carriageY) {
    const { x, za, zb, r, fixed, straight, pitch } = CHAIN;
    const yc = carriageY + 0.045, zc = (za + zb) / 2;
    const yb = (yc + fixed - straight) / 2, a = yc - yb;
    for (let i = 0; i < chainCount; i++) {
      const s = (i + 0.5) * pitch;
      let y, z, ty, tz;
      if (s < a) { y = yc - s; z = za; ty = -1; tz = 0; }
      else if (s < a + Math.PI * r) { const t = (s - a) / r; y = yb - r * Math.sin(t); z = zc + r * Math.cos(t); ty = -Math.cos(t); tz = -Math.sin(t); }
      else { y = yb + (s - a - Math.PI * r); z = zb; ty = 1; tz = 0; }
      link.position.set(x, y, z);
      link.rotation.set(Math.atan2(tz, ty), 0, 0);
      link.updateMatrix();
      chain.setMatrixAt(i, link.matrix);
    }
    chain.instanceMatrix.needsUpdate = true;
    chain.computeBoundingSphere();
    chain.computeBoundingBox();
  }
  const halfGap = grip => 0.0325 + grip / 100 * 0.0325;
  const rig = {
    layout: { M, C, ring: RING, ox: OX, lz0: LZ0, drop: DROP, grab: GRAB, seat: SEAT, deck: DECK, place: { x: M.x, z: D / 2 + 0.208 }, pitch: 0.507, reachMax: RANGES.reach[1] * MM, slotDeg: k => k * 60 },
    wheels, bottles, slots, holder, lamp: m.lens,
    setPose({ lift, reach, yaw, grip, turn }) {
      turret.rotation.y = yaw * DEG;
      carriage.position.y = lift * MM - DECK;
      inner.position.z = reach * MM;
      for (const f of fingers) f.position.x = f.userData.side * halfGap(grip);
      table.rotation.y = turn * DEG;
      updateChain(carriage.position.y);
    },
  };
  rig.setPose(Object.fromEntries(POSE_KEYS.map(k => [k, RANGES[k][2]])));
  return { object: root, rig };
}
