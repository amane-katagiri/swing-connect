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
