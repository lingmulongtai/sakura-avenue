// Pick-and-place demo for the concept robot: take each bottle from the carousel, set it in the next
// Common Zone, then strafe one zone along. Everything is a pure function of time, so scrubbing works.
const R2D = 180 / Math.PI;
const ease = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;

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

  // Keyframes: [duration, changes, event]
  const keys = [];
  const ready = k => ({ yaw: pick.yaw, lift: liftPick, reach: 0, grip: OPEN, turn: turnFor(k) });
  keys.push([0.7, { lift: Math.max(start.lift, liftClear), reach: 0, grip: OPEN }]);
  keys.push([1.0, ready(0)]);
  for (let k = 0; k < cycles; k++) {
    keys.push([0.7, { reach: pick.reach }]);
    keys.push([0.35, { grip: CLOSED }, ['grab', k]]);
    keys.push([0.45, { lift: liftCarry }]);
    keys.push([0.4, { reach: 0 }]);
    keys.push([1.0, { yaw: place.yaw }]);
    keys.push([0.7, { reach: place.reach, turn: turnFor(k + 1) }]);
    keys.push([0.7, { lift: liftPlace }]);
    keys.push([0.35, { grip: OPEN }, ['release', k]]);
    keys.push([0.45, { lift: liftClear }]);
    keys.push([0.4, { reach: 0 }]);
    keys.push([1.3, { yaw: pick.yaw, lift: liftPick }, ['strafe', k]]);
  }
  keys.push([1.8, {}]);

  // Resolve keyframes into absolute segments.
  let t = 0, pose = { ...start };
  const segments = [], grabbed = [], released = [], strafes = [];
  for (const [duration, change, event] of keys) {
    const from = { ...pose };
    pose = { ...pose, ...change };
    segments.push({ t0: t, t1: t + duration, from, to: { ...pose } });
    if (event?.[0] === 'grab') grabbed[event[1]] = t + duration;
    if (event?.[0] === 'release') released[event[1]] = t;
    if (event?.[0] === 'strafe') strafes.push([t, t + duration]);
    t += duration;
  }
  const duration = t;

  return {
    duration,
    pick, place,
    at(time) {
      const tt = Math.min(Math.max(time, 0), duration);
      const seg = segments.find(s => tt <= s.t1) || segments[segments.length - 1];
      const p = ease(Math.min(Math.max((tt - seg.t0) / (seg.t1 - seg.t0), 0), 1));
      const pose = {};
      for (const key of Object.keys(seg.to)) pose[key] = lerp(seg.from[key], seg.to[key], p);
      let shift = 0;
      for (const [a, b] of strafes) shift += tt >= b ? 1 : tt > a ? ease((tt - a) / (b - a)) : 0;
      const bottles = [];
      for (let k = 0; k < count; k++) {
        const state = tt < grabbed[k] ? 'slot' : tt < released[k] ? 'held' : 'placed';
        bottles.push({ state, spin: (turnFor(k) - pick.yaw) / R2D });
      }
      return { pose, offset: -shift * L.pitch, bottles, placeYaw: place.yaw / R2D };
    },
  };
}
