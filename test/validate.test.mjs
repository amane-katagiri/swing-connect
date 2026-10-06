import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contrast,
  normalizeDomain,
  palette,
  parseAllowedKeys,
  parseColor,
  parseNip05Param,
  parseTheme,
  parseBannerEntry,
  parseBanners,
  bannerFileName,
  resolveKey,
  textOn,
} from "../lib/validate.js";

const NPUB = "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
const HEX = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const OTHER = "a".repeat(64);

test("valid domains are normalized to lowercase", () => {
  assert.equal(normalizeDomain("Example.COM"), "example.com");
  assert.equal(normalizeDomain("a-b.example.co.jp"), "a-b.example.co.jp");
  assert.equal(normalizeDomain(`${"a".repeat(63)}.com`), `${"a".repeat(63)}.com`);
});

test("invalid domains are rejected", () => {
  const bad = [
    "",
    "localhost",
    "example.com/",
    "example.com:443",
    "_@example.com",
    "a@example.com",
    "exa mple.com",
    "-example.com",
    "example-.com",
    "example..com",
    ".example.com",
    "example.com.",
    "exa_mple.com",
    `${"a".repeat(64)}.com`,
    `${"a.".repeat(127)}com`,
    "127.0.0.1",
    "0x7f.1",
    "example.123",
    "例え.jp",
  ];
  for (const d of bad) assert.equal(normalizeDomain(d), null, d);
});

test("nip05 param accepts a bare domain or _@domain only", () => {
  assert.equal(parseNip05Param("example.com"), "example.com");
  assert.equal(parseNip05Param("_@Example.com"), "example.com");
  assert.equal(parseNip05Param("bob@example.com"), null);
  assert.equal(parseNip05Param("_@_@example.com"), null);
  assert.equal(parseNip05Param(null), null);
});

test("colors accept rrggbb with or without #", () => {
  assert.equal(parseColor("0645AD"), "#0645ad");
  assert.equal(parseColor("#7dff3c"), "#7dff3c");
  for (const c of ["", "#fff", "fff", "#0645ad0", "red", "#gggggg", "##0645ad", "0645ad;x:y", null]) {
    assert.equal(parseColor(c), null, String(c));
  }
});

test("text on an accent picks the higher-contrast of black and white", () => {
  assert.equal(textOn("#0645ad"), "#ffffff");
  assert.equal(textOn("#7dff3c"), "#000000");
  assert.equal(textOn("#ffff00"), "#000000");
});

test("palette ink is readable on its background", () => {
  for (const hex of ["#ffff00", "#7dff3c", "#0645ad", "#000000", "#ffffff", "#ff0000"]) {
    assert.ok(contrast(palette(hex, "light").ink, "#ffffff") >= 4.5, hex);
    assert.ok(contrast(palette(hex, "dark").ink, "#111214") >= 4.5, hex);
  }
  assert.equal(palette("#0645ad", "light").ink, "#0645ad");
});

test("allowed keys accept any key format, separated by spaces or commas", () => {
  const { keys, invalid } = parseAllowedKeys(` ${NPUB}, ${OTHER.toUpperCase()}\n${HEX} `);
  assert.deepEqual(keys, [HEX, OTHER]);
  assert.deepEqual(invalid, []);
  assert.deepEqual(parseAllowedKeys("npub1bad, nope").invalid, ["npub1bad", "nope"]);
  assert.deepEqual(parseAllowedKeys("").keys, []);
});

test("resolveKey with no allowlist accepts any valid key", () => {
  assert.deepEqual(resolveKey(NPUB, []), { status: "ok", hex: HEX, fromConfig: false });
  assert.deepEqual(resolveKey(null, []), { status: "none" });
  assert.deepEqual(resolveKey("  ", []), { status: "none" });
  assert.deepEqual(resolveKey("npub1nope", []), { status: "invalid" });
});

test("resolveKey with an allowlist refuses unlisted keys", () => {
  assert.deepEqual(resolveKey(OTHER, [HEX]), { status: "not-allowed", hex: OTHER });
  assert.deepEqual(resolveKey(HEX, [OTHER, HEX]), { status: "ok", hex: HEX, fromConfig: false });
  assert.deepEqual(resolveKey("bad", [HEX]), { status: "invalid" });
});

test("resolveKey falls back to the only allowed key when none is given", () => {
  assert.deepEqual(resolveKey(null, [HEX]), { status: "ok", hex: HEX, fromConfig: true });
  assert.deepEqual(resolveKey(null, [HEX, OTHER]), { status: "none" });
});

test("themes are homepage or modern only", () => {
  assert.equal(parseTheme("homepage"), "homepage");
  assert.equal(parseTheme(" Modern "), "modern");
  for (const t of ["", "retro", "modern2", null, undefined]) assert.equal(parseTheme(t), null, String(t));
});

test("banner lists: unset and empty use the default, commas alone mean none", () => {
  assert.deepEqual(parseBanners(undefined), { banners: ["assets/swing-banner.gif"], invalid: [] });
  assert.deepEqual(parseBanners(""), { banners: ["assets/swing-banner.gif"], invalid: [] });
  assert.deepEqual(parseBanners(","), { banners: [], invalid: [] });
  assert.deepEqual(parseBanners(" , "), { banners: [], invalid: [] });
});

test("banner lists keep valid entries trimmed and report bad ones", () => {
  assert.deepEqual(parseBanners(" assets/a.gif ,, https://example.com/x.png, /img/b.png , assets/a.gif"), {
    banners: ["assets/a.gif", "https://example.com/x.png", "/img/b.png"],
    invalid: [],
  });
  assert.deepEqual(parseBanners("assets/a.gif, javascript:alert(1), //evil.example/x.png").invalid, [
    "javascript:alert(1)",
    "//evil.example/x.png",
  ]);
});

test("banner entries reject non-http schemes, protocol-relative URLs and backslashes", () => {
  for (const bad of [
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:image/gif;base64",
    "ftp://example.com/x.gif",
    "//example.com/x.gif",
    "assets\\x.gif",
    "a b.gif",
    "",
    null,
  ]) {
    assert.equal(parseBannerEntry(bad), null, String(bad));
  }
  assert.equal(parseBannerEntry("HTTPS://Example.com/x.png"), "https://example.com/x.png");
  assert.equal(parseBannerEntry("assets/swing-banner.gif"), "assets/swing-banner.gif");
});

test("banner file names come from the last path segment, safely re-encoded", () => {
  const cases = [
    ["http://127.0.0.1:8000/assets/swing-banner.gif", "swing-banner.gif"],
    ["https://example.com/img/x.png?v=2&size=88#top", "x.png"],
    ["https://example.com/my%20banner.gif", "my%20banner.gif"],
    ["https://example.com/%E3%83%90%E3%83%8A%E3%83%BC.gif", "%E3%83%90%E3%83%8A%E3%83%BC.gif"],
    ["https://example.com/x%22onerror%3D.gif", "x%22onerror%3D.gif"],
    ["https://example.com/img/", "banner.png"],
    ["https://example.com/", "banner.png"],
    ["https://example.com/a%2Fb.GIF", "banner.gif"],
    ["https://example.com/%E0%A4%A.webp", "banner.webp"],
    ["https://example.com/%2E%2E", "banner.png"],
    ["not a url", "banner.png"],
  ];
  for (const [href, name] of cases) assert.equal(bannerFileName(href), name, href);
});
