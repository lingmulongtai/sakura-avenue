import {LANG, L, tx, langHooks} from '../core/i18n.js';
import {$, RM, clamp, easeIO, easeOut, backOut, s} from '../core/util.js';
import {RUNG, ZC, pct, buildField, makeObjects, makeRobot, setArm, setHeld} from '../core/field.js';
import {TEAMS, TNM, focusRects, lerpMap, pathAt, armAt, sumUntil, countUntil, weedFall, isLocked, faceAt, occAt} from './timeline.js';
import {SCENARIOS} from './scenarios/index.js';

/* ================= MATCH PLAYER ================= */
const msvg = $('matchSvg');
const ML = buildField(msvg);
const MO = makeObjects(ML);
const trailG = s('g', null);
msvg.insertBefore(trailG, ML.actors);
const TRAIL = {red:s('path', {class:'trail red'}, trailG), blue:s('path', {class:'trail blue'}, trailG)};
const ROB = {red:makeRobot(ML.actors, 'red'), blue:makeRobot(ML.actors, 'blue')};
const zNext = s('rect', {x:3365, width:270, height:439, rx:40, class:'znext', style:'display:none'});
ML.obj.insertBefore(zNext, ML.obj.firstChild);
const scnFx = s('g', null, ML.top);
const PET = [];
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 44; i++) {
  const p = s('path', {d:'M0 -70C48 -52 52 30 0 70C-52 30 -48 -52 0 -70Z', class:'petal', style:'display:none'}, ML.top);
  PET.push({el:p, x0:rnd() * 7000, d:rnd() * 2.2, v:900 + rnd() * 900, sw:150 + rnd() * 250, w:1.5 + rnd() * 2, ph:rnd() * 6, rs:(rnd() - .5) * 300, sc:.8 + rnd() * .8});
}
const fx = $('fx');
const statusEl = $('status');
const ST = {};
for (const team of TEAMS) {
  const box = document.createElement('div'); box.className = 'st ' + team;
  box.innerHTML = `<div class="row"><span class="lab lab1"></span><span class="slots"></span></div><div class="row"><span class="lab lab2"></span><span class="pips">${'<i class="pip5"></i>'.repeat(5)}<em></em></span></div><div class="row badges"></div>`;
  statusEl.appendChild(box);
  const slots = box.querySelector('.slots');
  for (let i = 0; i < 6; i++) { const sl = document.createElement('i'); sl.className = 'slot'; slots.appendChild(sl); }
  ST[team] = {box, slots:[...slots.children], lab1:box.querySelector('.lab1'), lab2:box.querySelector('.lab2'), pips:[...box.querySelectorAll('.pip5')], cnt:box.querySelector('.pips em'), badges:box.querySelector('.badges'), key:''};
}
const segsEl = $('segs'), tmarksEl = $('tmarks'), scoreEl = {red:$('scR'), blue:$('scB')};
let SC = null, scnIdx = 0, pops = [], bans = [], thrown = [], ripples = [], impacts = [], segBtns = [], focusEls = {};
let T = 0, playing = false, speed = 1, last = 0, curScene = -1, popDirty = true, everPlayed = false, lastT = 0;

