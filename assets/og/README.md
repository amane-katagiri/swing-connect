# プレビュー画像

`og.png` は、リンクを貼ったときのプレビュー（`og:image`）に使う 1200×630 の PNG。homepage テーマと同じ星空の背景の真ん中に、ダークモード用のロックアップ（`../swing-lockup-dark.svg`）を置いている。文字を入れていないので、見出しを変えたフォークでもそのまま使える。

## 撮り方

`src/og.html` を `agent-browser` で開き、ビューポートを 1200×630 にして撮る。星空は `homepage.css` の `html[data-theme="homepage"]` の背景と同じものなので、背景を変えたら `src/og.html` も合わせてから撮り直す。

```sh
agent-browser open file://$PWD/src/og.html
agent-browser set viewport 1200 630
agent-browser screenshot og.png
```
