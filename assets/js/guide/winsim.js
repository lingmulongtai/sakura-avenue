import {L, tx, langHooks} from '../core/i18n.js';
import {$} from '../core/util.js';

/* ================= WIN SIM ================= */
const lane = $('lane');
const zcells = [];
for (let k = 1; k <= 12; k++) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'zc' + (k === 12 ? ' twelve' : '');
  b.innerHTML = `<span class="zn">${k}</span><span class="bot"></span>`;
  b.addEventListener('click', () => simRemove(k));
  lane.appendChild(b); zcells[k] = b;
}
const simTeams = $('simTeams');
const TN = {red:['赤','Red'], blue:['青','Blue']};
const tn = team => tx(TN[team]);
const SIMUI = {};
for (const team of ['red', 'blue']) {
  const d = document.createElement('div'); d.className = 'simt ' + team;
  d.innerHTML = `<h4><span class="nm"></span><span class="bdg"></span></h4><button class="put" type="button"></button><div><div class="meter">${'<i></i>'.repeat(5)}</div><p class="sc"></p></div><label class="switch"><input type="checkbox" id="weed-${team}"><span class="swl"></span></label>`;
  simTeams.appendChild(d);
  SIMUI[team] = {nm:d.querySelector('.nm'), put:d.querySelector('.put'), meter:[...d.querySelectorAll('.meter i')], sc:d.querySelector('.sc'), bdg:d.querySelector('.bdg'), sw:d.querySelector('input'), swl:d.querySelector('.swl')};
  SIMUI[team].put.addEventListener('click', () => simPlace(team));
  SIMUI[team].sw.addEventListener('change', e => {
    sim.lock[team] = e.target.checked;
    simMsg(e.target.checked
      ? () => L(`${tn(team)}の雑草ボトルが倒れた。${tn(team)}は立て直す（リトライなど）まで共通ゾーンに置けません。倒れた1本につき−15点。`, `${tn(team)}'s Weed bottle is down. ${tn(team)} can't place in the Common Zones until it's stood back up (e.g. with a retry). −15 per fallen bottle.`)
      : () => L(`${tn(team)}の雑草ボトルが元どおり。また置けます。`, `${tn(team)}'s weeds are back up. ${tn(team)} can place again.`), e.target.checked ? 'ng' : '');
    simDraw();
  });
}
const sim = {z:[], lock:{red:false, blue:false}, win:null};
let simLast = null;
const opp = t => t === 'red' ? 'blue' : 'red';
const own = team => sim.z.filter(x => x === team).length;
const nextEmpty = () => { for (let k = 1; k <= 12; k++) if (!sim.z[k]) return k; return 0; };
function simMsg(fn, cls) { simLast = {fn, cls}; const m = $('simMsg'); m.textContent = fn(); m.className = 'sim-msg' + (cls ? ' ' + cls : ''); }
function simDraw() {
  const nx = sim.win ? 0 : nextEmpty();
  for (let k = 1; k <= 12; k++) {
    zcells[k].className = 'zc' + (k === 12 ? ' twelve' : '') + (sim.z[k] ? ' ' + sim.z[k] : '') + (k === nx ? ' next' : '');
    zcells[k].setAttribute('aria-label', L(`共通ゾーン${k}`, `Common Zone ${k}`) + (sim.z[k] ? ' · ' + tn(sim.z[k]) : ''));
  }
  for (const team of ['red', 'blue']) {
    const n = own(team), U = SIMUI[team];
    U.nm.textContent = tn(team);
    U.put.textContent = L(`${tn(team)}が置く`, `${tn(team)} places`);
    U.swl.textContent = L('雑草ボトルが倒れている', 'Weed bottle knocked over');
    U.meter.forEach((el, i) => el.classList.toggle('on', i < n));
    U.sc.innerHTML = L(`自分の色 <b>${n}</b> ゾーン<br>C点 <b>${n * 30}</b>`, `Own zones <b>${n}</b><br>C points <b>${n * 30}</b>`);
    U.bdg.innerHTML = (sim.win === team ? `<span class="badge full">${L('満開', 'Full Bloom')}</span>` : n >= 5 ? `<span class="badge go">${L('五分咲き', 'Half Bloom')}</span>` : '') + (sim.lock[team] ? `<span class="badge lock">${L('配置不可', "Can't place")}</span>` : '');
    U.sw.checked = sim.lock[team];
  }
}
function shake(k) { const c = zcells[k]; if (!c) return; c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }
function simPlace(team) {
  if (sim.win) { simMsg(() => L('もう満開です。「例の状態に戻す」か「空にする」でやり直せます。', 'Already in Full Bloom. Use "Load example" or "Clear" to start again.')); return; }
  const k = nextEmpty();
  if (sim.lock[team]) { simMsg(() => L(`置けません。${tn(team)}の雑草ボトルが倒れているあいだは、共通ゾーンに桜ボトルを置けません。`, `Can't place. While ${tn(team)}'s Weed bottle is down, ${tn(team)} can't put Sakura bottles in the Common Zones.`), 'ng'); shake(k); return; }
  if (!k) { simMsg(() => L('12個すべて埋まっています。', 'All 12 zones are filled.')); return; }
  if (k === 12 && own(team) < 5) { const n = own(team); simMsg(() => L(`12番は「五分咲き」になってから。${tn(team)}はいま${n}ゾーンなので、あと${5 - n}ゾーン必要です（相手のボトルをどけて自分の色に置き換える手もあります）。`, `Zone 12 needs Half Bloom first. ${tn(team)} has ${n} zones, so ${5 - n} more are needed (you could also remove an opponent's bottle and replace it with yours).`), 'ng'); shake(12); return; }
  const before = own(team);
  sim.z[k] = team;
  if (k === 12) { sim.win = team; simMsg(() => L(`${tn(team)}が12番に置いて満開（+180）！ ロボットが合図して審判が確認すれば満開宣言、その場で${tn(team)}の勝ちです。`, `${tn(team)} places in zone 12: Full Bloom (+180)! Once the robot signals and the referee confirms, that's the Full Bloom Declaration and ${tn(team)} wins on the spot.`), 'win'); }
  else if (before < 5 && own(team) >= 5) simMsg(() => L(`${tn(team)}が${k}番に置いた（+30）。自分の色が5ゾーンで五分咲き（+90）！ これで12番に置く資格ができました。`, `${tn(team)} places in zone ${k} (+30). Five zones in its color means Half Bloom (+90)! ${tn(team)} may now place in zone 12.`));
  else simMsg(() => L(`${tn(team)}が${k}番に置いた（+30）。次に置けるのは${k + 1}番。`, `${tn(team)} places in zone ${k} (+30). Next open zone: ${k + 1}.`));
  simDraw();
}
function simRemove(k) {
  if (sim.win) { simMsg(() => L('もう満開です。リセットして試してください。', 'Already in Full Bloom. Reset to try again.')); return; }
  const t = sim.z[k];
  if (!t) {
    const nx = nextEmpty();
    simMsg(k === nx ? () => L(`${k}番はいま置ける場所です。上のボタンで置いてみましょう。`, `Zone ${k} is open now. Use the buttons to place a bottle.`) : () => L(`${k}番はまだ置けません。先に${nx}番を埋める必要があります。`, `Zone ${k} isn't open yet. Zone ${nx} has to be filled first.`));
    if (k !== nx) shake(k); return;
  }
  sim.z[k] = null;
  simMsg(() => L(`${tn(opp(t))}が${k}番の${tn(t)}の桜ボトルをどけた。${k}番が空いたので、次はまた${k}番から。それより上のボトルはそのまま残ります。`, `${tn(opp(t))} removed ${tn(t)}'s Sakura bottle from zone ${k}. Zone ${k} is empty again, so the next placement goes there. Bottles above it stay put.`));
  simDraw();
}
function simExample() { sim.z = []; [[1,'red'],[2,'red'],[3,'blue'],[4,'red'],[5,'blue'],[6,'red']].forEach(([k, t]) => sim.z[k] = t); sim.lock = {red:false, blue:false}; sim.win = null; simMsg(() => L('例：赤4ゾーン・青2ゾーン。次に置けるのは7番だけ。赤があと1つ置けば五分咲きです。', 'Example: Red has 4 zones and Blue has 2. Only zone 7 is open. One more for Red means Half Bloom.')); simDraw(); }
$('simEx').addEventListener('click', simExample);
$('simClear').addEventListener('click', () => { sim.z = []; sim.lock = {red:false, blue:false}; sim.win = null; simMsg(() => L('空にしました。1番はいつでも置けます。', 'Cleared. Zone 1 is always open.')); simDraw(); });
simExample();
langHooks.push(() => { simDraw(); if (simLast) simMsg(simLast.fn, simLast.cls); });
