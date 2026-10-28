// Score calculator: the end-of-match state in, the breakdown and the Rule 3.8 decision out.
import {L, tx, langHooks} from '../core/i18n.js';
import {$} from '../core/util.js';
import {TEAMS, TNM, other} from '../match/timeline.js';
import {SCENARIOS} from '../match/scenarios/index.js';

const PTS = {A:10, B:20, C:30, D:-15, E:90, F:180};
const ROWS = [
  ['A', 'check', ['エリア2に進入した', 'Entered Area 2'], ['初めての進入で +10', '+10 for the first entry']],
  ['B', 'check', ['サイコロの目を変えた', 'Changed the dice face'], ['初めて変えたとき +20', '+20 the first time']],
  ['C', 'count', ['共通ゾーンの桜ボトル', 'Sakura bottles in Common Zones'], ['完全に接地している1本につき +30', '+30 each, fully grounded'], 12],
  ['D', 'count', ['倒れた・ゾーン外の雑草ボトル', 'Weed bottles down or out of the zone'], ['1本につき −15', '−15 each'], 3],
  ['E', 'check', ['五分咲きを達成した', 'Reached Half Bloom'], ['自分の色が5ゾーン以上 +90', '5 or more zones in your color: +90']],
  ['F', 'check', ['満開を達成した', 'Reached Full Bloom'], ['五分咲きで12番に置く +180', 'Zone 12 while in Half Bloom: +180']]
];
const blank = () => ({A:false, B:false, C:0, D:0, E:false, F:false, dq:false});
let st = {red:blank(), blue:blank(), decl:'', firstPlace:'', firstScore:''}, preset = -1;

function fromMatch(sc) {
  const s = {red:blank(), blue:blank(), decl:sc.ending === 'declare' ? sc.winner : '', firstPlace:'', firstScore:''};
  for (const [te, tm, pts, , , cat] of sc.score) {
    if (te > sc.end || cat === 'Q') continue;
    if (cat === 'C') s[tm].C += pts / 30; else if (cat === 'D') s[tm].D -= pts / 15; else s[tm][cat] = true;
  }
  if (sc.dq) s[sc.dq[0]].dq = true;
  const fp = [...sc.place].sort((a, b) => a[0] - b[0])[0], fs = sc.score.filter(e => e[2] > 0).sort((a, b) => a[0] - b[0])[0];
  s.firstPlace = fp ? fp[2] : ''; s.firstScore = fs ? fs[1] : '';
  return s;
}
// Keep the inputs consistent: 5+ bottles means Half Bloom was reached, Full Bloom needs Half Bloom, a declaration needs Full Bloom.
function normalize(changed) {
  for (const team of TEAMS) if (changed === team + 'E' && !st[team].E) { st[team].F = false; if (st.decl === team) st.decl = ''; }
  if (st.decl) st[st.decl].F = true;
  for (const team of TEAMS) if (st[team].F || st[team].C >= 5) st[team].E = true;
}
const parts = team => { const t = st[team]; return {A:t.A ? 10 : 0, B:t.B ? 20 : 0, C:t.C * 30, D:t.D * -15, E:t.E ? 90 : 0, F:t.F ? 180 : 0}; };
const total = team => { const p = parts(team); return st[team].dq ? 0 : p.A + p.B + p.C + p.D + p.E + p.F; };

function decide() {
  const r = total('red'), b = total('blue'), nm = team => tx(TNM[team]);
  const rungs = [
    {t:['失格（6.1）', 'Disqualification (6.1)']},
    {t:['先に満開宣言したチーム', 'First to declare Full Bloom']},
    {t:['合計得点が高いチーム', 'Higher total score']},
    {t:['先に桜ボトルを共通ゾーンに配置したチーム', 'First to place a Sakura bottle in a Common Zone']},
    {t:['先に初めての得点を獲得したチーム', 'First to score any points']},
    {t:['審判による決定', "Referee's decision"]}
  ];
  const dqR = st.red.dq, dqB = st.blue.dq;
  let hit = 5, winner = '';
  if (dqR !== dqB) { hit = 0; winner = dqR ? 'blue' : 'red'; rungs[0].why = L(`${nm(other(winner))}が失格`, `${nm(other(winner))} is disqualified`); }
  else {
    rungs[0].why = dqR ? L('両チーム失格：ルールに定めがないので審判の判断', 'Both disqualified: not covered by the rules, so the referee decides') : L('失格なし', 'No disqualification');
    if (!dqR) {
      if (st.decl) { hit = 1; winner = st.decl; rungs[1].why = L(`${nm(winner)}が満開宣言`, `${nm(winner)} declared`); }
      else {
        rungs[1].why = L('どちらも満開宣言なし', 'Neither team declared');
        if (r !== b) { hit = 2; winner = r > b ? 'red' : 'blue'; rungs[2].why = `${r} – ${b}`; }
        else {
          rungs[2].why = L(`${r} – ${b} の同点`, `Tied ${r} – ${b}`);
          if (st.firstPlace) { hit = 3; winner = st.firstPlace; rungs[3].why = L(`${nm(winner)}が先`, `${nm(winner)} was first`); }
          else {
            rungs[3].why = L('右下で選んでください（どちらも置いていなければ「なし」）', 'Choose below ("none" if neither placed)');
            if (st.firstScore) { hit = 4; winner = st.firstScore; rungs[4].why = L(`${nm(winner)}が先`, `${nm(winner)} was first`); }
            else rungs[4].why = L('右下で選んでください', 'Choose below');
          }
        }
      }
    }
  }
  if (hit === 5 && !rungs[5].why) rungs[5].why = L('ここまでで決まらないときは審判が決めます', 'If nothing above settles it, the referee decides');
  return {r, b, hit, winner, rungs};
}

