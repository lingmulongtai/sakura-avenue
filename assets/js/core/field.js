import {W, PAD, VB, s} from './util.js';

export const M = x => W - x;
export const RUNG = k => 6083 - 507 * k;
export const ZC = k => 6083 - 507 * (k - 0.5);
export const ZR = k => Math.max(ZC(k) + 50, 300);
export const pct = v => ((v + PAD) / VB * 100);

/* ---------- geometry (mm, red court; blue = mirror) ---------- */
export const GEO = {
  wood: [[0,1140,1625,1140],[0,2280,500,2280],[1625,1140,1625,5134],[1089,3340,1625,3340],[0,4360,500,4360],[0,6281,1640,6281],[3022,RUNG(4),3331,RUNG(4)],[3022,RUNG(8),3331,RUNG(8)]],
  chalk: [[500,0,500,2280],[1640,6281,3022,6281],[2794,6281,2794,7000],[3022,0,3022,6281]],
  sakura: (() => { const a = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) a.push([110 + c * 140, 1255 + r * 195]); return a; })(),
  herb: [[140,230],[360,230],[140,520],[360,520],[250,820]],
  weed: [[3176,1000],[3176,3040],[3176,5070]],
  dice: [3150, 6618]
};
export const FACES = {1:['C'],2:['TL','BR'],3:['TL','C','BR'],4:['TL','TR','BL','BR'],5:['TL','TR','BL','BR','C'],6:['TL','ML','BL','TR','MR','BR']};
export const PIPPOS = {TL:[-64,-64],TR:[64,-64],ML:[-64,0],MR:[64,0],BL:[-64,64],BR:[64,64],C:[0,0]};

