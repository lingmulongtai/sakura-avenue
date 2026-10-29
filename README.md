# SAKURA AVENUE | Illustrated Guide

An unofficial illustrated guide to the Kansai Spring Robocon 2027 SAKURA AVENUE rules, with animations, interactive simulations, and a 3D concept studio. The site follows your browser's language preferences for English or Japanese, and remembers a manually selected language.

**公開サイト:** https://sakura-avenue.vercel.app/

## ページ

| ページ | 内容 |
|---|---|
| `index.html` | 図解ガイド。5つの試合展開を選べるアニメーション、フィールド、勝ち方シミュレーター、得点、サイコロ、違反クイズなど |
| `strategy.html` | 戦略ノート。12番までの算数（ゾーン数の組み合わせ図）、サイコロと往復回数、妨害、同点時の決まり方、公式FAQで確かめたい点 |
| `calculator.html` | 得点計算。試合終了時の状態から得点の内訳と勝敗（ルール3.8の順）を出す |
| `glossary.html` | 用語集。ルールブックの用語を検索・分類で引ける |
| `models.html` | 3Dモデル。実寸で作った検討用ロボット（アルミフレーム・メカナムホイール・旋回昇降アーム・6本積みターンテーブル）の寸法や姿勢を変え、ボトルを共通ゾーンに並べる動きを再生できる。700mm/1000mm立方のサイズ制限チェック、部位ごとの表示、単一GLBの読み込み・アニメーション再生にも対応 |

## 構成

既存ページは静的なHTML・CSS・JavaScript（ESモジュール）です。3DモデルページはThree.jsを使い、ビルド時に必要なコードを束ねて `dist/` に出力します。

```
index.html, strategy.html, calculator.html, glossary.html, models.html
site.webmanifest
assets/
  css/
    base.css      色・文字・レイアウト・共通ヘッダー/フッター・共通部品・トップのヒーロー（全ページ）
    match.css     試合プレーヤーとフィールド図
    guide.css     図解ガイドの各セクション
    pages.css     戦略ノート・得点計算・用語集
    models.css    3Dモデルページ
  js/
    boot.js       描画前に表示言語を決める（<head>で読み込む）
    core/         i18n.js（言語切り替え）・util.js（DOM補助）・field.js（フィールド図）
    match/        timeline.js・block.js（元の試合）・compiler.js・scenarios/・player.js
    guide/        図解ガイドの各セクション
    pages/        各ページの入口（models.jsを含む）
    models/       3Dスタジオ
      kit.js      部品（アルミフレーム断面・メカナムホイール・ペットボトル・モーターなど）と結合処理
      concept.js  検討用ロボットの組み立てと姿勢の切り替え（寸法はメートル単位）
      stage.js    照明・反射・影・背景と描画
      motion.js   ボトルを並べる動きの時間割（時刻から姿勢を計算する）
      zones.js    デモ用の共通ゾーン（木枠）
  img/            トップページのロボット画像（3Dモデルから書き出したもの）
  icons/          ファビコン・ホーム画面用アイコン
docs/             ルールブック（PDF）
tools/
  sync_chrome.py  全ページの共通ヘッダー/フッターを書き換える
  build.mjs       静的ページと3Dビューアーをdist/に出力する
```

フォントはGoogle Fontsから読み込みます。取得できない場合はシステムフォントを使用します。

## ローカルで確認

Node.js 22以降とPython 3を使用します。リポジトリのルートで次を実行してください。

```sh
npm ci
npm run build
python -m http.server 8000 --bind 127.0.0.1 --directory dist
```

ブラウザーで http://127.0.0.1:8000/ を開きます。

ブラウザー検証には、初回のみ `npx playwright install chromium` を実行し、`npm test` を使います。3D表示、姿勢・サイズ制限チェック、デモ再生、GLBの入出力、既存ページの操作を確認します。インストール済みのChromiumを使う場合は `CHROMIUM_PATH=/path/to/chromium npm test` とします。

3Dページの検討用モデルは実機の設計や競技規定を再現したものではありません。寸法はルールブックの制限（スタート時700mm立方・競技中1000mm立方、ロゴ100mm以内）を意識していますが、強度・重量・配線は検証していません。トップページの `assets/img/concept-robot.webp` はこのモデルを描画した画像なので、形を大きく変えたときは撮り直してください。調整値はブラウザ内に保存され、現在の姿勢をGLBとして書き出せます。単一のGLBを開く場合も、ファイルはブラウザ内で処理されます。外部ファイルを参照するGLBや、未対応の圧縮形式は使用できません。読み込んだGLB自体はページを閉じると保持されません。

## よくある変更

### 試合展開を追加する

1. `assets/js/match/scenarios/` に新しいファイルを作り、既存のファイル（例：`swap.js`）と同じ形で `DEF_...` を書きます。ロボットの動きは `['dice',6]`・`['sakura',6]`・`['place',1]` のような手順の並びで、両チームとも赤コートの座標で書きます（青は自動で左右反転）。
2. `assets/js/match/scenarios/index.js` の `SCENARIOS` に追加します。

移動時間は距離から自動で計算され、`place` は下の番号が埋まるまで自動で待ちます。点数・五分咲き/満開のバナー・最後のバナーも自動で付きます。番号順・五分咲き・雑草・持てる本数のルールに反する手順があると、ブラウザーのコンソールに `[match:<id>]` で始まる警告が出ます。得点計算ページにも自動でプリセットとして並びます。

### ページを追加する・ヘッダーのリンクを変える

1. 既存のページ（例：`calculator.html`）をもとにHTMLを作り、`<!-- site-header:<ページのキー> -->` と `<!-- site-footer -->` の目印を残します。
2. `tools/sync_chrome.py` の `PAGES` にページを追加し、`python3 tools/sync_chrome.py` を実行すると、全ページのヘッダーとフッターがそろいます。

### 文章を直す

日本語と英語は `<span lang="ja">…</span><span lang="en">…</span>` のように並べて書き、表示中の言語だけが見えます。JavaScriptで出す文章は `L('日本語', 'English')` または `['日本語', 'English']` の組で書きます。

## 公開・更新

GitHubの `main` ブランチをVercelに接続しています。`npm ci` と `npm run build` が実行され、`dist/` が公開されます。

本ページは非公式の解説です。ルールの出典・注意事項はページ内の表記を参照してください。
