export const DEF_FOUL = {
  id:'foul', name:['違反で強制リトライ','Violation, forced retry'], sub:['持ちすぎは違反。やり直しで大きく出遅れる','Holding too many: a forced retry and lost time'],
  tag:['赤 満開宣言','Red declares'], winner:'red', ending:'declare', sec:128, allowOver:'blue',
  note:['青は違反による強制リトライで出遅れ、置けたのは3本だけ。赤は2往復で9本を置き、五分咲き→満開→満開宣言まで一気に進みました。','Blue lost time to the forced retry and placed only 3 bottles. Red placed 9 over two trips and went straight from Half Bloom to Full Bloom to the declaration.'],
  red:[['dice',6],['sakura',6],['place',1],['place',2],['place',3],['place',4],['place',5],['place',6],['sakura',3],['place',10],['place',11],['place',12],['signal']],
  blue:[['dice',3],['sakura',4],['mark','over'],['wait',.8],['retry'],['sakura',3],['place',7],['place',8],['place',9]],
  banners:[[['over',-.9],'blueRetry',[5300,2900],['4本 ＞ 出目3 → 違反','4 bottles > face 3 → violation'],'b-warn'],['blueRetry',['blueRetry',2.4],[5300,2900],['強制リトライ','Forced retry'],'b-blue']],
  scenes:[
    {t:6, title:['出目の差','Different dice faces'], body:['赤はサイコロを6に変えましたが、青の目は3。サイコロの目は狙いどおりに出るとは限りません。青が一度に持てるのは3本までです。',"Red rolls its die to 6, but Blue's lands on 3. The face doesn't always come up the way you aim. Blue can hold only 3 bottles at a time."], refs:[['1 用語「サイコロ」','1 Terms: dice'],'3.6 B'], focus:['dice']},
    {t:['over',-2.4], title:['3本までなのに4本','Four with a face of three'], body:['青は桜ボトルを4本つかんでしまいました。サイコロの目の数より多いペットボトルを把持するのは違反です。ステータスの赤いマスが持ちすぎの分です。','Blue grabs 4 Sakura bottles. Gripping more PET bottles than the dice face is a violation. The red slot in the status panel is the extra bottle.'], refs:['5.4'], focus:['sakuraB']},
    {t:'blueRetry', title:['強制リトライ','Forced retry'], body:['違反は強制リトライ。非常停止してスタートゾーンへ戻り、つかんでいた4本も桜ゾーンへ戻します。手順は自分から宣言するリトライと同じで、その間も時間は進みます。','A violation means a forced retry: emergency stop, back to the Start Zone, and the 4 bottles it was holding go back to the Sakura Zone. The steps are the same as a retry you declare yourself, and the clock keeps running.'], refs:['4.9','4.6',['5 違反','5 Violations']], focus:['startB','sakuraB']},
    {t:['p1',-.6], title:['赤がひとりで並木を伸ばす','Red builds the avenue alone'], body:['その間に赤は1番から6番まで続けて置き、5本目で五分咲き（+90）。12番に置く資格を得ました。','Meanwhile Red places zones 1 to 6 in a row and reaches Half Bloom with the fifth (+90), earning the right to place in zone 12.'], refs:['3.6 C','3.6 E'], focus:['common']},
    {t:['p7',-.6], title:['青も戻ってくる','Blue comes back'], body:['青は3本を持って戻り、7〜9番を埋めます（+30×3）。ただ、並木が伸びるほど12番に近づくのは、五分咲きの赤のほうです。','Blue returns with 3 bottles and fills zones 7 to 9 (+30 × 3). But the longer the avenue grows, the closer Red, already in Half Bloom, gets to zone 12.'], refs:['3.6 C'], focus:['common']},
    {t:['p10',-.6], title:['満開 → 満開宣言','Full Bloom → Declaration'], body:['赤は2往復目の3本で10番・11番を埋め、そのまま12番へ。満開（+180）になり、合図を審判が確認して満開宣言。赤の勝ちです。','With 3 more bottles from a second trip, Red fills zones 10 and 11 and goes straight on to 12: Full Bloom (+180). The referee confirms the signal, that is the declaration, and Red wins.'], refs:['3.5.5',['3.8 勝敗','3.8 Winner']], focus:['z12']}
  ]
};