export function buildField(svg) {
  svg.setAttribute('viewBox', `${-PAD} ${-PAD} ${VB} ${VB}`);
  const L2 = {};
  L2.base = s('g', null, svg);
  s('rect', {x:-PAD, y:-PAD, width:VB, height:VB, class:'f-mat'}, L2.base);
  s('rect', {x:0, y:0, width:W, height:W, class:'f-floor'}, L2.base);
  s('rect', {x:0, y:0, width:3500, height:W, class:'f-half red'}, L2.base);
  s('rect', {x:3500, y:0, width:3500, height:W, class:'f-half blue'}, L2.base);
  const chalk = s('g', {class:'chalk'}, svg);
  for (const side of [0, 1]) {
    const X = side ? M : (x => x);
    for (const [x1,y1,x2,y2] of GEO.chalk) s('line', {x1:X(x1), y1, x2:X(x2), y2}, chalk);
    const dc = X(GEO.dice[0]);
    s('rect', {x:dc-125, y:GEO.dice[1]-125, width:250, height:250}, chalk);
    s('line', {x1:X(700), y1:6281, x2:X(700), y2:7000, class: side ? 'tape blue' : 'tape red'}, svg);
  }
  const wood = s('g', null, svg);
  const segs = [];
  for (const side of [0, 1]) { const X = side ? M : (x => x); for (const [x1,y1,x2,y2] of GEO.wood) segs.push([X(x1),y1,X(x2),y2]); }
  segs.push([3331,0,3331,6083],[3669,0,3669,6083],[3331,6083,3669,6083],[3500,6083,3500,7000]);
  for (let k = 1; k <= 11; k++) segs.push([3331,RUNG(k),3669,RUNG(k)]);
  L2.segs = segs;
  for (const q of segs) s('line', {x1:q[0], y1:q[1], x2:q[2], y2:q[3], class:'wood-sh'}, wood);
  for (const q of segs) s('line', {x1:q[0], y1:q[1], x2:q[2], y2:q[3], class:'wood'}, wood);
  s('rect', {x:0, y:0, width:W, height:W, class:'frame-sh'}, wood);
  s('rect', {x:0, y:0, width:W, height:W, class:'frame'}, wood);
  const nums = s('g', null, svg);
  for (let k = 1; k <= 12; k++) { const t = s('text', {x:3500, y:ZC(k) - 125, 'text-anchor':'middle', 'dominant-baseline':'central', class:'znum'}, nums); t.textContent = k; }
  L2.focus = s('g', null, svg);
  L2.obj = s('g', null, svg);
  L2.actors = s('g', null, svg);
  L2.top = s('g', null, svg);
  return L2;
}
export function bottle(parent, x, y, r, cap) {
  const outer = s('g', {transform:`translate(${x} ${y})`}, parent);
  const g = s('g', null, outer);
  s('circle', {r, class:'bt-body'}, g);
  s('circle', {r:r * .45, class:'cap ' + cap}, g);
  return {outer, g, x, y};
}
export function weedBottle(parent, x, y) {
  const outer = s('g', {transform:`translate(${x} ${y})`}, parent);
  const g = s('g', null, outer);
  const hit = s('circle', {r:100, class:'hit', opacity:0}, g);
  const stand = s('g', null, g);
  s('circle', {r:96, class:'weed-body'}, stand);
  s('circle', {r:42, class:'weed-cap'}, stand);
  const lie = s('g', {opacity:0}, g);
  s('rect', {x:-60, y:-80, width:400, height:160, rx:70, class:'weed-body'}, lie);
  s('rect', {x:340, y:-36, width:70, height:72, rx:16, class:'weed-cap'}, lie);
  return {outer, g, stand, lie, hit, x, y};
}
export function makeDice(parent, x, y) {
  const outer = s('g', {transform:`translate(${x} ${y})`}, parent);
  const g = s('g', null, outer);
  s('rect', {x:-125, y:-125, width:250, height:250, rx:44, class:'dice'}, g);
  const pips = {};
  for (const k in PIPPOS) pips[k] = s('circle', {cx:PIPPOS[k][0], cy:PIPPOS[k][1], r:24, class:'pipd'}, g);
  const d = {outer, g, pips, x, y, face:0, set(n) { if (n === d.face) return; d.face = n; const on = FACES[n]; for (const k in pips) pips[k].style.display = on.includes(k) ? '' : 'none'; }};
  d.set(1);
  return d;
}
export function makeObjects(L2) {
  const O = {sak:{red:[], blue:[]}, herb:{red:[], blue:[]}, weed:{red:[], blue:[]}, dice:{}, zone:[]};
  for (const team of ['red', 'blue']) {
    const X = team === 'blue' ? M : (x => x);
    GEO.sakura.forEach(([x,y]) => O.sak[team].push(bottle(L2.obj, X(x), y, 64, 'c-' + team)));
    GEO.herb.forEach(([x,y]) => O.herb[team].push(bottle(L2.obj, X(x), y, 64, 'c-yel')));
    GEO.weed.forEach(([x,y]) => O.weed[team].push(weedBottle(L2.obj, X(x), y)));
    O.dice[team] = makeDice(L2.obj, X(GEO.dice[0]), GEO.dice[1]);
  }
  for (let k = 1; k <= 12; k++) { const b = bottle(L2.obj, 3500, ZC(k) + 60, 88, 'c-red'); b.outer.style.display = 'none'; O.zone[k] = b; }
  O.sakOrder = GEO.sakura.map((p, i) => i).sort((a, b) => (GEO.sakura[b][0] - GEO.sakura[a][0]) || (GEO.sakura[a][1] - GEO.sakura[b][1]));
  return O;
}
export function makeRobot(parent, team) {
  const g = s('g', {class:'robot t-' + team}, parent);
  const arm = s('g', {style:'display:none'}, g);
  const armBar = s('rect', {x:0, y:-60, width:10, height:120, rx:30, class:'arm-bar'}, arm);
  const grip = s('path', {d:'M0 -100H95V-58H42V58H95V100H0Z', class:'arm-grip'}, arm);
  s('rect', {x:-260, y:-260, width:520, height:520, rx:80, class:'rb-body'}, g);
  s('rect', {x:-205, y:-205, width:410, height:410, rx:54, class:'rb-plate'}, g);
  const ex = team === 'red' ? 160 : -160;
  s('rect', {x:ex - 62, y:-232, width:124, height:124, rx:18, class:'es-base'}, g);
  s('circle', {cx:ex, cy:-170, r:40, class:'es-btn'}, g);
  const ring = s('circle', {cx:ex, cy:-170, r:90, class:'es-ring'}, g);
  const lamp = s('circle', {cx:-ex, cy:-170, r:46, class:'rb-lamp'}, g);
  const dots = [];
  [[-115,-20],[0,-20],[115,-20],[-115,115],[0,115],[115,115]].forEach(([x,y]) => { const c = s('circle', {cx:x, cy:y, r:48, class:'hd s'}, g); c.style.display = 'none'; dots.push(c); });
  return {g, arm, armBar, grip, lamp, ring, dots, held:''};
}
export function setArm(R, ang, len) {
  if (len <= 2) { if (R.arm.style.display !== 'none') R.arm.style.display = 'none'; return; }
  R.arm.style.display = '';
  R.arm.setAttribute('transform', `rotate(${ang}) translate(250 0)`);
  R.armBar.setAttribute('width', len);
  R.grip.setAttribute('transform', `translate(${len - 20} 0)`);
}
export function setHeld(R, sk, hb, op = 0) {
  const key = sk + ',' + hb + ',' + op;
  if (R.held === key) return; R.held = key;
  R.dots.forEach((d, i) => {
    if (i < sk) { d.style.display = ''; d.setAttribute('class', 'hd s'); }
    else if (i < sk + hb) { d.style.display = ''; d.setAttribute('class', 'hd h'); }
    else if (i < sk + hb + op) { d.style.display = ''; d.setAttribute('class', 'hd o'); }
    else d.style.display = 'none';
  });
}
