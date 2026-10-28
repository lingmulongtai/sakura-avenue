// Strategy notes: the zone-split matrix (who may place in zone 12 for every Red/Blue split of zones 1–11).
import {L, langHooks} from '../core/i18n.js';
import {$} from '../core/util.js';

const mx = $('mx'), out = $('mxOut');
let sel = [6, 5];
const who = (r, b) => r + b !== 11 ? '' : r >= 5 && b >= 5 ? 'both' : r >= 5 ? 'red' : 'blue';
const mark = w => w === 'both' ? L('両', 'R/B') : w === 'red' ? L('赤', 'R') : w === 'blue' ? L('青', 'B') : '';

function explain(r, b) {
  const rest = 11 - r - b, w = who(r, b);
  const hb = (n, team) => n >= 5 ? L(`${team}は五分咲き。`, `${team} is in Half Bloom.`) : L(`${team}はあと${5 - n}ゾーンで五分咲き。`, `${team} needs ${5 - n} more zone${5 - n > 1 ? 's' : ''} for Half Bloom.`);
  const R = L('赤', 'Red'), B = L('青', 'Blue');
  let p;
  if (w === 'both') p = L('1〜11番がすべて埋まり、12番が開いています。両チームとも五分咲きなので、先に12番に置いたほうが満開です。', 'Zones 1–11 are full and zone 12 is open. Both teams are in Half Bloom, so whoever places in zone 12 first reaches Full Bloom.');
  else if (w) { const on = w === 'red' ? R : B, off = w === 'red' ? B : R, n = w === 'red' ? b : r; p = L(`1〜11番がすべて埋まり、12番が開いています。12番に置けるのは五分咲きの${on}だけ。${off}は${5 - n}ゾーン足りません。`, `Zones 1–11 are full and zone 12 is open. Only ${on}, in Half Bloom, may place there; ${off} is ${5 - n} zone${5 - n > 1 ? 's' : ''} short.`); }
  else {
    p = L(`あと${rest}ゾーン埋まると12番が開きます。`, `${rest} more zone${rest > 1 ? 's' : ''} until zone 12 opens. `) + hb(r, R) + ' ' + hb(b, B);
    if (rest === 1) p += ' ' + (r >= 6 || b >= 6 || (r >= 5 && b >= 5) ? L('次の1本で12番が開きます。五分咲きの相手に12番を渡さないよう、誰が最後の1ゾーンを埋めるかが大事な場面です。', 'The next bottle opens zone 12, so who fills that last zone matters: you don\'t want to hand zone 12 to an opponent in Half Bloom.') : L('次の1本で12番が開き、そのときには必ずどちらかが五分咲きです。', 'The next bottle opens zone 12, and by then one team is sure to be in Half Bloom.'));
  }
  out.innerHTML = `<h3>${L(`赤 ${r} ・ 青 ${b}`, `Red ${r} · Blue ${b}`)}</h3><p>${p}</p>`;
}
function render() {
  let h = '';
  for (let r = 11; r >= 0; r--) {
    h += `<span class="mx-ax" aria-hidden="true">${r}</span>`;
    for (let b = 0; b <= 11; b++) {
      if (r + b > 11) { h += '<span class="mx-c na" aria-hidden="true"></span>'; continue; }
      const w = who(r, b), cls = w ? 'open ' + w : r >= 5 && b >= 5 ? 'hb-rb' : r >= 5 ? 'hb-r' : b >= 5 ? 'hb-b' : '';
      const on = r === sel[0] && b === sel[1];
      h += `<button type="button" class="mx-c ${cls}${on ? ' sel' : ''}" data-r="${r}" data-b="${b}" aria-pressed="${on}" aria-label="${L(`赤${r}・青${b}`, `Red ${r}, Blue ${b}`)}">${mark(w)}</button>`;
    }
  }
  h += '<span class="mx-ax"></span>' + Array.from({length:12}, (_, b) => `<span class="mx-ax" aria-hidden="true">${b}</span>`).join('');
  mx.innerHTML = h;
  mx.setAttribute('aria-label', L('赤と青のゾーン数の組み合わせ', 'Splits of zones between Red and Blue'));
  explain(...sel);
}
const cellOf = e => e.target.closest('.mx-c[data-r]');
mx.addEventListener('mouseover', e => { const c = cellOf(e); if (c) explain(+c.dataset.r, +c.dataset.b); });
mx.addEventListener('focusin', e => { const c = cellOf(e); if (c) explain(+c.dataset.r, +c.dataset.b); });
mx.addEventListener('mouseleave', () => explain(...sel));
mx.addEventListener('click', e => { const c = cellOf(e); if (!c) return; sel = [+c.dataset.r, +c.dataset.b]; render(); mx.querySelector('.sel').focus(); });
render();
langHooks.push(render);
