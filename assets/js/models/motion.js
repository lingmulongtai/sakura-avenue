// Pick-and-place demo for the concept robot: take each bottle from the carousel, set it in the next
// Common Zone, then strafe one zone along. Everything is a pure function of time, so scrubbing works,
// and the robot, the bottles, the charts and the timeline all read the same plan.
const R2D = 180 / Math.PI;
// Minimum-jerk profile: starts and stops with zero speed and zero acceleration, so moves never snap.
const smooth = p => p * p * p * (p * (p * 6 - 15) + 10);
const speedOf = p => 30 * p * p * (1 - p) * (1 - p) / 1.875; // d(smooth)/dp scaled so the peak is 1

export const JOINTS = ['yaw', 'lift', 'reach', 'grip', 'turn'];
export const PHASES = {
  ready: ['準備', 'Ready'], pick: ['取る', 'Pick'], carry: ['運ぶ', 'Carry'],
  place: ['置く', 'Place'], strafe: ['横へ移動', 'Strafe'], rest: ['一周', 'Loop'],
};

export function planDemo(rig, start, count) {
  const L = rig.layout;
  // Yaw (deg) and reach (mm) that put the gripper centre over a point on the floor plan.
  const reachTo = (x, z) => {
    const dx = x - L.M.x, dz = z - L.M.z, d = Math.hypot(dx, dz);
    const lz = Math.sqrt(Math.max(d * d - L.ox * L.ox, 0));
    return { yaw: (Math.atan2(dx, dz) - Math.atan2(L.ox, lz)) * R2D, reach: Math.min(Math.max(lz - L.lz0, 0), L.reachMax) * 1000 };
  };
  const toMast = Math.atan2(L.M.x - L.C.x, L.M.z - L.C.z);
  const pick = reachTo(L.C.x + Math.sin(toMast) * L.ring, L.C.z + Math.cos(toMast) * L.ring);
  const place = reachTo(L.place.x, L.place.z);
  const liftPick = (L.seat + L.grab + L.drop) * 1000, liftCarry = liftPick + 70;
  const liftPlace = (L.grab + L.drop) * 1000 + 2, liftClear = 520;
  const OPEN = 38, CLOSED = 0;
  const turnFor = k => toMast * R2D - L.slotDeg(k);
  const cycles = Math.max(count, 1);

  // Steps: [duration, changes, phase, overlap, event]. A step starts `overlap` seconds before the
  // previous one ends, so independent joints blend (the arm retracts while it rises, the turret swings
  // while it reaches out). One joint never runs two moves at once: it waits for its own last move.
  const steps = [];
  const ready = k => ({ yaw: pick.yaw, lift: liftPick, reach: 0, grip: OPEN, turn: turnFor(k) });
  steps.push([0.8, { lift: Math.max(start.lift, liftClear), reach: 0, grip: OPEN }, 'ready', 0]);
  steps.push([1.1, ready(0), 'ready', 0.2]);
  for (let k = 0; k < cycles; k++) {
    const first = steps.length;
    steps.push([0.75, { reach: pick.reach }, 'pick', 0]);
    steps.push([0.35, { grip: CLOSED }, 'pick', 0, ['grab', k]]);
    steps.push([0.5, { lift: liftCarry }, 'carry', 0]);
    steps.push([0.55, { reach: 0 }, 'carry', 0.1]);
    steps.push([1.1, { yaw: place.yaw, turn: turnFor(k + 1) }, 'carry', 0.3]);
    steps.push([0.8, { reach: place.reach }, 'carry', 0.4]);
    steps.push([0.8, { lift: liftPlace }, 'place', 0.25]);
    steps.push([0.35, { grip: OPEN }, 'place', 0, ['release', k]]);
    steps.push([0.5, { lift: liftClear }, 'place', 0]);
    steps.push([0.5, { reach: 0 }, 'place', 0.25]);
    steps.push([1.4, { yaw: pick.yaw, lift: liftPick, shift: k + 1 }, 'strafe', 0.15]);
    for (let i = first; i < steps.length; i++) steps[i].cycle = k;
  }
  steps.push([1.6, {}, 'rest', 0]);

  // Resolve the steps into one track of moves per joint, plus the phase strip for the timeline.
  const tracks = Object.fromEntries([...JOINTS, 'shift'].map(j => [j, []]));
  const value = { ...start, shift: 0 }, free = {};
  const phases = [], grabbed = [], released = [];
  let cursor = 0;
  for (const step of steps) {
    const [duration, change, phase, overlap, event] = step;
    const t0 = Math.max(cursor - overlap, 0);
    let t1 = t0 + duration;
    for (const [joint, to] of Object.entries(change)) {
      const a = Math.max(t0, free[joint] || 0), b = a + duration;
      if (to !== value[joint]) tracks[joint].push({ t0: a, t1: b, from: value[joint], to });
      value[joint] = to; free[joint] = b; t1 = Math.max(t1, b);
    }
    if (event?.[0] === 'grab') grabbed[event[1]] = t1;
    if (event?.[0] === 'release') released[event[1]] = t0;
    const cycle = step.cycle ?? -1;
    const last = phases[phases.length - 1];
    if (last && last.phase === phase && last.cycle === cycle) last.t1 = Math.max(last.t1, t1);
    else phases.push({ phase, cycle, t0: last ? Math.max(last.t1, t0) : 0, t1 });
    cursor = Math.max(cursor, t1);
  }
  const duration = cursor;
  phases[phases.length - 1].t1 = duration;

  // Value and speed (0 to 1) of one joint at time t.
  const sample = (joint, t) => {
    const track = tracks[joint];
    let v = joint === 'shift' ? 0 : start[joint], speed = 0;
    for (const m of track) {
      if (t >= m.t1) { v = m.to; continue; }
      if (t > m.t0) { const p = (t - m.t0) / (m.t1 - m.t0); v = m.from + (m.to - m.from) * smooth(p); speed = speedOf(p); }
      break;
    }
    return [v, speed];
  };

  return {
    duration, phases, cycles,
    pick, place,
    at(time) {
      const tt = Math.min(Math.max(time, 0), duration);
      const pose = {}, activity = {};
      for (const j of JOINTS) [pose[j], activity[j]] = sample(j, tt);
      const [shift, drive] = sample('shift', tt);
      const bottles = [];
      for (let k = 0; k < count; k++) {
        const state = tt < grabbed[k] ? 'slot' : tt < released[k] ? 'held' : 'placed';
        bottles.push({ state, spin: (turnFor(k) - pick.yaw) / R2D });
      }
      const phase = phases.find(p => tt <= p.t1) || phases[phases.length - 1];
      const placed = bottles.filter(b => b.state === 'placed').length;
      return { pose, activity, drive, offset: -shift * L.pitch, bottles, placed, phase, placeYaw: place.yaw / R2D };
    },
  };
}
