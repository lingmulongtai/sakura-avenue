# SAKURA AVENUE 図解

SAKURA AVENUEのルールを、アニメーション・図解・シミュレーターで学べる非公式の解説ページです。日本語・英語の切り替えに対応しています。

**公開サイト:** https://lingmulongtai.github.io/sakura-avenue/

## 構成

- `index.html`: 提供されたHTML。CSS・JavaScript・SVGを内包し、ビルドやサーバー側処理は不要です。
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
