import assert from "node:assert/strict";
import { test } from "node:test";
import { bech32Encode, npubFromHex, parseKey } from "../lib/nip19.js";

const NPUB = "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
const HEX = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const NPROFILE =
  "nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p";

test("npub decodes to the NIP-19 test vector", () => {
  assert.equal(parseKey(NPUB), HEX);
});

test("hex encodes to the NIP-19 npub", () => {
  assert.equal(npubFromHex(HEX), NPUB);
});

test("nprofile yields the pubkey from TLV type 0", () => {
  assert.equal(parseKey(NPROFILE), HEX);
});

test("hex is accepted in either case and normalized to lowercase", () => {
  assert.equal(parseKey(HEX), HEX);
  assert.equal(parseKey(HEX.toUpperCase()), HEX);
  assert.equal(parseKey(`  ${HEX}\n`), HEX);
});

test("uppercase bech32 is accepted, mixed case is not", () => {
  assert.equal(parseKey(NPUB.toUpperCase()), HEX);
  assert.equal(parseKey(NPUB.slice(0, 10) + NPUB.slice(10).toUpperCase()), null);
});

test("a bad checksum is rejected", () => {
  const last = NPUB.at(-1) === "q" ? "p" : "q";
  assert.equal(parseKey(NPUB.slice(0, -1) + last), null);
});

test("other NIP-19 prefixes are rejected", () => {
  const bytes = Buffer.from(HEX, "hex");
  assert.equal(parseKey(bech32Encode("nsec", bytes)), null);
  assert.equal(parseKey(bech32Encode("note", bytes)), null);
});

test("an npub with the wrong payload length is rejected", () => {
  assert.equal(parseKey(bech32Encode("npub", Buffer.from(HEX.slice(0, 62), "hex"))), null);
});

test("an nprofile without a 32-byte type 0 entry is rejected", () => {
  assert.equal(parseKey(bech32Encode("nprofile", Uint8Array.from([1, 2, 0x61, 0x62]))), null);
  assert.equal(parseKey(bech32Encode("nprofile", Uint8Array.from([0, 31, ...Buffer.from(HEX, "hex").subarray(0, 31)]))), null);
  assert.equal(parseKey(bech32Encode("nprofile", Uint8Array.from([0, 32, 1, 2]))), null);
});

test("garbage is rejected", () => {
  for (const s of ["", "npub1", "hello", HEX.slice(1), `${HEX}0`, "g".repeat(64), null, undefined, 42]) {
    assert.equal(parseKey(s), null, String(s));
  }
});
