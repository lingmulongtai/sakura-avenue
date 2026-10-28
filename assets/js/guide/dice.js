import {L, langHooks} from '../core/i18n.js';
import {$, RM, s} from '../core/util.js';
import {FACES} from '../core/field.js';

/* ================= DICE ================= */
const dpips = $('dpips');
const DP = {TL:[30,30],TR:[70,30],ML:[30,50],MR:[70,50],BL:[30,70],BR:[70,70],C:[50,50]};
let face = 1, hold = 1, rollState = 0;
function drawDice() { dpips.innerHTML = FACES[face].map(k => `<circle cx="${DP[k][0]}" cy="${DP[k][1]}" r="8"/>`).join(''); }
function drawNote() {
  const f = `<b class="num">${face}</b>`;
  $('rollNote').innerHTML = rollState === 0 ? L(`いまの目：${f}（相手チームが置いた状態）`, `Current face: ${f} (as placed by the opponent)`)
    : rollState === 1 ? L(`いまの目：${f}　初めて目を変えたので +20点`, `Current face: ${f} · first change, so +20`)
    : L(`いまの目：${f}（2回目以降は点にならない）`, `Current face: ${f} (later changes score nothing)`);
}
const mr = $('mrobot');
s('rect', {x:6, y:6, width:88, height:88, rx:14, class:'mr-body'}, mr);
const mslots = [];
for (let i = 0; i < 8; i++) mslots.push(s('circle', {cx:22 + (i % 4) * 18.7, cy:i < 4 ? 38 : 66, r:7.5, class:'mr-slot'}, mr));
function drawHold() {
  $('hOut').textContent = hold;
  mslots.forEach((c, i) => c.setAttribute('class', 'mr-slot' + (i < hold ? (i < face ? ' on' : ' over') : '')));
  const v = $('verdict');
  if (hold <= face) { v.className = 'verdict ok'; v.textContent = L(`OK：出目が${face}なので${face}本まで持てます（いま${hold}本）。`, `OK: the face is ${face}, so you can hold up to ${face} (holding ${hold}).`); }
  else { v.className = 'verdict ng'; v.textContent = L(`違反：${hold}本 ＞ 出目${face}。目より多く持つと強制リトライです。`, `Violation: ${hold} > face ${face}. Holding more than the face means a forced retry.`); }
  $('hMinus').setAttribute('aria-label', L('1本減らす', 'One fewer'));
  $('hPlus').setAttribute('aria-label', L('1本増やす', 'One more'));
}
$('rollBtn').addEventListener('click', () => {
  const d = $('dsvg'); d.classList.remove('roll'); void d.getBoundingClientRect(); d.classList.add('roll');
  let nf; do { nf = 1 + Math.floor(Math.random() * 6); } while (nf === face);
  setTimeout(() => { face = nf; rollState = rollState === 0 ? 1 : 2; drawDice(); drawHold(); drawNote(); }, RM ? 0 : 320);
});
$('hMinus').addEventListener('click', () => { hold = Math.max(0, hold - 1); drawHold(); });
$('hPlus').addEventListener('click', () => { hold = Math.min(8, hold + 1); drawHold(); });
drawDice(); drawHold(); drawNote();
langHooks.push(() => { drawHold(); drawNote(); });
