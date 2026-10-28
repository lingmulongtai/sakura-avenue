import {M, ZC, ZR} from '../core/field.js';

/* ================= MATCH DATA ================= */
export const RX = 2740, BX = M(2740);
export const END = 64.8, TOTAL = 72;
export const PATH = {
  red: [[0,350,6640],[6,350,6640],[9.5,2560,6640],[14.2,2560,6640],[15.0,2250,6640],[16.4,2250,5800],[18,2000,5650],[19.5,800,5650],[22.5,800,1710],[26,800,1710],[28,800,5650],[29.2,RX,5650],[29.7,RX,ZR(1)],[30.7,RX,ZR(1)],[31.2,RX,ZR(2)],[32.2,RX,ZR(2)],[33.4,RX,ZR(4)],[34.4,RX,ZR(4)],[35.8,RX,ZR(6)],[36.8,RX,ZR(6)],[37.3,RX,ZR(7)],[40.6,RX,ZR(7)],[41.8,RX,ZR(10)],[43.4,RX,ZR(10)],[44.8,RX,5650],[46.0,800,5650],[47.8,800,1710],[49.4,800,1710],[51.2,800,5650],[52.4,RX,5650],[56.4,RX,ZR(11)],[59.05,RX,ZR(11)],[59.1,350,6640],[62.4,350,6640],[66.5,1900,6640]],
  blue: [[0,6650,6640],[6,6650,6640],[9.8,4440,6640],[14.4,4440,6640],[15.2,4750,6640],[16.6,4750,5800],[18.3,5000,5650],[19.8,6200,5650],[22.9,6200,1710],[26.4,6200,1710],[28.6,6200,5650],[29.9,BX,5650],[32.2,BX,ZR(3)],[33.2,BX,ZR(3)],[34.6,BX,ZR(5)],[35.6,BX,ZR(5)],[38.4,BX,ZR(8)],[39.4,BX,ZR(8)],[39.9,BX,ZR(9)],[40.9,BX,ZR(9)],[43.6,BX,ZR(9)],[45.0,BX,560],[46.6,5980,560],[48.8,5980,560],[50.4,BX,560],[53.0,BX,2400],[57.4,BX,2400],[59.4,BX,ZR(11)],[60.6,BX,ZR(11)],[61.5,BX,ZR(12)]]
};
export const PLACE = [[30.2,1,'red'],[31.7,2,'red'],[32.7,3,'blue'],[33.9,4,'red'],[35.1,5,'blue'],[36.3,6,'red'],[37.8,7,'red'],[38.9,8,'blue'],[40.4,9,'blue'],[42.3,10,'red'],[60.1,11,'blue'],[62.0,12,'blue']];
export const ARM = {
  red: [[9.6,10.9,0,260],[22.7,25.8,180,420],[47.9,49.3,180,420],[56.5,57.4,0,460]],
  blue: [[10.0,11.3,180,260],[23.0,26.1,0,420],[46.8,48.6,0,480],[53.8,54.4,180,320],[55.6,56.2,180,320]]
};
PLACE.forEach(([t,k,tm]) => ARM[tm].push([t - 0.5, t + 0.5, tm === 'red' ? 0 : 180, 470]));
export const HELD = {red:[], blue:[]};
export const SAKPICK = {red:[], blue:[]}, SAKRET = {red:[], blue:[]}, HERBPICK = {red:[], blue:[]};
[23.2,23.6,24.0,24.4,24.8,25.2,48.4,48.8].forEach(t => { HELD.red.push([t,1,0]); SAKPICK.red.push(t); });
[23.5,23.9,24.3,24.7,25.1,25.5].forEach(t => { HELD.blue.push([t,1,0]); SAKPICK.blue.push(t); });
PLACE.forEach(([t,k,tm]) => HELD[tm].push([t,-1,0]));
HELD.red.push([59.1,-2,0]); SAKRET.red.push(59.1, 59.1);
HELD.blue.push([47.4,0,1],[48.1,0,1],[54.2,0,-1],[56.0,0,-1]); HERBPICK.blue.push(47.4, 48.1);
export const DICEFLIP = {red:[10.2,11.0], blue:[10.6,11.4]};
export const WEEDEV = {red:[[1,55.1,59.8],[0,56.9,59.8]], blue:[]};
export const THROWS = [[54.2,55.1,1],[56.0,56.9,0]];
export const SCORE = [
  [11.0,'red',20,['サイコロ','Dice'],[2300,6000]],[11.4,'blue',20,['サイコロ','Dice'],[4700,6000]],
  [15.5,'red',10,['エリア2','Area 2'],[2250,5250]],[15.9,'blue',10,['エリア2','Area 2'],[4750,5250]],
  ...PLACE.map(([t,k,tm]) => [t, tm, 30, '', [3500, ZC(k) - 180]]),
  [38.3,'red',90,['五分咲き','Half Bloom'],[1900,ZC(7) - 350]],
  [55.4,'red',-15,['雑草','Weed'],[3176,3040 - 260]],[57.2,'red',-15,['雑草','Weed'],[3176,1000 + 300]],
  [60.3,'red',30,['減点が消えた','Penalty cleared'],[2300,2050]],
  [60.5,'blue',90,['五分咲き','Half Bloom'],[5200,ZC(11) + 450]],
  [62.4,'blue',180,['満開','Full Bloom'],[3500,ZC(12) + 520]]
];
export const BANNERS = [
  [10.4,12.4,[3500,5250],['出目 1 → 6　6本まで持てる','Dice 1 → 6 · hold up to 6'],'b-dark'],
  [36.9,38.3,[1500,ZC(6) + 200],['1〜6番が埋まった → 7番へ','Zones 1–6 filled → zone 7'],'b-dark'],
  [38.3,40.4,[1500,ZC(7) - 900],['赤 五分咲き！','Red: Half Bloom!'],'b-red'],
  [55.2,56.9,[1700,3700],['赤の雑草が倒れた → 赤は置けない',"Red's weed is down → Red can't place"],'b-warn'],
  [56.9,58.0,[RX - 600,ZR(11) + 560],['置けない！',"Can't place!"],'b-warn'],
  [58.0,59.1,[RX - 600,ZR(11) + 560],['リトライ宣言','Retry declared'],'b-red'],
  [59.8,61.4,[2200,2000],['雑草を立て直し','Weeds stood back up'],'b-red'],
  [60.5,62.1,[5300,ZC(11) + 800],['青 五分咲き！','Blue: Half Bloom!'],'b-blue'],
  [62.4,63.8,[3500,1150],['満開！','Full Bloom!'],'b-sakura'],
  [63.0,64.8,[5500,900],['ロボットが合図','Robot signals'],'b-blue'],
  [64.8,TOTAL + 1,[3500,3400],['満開宣言 → 青の勝ち','Full Bloom Declaration → Blue wins'],'b-final']
];
export const CLK = [[6,0],[10,8],[14.2,16],[18,24],[27,46],[37.6,66],[43.4,78],[53,98],[57.6,106],[61.6,114],[64.8,120]];
export const SCENES = [
  {t:0, title:['セッティング（1分間）','Setup (1 minute)'],
   body:['試合前に1分のセッティングタイム。各チームはロボットと桜ボトル15本・除草剤ボトル5本・雑草ボトル3本を決まった場所に置きます。サイコロだけは相手チームが、こちらのサイコロゾーンに置きます。作業できるのはメンバーとピットクルー合わせて6人まで。',
         'Before the match there is a 1-minute setup time. Each team puts its robot, 15 Sakura bottles, 5 Herbicide bottles and 3 Weed bottles in their spots. Only the die is placed by the opposing team, in your Dice Zone. Up to 6 people (members plus pit crew) can help.'],
   refs:[['3.2 セッティング','3.2 Setup']], focus:['sakura','herb','weed','dice']},
  {t:6, title:['競技開始（3分）','Start (3 minutes)'],
   body:['審判の合図でスタート。ロボットはスタートゾーンを底面とした高さ700mmの箱に収まった状態から出ます。ここから先、人は審判の許可なくフィールドに入ったり、ロボットに触れたりできません。',
         "The match starts on the referee's signal. The robot starts fully inside a 700 mm-tall box standing on the Start Zone. From here on, people can't enter the field or touch the robot without the referee's permission."],
   refs:[['3.3 競技の開始','3.3 Start'],['3.4 メンバーの動き','3.4 Team members']], focus:['start']},
  {t:10, title:['サイコロの目を変える　+20','Change the dice face  +20'],
   body:['サイコロの目の数が、ロボットが一度に持てるボトルの本数。相手が置いたサイコロを転がして大きい目に変えます。初めて目を変えた時点で20点。',
         'The dice face is how many bottles the robot can hold at once. Roll the die the opponent placed over to a bigger number. The first change of the face is worth 20 points.'],
   refs:['3.5.2','3.6 B'], focus:['dice']},
  {t:14.2, title:['エリア2へ進入　+10','Enter Area 2  +10'],
   body:['桜ゾーンと除草剤ゾーンがあるエリア2へ。真上から見たロボットの影（正射影）が少しでも重なれば「進入」で、初めての進入で10点です。',
         "Into Area 2, home of the Sakura Zone and Herbicide Zone. If the robot's footprint seen from directly above overlaps an area even slightly, it has entered. The first entry is worth 10 points."],
   refs:[['1 用語「進入」','1 Terms: entry'],'3.6 A'], focus:['area2']},
  {t:18, title:['桜ボトルを回収','Collect Sakura bottles'],
   body:['木枠で仕切られた通路を抜けて桜ゾーンへ。持てるのはサイコロの目の数まで、目が6なら6本です。除草剤ボトルも同じ枠で数えるので、合計が目を超えたら違反です。',
         'Through the walled corridors to the Sakura Zone. You can hold up to the dice face, so 6 bottles with a 6. Herbicide bottles count toward the same limit, so going over the face is a violation.'],
   refs:[['1 用語「サイコロ」','1 Terms: dice'],'5.4'], focus:['sakura']},
  {t:27, title:['共通ゾーンに並べる　+30/本','Line up the Common Zones  +30 each'],
   body:['中央の共通ゾーンは1番から順番。N番に置けるのは1〜N−1番が全部埋まっているときだけで、色は問いません。赤と青で1本の並木を一緒に伸ばしていく形になります。置いた桜ボトル1本につき30点。',
         'The Common Zones fill from zone 1. You can place in zone N only when zones 1 to N−1 are all filled, in any color, so Red and Blue grow one avenue together. Each Sakura bottle placed is worth 30 points.'],
   refs:[['1 用語「共通ゾーン」','1 Terms: Common Zone'],'3.6 C'], focus:['common']},
  {t:37.6, title:['五分咲き　+90','Half Bloom  +90'],
   body:['赤の色が5ゾーンそろって「五分咲き」。90点が入り、12番に置く資格を得ます。青も8番・9番と続けて4ゾーン。赤はさらに10番を埋めました。',
         'Red now holds 5 zones: Half Bloom. That earns 90 points and the right to place in zone 12. Blue adds zones 8 and 9 for 4 zones, and Red fills zone 10 as well.'],
   refs:[['1 用語「五分咲き」','1 Terms: Half Bloom'],'3.6 E'], focus:['common']},
  {t:43.4, title:['次の一手','The next move'],
   body:['赤は手持ちを使い切ったので、桜ボトルを取りに戻ります。青は桜2本を持ったまま除草剤ゾーンへ行き、計4本。11番を埋めると12番が相手にも開くので、残り本数とタイミングの読み合いになります。',
         "Red has used up its bottles and heads back for more Sakura bottles. Blue keeps 2 Sakura bottles and picks up 2 Herbicide bottles, 4 in total. Filling zone 11 opens zone 12 to the opponent as well, so it turns into a game of bottle counts and timing."],
   refs:[['1 用語「除草剤ボトル」','1 Terms: Herbicide bottle']], focus:['sakuraR','herbB']},
  {t:53, title:['除草剤で妨害','Blocking with herbicide'],
   body:['青が除草剤ボトルを投げて、赤の雑草ボトルを倒しました。自コートの雑草ボトルが1本でも倒れていると、共通ゾーンに桜ボトルを置けません。赤は11番の前まで来たのに置けず、倒れた雑草1本につき−15点。',
         "Blue throws Herbicide bottles and knocks over Red's Weed bottles. If even one Weed bottle in your court is down, you can't place Sakura bottles in the Common Zones. Red reaches zone 11 but can't place, and loses 15 points per fallen weed."],
   refs:[['1 用語「雑草ボトル」','1 Terms: Weed bottle'],'3.6 D'], focus:['weedR']},
  {t:57.6, title:['リトライで立て直す','Recover with a retry'],
   body:['赤はリトライを宣言。非常停止してスタートゾーンへ運び、倒れた雑草を元の位置に置き直します。ロボットが持っていた桜ボトルも元の場所へ戻り、減点は消えました。その間に青は11番を埋めて五分咲き。',
         'Red declares a retry: emergency stop, carry the robot to the Start Zone, and stand the fallen weeds back in place. The bottles the robot was holding go back too, and the penalty disappears. Meanwhile Blue fills zone 11 and reaches Half Bloom.'],
   refs:[['4 リトライ','4 Retry']], focus:['startR','weedR']},
  {t:61.6, title:['満開 → 満開宣言','Full Bloom → Declaration'],
   body:['五分咲きの青が12番に置いて「満開」+180点。ロボットの合図を審判が確認して「満開宣言」となり、その場で試合終了。点数に関係なく、先に満開宣言したチームの勝ちです。',
         "In Half Bloom, Blue places in zone 12: Full Bloom, +180. The referee confirms the robot's signal, that counts as the Full Bloom Declaration, and the match ends right there. Whoever declares first wins, regardless of score."],
   refs:['3.5.5',['3.7 競技の終了','3.7 End'],['3.8 勝敗','3.8 Winner']], focus:['z12']}
];
SCENES.forEach((sc, i) => sc.end = i < SCENES.length - 1 ? SCENES[i + 1].t : TOTAL);

