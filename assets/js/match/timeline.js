import {clamp, easeIO, easeOut} from '../core/util.js';
import {M, RUNG} from '../core/field.js';

export const R1 = (r) => [r, [M(r[2]), r[1], M(r[0]), r[3]]];
export const FOCUS = {
  start: R1([0,6281,700,7000]), dice: R1([2794,6281,3500,7000]), area2: R1([0,0,3022,6281]),
  sakura: R1([0,1140,500,2280]), herb: R1([0,0,500,1140]), weed: R1([3022,0,3331,6083]),
  common: [[3331,0,3669,6083]], sakuraR: [[0,1140,500,2280]], herbB: [[6500,0,7000,1140]],
  weedR: [[3022,0,3331,6083]], startR: [[0,6281,700,7000]], z12: [[3331,0,3669,RUNG(11)]]
};

export const TEAMS = ['red', 'blue'];
export const TNM = {red:['赤','Red'], blue:['青','Blue']};
export const other = tm => tm === 'red' ? 'blue' : 'red';
export const r2 = v => Math.round(v * 100) / 100;
Object.assign(FOCUS, {sakuraB:[[6500,1140,7000,2280]], herbR:[[0,0,500,1140]], weedB:[[3669,0,3978,6083]], startB:[[6300,6281,7000,7000]], crash:[[0,3150,900,4250]]});
export const focusRects = key => { const m = /^z(\d+)$/.exec(key); return m ? [[3331, Math.max(0, RUNG(+m[1])), 3669, RUNG(+m[1] - 1)]] : FOCUS[key] || []; };

export function lerpMap(pts, t) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const a = pts[i-1], b = pts[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return pts[pts.length - 1][1];
}
export function pathAt(wps, t) {
  if (t <= wps[0][0]) return [wps[0][1], wps[0][2]];
  for (let i = 1; i < wps.length; i++) {
    const a = wps[i-1], b = wps[i];
    if (t <= b[0]) { const p = b[0] === a[0] ? 1 : easeIO((t - a[0]) / (b[0] - a[0])); return [a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p]; }
  }
  const l = wps[wps.length - 1]; return [l[1], l[2]];
}
export function armAt(list, t) {
  for (const [a, b, ang, len] of list) if (t >= a && t <= b) {
    const p = (t - a) / (b - a);
    const e = p < .3 ? easeOut(p / .3) : p > .7 ? easeOut((1 - p) / .3) : 1;
    return [ang, len * e];
  }
  return null;
}
export const sumUntil = (list, t, idx) => list.reduce((acc, ev) => ev[0] <= t ? acc + (ev[idx] || 0) : acc, 0);
export const countUntil = (list, t) => list.reduce((a, x) => x <= t ? a + 1 : a, 0);
export function weedFall(sc, team, i, t) {
  const ev = sc.weedEv[team].find(e => e[0] === i);
  if (!ev || t < ev[1]) return 0;
  if (ev[2] && t >= ev[2]) return 1 - clamp((t - ev[2]) / .45, 0, 1);
  return clamp((t - ev[1]) / .45, 0, 1);
}
export const isLocked = (sc, team, t) => sc.weedEv[team].some(e => weedFall(sc, team, e[0], t) > .5);
export const faceAt = (sc, team, t) => { const d = sc.dice[team]; return d.f1 && t >= (d.f0 + d.f1) / 2 ? d.to : d.from; };
export function occAt(sc, t) {
  const occ = [];
  for (const [te, k, tm] of sc.zev) if (te <= t) occ[k] = tm;
  return occ;
}
