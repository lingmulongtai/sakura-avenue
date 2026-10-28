import {s} from '../../core/util.js';
import {ZC, ZR, bottle} from '../../core/field.js';

export const DEF_SWAP = {
  id:'swap', name:['ボトルをどけて逆転','Swap a bottle, turn it around'], sub:['相手の桜ボトルをどけて、自分の色に置きかえる',"Move the opponent's bottle, put yours in its place"],
  tag:['青 満開宣言','Blue declares'], winner:'blue', ending:'declare', sec:150,
  note:['赤の4番をどけて青に置きかえたことで、赤は1ゾーン減り（−30）、青が先に五分咲きへ。赤は五分咲きに届かず、12番に置けませんでした。','Swapping zone 4 from Red to Blue cost Red a zone (−30) and put Blue into Half Bloom first. Red never reached Half Bloom, so it could not place in zone 12.'],
  red:[['dice',3],['sakura',3],['place',1],['place',2],['place',4],['sakura',3],['place',9],['place',10],['go',2740,ZR(11) + 80],['mark','redWait']],
  blue:[['wait',.5],['dice',6],['sakura',6],['place',3],['place',5],['place',6],['remove',4],['place',4],['place',7],['place',8],['sakura',4],['place',11],['place',12],['signal']],
  banners:[['x4',['x4',1.8],[5100,ZC(4)],['相手の桜ボトルはどけてOK',"Moving the opponent's bottle is OK"],'b-dark'],[['p4',.5],['p4',2.7],[5100,ZC(4)],['どけたボトルは持ったまま','The removed bottle stays in the grip'],'b-dark'],['redWait',['p11',-.6],[1500,ZC(11) + 700],['11番を埋めると12番が開く','Filling 11 opens 12'],'b-warn']],
  scenes:[
    {t:6, title:['出目は赤3・青6','Faces: Red 3, Blue 6'], body:['赤のサイコロは3、青は6。赤は一度に3本しか運べないので、早めに並べ始めて手数で勝負します。','Red ends up with a 3 and Blue with a 6. Red can carry only 3 bottles at a time, so it starts placing early to keep pace.'], refs:[['1 用語「サイコロ」','1 Terms: dice']], focus:['dice']},
    {t:['p1',-.6], title:['交互に並べる','Taking turns'], body:['赤が1・2・4番、青が3・5・6番。赤は3本を使い切って、桜ボトルを取りに戻ります。','Red takes zones 1, 2 and 4; Blue takes 3, 5 and 6. Red has used its 3 bottles and heads back for more.'], refs:['3.6 C'], focus:['common']},
    {t:['x4',-1.2], title:['相手のボトルをどける',"Moving Red's bottle"], body:['青は4番にある赤の桜ボトルをどけました。共通ゾーンにある相手の桜ボトルは動かしてかまいません。4番が空いたので、次に置けるのは4番。それより上のボトルはそのままです。',"Blue lifts Red's Sakura bottle out of zone 4. You may move the opponent's Sakura bottles in the Common Zones. Zone 4 is now empty, so it is the next open zone; the bottles above it stay put."], refs:[['1 用語「共通ゾーン」','1 Terms: Common Zone']], focus:['z4']},
    {t:['p4',-.6], title:['自分の色に置きかえる','Swapping in Blue'], body:['空いた4番に青が自分の桜ボトルを置きます（+30）。赤は2ゾーンに減って−30、青は4ゾーン。どけた赤のボトルは自コートに置くと違反なので、青は持ったまま。持っている本数にも数えます。',"Blue puts its own bottle in the empty zone 4 (+30). Red drops to 2 zones (−30) and Blue has 4. Putting Red's bottle in Blue's own court would be a violation, so Blue keeps holding it, and it counts toward the bottles held."], refs:['5.5','5.4'], focus:['z4']},
    {t:['hb-blue',-.6], title:['青が先に五分咲き','Blue reaches Half Bloom first'], body:['青は7番で5ゾーンになり五分咲き（+90）。8番も埋めて、桜ボトルを取りに戻ります。','Blue reaches 5 zones at zone 7: Half Bloom (+90). It fills zone 8 too, then goes back for more bottles.'], refs:['3.6 E'], focus:['common']},
    {t:['p9',-.6], title:['赤は動けない','Red is stuck'], body:['戻ってきた赤は9・10番を埋めて4ゾーン。残りの1本で11番を埋めれば五分咲きですが、12番に置く分が残りません。しかも12番が開けば、五分咲きの青に置かれてしまいます。',"Back again, Red fills zones 9 and 10 for 4 zones. Its last bottle in zone 11 would mean Half Bloom, but leave nothing for zone 12, and opening zone 12 would hand it to Blue, which is already in Half Bloom."], refs:[['1 用語「満開」','1 Terms: Full Bloom']], focus:['z11','z12']},
    {t:['p11',-.6], title:['満開宣言','The declaration'], body:['青が11番を埋めて12番を開け、そのまま12番へ。満開（+180）→満開宣言で青の勝ち。五分咲きでない赤は、12番が開いても置けません。',"Blue fills zone 11 to open zone 12 and goes straight on: Full Bloom (+180), then the declaration. Blue wins. Red, not in Half Bloom, can't place in zone 12 even once it is open."], refs:['3.5.5',['3.8 勝敗','3.8 Winner']], focus:['z12']}
  ]
};
