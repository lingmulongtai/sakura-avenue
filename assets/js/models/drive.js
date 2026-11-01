// Mecanum drive demo: forward, sideways, diagonal and turning on the spot. The body path is a pure
// function of time, and each wheel's angle and speed follow from it by the usual mecanum mix
// (forward ± sideways ∓ turn), so the console can show why the robot slides sideways.
import * as THREE from 'three';

const R2D = 180 / Math.PI, AXLE = 0.0635;
const smooth = p => p * p * p * (p * (p * 6 - 15) + 10);
const slope = p => 30 * p * p * (1 - p) * (1 - p); // d(smooth)/dp

export function planDrive(rig) {
  // [duration, dx, dz, dyaw (deg), phase]: moves in the robot's own frame, one at a time.
  const moves = [
    [1.6, 0, 0.45, 0, 'forward'],
    [1.7, 0.45, 0, 0, 'sideways'],
    [2.1, -0.45, -0.45, 0, 'diagonal'],
    [1.5, 0, 0, 90, 'turn'],
    [1.5, 0, 0, -90, 'turn'],
  ];
  const rest = 0.9;
  let t = 0;
  const rows = moves.map(([d, dx, dz, dyaw, phase]) => { const row = { t0: t, t1: t + d, dx, dz, dyaw: dyaw / R2D, phase }; t += d; return row; });
  const duration = t + rest;
  const phases = rows.map(r => ({ phase: r.phase, cycle: -1, t0: r.t0, t1: r.t1 }));
  phases.push({ phase: 'rest', cycle: -1, t0: t, t1: duration });

  // Wheel layout from the built robot: x, z of each hub, and its roller handedness (spin).
  const wheels = rig.wheels.map((w, i) => {
    const p = w.wheel.getWorldPosition(new THREE.Vector3());
    return { i, spin: w.spin, x: p.x, z: p.z, k: Math.abs(p.x) + Math.abs(p.z), name: `${p.z > 0 ? 'F' : 'R'}${p.x < 0 ? 'L' : 'R'}` };
  }).sort((a, b) => b.z - a.z || a.x - b.x);
  // Wheel travel (m) for a body displacement: forward + spin × sideways − side × k × turn.
  const travel = (w, x, z, yaw) => z + w.spin * x - Math.sign(w.x) * w.k * yaw;

  const at = time => {
    const tt = Math.min(Math.max(time, 0), duration);
    let x = 0, z = 0, yaw = 0, vx = 0, vz = 0, vyaw = 0, phase = phases[phases.length - 1];
    for (const r of rows) {
      const p = Math.min(Math.max((tt - r.t0) / (r.t1 - r.t0), 0), 1), f = smooth(p);
      x += r.dx * f; z += r.dz * f; yaw += r.dyaw * f;
      if (p > 0 && p < 1) {
        const rate = slope(p) / (r.t1 - r.t0);
        vx = r.dx * rate; vz = r.dz * rate; vyaw = r.dyaw * rate;
        phase = phases[rows.indexOf(r)];
      }
    }
    if (tt < rows[rows.length - 1].t1 && phase.phase === 'rest') phase = phases.find(p => tt <= p.t1);
    const wheel = wheels.map(w => ({ angle: travel(w, x, z, yaw) / AXLE, rpm: travel(w, vx, vz, vyaw) / AXLE * 60 / (2 * Math.PI) }));
    const speed = Math.hypot(vx, vz);
    return { x, z, yaw, wheel, speed, activity: {}, drive: speed > 0.01 || Math.abs(vyaw) > 0.05 ? 1 : 0, phase };
  };

  const rpm = v => `${Math.round(v)} rpm`;
  return {
    duration, phases, cycles: 1, wheels, at,
    // The floor line: where the body centre goes.
    path: Array.from({ length: 121 }, (_, i) => { const s = at(i / 120 * duration); return [s.x, s.z]; }),
    lanes: [
      ['前後', 'Forward', v => `${Math.round(v)} mm`, q => q.z * 1000, q => q.drive],
      ['横', 'Sideways', v => `${Math.round(v)} mm`, q => q.x * 1000, q => q.drive],
      ['向き', 'Heading', v => `${Math.round(v)}°`, q => q.yaw * R2D, q => q.drive],
      ...wheels.map((w, n) => [`車輪 ${w.name}`, `Wheel ${w.name}`, rpm, q => q.wheel[n].rpm, q => Math.min(Math.abs(q.wheel[n].rpm) / 40, 1)]),
    ],
    stat: { ja: '速さ', en: 'Speed', value: q => Math.round(q.speed * 1000), total: () => 'mm/s' },
  };
}
