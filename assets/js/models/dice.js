// The 150 mm sponge die (score B) and the routine that tips it with the gripper.
// As with the placing demo, the plan is a pure function of time: the die's tilt is solved from how far
// the arm has reached, so the gripper never passes through the die and the die never moves early.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const DIE = 0.15;
const R2D = 180 / Math.PI;
const smooth = p => p * p * p * (p * (p * 6 - 15) + 10);
const speedOf = p => 30 * p * p * (1 - p) * (1 - p) / 1.875;
// Box face order is +x, -x, +y, -y, +z, -z; opposite faces add up to 7. The die starts with 1 on top.
const FACES = [3, 4, 1, 6, 2, 5];
const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(n => new THREE.Vector3(...n));
const PIPS = {
  1: [[0.5, 0.5]], 2: [[0.28, 0.28], [0.72, 0.72]], 3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
  6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
};

function faceTexture(n) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = '#f4f1ea';
  g.fillRect(0, 0, 256, 256);
  // Sponge: fine speckle so the face does not read as plastic.
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(120,100,80,${Math.random() * 0.07})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.6, 1.6);
  }
  for (const [x, y] of PIPS[n]) {
    g.beginPath();
    g.arc(x * 256, y * 256, n === 1 ? 34 : 22, 0, Math.PI * 2);
    g.fillStyle = n === 1 ? '#c9283c' : '#1d1a18';
    g.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

// The die sits in a pivot group at its far bottom edge so a rotation about x tips it away from the robot.
export function makeDie() {
  const pivot = new THREE.Group();
  pivot.name = 'Die';
  const body = new THREE.Group();
  body.position.set(0, DIE / 2, -DIE / 2);
  pivot.add(body);
  const materials = FACES.map(n => new THREE.MeshStandardMaterial({ map: faceTexture(n), roughness: 0.92, metalness: 0 }));
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(DIE, DIE, DIE, 4, 0.012), materials);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.part = 'die';
  body.add(mesh);
  const up = new THREE.Vector3();
  return {
    group: pivot, mesh,
    // The face number on top for a given orientation of the die body.
    top(quaternion) {
      let best = 0, bestY = -2;
      NORMALS.forEach((n, i) => { const y = up.copy(n).applyQuaternion(quaternion).y; if (y > bestY) { bestY = y; best = i; } });
      return FACES[best];
    },
  };
}

// Tilt (rad) of the die when the gripper has travelled `p` metres past first contact. It touches
// the near face at height h; tipping about the far edge moves that point to z = -s cos t + h sin t.
function tiltFor(p, h) {
  const target = -DIE + p;
  let lo = 0, hi = Math.PI / 2;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (-DIE * Math.cos(mid) + h * Math.sin(mid) < target) lo = mid; else hi = mid;
  }
  return lo;
}

export function planDice(rig, start) {
  const L = rig.layout;
  // With the turret at 0° the arm points straight ahead and the gripper runs along z at x = M.x + ox.
  const dieX = L.M.x + L.ox;
  const front = 0.03;                    // gripper centre to the face of its closed fingers
  const zAt = reach => L.M.z + L.lz0 + reach / 1000 + front;
  const nearZ = zAt(0) + 0.105;          // near face of the die at home
  const homeZ = nearZ + DIE;             // far bottom edge (the pivot)
  const h = 0.12;                        // push this high on the near face
  const lift = (h + L.drop) * 1000;      // the hold point of the gripper sits `drop` below the arm
  const tip = 48 / R2D;                  // past this the die's weight carries it over
  const contact = (nearZ - zAt(0)) * 1000;
  const stroke = contact + (-DIE * Math.cos(tip) + h * Math.sin(tip) + DIE) * 1000;
  const clear = 520, approach = contact - 30;

  // [t0, t1, key, to]: each joint moves from wherever its previous row left it, minimum-jerk.
  const rows = [
    [0, 0.8, 'lift', Math.max(start.lift, clear)], [0, 0.6, 'reach', 0], [0, 0.6, 'grip', 0],
    [0.6, 1.7, 'yaw', 0],
    [1.7, 2.6, 'lift', lift], [1.9, 2.6, 'reach', approach],
    [2.6, 3.1, 'reach', contact],
    [3.1, 4.5, 'reach', stroke],
    [5.0, 5.5, 'reach', approach], [5.3, 6.1, 'lift', clear], [5.8, 6.4, 'reach', 0],
    [6.4, 7.8, 'drive', DIE],
  ];
  const fall = [4.5, 4.9];
  const duration = 8.6;
  const phases = [
    { phase: 'aim', cycle: -1, t0: 0, t1: 2.6 },
    { phase: 'push', cycle: -1, t0: 2.6, t1: 4.5 },
    { phase: 'roll', cycle: -1, t0: 4.5, t1: 5.0 },
    { phase: 'retract', cycle: -1, t0: 5.0, t1: 6.4 },
    { phase: 'drive', cycle: -1, t0: 6.4, t1: 7.8 },
    { phase: 'rest', cycle: -1, t0: 7.8, t1: duration },
  ];
  const sample = (key, t) => {
    let v = key === 'drive' ? 0 : start[key], speed = 0;
    for (const [t0, t1, k, to] of rows) {
      if (k !== key) continue;
      if (t >= t1) { v = to; continue; }
      if (t > t0) { const p = (t - t0) / (t1 - t0); v = v + (to - v) * smooth(p); speed = speedOf(p); }
      break;
    }
    return [v, speed];
  };
  const mm = v => `${Math.round(v)} mm`;

  return {
    duration, phases, cycles: 1, dieX, homeZ,
    lanes: [
      ['旋回', 'Turret', v => `${Math.round(v)}°`, q => q.pose.yaw, q => q.activity.yaw],
      ['昇降', 'Lift', mm, q => q.pose.lift, q => q.activity.lift],
      ['伸縮', 'Reach', mm, q => q.pose.reach, q => q.activity.reach],
      ['サイコロの傾き', 'Die tilt', v => `${Math.round(v)}°`, q => q.tilt * R2D, q => q.activity.tilt],
      ['前進', 'Drive', mm, q => q.travel * 1000, q => q.drive],
    ],
    // The page fills in face (the number on top) and changed (score B, +20 the first time).
    stat: { ja: 'サイコロの目', en: 'Die face', value: q => q.face ?? '—', total: q => q.changed ? '+20' : '' },
    at(time) {
      const t = Math.min(Math.max(time, 0), duration);
      const pose = { turn: start.turn }, activity = {};
      for (const key of ['yaw', 'lift', 'reach', 'grip']) [pose[key], activity[key]] = sample(key, t);
      const [travel, drive] = sample('drive', t);
      let tilt = tiltFor(Math.max(pose.reach - contact, 0) / 1000, h);
      activity.tilt = activity.reach && pose.reach > contact ? activity.reach : 0;
      if (t >= fall[0]) {
        const p = Math.min((t - fall[0]) / (fall[1] - fall[0]), 1);
        tilt = tip + (Math.PI / 2 - tip) * p * p;
        activity.tilt = p < 1 ? p : 0;
      }
      const phase = phases.find(p => t <= p.t1) || phases[phases.length - 1];
      return { pose, activity, drive, travel, tilt, rolled: t >= fall[1], phase };
    },
  };
}