function loadScenario(i) {
  SC = SCENARIOS[i];
  scnFx.innerHTML = ''; fx.innerHTML = ''; ML.focus.innerHTML = '';
  focusEls = {};
  for (const sc of SC.scenes) for (const key of sc.focus) if (!focusEls[key]) focusEls[key] = focusRects(key).map(([x1,y1,x2,y2]) => s('rect', {x:x1, y:y1, width:x2 - x1, height:y2 - y1, rx:50, class:'focus'}, ML.focus));
  ripples = SC.zev.map(([t, k, tm]) => ({t, el:s('circle', {cx:3500, cy:ZC(k) + 60, r:140, class:'ripple ' + (tm || 'gone'), style:'display:none'}, scnFx)}));
  thrown = SC.throws.map(() => {
    const g = s('g', {class:'thrown', style:'display:none'}, scnFx);
    const sh = s('ellipse', {rx:70, ry:40, class:'tb-shadow'}, g);
    const fly = s('g', null, g);
    s('circle', {r:64, class:'bt-body'}, fly); s('circle', {r:29, class:'cap c-yel'}, fly);
    const lie = s('g', {style:'display:none'}, g);
    s('rect', {x:-70, y:-60, width:260, height:120, rx:55, class:'bt-body'}, lie);
    s('rect', {x:180, y:-30, width:56, height:60, rx:14, class:'cap c-yel'}, lie);
    return {g, sh, fly, lie};
  });
  impacts = SC.impacts.map(([t, x, y]) => {
    const g = s('g', {transform:`translate(${x} ${y})`, style:'display:none'}, scnFx);
    const crack = s('g', null, g);
    s('path', {d:'M-40 -230L30 -140L-35 -60L40 20L-30 100L35 190L-20 250', class:'crack'}, crack);
    [[150,-170,30],[200,40,-50],[130,210,70],[-80,-120,-20]].forEach(([dx, dy, r]) => s('rect', {x:dx - 45, y:dy - 14, width:90, height:28, rx:6, transform:`rotate(${r} ${dx} ${dy})`, class:'splinter'}, crack));
    return {t, g, crack, ring:s('circle', {r:100, class:'impact'}, g)};
  });
  pops = SC.score.map(([t, team, pts, label, pos]) => {
    const d = document.createElement('div');
    d.className = 'pop ' + (pts < 0 ? 'neg' : team);
    d.style.left = clamp(pct(pos[0]), 8, 92) + '%'; d.style.top = clamp(pct(pos[1]), 4, 96) + '%';
    fx.appendChild(d); return {d, t, pts, label};
  });
  bans = SC.banners.map(([t0, t1, pos, text, cls]) => {
    const d = document.createElement('div');
    d.className = 'ban ' + cls;
    d.style.left = pct(pos[0]) + '%'; d.style.top = clamp(pct(pos[1]), 5, 95) + '%';
    fx.appendChild(d); return {d, t0, t1, px:pct(pos[0]), text};
  });
  fxText();
  segsEl.innerHTML = '';
  segBtns = SC.scenes.map(sc => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'seg';
    b.style.flexGrow = (sc.end - sc.t).toFixed(2);
    b.addEventListener('click', e => { if (e.detail === 0) seek(sc.t + .01); });
    segsEl.appendChild(b); return b;
  });
  tmarksEl.innerHTML = SC.tmk.map(([t, c]) => `<i class="tmk ${c}" style="left:${(t / SC.total * 100).toFixed(2)}%"></i>`).join('');
  for (const team of TEAMS) { ST[team].key = ''; ROB[team].held = ''; }
  zNext.k = -1; curScene = -1; popDirty = true; lastT = 0;
  playerLabels(); breakdown();
}
function fxText() {
  pops.forEach(p => { p.d.innerHTML = (p.pts > 0 ? '+' : '−') + Math.abs(p.pts) + (p.label ? `<small>${tx(p.label)}</small>` : ''); });
  bans.forEach(b => { b.d.textContent = tx(b.text); b.d.style.display = 'none'; });
}
function playerLabels() {
  segBtns.forEach((b, i) => { const ttl = tx(SC.scenes[i].title); b.title = ttl; b.setAttribute('aria-label', L(`シーン${i + 1}: `, `Scene ${i + 1}: `) + ttl); });
  $('bPrev').setAttribute('aria-label', L('前のシーン', 'Previous scene'));
  $('bNext').setAttribute('aria-label', L('次のシーン', 'Next scene'));
  $('bSpeed').setAttribute('aria-label', L('再生速度', 'Playback speed'));
  $('timeline').setAttribute('aria-label', L('シーンの選択', 'Choose a scene'));
  msvg.setAttribute('aria-label', L('フィールド上で赤と青のロボットが動く試合アニメーション：', 'Animation of Red and Blue robots playing a match on the field: ') + tx(SC.name));
}
function breakdown() {
  const cats = ['A', 'B', 'C', 'E', 'F'], parts = {}, gross = {};
  for (const team of TEAMS) {
    const p = parts[team] = {A:0, B:0, C:0, D:0, E:0, F:0};
    for (const [te, tt, pts, , , cat] of SC.score) if (tt === team && cat !== 'Q' && te <= SC.end) p[cat] += pts;
    gross[team] = cats.reduce((a, c) => a + Math.max(0, p[c]), 0);
  }
  const max = Math.max(gross.red, gross.blue, 1);
  $('exRows').innerHTML = TEAMS.map(team => {
    const p = parts[team], g = gross[team], out = !!SC.dq && SC.dq[0] === team;
    const segs = cats.filter(c => p[c] > 0).map(c => `<span class="${c.toLowerCase()}" style="flex:${p[c]}">${c}${p[c] >= 60 ? ' ' + p[c] : ''}</span>`).join('');
    const neg = p.D < 0 && g ? `<i class="neg" style="width:${(-p.D / g * 100).toFixed(1)}%">−${-p.D}</i>` : '';
    return `<div class="exrow"><span class="who ${team[0]}">${tx(TNM[team])}</span><div class="stack${out ? ' void' : ''}" style="width:${(g / max * 100).toFixed(1)}%">${segs}${neg}</div><span class="tot${SC.winner === team ? ' win' : ''}">${out ? 0 : g + p.D}${out ? `<small>${L('失格', 'DQ')}</small>` : ''}</span></div>`;
  }).join('');
  $('exName').textContent = `MATCH ${String(scnIdx + 1).padStart(2, '0')} · ${tx(SC.name)}`;
  $('exNote').textContent = tx(SC.note);
}
const fmt = sec => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
function sceneAt(t) { let i = 0; for (let k = 0; k < SC.scenes.length; k++) if (t >= SC.scenes[k].t) i = k; return i; }
function bump(team) { if (!RM && scoreEl[team].animate) scoreEl[team].animate([{transform:'scale(1.4)'}, {transform:'scale(1)'}], {duration:420, easing:'cubic-bezier(.2,1.5,.4,1)'}); }

