import {L, tx, langHooks} from '../core/i18n.js';
import {$, W, PAD, clamp, s} from '../core/util.js';
import {M, pct, buildField, makeObjects, makeRobot} from '../core/field.js';

/* ================= FIELD EXPLORER ================= */
const esvg = $('expSvg');
const EL = buildField(esvg);
makeObjects(EL);
makeRobot(EL.actors, 'red').g.setAttribute('transform', 'translate(350 6640)');
makeRobot(EL.actors, 'blue').g.setAttribute('transform', 'translate(6650 6640)');
const dimPath = s('path', {class:'dim', 'fill-rule':'evenodd', style:'display:none'}, EL.top);
const hlG = s('g', null, EL.top);
const glowG = s('g', {style:'display:none'}, EL.top);
EL.segs.forEach(q => s('line', {x1:q[0], y1:q[1], x2:q[2], y2:q[3], class:'wood-glow'}, glowG));
s('rect', {x:0, y:0, width:W, height:W, fill:'none', class:'wood-glow'}, glowG);
const defs = s('defs', null, esvg);
const pat = s('pattern', {id:'hatch', width:260, height:260, patternUnits:'userSpaceOnUse', patternTransform:'rotate(45)'}, defs);
s('line', {x1:0, y1:0, x2:0, y2:260, class:'hatch-line'}, pat);
const reachG = s('g', {style:'display:none'}, EL.top);
s('path', {d:'M3500 0H7000V7000H3500V6083H3669V0Z', fill:'rgba(12,8,6,.5)'}, reachG);
s('path', {d:'M3500 0H7000V7000H3500V6083H3669V0Z', fill:'url(#hatch)'}, reachG);
s('path', {d:'M0 0H3669V6083H3500V7000H0Z', class:'hl-rect'}, reachG);
const expFx = $('expFx');
const R2 = r => [r, [M(r[2]), r[1], M(r[0]), r[3]]];
const EXP = [
  {k:'all', label:['全体','Overview'], title:['フィールド全体（7m×7m）','The whole field (7 m × 7 m)'],
   text:['赤コート（左）と青コート（右）は左右対称。下の帯がエリア1、左右の広い部分がエリア2、中央の帯がエリア3です。床はロンリウム、仕切りは木枠と白線（幅50mm）。','The Red court (left) and Blue court (right) are mirror images. The bottom strip is Area 1, the wide parts on each side are Area 2, and the center strip is Area 3. The floor is Lonrium; dividers are wooden frames and 50 mm white lines.'],
   rects:[], tags:[[['エリア1','Area 1'],1750,6640],[['エリア2','Area 2'],1500,3000],[['エリア3','Area 3'],3500,3000]]},
  {k:'area1', label:['エリア1','Area 1'], title:['エリア1','Area 1'],
   text:['スタートゾーンとサイコロゾーンがある下の帯。ここから出発して、まずサイコロの目を変えに行きます。','The bottom strip with the Start Zone and Dice Zone. Robots start here and usually go change the dice face first.'],
   rects:R2([0,6281,3500,7000]), tags:[[['エリア1','Area 1'],1750,6640]]},
  {k:'area2', label:['エリア2','Area 2'], title:['エリア2','Area 2'],
   text:['桜ゾーンと除草剤ゾーンがあるメインのエリア。木枠で迷路のように仕切られています。初めて進入すると+10点。','The main area, with the Sakura Zone and Herbicide Zone, divided into a maze by wooden frames. First entry earns +10.'],
   rects:R2([0,0,3022,6281]), tags:[[['エリア2','Area 2'],2300,3000]]},
  {k:'area3', label:['エリア3','Area 3'], title:['エリア3','Area 3'],
   text:['12個の共通ゾーンと雑草ゾーンがある中央の帯。共通ゾーンだけは、赤と青どちらのロボットも入れます。','The center strip with the 12 Common Zones and the Weed Zones. The Common Zones are the one place both Red and Blue robots may enter.'],
   rects:[[3022,0,3978,6281]], tags:[[['エリア3','Area 3'],3500,3000]]},
  {k:'start', label:['スタート','Start'], title:['スタートゾーン','Start Zone'],
   text:['700×700mm。境界は赤・青の幅19mmビニールテープ。試合開始もリトライ後の再スタートもここから。出発時、ロボットはこのゾーンを底面にした高さ700mmの箱に完全に収まっている必要があります。','700 × 700 mm, bordered with 19 mm red or blue vinyl tape. Robots start here, and restart here after a retry. At the start the robot must fit completely inside a 700 mm-tall box standing on this zone.'],
   rects:R2([0,6281,700,7000]), tags:[[['スタート','Start'],350,6100]]},
  {k:'dice', label:['サイコロ','Dice'], title:['サイコロゾーン','Dice Zone'],
   text:['試合前に相手チームがサイコロを置く場所。中の白線の四角（150mm）に、サイコロの影がぴったり重なるように置きます。','Where the opposing team places your die before the match. Its footprint must line up exactly with the 150 mm white square inside.'],
   rects:R2([2794,6281,3500,7000]), tags:[[['サイコロ','Dice'],3150,6000]]},
  {k:'sakura', label:['桜ゾーン','Sakura Zone'], title:['桜ゾーン','Sakura Zone'],
   text:['桜ボトル15本を置く場所。キャップには自チームの色（赤／青）のテープが巻いてあります。','Holds your 15 Sakura bottles. Their caps are taped in your team color (red / blue).'],
   rects:R2([0,1140,500,2280]), tags:[[['桜','Sakura'],250,2500]]},
  {k:'herb', label:['除草剤ゾーン','Herbicide Zone'], title:['除草剤ゾーン','Herbicide Zone'],
   text:['除草剤ボトル5本（黄色テープ）を置く場所。ロボットはこれを投げて、相手の雑草ボトルを倒せます。',"Holds 5 Herbicide bottles (yellow tape). The robot can throw them to knock over the opponent's Weed bottles."],
   rects:R2([0,0,500,1140]), tags:[[['除草剤','Herbicide'],250,1300]]},
  {k:'weed', label:['雑草ゾーン','Weed Zone'], title:['雑草ゾーン','Weed Zone'],
   text:['雑草ボトル3本（1L）を置く場所。木枠に触れないように置きます。自コートの雑草が1本でも倒れると共通ゾーンに置けなくなり、1本につき−15点。',"Holds 3 Weed bottles (1 L), set up so they don't touch the wooden frame. If even one of your weeds falls, you can't place in the Common Zones, and it costs −15 per bottle."],
   rects:R2([3022,0,3331,6083]), tags:[[['雑草','Weed'],2600,3040]]},
  {k:'common', label:['共通ゾーン','Common Zones'], title:['共通ゾーン1〜12','Common Zones 1–12'],
   text:['両チームで共有する12個のマス。下の1番から順に埋まっていき、五分咲きのチームが12番に置けば満開です。各マスは幅300mm、木枠で区切られています。','12 boxes shared by both teams. They fill up in order from zone 1 at the bottom, and a team in Half Bloom that places in zone 12 reaches Full Bloom. Each box is 300 mm wide, divided by wooden frames.'],
   rects:[[3331,0,3669,6083]], tags:[['1',3500,6300],['12',3500,-40]]},
  {k:'wood', label:['木枠','Frames'], title:['木枠（断面38×89mm）','Wooden frames (38 × 89 mm)'],
   text:['自コート内の木枠には触れてOK。外周の木枠は、上に「はみ出す」のはOKでも、上面や外側に触れるのはNG。固定用の金属部品で表面に出っ張りがあることもあります。',"Touching the wooden frames inside your own court is fine. The outer frame may be overhung from above, but touching its top or outside is not allowed. Metal fixings can stick out of the surface."],
   rects:[], wood:true, tags:[]},
  {k:'reach', label:['入れる範囲','Where to go'], title:['ロボットが入れる範囲（赤の場合）',"Where the robot may go (Red's view)"],
   text:['自分のコート、共通ゾーン、自コートを囲う木枠の上（触れずに）。相手コートには入れません。真上から見た影が少しでも重なった時点で「進入」です。',"Your own court, the Common Zones, and the space above the frame around your court (without touching it). Never the opponent's court: the moment your footprint seen from above overlaps it, you have entered."],
   rects:[], reach:true, tags:[[['入れる','Allowed'],1750,3000],[['入れない','Not allowed'],5300,3000]]}
];
const chipsEl = $('expChips');
EXP.forEach(item => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
  b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => selectExp(item.k));
  item.btn = b; chipsEl.appendChild(b);
});
let curExp = 'all';
function selectExp(k) {
  curExp = k;
  const item = EXP.find(x => x.k === k);
  EXP.forEach(x => { x.btn.textContent = tx(x.label); x.btn.setAttribute('aria-pressed', String(x === item)); });
  chipsEl.setAttribute('aria-label', L('場所を選ぶ', 'Choose a place'));
  esvg.setAttribute('aria-label', L('フィールドの平面図', 'Field plan'));
  $('expTitle').textContent = tx(item.title); $('expText').textContent = tx(item.text);
  hlG.innerHTML = '';
  if (item.rects.length) {
    let d = `M${-PAD} ${-PAD}H${W + PAD}V${W + PAD}H${-PAD}Z`;
    item.rects.forEach(([x1,y1,x2,y2]) => { d += `M${x1} ${y1}H${x2}V${y2}H${x1}Z`; s('rect', {x:x1, y:y1, width:x2 - x1, height:y2 - y1, rx:40, class:'hl-rect'}, hlG); });
    dimPath.setAttribute('d', d); dimPath.style.display = '';
  } else if (item.wood) {
    dimPath.setAttribute('d', `M${-PAD} ${-PAD}H${W + PAD}V${W + PAD}H${-PAD}Z`); dimPath.style.display = '';
  } else dimPath.style.display = 'none';
  glowG.style.display = item.wood ? '' : 'none';
  reachG.style.display = item.reach ? '' : 'none';
  expFx.innerHTML = '';
  item.tags.forEach(([txt, x, y]) => {
    const d = document.createElement('div'); d.className = 'tag'; d.textContent = tx(txt);
    d.style.left = clamp(pct(x), 10, 90) + '%'; d.style.top = clamp(pct(y), 4, 96) + '%';
    expFx.appendChild(d);
  });
}
selectExp('all');
langHooks.push(() => selectExp(curExp));
