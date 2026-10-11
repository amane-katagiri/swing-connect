import { EMOJI } from "./emoji.js";

const LENGTH = 4;
const HEX_KEY = /^[0-9a-f]{64}$/;

export async function fingerprint(hex) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || !HEX_KEY.test(hex)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const digest = new Uint8Array(await subtle.digest("SHA-256", bytes));
  return [...digest.slice(0, LENGTH)].map((b) => EMOJI[b]);
}

// Some entries default to text presentation; VS16 makes them read as emoji and is harmless on the rest.
export function emojiChar(id) {
  return `${String.fromCodePoint(parseInt(id, 16))}️`;
}