function render(t) {
  const tm = Math.min(t, SC.end), occ = occAt(SC, tm);
  for (const team of TEAMS) {
    const R = ROB[team], P = SC.path[team];
    const [x, y] = pathAt(P, tm);
    R.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const a = armAt(SC.arm[team], tm);
    setArm(R, a ? a[0] : 0, a ? a[1] : 0);
    setHeld(R, sumUntil(SC.held[team], tm, 1), sumUntil(SC.held[team], tm, 2), sumUntil(SC.held[team], tm, 3));
    let op = 1, ring = -1;
    for (const [rt, t0, tOut, tIn] of SC.retry) if (rt === team) {
      if (tm >= tOut && tm < tIn) op = Math.max(0, 1 - (tm - tOut) / .4);
      else if (tm >= tIn && tm < tIn + .45) op = (tm - tIn) / .45;
      if (tm >= t0 && tm < tOut + .4) ring = (tm - t0) % .5 / .5;
    }
    const dq = SC.dq && SC.dq[0] === team ? SC.dq[1] : -1;
    if (dq >= 0 && tm >= dq && tm < dq + 1.2) ring = (tm - dq) % .5 / .5;
    R.g.setAttribute('opacity', op.toFixed(2));
    R.g.classList.toggle('dq', dq >= 0 && tm >= dq + .4);
    R.ring.setAttribute('opacity', ring >= 0 ? (1 - ring).toFixed(2) : 0);
    R.ring.setAttribute('r', ring >= 0 ? 60 + ring * 120 : 90);
    const sg = SC.signal.find(e => e[0] === team);
    const lampOn = !!sg && t >= sg[1] && (t >= SC.end || Math.floor((t - sg[1]) / .25) % 2 === 0);
    R.lamp.setAttribute('class', 'rb-lamp' + (lampOn ? ' on' : ''));
    let d = '';
    if (op > .05 && tm > 6 && tm < SC.end) {
      let px = null, py = 0;
      for (let i = 0; i <= 12; i++) {
        const [qx, qy] = pathAt(P, Math.max(6, tm - 1 + i / 12));
        d += (px === null || Math.hypot(qx - px, qy - py) > 600 ? 'M' : 'L') + qx.toFixed(0) + ' ' + qy.toFixed(0);
        px = qx; py = qy;
      }
    }
    TRAIL[team].setAttribute('d', d);
    TRAIL[team].style.opacity = (.2 * op).toFixed(2);
  }
  if (t < 6 || popDirty) {
    popDirty = t < 6;
    const popS = at => t >= at + .35 ? 1 : t < at ? 0 : Math.max(0, backOut((t - at) / .35));
    for (const team of TEAMS) {
      const off = team === 'blue' ? .05 : 0;
      MO.sak[team].forEach((b, i) => b.g.setAttribute('transform', `scale(${popS(.5 + i * .06 + off).toFixed(3)})`));
      MO.herb[team].forEach((b, i) => b.g.setAttribute('transform', `scale(${popS(1.7 + i * .09 + off).toFixed(3)})`));
      MO.weed[team].forEach((b, i) => b.outer.setAttribute('transform', `translate(${b.x} ${b.y}) scale(${popS(2.5 + i * .16 + off).toFixed(3)})`));
      const d = MO.dice[team];
      d.outer.setAttribute('transform', `translate(${d.x} ${d.y}) scale(${popS(3.6 + off).toFixed(3)})`);
    }
  }
  for (const team of TEAMS) {
    const removed = countUntil(SC.sakPick[team], tm) - countUntil(SC.sakRet[team], tm);
    MO.sakOrder.forEach((idx, rank) => { MO.sak[team][idx].outer.style.display = rank < removed ? 'none' : ''; });
    const hr = countUntil(SC.herbPick[team], tm) - countUntil(SC.herbRet[team], tm);
    MO.herb[team].forEach((b, i) => { b.outer.style.display = i < hr ? 'none' : ''; });
    const d = MO.dice[team], dz = SC.dice[team];
    d.set(faceAt(SC, team, tm));
    if (dz.f1 && tm > dz.f0 && tm < dz.f1) { const p = (tm - dz.f0) / (dz.f1 - dz.f0); d.g.setAttribute('transform', `rotate(${(easeIO(p) * 360).toFixed(1)}) scale(${(1 + .4 * Math.sin(Math.PI * p)).toFixed(3)})`); }
    else d.g.setAttribute('transform', '');
    MO.weed[team].forEach((w, i) => {
      const f = weedFall(SC, team, i, tm);
      w.stand.setAttribute('opacity', (1 - f).toFixed(2));
      w.lie.setAttribute('opacity', f.toFixed(2));
      w.lie.setAttribute('transform', `rotate(${(-30 + f * 150).toFixed(1)}) scale(${(.5 + .5 * f).toFixed(2)})`);
      const ev = SC.weedEv[team].find(e => e[0] === i);
      const hq = ev && tm >= ev[1] && tm < ev[1] + .6 ? (tm - ev[1]) / .6 : -1;
      w.hit.setAttribute('opacity', hq >= 0 ? (1 - hq).toFixed(2) : 0);
      w.hit.setAttribute('r', hq >= 0 ? 100 + hq * 380 : 100);
    });
  }
  for (let k = 1; k <= 12; k++) {
    const b = MO.zone[k];
    let e = null;
    for (const z of SC.zev) if (z[1] === k && z[0] <= tm) e = z;
    const age = e ? tm - e[0] : 0;
    if (!e || (!e[2] && age >= .4)) { b.outer.style.display = 'none'; continue; }
    b.outer.style.display = '';
    if (e[2]) {
      if (b.team !== e[2]) { b.team = e[2]; b.g.lastChild.setAttribute('class', 'cap c-' + e[2]); }
      const p = clamp(age / .35, 0, 1);
      b.g.setAttribute('transform', `scale(${(1.7 - .7 * easeOut(p)).toFixed(3)})`);
      b.g.setAttribute('opacity', p.toFixed(2));
    } else {
      const p = age / .4;
      b.g.setAttribute('transform', `translate(${((e[3] === 'blue' ? 320 : -320) * easeOut(p)).toFixed(0)} 0) scale(${(1 + .3 * p).toFixed(3)})`);
      b.g.setAttribute('opacity', (1 - p).toFixed(2));
    }
  }
  ripples.forEach(r => {
    const age = tm - r.t;
    if (age < 0 || age > .7) { r.el.style.display = 'none'; return; }
    const p = age / .7;
    r.el.style.display = '';
    r.el.setAttribute('r', (140 + 380 * easeOut(p)).toFixed(0));
    r.el.setAttribute('opacity', (1 - p).toFixed(2));
  });
  let nk = 0;
  if (tm >= 6 && tm < SC.end) for (let k = 1; k <= 12; k++) if (!occ[k]) { nk = k; break; }
  if (nk !== zNext.k) {
    zNext.k = nk;
    zNext.style.display = nk ? '' : 'none';
    if (nk) { const y0 = Math.max(0, RUNG(nk)); zNext.setAttribute('y', y0 + 34); zNext.setAttribute('height', RUNG(nk - 1) - y0 - 68); }
  }
  SC.throws.forEach(([t0, t1, target, wi, fx0, fy0], i) => {
    const o = thrown[i];
    if (tm < t0) { o.g.style.display = 'none'; return; }
    o.g.style.display = '';
    const w = MO.weed[target][wi];
    const tx2 = w.x + (target === 'red' ? -40 : 40), ty = w.y + 210;
    if (tm < t1) {
      const p = (tm - t0) / (t1 - t0);
      const gx = fx0 + (tx2 - fx0) * p, gy = fy0 + (ty - fy0) * p, h = 1100 * Math.sin(Math.PI * p);
      o.sh.setAttribute('cx', gx); o.sh.setAttribute('cy', gy); o.sh.style.display = '';
      o.fly.style.display = ''; o.lie.style.display = 'none';
      o.fly.setAttribute('transform', `translate(${gx.toFixed(1)} ${(gy - h).toFixed(1)}) scale(${(1 + h / 1400).toFixed(3)}) rotate(${(p * 540).toFixed(0)})`);
    } else {
      o.sh.style.display = 'none'; o.fly.style.display = 'none'; o.lie.style.display = '';
      o.lie.setAttribute('transform', `translate(${tx2} ${ty}) rotate(${(target === 'red' ? 160 : 20) + (i % 2) * 40})`);
    }
  });
  let shake = 0;
  impacts.forEach(o => {
    const age = tm - o.t;
    o.g.style.display = age < 0 ? 'none' : '';
    if (age < 0) return;
    const p = clamp(age / .6, 0, 1);
    o.ring.setAttribute('r', (100 + 520 * easeOut(p)).toFixed(0));
    o.ring.setAttribute('opacity', (1 - p).toFixed(2));
    o.crack.setAttribute('transform', `scale(${(.4 + .6 * easeOut(clamp(age / .25, 0, 1))).toFixed(3)})`);
    if (age < .45) shake = 1 - age / .45;
  });
  msvg.style.transform = shake > 0 && !RM ? `translate(${(Math.sin(tm * 90) * 7 * shake).toFixed(1)}px,${(Math.cos(tm * 70) * 5 * shake).toFixed(1)}px)` : '';
  const sIdx = sceneAt(t), bloom = SC.ending === 'declare';
  PET.forEach(pt => {
    const age = bloom ? t - (SC.end + pt.d) : -1;
    if (age < 0) { if (pt.el.style.display !== 'none') pt.el.style.display = 'none'; return; }
    const y = -300 + age * pt.v;
    if (y > 7300) { pt.el.style.display = 'none'; return; }
    pt.el.style.display = '';
    const x = pt.x0 + Math.sin(age * pt.w + pt.ph) * pt.sw;
    pt.el.setAttribute('transform', `translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${(age * pt.rs + pt.ph * 60).toFixed(0)}) scale(${pt.sc.toFixed(2)})`);
  });
  pops.forEach(p => {
    const age = t - p.t;
    if (age < 0 || age > 1.6) { p.d.style.display = 'none'; return; }
    p.d.style.display = 'block';
    p.d.style.opacity = age < .15 ? age / .15 : age > 1.2 ? (1.6 - age) / .4 : 1;
    p.d.style.transform = `translate(-50%, calc(-50% - ${(easeOut(Math.min(age / 1.2, 1)) * 22).toFixed(1)}px))`;
  });
  bans.forEach(b => {
    if (t < b.t0 || t > b.t1) { b.d.style.display = 'none'; return; }
    if (b.d.style.display !== 'block') { b.d.style.display = 'block'; const sw = fx.clientWidth, bw = b.d.offsetWidth; b.d.style.left = clamp(b.px / 100 * sw, bw / 2 + 6, sw - bw / 2 - 6) + 'px'; }
    const age = t - b.t0, rem = b.t1 - t;
    b.d.style.opacity = Math.min(1, age / .2, rem / .2);
    const sc = age < .3 ? .7 + .3 * backOut(age / .3) : 1;
    b.d.style.transform = `translate(-50%,-50%) scale(${sc.toFixed(3)})`;
  });
  for (const team of TEAMS) {
    let sc = 0;
    for (const [te, tt, pts] of SC.score) if (tt === team && te <= t) sc += pts * clamp((t - te) / .35, 0, 1);
    scoreEl[team].textContent = Math.round(sc);
  }
  if (t > lastT && t - lastT < .5) for (const [te, tt] of SC.score) if (te > lastT && te <= t) bump(tt);
  lastT = t;
  $('tmR').classList.toggle('won', t >= SC.end && SC.winner === 'red');
  $('tmB').classList.toggle('won', t >= SC.end && SC.winner === 'blue');
  if (t < 6) { $('clockLabel').textContent = 'SETTING'; $('clock').textContent = fmt(60 - t * 10); }
  else { $('clockLabel').textContent = t >= SC.end ? 'FINISH' : 'REMAIN'; $('clock').textContent = fmt(180 - lerpMap(SC.clk, t)); }
  for (const team of TEAMS) {
    const S2 = ST[team], hs = SC.held[team];
    const face = faceAt(SC, team, tm), sk = sumUntil(hs, tm, 1), hb = sumUntil(hs, tm, 2), op = sumUntil(hs, tm, 3), n = sk + hb + op, z = occ.filter(v => v === team).length;
    const lock = isLocked(SC, team, tm), retry = SC.retry.some(e => e[0] === team && tm >= e[1] && tm < e[4]);
    const full = occ[12] === team, out = !!SC.dq && SC.dq[0] === team && tm >= SC.dq[1], decl = t >= SC.end && SC.ending === 'declare' && SC.winner === team;
    const key = [LANG, face, sk, hb, op, z, lock, retry, full, out, decl].join('|');
    if (key === S2.key) continue; S2.key = key;
    S2.lab1.innerHTML = L(`持てる <b class="num">${face}</b>本`, `Hold <b class="num">${face}</b>`);
    S2.lab2.textContent = L('共通ゾーン', 'Zones');
    S2.slots.forEach((el, i) => { el.style.display = i < Math.max(face, n) ? '' : 'none'; el.className = 'slot' + (i >= n ? '' : i >= face ? ' x' : i < sk ? ' s' : i < sk + hb ? ' h' : ' o'); });
    S2.pips.forEach((el, i) => el.classList.toggle('on', i < z));
    S2.cnt.textContent = z + '/5';
    let bh = '';
    if (full) bh += `<span class="badge full">${L('満開', 'Full Bloom')}</span>`;
    else if (z >= 5) bh += `<span class="badge go">${L('五分咲き', 'Half Bloom')}</span>`;
    if (lock) bh += `<span class="badge lock">${L('配置不可', "Can't place")}</span>`;
    if (retry) bh += `<span class="badge retry">${L('リトライ中', 'Retrying')}</span>`;
    if (out) bh += `<span class="badge dq">${L('失格', 'Disqualified')}</span>`;
    if (decl) bh += `<span class="badge full">${L('満開宣言', 'Declared')}</span>`;
    S2.badges.innerHTML = bh || '<span class="hint">—</span>';
  }
  $('head').style.left = (t / SC.total * 100) + '%';
  if (sIdx !== curScene) {
    curScene = sIdx;
    const sc = SC.scenes[sIdx], n2 = String(SC.scenes.length).padStart(2, '0');
    $('capNum').textContent = `SCENE ${String(sIdx + 1).padStart(2, '0')} / ${n2}`;
    $('capTitle').textContent = tx(sc.title);
    $('capBody').textContent = tx(sc.body);
    $('capRefs').innerHTML = sc.refs.map(r => `<span class="ref">${L('ルール ', 'Rule ')}${tx(r)}</span>`).join('');
    $('sceneIx').textContent = `${String(sIdx + 1).padStart(2, '0')} / ${n2}`;
    segBtns.forEach((b, i) => { b.classList.toggle('done', i < sIdx); b.classList.toggle('cur', i === sIdx); });
    for (const key in focusEls) focusEls[key].forEach(r => r.classList.toggle('on', sc.focus.includes(key)));
  }
}
function setPlayIcon() {
  $('playIco').innerHTML = playing ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M7 4.5v15l13-7.5z"/>';
  $('bPlay').setAttribute('aria-label', playing ? L('一時停止', 'Pause') : L('再生', 'Play'));
  $('bigplay').hidden = playing || everPlayed;
}
function loop(now) {
  if (!playing) return;
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  T += dt * speed;
  if (T >= SC.total) { T = SC.total; playing = false; setPlayIcon(); }
  render(T);
  if (playing) requestAnimationFrame(loop);
}
function play() { if (T >= SC.total - .05) { T = 0; popDirty = true; lastT = 0; } playing = true; everPlayed = true; last = performance.now(); setPlayIcon(); requestAnimationFrame(loop); }
function pause() { playing = false; setPlayIcon(); }
function seek(t) { T = clamp(t, 0, SC.total); popDirty = true; lastT = T; render(T); }
$('bPlay').addEventListener('click', () => playing ? pause() : play());
$('bigplay').addEventListener('click', play);
$('bNext').addEventListener('click', () => { const i = sceneAt(T); seek(i < SC.scenes.length - 1 ? SC.scenes[i + 1].t + .01 : SC.total); });
$('bPrev').addEventListener('click', () => { const i = sceneAt(T); seek(T - SC.scenes[i].t > 1.2 || i === 0 ? SC.scenes[i].t + .01 : SC.scenes[i - 1].t + .01); });
const speeds = [1, 2, .5];
$('bSpeed').addEventListener('click', () => { speed = speeds[(speeds.indexOf(speed) + 1) % speeds.length]; $('bSpeed').textContent = speed + '×'; });
const tl = $('timeline'); let drag = false, moved = false, sx = 0;
const tlPos = e => { const r = tl.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1) * SC.total; };
tl.addEventListener('pointerdown', e => { drag = true; moved = false; sx = e.clientX; try { tl.setPointerCapture(e.pointerId); } catch (_) {} });
tl.addEventListener('pointermove', e => { if (!drag) return; if (Math.abs(e.clientX - sx) > 6) moved = true; if (moved) seek(tlPos(e)); });
tl.addEventListener('pointerup', e => { if (drag && !moved) seek(SC.scenes[sceneAt(tlPos(e))].t + .01); drag = false; });
tl.addEventListener('pointercancel', () => { drag = false; });
window.addEventListener('resize', () => { bans.forEach(b => { b.d.style.display = 'none'; }); render(T); });
const pickEl = $('scnPick');
const pickBtns = SCENARIOS.map((sc, i) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'scn-b';
  b.addEventListener('click', () => selectScenario(i, true));
  pickEl.appendChild(b); return b;
});
function pickLabels() {
  pickBtns.forEach((b, i) => {
    const sc = SCENARIOS[i];
    b.innerHTML = `<span class="scn-n">MATCH ${String(i + 1).padStart(2, '0')}</span><span class="scn-t">${tx(sc.name)}</span><span class="scn-s">${tx(sc.sub)}</span><span class="scn-r ${sc.winner}">${tx(sc.tag)}</span>`;
    b.setAttribute('aria-pressed', String(i === scnIdx));
  });
  pickEl.setAttribute('aria-label', L('試合の展開', 'Matches'));
  $('scnCount').textContent = `${String(scnIdx + 1).padStart(2, '0')} / ${String(SCENARIOS.length).padStart(2, '0')}`;
}
function selectScenario(i, go) {
  pause(); scnIdx = i; loadScenario(i); T = 0; render(0); pickLabels();
  const b = pickBtns[i];
  if (pickEl.scrollWidth > pickEl.clientWidth) pickEl.scrollTo({left:b.offsetLeft - pickEl.offsetLeft - 16, behavior:RM ? 'auto' : 'smooth'});
  if (go) { play(); try { history.replaceState(null, '', '#match-' + (i + 1)); } catch (_) {} }
}
// Links such as index.html#match-2 open that match.
function matchFromHash() {
  const m = /^#match-(\d+)$/.exec(location.hash), i = m ? +m[1] - 1 : -1;
  if (i < 0 || i >= SCENARIOS.length) return false;
  if (i !== scnIdx || !SC) selectScenario(i, false);
  $('match').scrollIntoView();
  return true;
}
if (!matchFromHash()) selectScenario(0, false);
window.addEventListener('hashchange', matchFromHash);
langHooks.push(() => { fxText(); playerLabels(); pickLabels(); breakdown(); setPlayIcon(); curScene = -1; render(T); });
if (!RM && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting && !everPlayed) { play(); io.disconnect(); } }); }, {threshold:.55});
  io.observe($('stage'));
}
if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting && playing) pause(); }), {threshold:0}).observe($('stage'));
