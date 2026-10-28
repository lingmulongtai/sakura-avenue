export const DEF_DQ = {
  id:'dq', name:['暴走で失格','Runaway, disqualified'], sub:['得点でリードしていても、失格なら負け','Ahead on points, but a DQ still loses'],
  tag:['赤 失格 → 青','Red DQ → Blue'], winner:'blue', ending:'dq', sec:84,
  note:['赤は五分咲きまで進んで得点で大きくリードしていましたが、失格した時点で得点は0点、青の勝ちです。','Red had reached Half Bloom and led comfortably on points, but the moment it was disqualified its score became 0 and Blue won.'],
  red:[['dice',6],['sakura',6],['place',1],['place',2],['place',4],['place',6],['place',7],['go',800,5650],['go',800,4700],['mark','wild'],['go',1300,4250,.4],['go',560,3950,.4],['go',1150,3700,.4],['crash',260,3650,0,3650],['wait',.7],['dq']],
  blue:[['wait',.8],['dice',6],['sakura',6],['place',3],['place',5],['place',8],['place',9]],
  banners:[['crash',['crash',1.6],[1500,3000],['外周の木枠を破損','Outer frame broken'],'b-warn'],['dq',['dq',1.6],[1600,4600],['非常停止 → 失格','Emergency stop → disqualified'],'b-red']],
  scenes:[
    {t:6, title:['赤が快調にスタート','Red gets off to a strong start'], body:['赤も青もサイコロを6に変えて、桜ボトルを6本回収。赤のほうが一歩早く、1番から並べ始めます。','Both teams roll their die to 6 and collect 6 Sakura bottles. Red is a step quicker and starts placing from zone 1.'], refs:['3.5.2','3.5.3'], focus:['dice','sakura']},
    {t:['hb-red',-.6], title:['赤が五分咲き','Red reaches Half Bloom'], body:['赤は1・2・4・6・7番で5ゾーン、五分咲き（+90）。得点でも赤が大きくリードしています。','Red holds zones 1, 2, 4, 6 and 7: five zones, Half Bloom (+90). Red is well ahead on points too.'], refs:['3.6 E'], focus:['common']},
    {t:'wild', title:['ロボットが暴走','The robot runs out of control'], body:['桜ボトルを取りに戻る途中、赤のロボットが制御を失いました。ロボットは、異常が起きても暴走しないように作る必要があります。',"On the way back for more bottles, Red's robot loses control. Robots must be built so they don't run wild when something goes wrong."], refs:['9.4','9.5'], focus:['crash']},
    {t:['crash',-.1], title:['木枠を壊して失格','Breaking the frame: disqualified'], body:['赤のロボットは外周の木枠に激突して壊してしまいました。フィールドを著しく壊したり、安全上の重大な問題が起きたりすると失格です。チームは非常停止ボタンでロボットを止めます（審判が押すこともあります）。',"Red's robot slams into the outer frame and breaks it. Seriously damaging the field, or a serious safety problem, means disqualification. The team stops the robot with the emergency stop (the referee may press it too)."], refs:['6.1.1','6.1.4'], focus:['crash']},
    {t:'end', title:['失格した時点で試合終了','The match ends at the disqualification'], body:['失格した時点で試合終了、相手チームの勝ちです。失格したチームの得点は0点になり、競技終了までフィールドの外で待機します。点数で大きくリードしていた赤でも負けになりました。',"The match ends the moment a team is disqualified, and the opponent wins. The disqualified team's score becomes 0, and it waits outside the field until the match is over. Red was far ahead on points and still lost."], refs:[['6 失格','6 Disqualification'],['3.7 競技の終了','3.7 End']], focus:[]}
  ]
};
