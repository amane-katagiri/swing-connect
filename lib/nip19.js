const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const MAX_LENGTH = 5000;
const HEX_KEY = /^[0-9a-f]{64}$/;

function polymod(values) {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >>> i) & 1) chk ^= GENERATOR[i];
    }
  }
  return chk >>> 0;
}

function hrpExpand(hrp) {
  const out = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

function convertBits(data, from, to, pad) {
  let acc = 0;
  let bits = 0;
  const out = [];
  const maxv = (1 << to) - 1;
  const maxAcc = (1 << (from + to - 1)) - 1;
  for (const value of data) {
    acc = ((acc << from) | value) & maxAcc;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) out.push((acc << (to - bits)) & maxv);
  } else if (bits >= from || ((acc << (to - bits)) & maxv)) {
    return null;
  }
  return out;
}

export function bech32Decode(input) {
  if (typeof input !== "string" || input.length < 8 || input.length > MAX_LENGTH) return null;
  const lower = input.toLowerCase();
  if (input !== lower && input !== input.toUpperCase()) return null;
  const sep = lower.lastIndexOf("1");
  if (sep < 1 || sep + 7 > lower.length) return null;
  const hrp = lower.slice(0, sep);
  for (let i = 0; i < hrp.length; i++) {
    const c = hrp.charCodeAt(i);
    if (c < 33 || c > 126) return null;
  }
  const data = [];
  for (const ch of lower.slice(sep + 1)) {
    const v = CHARSET.indexOf(ch);
    if (v < 0) return null;
    data.push(v);
  }
  if (polymod([...hrpExpand(hrp), ...data]) !== 1) return null;
  const bytes = convertBits(data.slice(0, -6), 5, 8, false);
  if (!bytes) return null;
  return { hrp, bytes: Uint8Array.from(bytes) };
}

export function bech32Encode(hrp, bytes) {
  const data = convertBits(bytes, 8, 5, true);
  const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const mod = polymod(values) ^ 1;
  let out = hrp + "1";
  for (const v of data) out += CHARSET[v];
  for (let i = 0; i < 6; i++) out += CHARSET[(mod >>> (5 * (5 - i))) & 31];
  return out;
}

function toHex(bytes) {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function pubkeyFromNprofile(bytes) {
  let i = 0;
  while (i + 2 <= bytes.length) {
    const type = bytes[i];
    const len = bytes[i + 1];
    const start = i + 2;
    if (start + len > bytes.length) return null;
    if (type === 0) return len === 32 ? toHex(bytes.subarray(start, start + 32)) : null;
    i = start + len;
  }
  return null;
}

export function parseKey(input) {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (s.length === 64 && HEX_KEY.test(s.toLowerCase())) return s.toLowerCase();
  const decoded = bech32Decode(s);
  if (!decoded) return null;
  if (decoded.hrp === "npub") return decoded.bytes.length === 32 ? toHex(decoded.bytes) : null;
  if (decoded.hrp === "nprofile") return pubkeyFromNprofile(decoded.bytes);
  return null;
}

export function npubFromHex(hex) {
  if (!HEX_KEY.test(hex)) throw new Error("invalid hex public key");
  return bech32Encode("npub", fromHex(hex));
}
