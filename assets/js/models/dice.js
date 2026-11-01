// The 150 mm sponge die (score B) and the routine that tips it with the front paddle.
// As with the placing demo, the plan is a pure function of time: the die's tilt is solved from where
// the pusher is, so the pad never passes through the die and the die never moves on its own early.
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

// Tilt (rad) of the die when the pusher has travelled `p` metres past first contact. The pad touches
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

export function planDice(rig) {
  const T = rig.tool;
  const dieX = -0.05;                 // die centre, off to one side so the paddle has to slide
  const gap = 0.018;                  // pad to die at zero stroke
  const homeZ = T.padZ + gap + DIE;   // far bottom edge (the pivot) when the die is home
  const tip = 48 / R2D;               // past this the die's weight carries it over
  const contact = gap * 1000;
  const stroke = contact + (-DIE * Math.cos(tip) + T.padY * Math.sin(tip) + DIE) * 1000;
  const paddleTo = dieX * 1000, paddleHome = T.padX * 1000;

  // [t0, t1, key, from, to]: one move per row, minimum-jerk like the placing routine.
  const rows = [
    [0, 0.9, 'paddle', paddleHome, paddleTo],
    [0.9, 1.5, 'push', 0, contact],
    [1.5, 2.9, 'push', contact, stroke],
    [3.4, 4.1, 'push', stroke, 0],
    [3.6, 4.4, 'paddle', paddleTo, paddleHome],
    [4.4, 5.8, 'drive', 0, DIE],
  ];
  const fall = [2.9, 3.3];            // free tip from 48° to 90°, accelerating
  const duration = 6.8;
  const phases = [
    { phase: 'aim', cycle: -1, t0: 0, t1: 0.9 },
    { phase: 'push', cycle: -1, t0: 0.9, t1: 2.9 },
    { phase: 'roll', cycle: -1, t0: 2.9, t1: 3.4 },
    { phase: 'retract', cycle: -1, t0: 3.4, t1: 4.4 },
    { phase: 'drive', cycle: -1, t0: 4.4, t1: 5.8 },
    { phase: 'rest', cycle: -1, t0: 5.8, t1: duration },
  ];
  const sample = (key, t, rest) => {
    let v = rest, speed = 0;
    for (const [t0, t1, k, from, to] of rows) {
      if (k !== key) continue;
      if (t >= t1) { v = to; continue; }
      if (t > t0) { const p = (t - t0) / (t1 - t0); v = from + (to - from) * smooth(p); speed = speedOf(p); }
      break;
    }
    return [v, speed];
  };

  return {
    duration, phases, cycles: 1, dieX, homeZ,
    at(time) {
      const t = Math.min(Math.max(time, 0), duration);
      const [paddle, aPaddle] = sample('paddle', t, paddleHome);
      const [push, aPush] = sample('push', t, 0);
      const [drive, aDrive] = sample('drive', t, 0);
      let tilt = tiltFor(Math.max(push - contact, 0) / 1000, T.padY), aTilt = 0;
      if (t >= fall[0]) {
        const p = Math.min((t - fall[0]) / (fall[1] - fall[0]), 1);
        tilt = tip + (Math.PI / 2 - tip) * p * p;
        aTilt = p < 1 ? p : 0;
      } else if (aPush && push > contact) aTilt = aPush;
      const phase = phases.find(p => t <= p.t1) || phases[phases.length - 1];
      return { tool: { paddle, push }, activity: { paddle: aPaddle, push: aPush, tilt: aTilt }, drive: aDrive, travel: drive, tilt, rolled: t >= fall[1], phase };
    },
  };
}