function renderTeams() {
  $('calcTeams').innerHTML = TEAMS.map(team => `<section class="calc-team card ${team}" aria-label="${tx(TNM[team])}">
    <h2><span>${tx(TNM[team])}</span><span class="num" id="tot-${team}"></span></h2>
    ${ROWS.map(([k, type, label, hint, max]) => `<div class="crow${k === 'D' ? ' neg' : ''}" id="row-${team}-${k}"><span class="ck">${k}</span><span class="lb">${tx(label)}<small>${tx(hint)}</small></span>${type === 'check'
      ? `<label class="switch"><input type="checkbox" data-team="${team}" data-k="${k}" aria-label="${tx(TNM[team])}: ${tx(label)}"></label>`
      : `<span class="step"><button type="button" data-team="${team}" data-k="${k}" data-d="-1" aria-label="${tx(TNM[team])}: ${tx(label)} −1">−</button><output id="out-${team}-${k}">0</output><button type="button" data-team="${team}" data-k="${k}" data-d="1" data-max="${max}" aria-label="${tx(TNM[team])}: ${tx(label)} +1">＋</button></span>`}</div>`).join('')}
    <div class="crow dq" id="row-${team}-dq"><span class="ck">!</span><span class="lb">${L('失格した', 'Disqualified')}<small>${L('得点0点・相手の勝ち', 'Scores 0, opponent wins')}</small></span><label class="switch"><input type="checkbox" data-team="${team}" data-k="dq" aria-label="${tx(TNM[team])}: ${L('失格', 'disqualified')}"></label></div>
  </section>`).join('');
}
function seg(key, label, hint) {
  const opt = [['', L('なし', 'None')], ['red', tx(TNM.red)], ['blue', tx(TNM.blue)]];
  return `<div class="orow"><span class="lb">${label}${hint ? `<small>${hint}</small>` : ''}</span><div class="seg3" role="group" aria-label="${label}">${opt.map(([v, t]) => `<button type="button" class="${v}" data-o="${key}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
}
function renderOrder() {
  $('calcOrder').innerHTML = `<h3>${L('どちらが先？', 'Who was first?')}</h3>`
    + seg('decl', L('満開宣言', 'Full Bloom Declaration'), L('先に宣言したチーム', 'the team that declared first'))
    + seg('firstPlace', L('共通ゾーンへの初めての配置', 'First Sakura bottle in a Common Zone'), L('同点のとき', 'used on a tie'))
    + seg('firstScore', L('初めての得点', 'First points scored'), L('それでも決まらないとき', 'if still tied'));
}
function renderPresets() {
  $('calcPresets').innerHTML = SCENARIOS.map((sc, i) => `<button type="button" class="chip" data-p="${i}" aria-pressed="${i === preset}">${String(i + 1).padStart(2, '0')} ${tx(sc.name)}</button>`).join('')
    + `<button type="button" class="chip" data-p="clear">${L('クリア', 'Clear')}</button>`;
}
function update() {
  for (const team of TEAMS) {
    const t = st[team];
    for (const [k, type] of ROWS) {
      const row = $(`row-${team}-${k}`);
      if (type === 'check') { const inp = row.querySelector('input'); inp.checked = t[k]; inp.disabled = (k === 'E' && t.C >= 5) || (k === 'F' && st.decl === team); }
      else $(`out-${team}-${k}`).textContent = t[k];
      row.classList.toggle('on', type === 'check' ? t[k] : t[k] > 0);
    }
    const dq = $(`row-${team}-dq`); dq.querySelector('input').checked = t.dq; dq.classList.toggle('on', t.dq);
    $(`tot-${team}`).textContent = total(team);
  }
  document.querySelectorAll('#calcOrder [data-o]').forEach(b => b.setAttribute('aria-pressed', String(st[b.dataset.o] === b.dataset.v)));
  document.querySelectorAll('#calcPresets [data-p]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.p === preset)));
  const d = decide(), g = {red:0, blue:0};
  for (const team of TEAMS) { const p = parts(team); g[team] = ['A', 'B', 'C', 'E', 'F'].reduce((a, k) => a + p[k], 0); }
  const max = Math.max(g.red, g.blue, 1);
  const bars = TEAMS.map(team => {
    const p = parts(team), out = st[team].dq;
    const segs = ['A', 'B', 'C', 'E', 'F'].filter(k => p[k] > 0).map(k => `<span class="${k.toLowerCase()}" style="flex:${p[k]}">${k}${p[k] >= 60 ? ' ' + p[k] : ''}</span>`).join('');
    const neg = p.D < 0 && g[team] ? `<i class="neg" style="width:${Math.min(100, -p.D / g[team] * 100).toFixed(1)}%">−${-p.D}</i>` : '';
    return `<div class="exrow"><span class="who ${team[0]}">${tx(TNM[team])}</span><div class="stack${out ? ' void' : ''}" style="width:${(g[team] / max * 100).toFixed(1)}%">${segs}${neg}</div><span class="tot${d.winner === team ? ' win' : ''}">${total(team)}${out ? `<small>${L('失格', 'DQ')}</small>` : ''}</span></div>`;
  }).join('');
  const warn = [];
  if (st.red.C + st.blue.C > 12) warn.push(L('共通ゾーンは12個なので、桜ボトルは2チーム合わせて12本までです。', 'There are only 12 Common Zones, so the two teams can have at most 12 Sakura bottles there.'));
  if (st.red.F && st.blue.F) warn.push(L('12番に置ける桜ボトルは1本です。両チームの満開は、予選リーグで先の宣言のあとも競技が続く場合などに限られます。', 'Zone 12 holds one bottle, so both teams reaching Full Bloom only happens in cases like the preliminary league, where play continues after the first declaration.'));
  for (const team of TEAMS) if (st[team].F && st[team].C < 1) warn.push(L(`${tx(TNM[team])}：満開なら12番の桜ボトルがCにも数えられるはずです。`, `${tx(TNM[team])}: with Full Bloom, the bottle in zone 12 should also count toward C.`));
  $('calcResult').innerHTML = `<h3>${L('結果', 'Result')}</h3>
    <p class="verdict-big">${d.winner ? `<span class="wchip ${d.winner}">${tx(TNM[d.winner])}</span>${L('の勝ち', ' wins')}` : `<span class="wchip none">${L('審判の判断', "Referee's call")}</span>`}</p>
    <p class="verdict-why">${d.hit < 5 ? L(`決め手：${tx(d.rungs[d.hit].t)}`, `Decided by: ${tx(d.rungs[d.hit].t)}`) : L('ルール3.8の1〜4で決まりませんでした。', 'Rule 3.8 steps 1–4 do not settle it.')}</p>
    ${bars}
    <ol class="ladder">${d.rungs.map((rg, i) => `<li class="${i === d.hit ? 'hit' : i > d.hit ? 'later' : ''}"><span class="n">${i ? i : '!'}</span><span><b>${tx(rg.t)}</b>${rg.why && i <= d.hit ? `<small>${rg.why}</small>` : ''}</span></li>`).join('')}</ol>
    <div class="calc-warn">${warn.join('<br>')}</div>`;
}

$('calcTeams').addEventListener('change', e => {
  const {team, k} = e.target.dataset;
  if (!team) return;
  st[team][k] = e.target.checked; preset = -1;
  normalize(team + k); update();
});
$('calcTeams').addEventListener('click', e => {
  const b = e.target.closest('button[data-d]');
  if (!b) return;
  const {team, k} = b.dataset, max = k === 'C' ? 12 : 3;
  st[team][k] = Math.max(0, Math.min(max, st[team][k] + +b.dataset.d)); preset = -1;
  normalize(team + k); update();
});
$('calcOrder').addEventListener('click', e => {
  const b = e.target.closest('button[data-o]');
  if (!b) return;
  st[b.dataset.o] = b.dataset.v; preset = -1;
  normalize(b.dataset.o); update();
});
$('calcPresets').addEventListener('click', e => {
  const b = e.target.closest('button[data-p]');
  if (!b) return;
  if (b.dataset.p === 'clear') { st = {red:blank(), blue:blank(), decl:'', firstPlace:'', firstScore:''}; preset = -1; }
  else { preset = +b.dataset.p; st = fromMatch(SCENARIOS[preset]); }
  update();
});
function renderAll() { renderPresets(); renderTeams(); renderOrder(); update(); }
preset = 0; st = fromMatch(SCENARIOS[0]);
renderAll();
langHooks.push(renderAll);
