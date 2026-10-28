import {M, ZC, ZR, GEO} from '../core/field.js';
import {TEAMS, TNM, other, r2, pathAt, sumUntil, isLocked, faceAt, occAt} from './timeline.js';
import {SCENES} from './block.js';

// The other matches are short scripts. Both robots are written in Red-court millimetres (Blue is mirrored);
// each step times itself from distance and action length, and a placement waits until every lower zone is filled.
export const SPD = 1500;
export const regionOf = (x, y) => y > 6300 ? 'a1' : x >= 1625 ? 'strip' : y < 1140 ? 'top' : 'left';
export function route(x, y, tx, ty) {
  const pts = [[x, y]], to = regionOf(tx, ty);
  let at = regionOf(x, y), n = 0;
  const add = (a, b) => { pts.push([a, b]); x = a; y = b; };
  while (at !== to && n++ < 6) {
    if (at === 'a1') { if (x < 2250) add(2250, y); add(x, 5650); at = 'strip'; }
    else if (at === 'left') { add(800, 5650); add(2000, 5650); at = 'strip'; }
    else if (at === 'top') { add(2740, 560); at = 'strip'; }
    else if (to === 'a1') { add(2250, 5650); add(2250, 6640); at = 'a1'; }
    else if (to === 'top') { add(x, 560); at = 'top'; }
    else { add(x, 5650); add(800, 5650); at = 'left'; }
  }
  add(tx, ty);
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const q = out.length ? out[out.length - 1] : pts[0], p = pts[i], r = pts[i + 1], ax = p[0] - q[0], ay = p[1] - q[1];
    if (Math.hypot(ax, ay) < 1) continue;
    if (r) { const bx = r[0] - p[0], by = r[1] - p[1]; if (Math.abs(ax * by - ay * bx) < 1 && ax * bx + ay * by > 0) continue; }
    out.push(p);
  }
  return out;
}
export function compile(def, prev) {
  const S = {path:{red:[], blue:[]}, arm:{red:[], blue:[]}, held:{red:[], blue:[]}, sakPick:{red:[], blue:[]}, sakRet:{red:[], blue:[]},
    herbPick:{red:[], blue:[]}, herbRet:{red:[], blue:[]}, dice:{}, weedEv:{red:[], blue:[]}, throws:[], place:[], remove:[], score:[],
    retry:[], signal:[], dq:null, impacts:[], marks:{}, end:0};
  const mark = (n, v) => { S.marks[n] = r2(v); };
  const markAt = (n, off = 0) => { const v = S.marks[n] ?? (prev && prev.marks[n]); return v === undefined ? 0 : v + off; };
  for (const team of TEAMS) {
    const B = team === 'blue', X = B ? M : (v => v), P = S.path[team];
    let t = 6, x = 350, y = 6640, face = 1, inA2 = false, sk = 0, hb = 0;
    S.dice[team] = {from:1, to:1, f0:0, f1:0};
    P.push([0, X(x), y]);
    const score = (tt, pts, label, pos, cat) => S.score.push([r2(tt), team, pts, label, pos, cat]);
    const arm = (a, len, t0, t1) => S.arm[team].push([r2(t0), r2(t1), B ? 180 - a : a, len]);
    const hold = (tt, s1, h1, o1) => S.held[team].push([r2(tt), s1, h1, o1]);
    const wp = (nx, ny, mul) => {
      const d = Math.hypot(nx - x, ny - y);
      if (d < 1) return;
      if (P[P.length - 1][0] < t) P.push([r2(t), X(x), y]);
      const dur = Math.max(.4, d / SPD) * mul;
      if (!inA2 && y > 6541 && ny <= 6541) {
        const p = (y - 6541) / (y - ny), u = p < .5 ? Math.sqrt(p / 2) : 1 - Math.sqrt((1 - p) / 2);
        inA2 = true; score(t + u * dur, 10, ['エリア2','Area 2'], [X(2250), 5250], 'A');
      }
      t += dur; x = nx; y = ny; P.push([r2(t), X(x), y]);
    };
    const go = (tx, ty, mul = 1) => route(x, y, tx, ty).forEach(([a, b]) => wp(a, b, mul));
    const filledAt = k => {
      const src = B ? S.place : [...S.place, ...(prev ? prev.place.filter(e => e[2] !== team) : [])];
      let need = 0;
      for (let j = 1; j < k; j++) { const ts = src.filter(e => e[1] === j).map(e => e[0]); if (!ts.length) return 0; need = Math.max(need, Math.min(...ts)); }
      return need;
    };
    const step = {
      wait: d => { t += d; },
      until: (n, off) => { t = Math.max(t, typeof n === 'number' ? n : markAt(n, off)); },
      mark: n => mark(n, t),
      go,
      dice: f => { go(2560, 6640); arm(0, 260, t, t + 1.3); S.dice[team] = {from:face, to:f, f0:r2(t + .6), f1:r2(t + 1.4)}; score(t + 1.4, 20, ['サイコロ','Dice'], [X(2300), 6000], 'B'); face = f; t += 1.5; },
      sakura: n => { go(800, 1710); arm(180, 420, t, t + .8 + n * .4); for (let i = 0; i < n; i++) { hold(t + .5 + i * .4, 1, 0, 0); S.sakPick[team].push(r2(t + .5 + i * .4)); } sk += n; t += 1 + n * .4; },
      herb: n => { go(1020, 560); arm(180, 480, t, t + .8 + n * .4); for (let i = 0; i < n; i++) { hold(t + .5 + i * .4, 0, 1, 0); S.herbPick[team].push(r2(t + .5 + i * .4)); } hb += n; t += 1 + n * .4; },
      place: k => { go(2740, ZR(k)); t = Math.max(t, filledAt(k) - .1); arm(0, 470, t, t + 1); S.place.push([r2(t + .5), k, team]); mark('p' + k, t + .5); hold(t + .5, -1, 0, 0); sk--; t += 1; },
      remove: k => { go(2740, ZR(k)); arm(0, 470, t, t + 1); S.remove.push([r2(t + .5), k, team]); mark('x' + k, t + .5); hold(t + .5, 0, 0, 1); t += 1; },
      throw: (i, ty) => { go(2740, ty); arm(0, 340, t, t + .8); S.throws.push([r2(t + .3), r2(t + 1.2), other(team), i, X(3460), ty]); S.weedEv[other(team)].push([i, r2(t + 1.2), 0]); mark(team + 'Throw', t + 1.2); hold(t + .3, 0, -1, 0); hb--; t += 1.4; },
      retry: () => {
        const t0 = t;
        P.push([r2(t0 + 1.05), X(x), y], [r2(t0 + 1.1), X(350), 6640]); x = 350; y = 6640;
        hold(t0 + 1.1, -sk, -hb, 0);
        for (let i = 0; i < sk; i++) S.sakRet[team].push(r2(t0 + 1.1));
        for (let i = 0; i < hb; i++) S.herbRet[team].push(r2(t0 + 1.1));
        sk = hb = 0; t = t0 + 4;
        S.retry.push([team, r2(t0), r2(t0 + .6), r2(t0 + 1.15), r2(t)]); mark(team + 'Retry', t0);
      },
      signal: () => { S.signal.push([team, r2(t)]); mark('signal', t); t += 2.2; S.end = r2(t); },
      crash: (cx, cy, ix, iy) => { wp(cx, cy, .3); S.impacts.push([r2(t), X(ix), iy]); mark('crash', t); },
      dq: () => { S.dq = [team, r2(t)]; mark('dq', t); t += 1.6; S.end = r2(t); }
    };
    for (const [op, ...args] of def[team]) step[op](...args);
  }
  return S;
}
export function build(def) {
  let S = null;
  for (let pass = 0; pass < 16; pass++) {
    const N = compile(def, S), same = S && JSON.stringify([N.place, N.marks]) === JSON.stringify([S.place, S.marks]);
    S = N;
    if (same) break;
  }
  const at = v => typeof v === 'number' ? v : Array.isArray(v) ? (S.marks[v[0]] || 0) + v[1] : S.marks[v] || 0;
  const Xof = team => team === 'blue' ? M : (v => v);
  if (def.ending === 'time') S.end = r2(at(def.end));
  S.total = r2(S.end + 7.2); S.marks.end = S.end;
  const live = e => e[0] <= S.end;
  S.place = S.place.filter(live); S.remove = S.remove.filter(live); S.score = S.score.filter(live); S.throws = S.throws.filter(live);
  for (const team of TEAMS) {
    S.weedEv[team] = S.weedEv[team].filter(e => e[1] <= S.end);
    const X = Xof(team), back = {};
    for (const e of S.weedEv[team]) {
      const r = S.retry.find(q => q[0] === team && q[1] > e[1]);
      if (r) { e[2] = r2(r[1] + 1.8); back[e[2]] = (back[e[2]] || 0) + 15; }
      const wy = GEO.weed[e[0]][1];
      S.score.push([r2(e[1] + .3), team, -15, ['雑草','Weed'], [X(3176), wy + (wy > 2000 ? -260 : 300)], 'D']);
    }
    for (const tb in back) S.score.push([r2(+tb + .5), team, back[tb], ['減点が消えた','Penalty cleared'], [X(2300), 2050], 'D']);
  }
  S.banners = [];
  const ev = [...S.place.map(e => [...e, 1]), ...S.remove.map(e => [...e, 0])].sort((a, b) => a[0] - b[0]);
  const occ = [], half = {};
  for (const [tt, k, tm, put] of ev) {
    const X = Xof(tm), y0 = ZC(k);
    if (!put) { const own = occ[k]; occ[k] = null; S.score.push([tt, own, -30, ['どけられた','Removed'], [3500, y0 - 180], 'C']); continue; }
    occ[k] = tm;
    S.score.push([tt, tm, 30, '', [3500, y0 - 180], 'C']);
    if (!half[tm] && occ.filter(v => v === tm).length >= 5) {
      half[tm] = true; S.marks['hb-' + tm] = tt;
      S.score.push([r2(tt + .2), tm, 90, ['五分咲き','Half Bloom'], [X(1900), y0 + (y0 > 2400 ? -350 : 450)], 'E']);
      S.banners.push([r2(tt + .2), r2(tt + 2.2), [X(1500), y0 + (y0 > 2400 ? -900 : 800)], [`${TNM[tm][0]} 五分咲き！`, `${TNM[tm][1]}: Half Bloom!`], 'b-' + tm]);
    }
    if (k === 12) {
      S.score.push([r2(tt + .4), tm, 180, ['満開','Full Bloom'], [3500, ZC(12) + 520], 'F']);
      S.banners.push([r2(tt + .4), r2(tt + 1.8), [3500, 1150], ['満開！','Full Bloom!'], 'b-sakura']);
    }
  }
  for (const [team, ts] of S.signal) S.banners.push([r2(ts + .4), S.end, [Xof(team)(1500), 900], ['ロボットが合図','Robot signals'], 'b-' + team]);
  if (S.dq) {
    const [team, td] = S.dq, [px, py] = pathAt(S.path[team], td);
    const had = S.score.reduce((a, e) => e[1] === team && e[0] <= td + 1 ? a + e[2] : a, 0);
    S.score.push([r2(td + 1), team, -had, ['失格 → 0点','DQ → 0'], [px + (px < 3500 ? 700 : -700), py - 560], 'Q']);
  }
  for (const [a, b, pos, text, cls] of def.banners || []) S.banners.push([r2(at(a)), r2(at(b)), pos, text, cls]);
  const W = TNM[def.winner], Lo = TNM[other(def.winner)];
  S.banners.push([S.end, r2(S.total + 1), [3500, 3400], def.final || (def.ending === 'declare' ? [`満開宣言 → ${W[0]}の勝ち`, `Full Bloom Declaration → ${W[1]} wins`]
    : def.ending === 'dq' ? [`${Lo[0]} 失格 → ${W[0]}の勝ち`, `${Lo[1]} disqualified → ${W[1]} wins`] : [`3分経過 → 得点で${W[0]}の勝ち`, `Time up → ${W[1]} wins on points`]), 'b-final ' + def.winner]);
  S.clk = [[6, 0], [S.end, def.sec]];
  S.scenes = [{...SCENES[0]}, ...def.scenes.map(sc => ({...sc, t:r2(at(sc.t))}))];
  for (const k of ['id', 'name', 'sub', 'tag', 'winner', 'ending', 'note', 'allowOver']) S[k] = def[k];
  return S;
}
export function prep(sc) {
  sc.zev = [...sc.place.map(([t, k, tm]) => [t, k, tm]), ...sc.remove.map(([t, k, tm]) => [t, k, null, tm])].sort((a, b) => a[0] - b[0]);
  sc.scenes.forEach((s2, i) => s2.end = i < sc.scenes.length - 1 ? sc.scenes[i + 1].t : sc.total);
  sc.tmk = [...sc.place.map(([t, , tm]) => [t, tm]), ...sc.remove.map(([t]) => [t, 'warn']), ...TEAMS.flatMap(tm => sc.weedEv[tm].map(e => [e[1], 'warn'])),
    ...sc.retry.map(e => [e[1], 'warn']), ...(sc.dq ? [[sc.dq[1], 'warn']] : []), [sc.end, 'end']];
  const warn = m => console.warn(`[match:${sc.id}] ${m}`);
  for (const [tp, k, team] of sc.place) {
    const occ = occAt(sc, tp - .01);
    for (let j = 1; j < k; j++) if (!occ[j]) { warn(`${team} zone ${k} @${tp} before zone ${j}`); break; }
    if (occ[k]) warn(`zone ${k} taken @${tp}`);
    if (isLocked(sc, team, tp)) warn(`${team} placed with a weed down @${tp}`);
    if (k === 12 && occ.filter(v => v === team).length < 5) warn(`${team} zone 12 without Half Bloom`);
  }
  for (const [tr, k, team] of sc.remove) if (occAt(sc, tr - .01)[k] !== other(team)) warn(`${team} removed zone ${k}`);
  for (const team of TEAMS) if (sc.allowOver !== team) for (const [th] of sc.held[team]) {
    const n = [1, 2, 3].reduce((a, i) => a + sumUntil(sc.held[team], th, i), 0);
    if (n > faceAt(sc, team, th)) warn(`${team} holds ${n} @${th}`);
  }
  return sc;
}
