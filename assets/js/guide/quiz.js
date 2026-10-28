import {L, tx, langHooks} from '../core/i18n.js';
import {$, s} from '../core/util.js';
import {bottle} from '../core/field.js';
import {other} from '../match/timeline.js';

/* ================= QUIZ ================= */
const Q = [
  [['サイコロの目が3なのに、桜ボトルを4本つかんだ。','The dice face is 3, but the robot grabbed 4 Sakura bottles.'], 'foul', ['目の数より多いボトルを持つのは違反。強制リトライです。','Holding more bottles than the dice face is a violation: forced retry.'], '5.4'],
  [['除草剤ボトルを投げて、相手の雑草ボトルを倒した。',"Threw a Herbicide bottle and knocked over an opponent's Weed bottle."], 'safe', ['これはルールで認められた妨害。倒された側は置けなくなり、1本−15点。',"That's blocking the rules allow. The other team can't place, and loses 15 per bottle."], ['用語「除草剤ボトル」','Terms: Herbicide bottle']],
  [['共通ゾーンにある相手の桜ボトルを、アームでどかした。',"Pushed an opponent's Sakura bottle out of a Common Zone with the arm."], 'safe', ['共通ゾーンにある相手の桜ボトルは動かしてよいと書かれています。',"The rules say you may move the opponent's Sakura bottles in the Common Zones."], ['用語「共通ゾーン」','Terms: Common Zone']],
  [['どかした相手の桜ボトルを、自分のコートに置いた。',"Put that removed opponent bottle down inside your own court."], 'foul', ['相手の桜ボトルを自コート内に置くのは違反です。',"Placing an opponent's Sakura bottle in your own court is a violation."], '5.5'],
  [['アームの先が、相手コートの上に少しだけはみ出した。',"The tip of the arm stuck out slightly over the opponent's court."], 'foul', ['真上から見た影が少しでも重なれば「進入」。相手コートへの進入は違反です。',"If your footprint seen from above overlaps even slightly, you have entered. Entering the opponent's court is a violation."], ['用語「進入」・5.3','Terms: entry · 5.3']],
  [['ロボットが自コート内の木枠にぶつかった。','The robot bumped into a wooden frame inside its own court.'], 'safe', ['自チームのコート内の木枠への接触は認められています。','Contact with the wooden frames inside your own court is allowed.'], ['用語「木枠」','Terms: wooden frame']],
  [['ロボットが外周の木枠の上面に乗り上げた。','The robot climbed onto the top of the outer frame.'], 'foul', ['外周の木枠は、上面や外側への接触が認められていません。',"Touching the top or outside of the outer frame isn't allowed."], ['用語「木枠」・5.3','Terms: wooden frame · 5.3']],
  [['わざと相手ロボットにぶつかった。',"Rammed the opponent's robot on purpose."], 'foul', ['相手ロボットへの意図的な接触は違反（強制リトライ）。',"Intentional contact with the opponent's robot is a violation (forced retry)."], '5.7'],
  [['わざと相手ロボットを壊した。',"Broke the opponent's robot on purpose."], 'dq', ['相手ロボットを故意に破損させると失格。その時点で相手の勝ち、得点は0点。',"Intentionally damaging the opponent's robot is a disqualification: the opponent wins and you score 0."], '6.1.2'],
  [['動かなくなったので、メンバーが審判の許可なくフィールドに手を入れて直した。',"The robot stalled, so a member reached into the field and fixed it without the referee's permission."], 'foul', ['許可なくフィールドに入ったりロボットに触れたりすると違反。まずリトライを宣言しましょう。','Entering the field or touching the robot without permission is a violation. Declare a retry first.'], '5.1'],
  [['リトライを宣言して承認されたあと、メンバーがロボットを持ってスタートゾーンへ運んだ。','After a retry was declared and approved, a member carried the robot to the Start Zone.'], 'safe', ['リトライ中はロボットに触れることも、動かすことも認められています。','During a retry you may touch and move the robot.'], '4.4 · 4.5'],
  [['審判の指示に何度も従わなかった。',"Repeatedly ignored the referee's instructions."], 'dq', ['審判の指示に繰り返し背くと失格です。','Repeatedly disobeying the referee is a disqualification.'], '6.1.3'],
  [['ロボットがフィールドを大きく壊してしまった。','The robot badly damaged the field.'], 'dq', ['フィールドや周囲の環境、オブジェクトを著しく破損・汚損すると失格です。','Seriously damaging or soiling the field, its surroundings or objects is a disqualification.'], '6.1.1'],
  [['自分の桜ボトルが相手コートに転がって、そこに置かれた状態になった。',"Your own Sakura bottle rolled into the opponent's court and ended up placed there."], 'foul', ['自チームの桜ボトルを相手コート内に配置すると違反です。',"Placing your own Sakura bottle in the opponent's court is a violation."], '5.6']
];
const QL = {safe:['セーフ','Safe'], foul:['違反','Violation'], dq:['失格','Disqualified']};
const quiz = {i:0, ok:0, ans:null};
function qProg() { $('qprog').textContent = quiz.i >= Q.length ? `${Q.length} / ${Q.length}` : `${quiz.i + 1} / ${Q.length}　` + L(`正解 ${quiz.ok}`, `correct ${quiz.ok}`); }
function qRender(anim) {
  const w = $('qwrap');
  qProg();
  if (quiz.i >= Q.length) {
    w.innerHTML = `<div class="qcard${anim ? ' anim' : ''}"><p class="qtext">${L(`${Q.length}問中 ${quiz.ok}問 正解！`, `${quiz.ok} of ${Q.length} correct!`)}</p><p class="hint">${L('迷ったら「やり直しで済むか（違反）」「試合が終わるほど重大か（失格）」で考えると整理しやすいです。', 'When unsure, ask: is a do-over enough (violation), or is it serious enough to end the match (disqualification)?')}</p><button class="qnext show" type="button" id="qAgain">${L('もう一度', 'Try again')}</button></div>`;
    $('qAgain').addEventListener('click', () => { quiz.i = 0; quiz.ok = 0; quiz.ans = null; qRender(true); });
    return;
  }
  const [text] = Q[quiz.i];
  w.innerHTML = `<div class="qcard${anim ? ' anim' : ''}"><p class="qtext">${tx(text)}</p><div class="qbtns">${['safe','foul','dq'].map(k => `<button class="qb ${k}" type="button" data-k="${k}">${tx(QL[k])}</button>`).join('')}</div><div class="qans"></div><button class="qnext" type="button">${L('次へ', 'Next')}</button></div>`;
  w.querySelectorAll('.qb').forEach(b => b.addEventListener('click', () => {
    if (quiz.ans) return;
    quiz.ans = b.dataset.k;
    if (quiz.ans === Q[quiz.i][1]) quiz.ok++;
    qShowAns(true);
  }));
  w.querySelector('.qnext').addEventListener('click', () => { quiz.i++; quiz.ans = null; qRender(true); });
  if (quiz.ans) qShowAns(false);
}
function qShowAns(anim) {
  const w = $('qwrap');
  const [, ans, why, ref] = Q[quiz.i];
  const right = quiz.ans === ans;
  w.querySelectorAll('.qb').forEach(x => {
    x.disabled = true;
    if (x.dataset.k === ans) x.classList.add('right');
    if (!right && x.dataset.k === quiz.ans) x.classList.add('wrong', ...(anim ? ['anim'] : []));
  });
  const box = w.querySelector('.qans'), nx = w.querySelector('.qnext');
  box.innerHTML = `<b>${right ? L('正解', 'Correct') : L('ざんねん', 'Not quite')}：${tx(QL[ans])}</b>　${tx(why)}<span class="ref" style="margin-left:6px">${L('ルール ', 'Rule ')}${tx(ref)}</span>`;
  box.className = 'qans show' + (anim ? ' anim' : ''); nx.classList.add('show');
  if (anim) nx.focus({preventScroll:true});
  qProg();
}
qRender(false);
langHooks.push(() => qRender(false));
