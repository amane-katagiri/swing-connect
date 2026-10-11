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

test("the fingerprint matches SWING for a known key", async () => {
  assert.deepEqual(
    await fingerprint("79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
    ["1f43c", "1f421", "1f33f", "1f52e"],
  );
});

test("a malformed key has no fingerprint", async () => {
  assert.equal(await fingerprint("79BE"), null);
});

test("emojiChar adds the emoji presentation selector", () => {
  assert.equal(emojiChar("2764"), "❤️");
});
