# AGENTS.md

swing-connect（SWING でサイトをミラーしてもらうためのリンク先ページ）のリポジトリで作業するエージェント向けの規則。

- 素の HTML / CSS / ES モジュールだけで書く。フレームワークと npm の依存は入れない（`package.json` は `type` と scripts のためだけに置いている）。
- コメントは原則書かない。書くなら「自然な実装を避けた理由」を 1 行だけ。
- `lib/` のモジュールはブラウザ（`app.js`）とビルド（`build.mjs`）の両方で使う。Node 専用・ブラウザ専用の API を入れない。
- URL パラメータや設定から来た文字列は `textContent` でだけ表示する。CSS 変数は検証済みの値だけを `style.setProperty` で入れる。
- 見た目は `<html data-theme>`（`homepage` / `modern`）で切り替える。`style.css` が土台（modern）で、`homepage.css` は `[data-theme="homepage"]` に限った上書きだけを書く。modern を変えずに homepage を直せるようにする。
- `homepage.css` の `font-size`・`line-height` は `calc(<整数>px * var(--hp-scale))` で書く。`app.js` が `--hp-scale` を「デバイスピクセル比を丸めた整数 ÷ デバイスピクセル比」にして、ブラウザの拡大率に関わらずドット絵フォントを整数倍で描かせている。
- ダークモードの色は、`@media (prefers-color-scheme: dark)` 内の `:not([data-scheme])` と `[data-scheme="dark"]` の 2 か所に同じ値で書く（リンク作成画面の配色の切り替えが `<html data-scheme>` を使う）。ダークモードで変わる値はこの 2 か所のトークンにまとめ、個別のルールに `prefers-color-scheme` を書かない。
- 設定を増やすときは `config.js`・`build.mjs`・`.env.example`・`.github/workflows/pages.yml`・README を同じ変更で更新する。
- `node --test` を通す。テストで外部ネットワークに接続しない。
- 見た目を変えたら、ローカルで配信してライト・ダーク・幅 375px で表示を確かめる。
- `assets/slides/` の画像は SWING のダッシュボードの画面から撮る。ファイル名を変えたら `app.js` の `STEPS` も直す。
