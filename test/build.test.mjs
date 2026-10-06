import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { build, configFromEnv, serializeConfig } from "../build.mjs";
import defaults from "../config.js";

const NPUB = "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
const HEX = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";

test("an empty environment keeps the defaults", () => {
  assert.deepEqual({ ...configFromEnv({}) }, { ...defaults, allowedKeys: [] });
});

test("empty strings count as unset", () => {
  assert.deepEqual({ ...configFromEnv({ SWING_CONNECT_TITLE: "", SWING_CONNECT_NIP05: "  " }) }, { ...defaults, allowedKeys: [] });
});

test("every variable is read and normalized", () => {
  const config = configFromEnv({
    SWING_CONNECT_THEME: "Modern",
    SWING_CONNECT_TITLE: "  わたしのサイト ",
    SWING_CONNECT_DESCRIPTION: "説明",
    SWING_CONNECT_NIP05: "False",
    SWING_CONNECT_CUSTOM_COLORS: "false",
    SWING_CONNECT_LIGHT_COLOR: "AA0000",
    SWING_CONNECT_DARK_COLOR: "#ffcc00",
    SWING_CONNECT_ALLOWED_KEYS: `${NPUB}, ${HEX.toUpperCase()}`,
    SWING_CONNECT_SWING_URL: "https://example.com/swing",
  });
  assert.deepEqual({ ...config }, {
    theme: "modern",
    title: "わたしのサイト",
    description: "説明",
    nip05: false,
    customColors: false,
    lightColor: "#aa0000",
    darkColor: "#ffcc00",
    allowedKeys: [HEX],
    swingUrl: "https://example.com/swing",
  });
});

test("invalid values fail with every problem named", () => {
  assert.throws(
    () =>
      configFromEnv({
        SWING_CONNECT_NIP05: "yes",
        SWING_CONNECT_LIGHT_COLOR: "blue",
        SWING_CONNECT_ALLOWED_KEYS: `${NPUB} npub1broken`,
        SWING_CONNECT_SWING_URL: "javascript:alert(1)",
        SWING_CONNECT_TITLE: "a\u0007b",
        SWING_CONNECT_THEME: "retro",
      }),
    (e) => {
      for (const name of ["NIP05", "LIGHT_COLOR", "ALLOWED_KEYS", "SWING_URL", "TITLE", "THEME"]) {
        assert.match(e.message, new RegExp(`SWING_CONNECT_${name}:`));
      }
      assert.match(e.message, /npub1broken/);
      return true;
    },
  );
});

test("serialized config escapes markup and line separators", async () => {
  const text = serializeConfig({ title: "</script><b>&\u2028" });
  assert.doesNotMatch(text, /[<>&\u2028]/);
  const dir = mkdtempSync(join(tmpdir(), "swing-connect-"));
  try {
    const file = join(dir, "c.mjs");
    await import("node:fs").then((fs) => fs.writeFileSync(file, text));
    const mod = await import(pathToFileURL(file).href);
    assert.equal(mod.default.title, "</script><b>&\u2028");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("build writes the site and a config module into the output directory", async () => {
  const dir = mkdtempSync(join(tmpdir(), "swing-connect-"));
  try {
    build(dir, { SWING_CONNECT_ALLOWED_KEYS: NPUB, SWING_CONNECT_TITLE: "T" });
    for (const f of ["index.html", "style.css", "app.js", "lib/nip19.js", "lib/validate.js", "assets/swing-lockup.svg"]) {
      assert.ok(existsSync(join(dir, f)), f);
    }
    assert.ok(!existsSync(join(dir, "build.mjs")));
    const mod = await import(pathToFileURL(join(dir, "config.js")).href);
    assert.deepEqual(mod.default.allowedKeys, [HEX]);
    assert.equal(mod.default.title, "T");
    assert.match(readFileSync(join(dir, "config.js"), "utf8"), /^export default Object\.freeze\(/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a failed build leaves no output", () => {
  const dir = join(mkdtempSync(join(tmpdir(), "swing-connect-")), "out");
  assert.throws(() => build(dir, { SWING_CONNECT_DARK_COLOR: "nope" }));
  assert.ok(!existsSync(dir));
});

test("only the slide images are shipped from assets/slides", () => {
  const dir = mkdtempSync(join(tmpdir(), "swing-connect-"));
  try {
    build(dir, {});
    for (const f of ["open-cli.png", "desktop.png"]) assert.ok(existsSync(join(dir, "assets/slides", f)), f);
    assert.ok(!existsSync(join(dir, "assets/slides/src")));
    assert.ok(!existsSync(join(dir, "assets/slides/README.md")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the theme defaults to homepage and is written into index.html", () => {
  for (const [env, theme] of [[{}, "homepage"], [{ SWING_CONNECT_THEME: "modern" }, "modern"]]) {
    const dir = mkdtempSync(join(tmpdir(), "swing-connect-"));
    try {
      assert.equal(build(dir, env).theme, theme);
      const html = readFileSync(join(dir, "index.html"), "utf8");
      assert.match(html, new RegExp(`<html lang="ja" data-theme="${theme}">`));
      assert.ok(existsSync(join(dir, "homepage.css")));
      assert.ok(existsSync(join(dir, "assets/fonts/pixelmplus12-regular.woff2")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
