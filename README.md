# SAKURA AVENUE | Illustrated Guide

An unofficial illustrated guide to the Kansai Spring Robocon 2027 SAKURA AVENUE rules, with animations and interactive simulations. The site follows your browser's language preferences for English or Japanese, and remembers a manually selected language.

**公開サイト:** https://lingmulongtai.github.io/sakura-avenue/

## 構成

- `index.html`: 提供されたHTML。CSS・JavaScript・SVGを内包し、ビルドやサーバー側処理は不要です。
- [関西春ロボコン2027 ルールブック（PDF）](docs/関西春ロボコン2027_ルールブック.pdf): 提供されたルールブックの原本です。
- `.nojekyll`: GitHub PagesでJekyllの処理をせず、静的ファイルをそのまま配信します。

フォントはGoogle Fontsから読み込みます。フォントを取得できない場合はシステムフォントを使用します。

## ローカルで確認

Python 3で、リポジトリのルートから実行します。

```sh
python -m http.server 8000 --bind 127.0.0.1
```

ブラウザーで http://127.0.0.1:8000/ を開きます。

## 公開・更新

GitHub Pagesの公開元は `main` ブランチのルート (`/`) です。`index.html` を更新して `main` にpushすると、自動的に再公開されます。

本ページは非公式の解説です。ルールの出典・注意事項はページ内の表記を参照してください。
