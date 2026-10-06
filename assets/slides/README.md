# スライド画像

公開鍵を渡すページのスライドショー用。すべて PNG・1280×800・等倍・日本語 UI。

| ファイル | 内容 | 作り方 |
|---|---|---|
| `open-cli.png` | ターミナルで `swing dashboard open` を実行した出力（ログイン URL とログインコード） | `src/open-cli.html`（モック） |
| `open-tray.png` | Windows 95 風のタスクバーで、SWING のトレイアイコンの右クリックメニューから「ダッシュボードを開く」を選ぶ場面 | `src/open-tray.html`（モック） |
| `desktop.png` | ダッシュボードのデスクトップ画面。カーソルは「ミラー」ボタン | デモ環境の実画面 |
| `mirror-add.png` | 「ミラーに追加」ダイアログに npub を入れ、OK を押す直前 | デモ環境の実画面 |
| `mirror-added.png` | OK を押した後。ダイアログが閉じ、ステータスバーに追加の結果が出る | デモ環境の実画面 |

## 撮り方

### モック（`open-cli.png`・`open-tray.png`）

`src/*.html` を `agent-browser` で開き、ビューポートを 1280×800 にして撮る。画面の文面は実装（`swing dashboard open`・トレイのメニュー）に合わせてあり、ログインコードは架空の値。`open-tray.png` はダッシュボードのデスクトップ画面と見分けられるよう、背景を青緑ではなく紫の模様の壁紙にしている。文字は SWING のダッシュボードと同じ PixelMplus12（`src/fonts/`、M+ FONT LICENSE）を 12px で描いて 2 倍に拡大し、トレイアイコンには `swing-tray` が実際に出す `tray/assets/icon-64.png`（`src/tray-icon.png`）を使う。ドット絵のカーソルを重ねるため、`src/cursor-init.js` を `--init-script` に渡してマウスを動かす。

```sh
agent-browser open --init-script src/cursor-init.js file://$PWD/src/open-tray.html
agent-browser set viewport 1280 800
agent-browser mouse move 1000 470
agent-browser mouse move 1192 556
agent-browser screenshot open-tray.png
```

### 実画面（`desktop.png`・`mirror-add.png`・`mirror-added.png`）

1. SWING のリポジトリでデモ環境を上げる（`docker/demo/demo.sh up --seed`）。
2. `docker/demo/demo.sh exec mirror swing dashboard open --no-browser` が出す URL でログインする。
3. `src/dashboard-init.js`（ドット絵カーソル、日本語、サイドナビを畳む、マスコットを左に寄せる乱数）を `--init-script` に渡して `http://127.0.0.1:18082/#/desktop` を開く。
4. 「ミラー」ボタンにカーソルを置いて `desktop.png`、クリックしてまだフォローしていないデモの人物（dave）の npub を入力して `mirror-add.png`、OK を押して `mirror-added.png`。
5. `mirror-added.png` はマスコットが左下のステータスバーの文字に重ならないよう、`http://127.0.0.1:18082/?mascot=right#/desktop` で開き直して撮る（`src/dashboard-init.js` が乱数を右寄りにする）。OK を押したあと、マスコットの体の中ほどを押して右上へ 200px ほど持ち上げ、つまんだまま撮る。マーキーの文字が見えていて NEW バッジが点灯しているコマになるまで撮り直す。
6. 撮り終えたら `swing mirror remove <npub>` でデモ環境を元に戻す。
