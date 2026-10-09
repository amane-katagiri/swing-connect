# swing-connect

自分のサイトからリンクしておくと、訪れた人が [SWING](https://github.com/amane-katagiri/swing) であなたのサイトをミラーできるようにするページです。

SWING は Nostr と IPFS で個人サイトをおたがいに保存しあうソフトウェアです。誰かのサイトをミラーするには、その人の Nostr の公開鍵を `swing mirror add <公開鍵>` か、ダッシュボードの「ミラーに追加」で登録します。swing-connect のページは、リンクに書かれた公開鍵と、その登録のしかたを表示します。

- 公開鍵（npub）をコピーするボタンと、hex 形式の表示
- `swing mirror add <npub>` のコマンド
- ダッシュボードからミラーする手順のスライド
- NIP-05 のドメインを渡すと、そのドメインに登録された公開鍵と一致するかを確かめて表示
- 公開鍵を渡さずに開くと、リンクを作る画面になる

見た目は 2 種類あります。既定の `homepage` は、星空の背景に虹色の区切り線や電光掲示板が並ぶ、懐かしい個人ホームページ風です（SWING のダッシュボードのデスクトップ画面にあるリンク集ページと同じ雰囲気）。`modern` はすっきりした今どきのページです。どちらもライト・ダークモードに対応しています。

ビルドの要らない静的なページなので、そのまま置くだけで動きます。依存パッケージはありません。

## リンクの作り方

公開鍵を付けずにページを開くと、リンクを作る画面になります。公開鍵・ドメイン・色を入れると、そのままコピーできるリンクと、サイトに貼る HTML ができます。「プレビューの配色」で「ライト」「ダーク」を選ぶと、OS の設定を変えずに両方の色を確かめられます（この切り替えはこの画面だけのもので、リンクには入りません）。「サイトに貼る HTML」を開くと、バナー画像もダウンロードできます。画像を自分のサイトに置いて使う前提なので、コピーされる HTML の `<img src>` は画像のファイル名だけになります（直リンクにはしません）。バナーは `SWING_CONNECT_BANNERS` で変えられます。

手で書くときは、次の URL パラメータを使います。

| パラメータ | 必須 | 内容 |
|---|---|---|
| `key` | ○ | 公開鍵。`npub1…`・`nprofile1…`・64 文字の hex のどれか |
| `nip05` | | NIP-05 のドメイン。`example.com` か `_@example.com`（名前は `_` だけ） |
| `light` | | ライトモードのキーカラー。`rrggbb` か `#rrggbb`（`#` は `%23` にする） |
| `dark` | | ダークモードのキーカラー。形式は `light` と同じ |

```text
https://example.github.io/swing-connect/?key=npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6
https://example.github.io/swing-connect/?key=npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6&nip05=example.com
https://example.github.io/swing-connect/?key=npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6&light=b0306a&dark=ffb3d1
```

- `nip05` を付けると、ページを開いたブラウザが `https://{ドメイン}/.well-known/nostr.json?name=_` を取りに行き、`names._` が `key` の公開鍵と一致すれば「確認済み」、違えば警告を出します。リダイレクトは追わず、10 秒で諦めます。ブラウザから読むので、`nostr.json` に `Access-Control-Allow-Origin: *` が付いていないと「確認できませんでした」になります。
- 色は、ボタンや見出しの色と、背景・枠のほのかな色づけに使います。ボタンの文字色（黒か白）と、背景に対して読める濃さのリンク色は自動で決まります。
- 公開鍵を読めない、または使えない公開鍵のときは、エラーを出してリンクを作る画面になります。

## 自分用に作り変える（フォーク）

ページの見出しや色、表示できる公開鍵などを、ビルド時の環境変数で変えられます。

| 環境変数 | 既定値 | 内容 |
|---|---|---|
| `SWING_CONNECT_THEME` | `homepage` | 見た目。`homepage`（個人ホームページ風）か `modern` |
| `SWING_CONNECT_TITLE` | SWING Connect | ページの見出し |
| `SWING_CONNECT_DESCRIPTION` | （SWING の説明） | 見出しの下の説明文 |
| `SWING_CONNECT_NIP05` | `true` | `nip05` パラメータを使うか（`true` / `false`） |
| `SWING_CONNECT_LIGHT_COLOR` | `0645ad` | ライトモードの既定の色 |
| `SWING_CONNECT_DARK_COLOR` | `7dff3c` | ダークモードの既定の色 |
| `SWING_CONNECT_CUSTOM_COLORS` | `true` | `light` / `dark` パラメータで色を変えられるか（`true` / `false`） |
| `SWING_CONNECT_ALLOWED_KEYS` | （空） | 表示を許す公開鍵。npub・nprofile・hex をスペースかカンマで区切る |
| `SWING_CONNECT_SWING_URL` | `https://github.com/amane-katagiri/swing` | 「SWING をインストールする」のリンク先 |
| `SWING_CONNECT_SITE_URL` | （空。GitHub Pages では Pages の URL） | 公開先の URL。リンクを貼ったときのプレビュー画像（`og:image`）の絶対 URL に使う。空なら画像なしで見出しと説明文だけを出す |
| `SWING_CONNECT_BANNERS` | `assets/swing-banner.gif` | リンク作成画面で配るバナー画像。http(s) の URL か、サイト内の相対パス（`assets/foo.gif` など）をカンマで区切る。`,` だけにするとバナーを出さない |

`SWING_CONNECT_ALLOWED_KEYS` が空ならどの公開鍵でも表示します。公開鍵を書くと、それ以外の公開鍵のリンクはエラーになります。1 つだけ書くと、`key` を付けずに開いたときもその公開鍵のページになるので、自分専用のページとして `?key=…` なしでリンクできます。

値が正しくない（色の形式が違う・公開鍵を読めないなど）と、ビルドはどの変数が悪いかを表示して失敗します。

ビルドすると、`SWING_CONNECT_TITLE` と `SWING_CONNECT_DESCRIPTION` がページの `<title>` と、SNS やチャットにリンクを貼ったときのプレビュー（OGP）に入ります。プレビューの画像は星空にロゴを置いた `assets/og/og.png` です。プレビューを読むサービスは JavaScript を動かさないので、どの `?key=…` のリンクでも同じプレビューになります。

### GitHub Pages で公開する

1. このリポジトリをフォークします。
2. フォークの **Settings → Pages** で、**Source** を **GitHub Actions** にします。
3. **Settings → Secrets and variables → Actions → Variables** に、変えたい `SWING_CONNECT_*` を登録します（変えないものは登録しなくて構いません）。
4. **Actions** の `pages` ワークフローを実行します（`main` に push しても動きます）。

Variables を変えたら、もう一度ワークフローを実行すると反映されます。

### 手元でビルドする

Node.js 20 以降で、依存のインストールは要りません。

```sh
cp .env.example .env    # 値を書き込む
node --env-file=.env build.mjs
```

`dist/` にサイトと、環境変数から作った `config.js` ができます。`dist/` の中身をそのまま静的ホスティングに置いてください。出力先は `node build.mjs <ディレクトリ>` で変えられます。

### config.js を直接書き換える

ビルドしない場合は、リポジトリ直下の `config.js` を書き換えて、リポジトリをそのまま置いても動きます。`allowedKeys` には npub・nprofile・hex のどれでも書けます。`theme` を変えるときは、`index.html` の `<html data-theme="…">` も同じ値にしてください（ビルドするとこれは自動で書き換わります。違っていても表示はされますが、開いた直後に一瞬だけ別の見た目が出ます）。

## 手元で表示する

ES モジュールを使うので、ファイルを直接開く（`file://`）のではなく、HTTP で配信して開きます。

```sh
python3 -m http.server 8000
```

<http://localhost:8000/> を開くとリンクを作る画面、<http://localhost:8000/?key=npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6> で公開鍵のページになります。

## テスト

```sh
node --test
```

公開鍵の読み取り（npub・nprofile・hex）、ドメインと色の検証、表示を許す公開鍵の判定、`build.mjs` の環境変数の扱いを確かめます。

## ライセンス

[MIT](LICENSE)

`assets/fonts/` の PixelMplus12 は M+ FONT LICENSE です（[`assets/fonts/LICENSE-PixelMplus.txt`](assets/fonts/LICENSE-PixelMplus.txt)）。
