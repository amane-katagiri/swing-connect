import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import defaults from "./config.js";
import { parseAllowedKeys, parseColor, parseTheme, THEMES } from "./lib/validate.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE_FILES = ["index.html", "style.css", "homepage.css", "app.js", "lib", "assets"];
const THEME_ATTR = /(<html\b[^>]*\bdata-theme=")[a-z]+(")/;
const PREFIX = "SWING_CONNECT_";
const SLIDES = join(ROOT, "assets", "slides");

function shipped(src) {
  if (src === SLIDES || !src.startsWith(SLIDES)) return true;
  return dirname(src) === SLIDES && src.endsWith(".png");
}

function read(env, name) {
  const value = env[PREFIX + name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function parseBool(value) {
  const v = value.toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export function configFromEnv(env) {
  const errors = [];
  const config = { ...defaults, allowedKeys: [...defaults.allowedKeys] };

  for (const [name, field] of [["TITLE", "title"], ["DESCRIPTION", "description"]]) {
    const v = read(env, name);
    if (v === null) continue;
    if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(v)) errors.push(`${PREFIX}${name}: 制御文字は使えません`);
    else config[field] = v;
  }

  for (const [name, field] of [["NIP05", "nip05"], ["CUSTOM_COLORS", "customColors"]]) {
    const v = read(env, name);
    if (v === null) continue;
    const b = parseBool(v);
    if (b === null) errors.push(`${PREFIX}${name}: true か false を指定してください（"${v}"）`);
    else config[field] = b;
  }

  for (const [name, field] of [["LIGHT_COLOR", "lightColor"], ["DARK_COLOR", "darkColor"]]) {
    const v = read(env, name);
    if (v === null) continue;
    const c = parseColor(v);
    if (!c) errors.push(`${PREFIX}${name}: rrggbb か #rrggbb の形で指定してください（"${v}"）`);
    else config[field] = c;
  }

  const theme = read(env, "THEME");
  if (theme !== null) {
    const t = parseTheme(theme);
    if (!t) errors.push(`${PREFIX}THEME: ${THEMES.join(" か ")} を指定してください（"${theme}"）`);
    else config.theme = t;
  }

  const keys = read(env, "ALLOWED_KEYS");
  if (keys !== null) {
    const { keys: hex, invalid } = parseAllowedKeys(keys);
    if (invalid.length > 0) errors.push(`${PREFIX}ALLOWED_KEYS: 公開鍵として読めません: ${invalid.join(" ")}`);
    else config.allowedKeys = hex;
  }

  const url = read(env, "SWING_URL");
  if (url !== null) {
    let parsed = null;
    try {
      parsed = new URL(url);
    } catch {}
    if (!parsed || (parsed.protocol !== "https:" && parsed.protocol !== "http:")) {
      errors.push(`${PREFIX}SWING_URL: http(s) の URL を指定してください（"${url}"）`);
    } else {
      config.swingUrl = parsed.href;
    }
  }

  if (errors.length > 0) throw new Error(errors.join("\n"));
  return Object.freeze(config);
}

export function serializeConfig(config) {
  const json = JSON.stringify(config, null, 2).replace(
    /[<>&\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  return `export default Object.freeze(${json});\n`;
}

export function build(outDir, env) {
  const config = configFromEnv(env);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const name of SITE_FILES) cpSync(join(ROOT, name), join(outDir, name), { recursive: true, filter: shipped });
  writeFileSync(join(outDir, "config.js"), serializeConfig(config));
  const indexPath = join(outDir, "index.html");
  const html = readFileSync(indexPath, "utf8");
  if (!THEME_ATTR.test(html)) throw new Error("index.html の <html> に data-theme がありません");
  writeFileSync(indexPath, html.replace(THEME_ATTR, `$1${config.theme}$2`));
  return config;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outDir = process.argv[2] ?? join(ROOT, "dist");
  try {
    const config = build(outDir, process.env);
    console.log(`built ${outDir}`);
    console.log(JSON.stringify(config, null, 2));
  } catch (e) {
    console.error(`build failed:\n${e.message}`);
    process.exit(1);
  }
}
