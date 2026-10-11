import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "emoji");
const SYMBOL = /<symbol id="e-([0-9a-f]+)" viewBox="0 0 36 36">([\s\S]*?)<\/symbol>/g;

const swing = process.argv[2];
if (!swing) {
  console.error("usage: node tools/import-emoji.mjs <SWING のリポジトリ>");
  process.exit(2);
}

const ids = readFileSync(join(swing, "web", "emoji", "list.txt"), "utf8")
  .split("\n")
  .map((line) => line.split(/\s+/)[0])
  .filter((id) => id !== "");
if (ids.length !== 256 || new Set(ids).size !== 256) throw new Error("list.txt は重複の無い 256 行のはずです");

const symbols = new Map();
for (const [, id, body] of readFileSync(join(swing, "web", "emoji.svg"), "utf8").matchAll(SYMBOL)) symbols.set(id, body);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const id of ids) {
  const body = symbols.get(id);
  if (body === undefined) throw new Error(`emoji.svg に e-${id} がありません`);
  writeFileSync(join(OUT, `${id}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">${body}</svg>\n`);
}
const SEPARATOR = "-".repeat(79);
const license = readFileSync(join(swing, "web", "emoji", "LICENSE-twemoji.txt"), "utf8");
const source = license.match(/^Source: .*$/m);
const full = license.indexOf(SEPARATOR);
if (!source || full < 0) throw new Error("LICENSE-twemoji.txt の形式が想定と違います");
writeFileSync(join(OUT, "LICENSE-twemoji.txt"), `Twemoji graphics by Twitter, Inc and other contributors, licensed under CC-BY 4.0.
https://creativecommons.org/licenses/by/4.0/

${source[0]}

256 of the Twemoji images are bundled into swing-connect (assets/emoji/) to show
emoji fingerprints of Nostr public keys. They are taken from the SWING dashboard
sprite, one file per image; the drawings are not modified (one image is shifted
to fit a square box).

The full license text follows.

${license.slice(full)}`);

const list = ids.map((id) => `"${id}"`).join(",\n  ");
writeFileSync(join(ROOT, "lib", "emoji.js"), `export const EMOJI = [\n  ${list},\n];\n`);
