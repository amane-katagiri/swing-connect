import { parseKey } from "./nip19.js";

const LABEL = /^[a-z0-9-]{1,63}$/;
const COLOR = /^#?([0-9a-fA-F]{6})$/;

export const THEMES = Object.freeze(["homepage", "modern"]);

export function parseTheme(input) {
  const v = typeof input === "string" ? input.trim().toLowerCase() : "";
  return THEMES.includes(v) ? v : null;
}

export function normalizeDomain(input) {
  if (typeof input !== "string") return null;
  const lower = input.trim().toLowerCase();
  if (lower.length === 0 || lower.length > 253) return null;
  const labels = lower.split(".");
  if (labels.length < 2) return null;
  for (const l of labels) {
    if (!LABEL.test(l) || l.startsWith("-") || l.endsWith("-")) return null;
  }
  const last = labels[labels.length - 1];
  if (/^[0-9]+$/.test(last) || /^0x[0-9a-f]*$/.test(last)) return null;
  let host;
  try {
    host = new URL(`https://${lower}/`).hostname;
  } catch {
    return null;
  }
  return host === lower ? lower : null;
}

export function parseNip05Param(input) {
  if (typeof input !== "string") return null;
  const s = input.trim();
  const domain = s.startsWith("_@") ? s.slice(2) : s;
  return normalizeDomain(domain);
}

export function parseColor(input) {
  if (typeof input !== "string") return null;
  const m = COLOR.exec(input.trim());
  return m ? `#${m[1].toLowerCase()}` : null;
}

function channels(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function toHexColor(rgb) {
  return `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

export function luminance(hex) {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function textOn(hex) {
  return contrast(hex, "#000000") >= contrast(hex, "#ffffff") ? "#000000" : "#ffffff";
}

export function inkOn(hex, background, target = 5) {
  const toward = luminance(background) > 0.5 ? [0, 0, 0] : [255, 255, 255];
  const base = channels(hex);
  for (let t = 0; t <= 1; t += 0.05) {
    const mixed = toHexColor(base.map((v, i) => v + (toward[i] - v) * t));
    if (contrast(mixed, background) >= target) return mixed;
  }
  return toHexColor(toward);
}

export const LIGHT_BACKGROUND = "#ffffff";
export const DARK_BACKGROUND = "#111214";

export function palette(hex, mode) {
  const background = mode === "dark" ? DARK_BACKGROUND : LIGHT_BACKGROUND;
  return { seed: hex, on: textOn(hex), ink: inkOn(hex, background) };
}

export function parseAllowedKeys(input) {
  const keys = [];
  const invalid = [];
  for (const token of String(input ?? "").split(/[\s,]+/)) {
    if (!token) continue;
    const hex = parseKey(token);
    if (!hex) invalid.push(token);
    else if (!keys.includes(hex)) keys.push(hex);
  }
  return { keys, invalid };
}

export function resolveKey(param, allowed) {
  const list = Array.isArray(allowed) ? allowed : [];
  if (param === null || param === undefined || param.trim() === "") {
    return list.length === 1 ? { status: "ok", hex: list[0], fromConfig: true } : { status: "none" };
  }
  const hex = parseKey(param);
  if (!hex) return { status: "invalid" };
  if (list.length > 0 && !list.includes(hex)) return { status: "not-allowed", hex };
  return { status: "ok", hex, fromConfig: false };
}

export const DEFAULT_BANNERS = Object.freeze(["assets/swing-banner.gif"]);

export function parseBannerEntry(input) {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (s === "" || /[\s\\\u0000-\u001f\u007f]/.test(s) || s.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    let url;
    try {
      url = new URL(s);
    } catch {
      return null;
    }
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  }
  return s;
}

export function parseBanners(input) {
  if (input === undefined || input === null || String(input).trim() === "") {
    return { banners: [...DEFAULT_BANNERS], invalid: [] };
  }
  const banners = [];
  const invalid = [];
  for (const raw of String(input).split(",")) {
    const entry = raw.trim();
    if (entry === "") continue;
    const banner = parseBannerEntry(entry);
    if (!banner) invalid.push(entry);
    else if (!banners.includes(banner)) banners.push(banner);
  }
  return { banners, invalid };
}

export function bannerFileName(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return "banner.png";
  }
  const segment = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
  let name = null;
  try {
    name = decodeURIComponent(segment);
  } catch {}
  const usable =
    name !== null &&
    name !== "" &&
    name !== "." &&
    name !== ".." &&
    !/[\/\\\u0000-\u001f\u007f]/.test(name) &&
    !/^\.+$/.test(name);
  if (usable) return encodeURIComponent(name);
  const ext = /\.([a-z0-9]{1,5})$/i.exec(segment);
  return `banner.${ext ? ext[1].toLowerCase() : "png"}`;
}