export const SCORECAT = {'サイコロ':'B', 'エリア2':'A', '五分咲き':'E', '雑草':'D', '減点が消えた':'D', '満開':'F'};
export const SC_BLOCK = {
  id:'block', name:['妨害とリトライ','Blocking & retry'], sub:['雑草を倒されて配置不可。リトライで立て直す',"Weeds knocked down, then a retry to recover"],
  tag:['青 満開宣言','Blue declares'], winner:'blue', ending:'declare',
  note:['赤は雑草を2本倒されて一度−30点になりましたが、リトライで立て直したので最終的な減点はゼロ。それでも青が先に満開宣言したので、勝敗は点数より先に決まっています。','Red briefly dropped 30 points when two weeds were knocked over, but stood them back up with a retry, so its final penalty was zero. Blue still declared Full Bloom first, so the result was settled before points came into it.'],
  path:PATH, place:PLACE, remove:[], arm:ARM, held:HELD, sakPick:SAKPICK, sakRet:SAKRET, herbPick:HERBPICK, herbRet:{red:[], blue:[]},
  dice:{red:{from:1, to:6, f0:DICEFLIP.red[0], f1:DICEFLIP.red[1]}, blue:{from:1, to:6, f0:DICEFLIP.blue[0], f1:DICEFLIP.blue[1]}},
  weedEv:WEEDEV, throws:THROWS.map(([t0, t1, wi]) => [t0, t1, 'red', wi, BX - 720, 2400]),
  score:SCORE.map(e => [...e, SCORECAT[e[3][0]] || 'C']), banners:BANNERS, clk:CLK, scenes:SCENES,
  retry:[['red', 58.0, 58.6, 59.15, 62.4]], signal:[['blue', 62.6]], dq:null, impacts:[], end:END, total:TOTAL
};
