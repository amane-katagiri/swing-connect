import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { EMOJI } from "../lib/emoji.js";
import { emojiChar, fingerprint } from "../lib/key-emoji.js";

test("the list has 256 distinct single code points, each with an image", () => {
  assert.equal(EMOJI.length, 256);
  assert.equal(new Set(EMOJI).size, 256);
  for (const id of EMOJI) {
    assert.match(id, /^[0-9a-f]{4,5}$/);
    assert.ok(existsSync(new URL(`../assets/emoji/${id}.svg`, import.meta.url)), id);
  }
});

test("the fingerprint matches the test vectors of the SWING spec", async () => {
  const vectors = [
    ["79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798", ["1f43c", "1f421", "1f33f", "1f52e"]],
    ["3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d", ["1f981", "1f3a0", "1f94c", "1f36f"]],
    ["2b9404067c270c5fccd0c249778bd27c432672acbd0a41f773868b4e6a01722c", ["1f422", "1f36b", "1f3ae", "1f363"]],
  ];
  for (const [hex, expected] of vectors) assert.deepEqual(await fingerprint(hex), expected, hex);
});

test("a malformed key has no fingerprint", async () => {
  assert.equal(await fingerprint("79BE"), null);
});

test("emojiChar adds the emoji presentation selector", () => {
  assert.equal(emojiChar("2764"), "❤️");
});
