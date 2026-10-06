import config from "./config.js";
import { npubFromHex, parseKey } from "./lib/nip19.js";
import { palette, parseAllowedKeys, parseColor, parseNip05Param, parseTheme, resolveKey } from "./lib/validate.js";

const $ = (id) => document.getElementById(id);
const NIP05_TIMEOUT_MS = 10000;
const NIP05_MAX_BYTES = 64 * 1024;

const allowed = parseAllowedKeys((config.allowedKeys ?? []).join(" ")).keys;
const defaultLight = parseColor(config.lightColor ?? "") ?? "#0645ad";
const defaultDark = parseColor(config.darkColor ?? "") ?? "#7dff3c";
document.documentElement.dataset.theme = parseTheme(config.theme) ?? "homepage";

function snapPixelScale() {
  const ratio = window.devicePixelRatio || 1;
  document.documentElement.style.setProperty("--hp-scale", String(Math.max(1, Math.round(ratio)) / ratio));
  matchMedia(`(resolution: ${ratio}dppx)`).addEventListener("change", snapPixelScale, { once: true });
}
snapPixelScale();
const swingUrl = safeHttpUrl(config.swingUrl) ?? "https://github.com/amane-katagiri/swing";

function countVisit(hex) {
  const key = `swing-connect:visits:${hex}`;
  try {
    const visits = (Number.parseInt(localStorage.getItem(key) ?? "0", 10) || 0) + 1;
    localStorage.setItem(key, String(visits));
    return visits;
  } catch {
    return 1;
  }
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function applyColors(light, dark) {
  const root = document.documentElement.style;
  for (const [mode, hex] of [["light", light], ["dark", dark]]) {
    if (!parseColor(hex)) continue;
    const p = palette(parseColor(hex), mode);
    root.setProperty(`--seed-${mode}`, p.seed);
    root.setProperty(`--on-seed-${mode}`, p.on);
    root.setProperty(`--ink-${mode}`, p.ink);
  }
}

function announce(text) {
  const el = $("announce");
  el.textContent = "";
  requestAnimationFrame(() => {
    el.textContent = text;
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    area.remove();
    return ok;
  }
}

function setupCopyButtons() {
  for (const button of document.querySelectorAll("[data-copy]")) {
    const label = button.textContent;
    let timer = 0;
    button.addEventListener("click", async () => {
      const source = $(button.dataset.copy);
      const text = source.dataset.value ?? source.textContent;
      if (button.closest("[hidden]") || text.trim() === "") return;
      const ok = await copyText(text);
      button.textContent = ok ? "コピーしました" : "コピーできませんでした";
      button.classList.toggle("is-copied", ok);
      announce(ok ? "コピーしました" : "コピーできませんでした。テキストを選択してコピーしてください");
      clearTimeout(timer);
      timer = setTimeout(() => {
        button.textContent = label;
        button.classList.remove("is-copied");
      }, 1800);
    });
  }
}

async function fetchNip05(domain, hex) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NIP05_TIMEOUT_MS);
  try {
    const res = await fetch(`https://${domain}/.well-known/nostr.json?name=_`, {
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!res.ok) return { state: "error", reason: `HTTP ${res.status}` };
    const body = await res.text();
    if (body.length > NIP05_MAX_BYTES) return { state: "error", reason: "too-large" };
    const json = JSON.parse(body);
    const value = json?.names?._;
    if (typeof value === "string" && value.toLowerCase() === hex) return { state: "verified" };
    return { state: "mismatch", found: typeof value === "string" ? value : null };
  } catch (e) {
    return { state: "error", reason: e?.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

function setBadge(state, text) {
  $("nip05-badge").dataset.state = state;
  $("nip05-state").textContent = text;
}

async function showNip05(raw, hex) {
  const badge = $("nip05-badge");
  const note = $("nip05-note");
  const domain = parseNip05Param(raw);
  badge.hidden = false;
  if (!domain) {
    $("nip05-id").textContent = "NIP-05";
    setBadge("invalid", "指定が正しくありません");
    note.textContent = "リンクに書かれた NIP-05 のドメインを読めませんでした。公開鍵はリンクの内容のまま表示しています。";
    note.hidden = false;
    return;
  }
  $("nip05-id").textContent = `_@${domain}`;
  setBadge("checking", "確認中…");
  const result = await fetchNip05(domain, hex);
  if (result.state === "verified") {
    setBadge("verified", "確認済み");
    note.textContent = `${domain} に登録された公開鍵と一致しました。`;
    note.hidden = false;
  } else if (result.state === "mismatch") {
    setBadge("mismatch", "一致しません");
    $("nip05-alert-text").textContent = result.found
      ? `${domain} に登録されている公開鍵は、このページの公開鍵と違います。リンクを書き換えられている可能性があります。ミラーに追加する前に、作者のサイトなど別の経路で公開鍵を確かめてください。`
      : `${domain} には _ の公開鍵が登録されていません。ミラーに追加する前に、作者のサイトなど別の経路で公開鍵を確かめてください。`;
    $("nip05-alert").hidden = false;
    note.hidden = true;
  } else {
    setBadge("error", "確認できませんでした");
    note.textContent = result.reason === "timeout"
      ? `${domain} から応答がありませんでした。公開鍵が正しいかは、作者のサイトなど別の経路でも確かめてください。`
      : `${domain} に接続できないか、ブラウザからの確認が許可されていません（CORS）。公開鍵が正しいかは、作者のサイトなど別の経路でも確かめてください。`;
    note.hidden = false;
  }
}

const STEPS = [
  {
    title: "ダッシュボードを開く",
    variants: {
      cli: {
        src: "assets/slides/open-cli.png",
        alt: "ターミナルで swing dashboard open を実行している画面",
        caption: ["ターミナルで ", { code: "swing dashboard open" }, " を実行すると、ログインした状態でダッシュボードがブラウザで開きます。"],
      },
      tray: {
        src: "assets/slides/open-tray.png",
        alt: "タスクトレイの SWING アイコンのメニューで「ダッシュボードを開く」を選んでいる画面",
        caption: ["タスクトレイ（macOS はメニューバー）の SWING のアイコンを右クリックして、「ダッシュボードを開く」を選びます。Windows と macOS のトレイユーティリティで使えます。"],
      },
    },
  },
  {
    title: "「ミラー」を押す",
    src: "assets/slides/desktop.png",
    alt: "デスクトップ画面の SWING Explorer。ツールバーに「ミラー」ボタンがある",
    caption: ["デスクトップ画面の SWING Explorer で、ツールバーの「ミラー」（星のアイコン）を押します。"],
  },
  {
    title: "公開鍵を貼り付ける",
    src: "assets/slides/mirror-add.png",
    alt: "「ミラーに追加」ダイアログに公開鍵を貼り付けている画面",
    caption: ["「ミラーに追加」が開いたら、コピーした公開鍵を貼り付けて OK を押します。"],
  },
  {
    title: "更新を待ちましょう！",
    src: "assets/slides/mirror-added.png",
    alt: "ミラーに追加したことを知らせる画面",
    caption: ["追加できました。相手がサイトを公開すると、あなたの SWING に保存されます。"],
  },
];

function setupSlides() {
  const root = $("slides");
  const frame = $("slide-frame");
  const img = $("slide-img");
  const tabs = [$("tab-cli"), $("tab-tray")];
  const dots = [];
  let index = 0;
  let variant = "cli";

  for (const [i, step] of STEPS.entries()) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `手順 ${i + 1}: ${step.title}`);
    dot.addEventListener("click", () => go(i));
    $("slide-dots").append(dot);
    dots.push(dot);
  }

  img.addEventListener("error", () => frame.classList.add("is-missing"));
  img.addEventListener("load", () => frame.classList.remove("is-missing"));

  function current() {
    const step = STEPS[index];
    return step.variants ? step.variants[variant] : step;
  }

  function render(dir) {
    const step = STEPS[index];
    const slide = current();
    const caption = $("slide-caption");
    caption.replaceChildren();
    const title = document.createElement("b");
    title.textContent = `${index + 1}. ${step.title}`;
    caption.append(title);
    for (const part of slide.caption) {
      if (typeof part === "string") caption.append(part);
      else {
        const code = document.createElement("code");
        code.textContent = part.code;
        caption.append(code);
      }
    }
    if (img.getAttribute("src") !== slide.src) {
      frame.classList.remove("is-missing", "is-changing");
      img.src = slide.src;
      if (dir) {
        frame.style.setProperty("--dir", String(dir));
        void frame.offsetWidth;
        frame.classList.add("is-changing");
      }
    }
    img.alt = slide.alt;
    $("slide-placeholder").firstElementChild.textContent = `画像を準備中です（${slide.alt}）`;
    $("slide-count").textContent = `${index + 1} / ${STEPS.length}`;
    $("open-tabs").hidden = !step.variants;
    $("step-title").hidden = Boolean(step.variants);
    $("step-title").textContent = step.title;
    for (const tab of tabs) {
      const selected = tab.dataset.variant === variant;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    $("slide-view").setAttribute("role", step.variants ? "tabpanel" : "group");
    $("slide-view").setAttribute("aria-labelledby", step.variants ? (variant === "cli" ? "tab-cli" : "tab-tray") : "step-title");
    for (const [i, dot] of dots.entries()) {
      if (i === index) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    }
    $("slide-prev").disabled = index === 0;
    $("slide-next").disabled = index === STEPS.length - 1;
  }

  function go(i) {
    if (i < 0 || i >= STEPS.length || i === index) return;
    const dir = i > index ? 1 : -1;
    index = i;
    render(dir);
  }

  function selectVariant(v, focus) {
    variant = v;
    render(v === "cli" ? -1 : 1);
    if (focus) tabs.find((t) => t.dataset.variant === v).focus();
  }

  $("slide-prev").addEventListener("click", () => go(index - 1));
  $("slide-next").addEventListener("click", () => go(index + 1));

  for (const tab of tabs) {
    tab.addEventListener("click", () => selectVariant(tab.dataset.variant, false));
  }
  $("open-tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    e.stopPropagation();
    selectVariant(variant === "cli" ? "tray" : "cli", true);
  });

  root.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    }
  });

  let startX = null;
  let startY = 0;
  $("slide-view").addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    startX = e.clientX;
    startY = e.clientY;
  });
  $("slide-view").addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
  });
  $("slide-view").addEventListener("pointercancel", () => {
    startX = null;
  });

  render(0);
  for (const step of STEPS) {
    for (const s of step.variants ? Object.values(step.variants) : [step]) {
      const pre = new Image();
      pre.src = s.src;
    }
  }
}

function showConnect(hex, params) {
  delete document.documentElement.dataset.scheme;
  const npub = npubFromHex(hex);
  document.title = config.title;
  $("title").textContent = config.title;
  $("description").textContent = config.description;
  $("npub").textContent = npub;
  $("hex").textContent = hex;
  $("command").textContent = `swing mirror add ${npub}`;
  $("swing-link").href = swingUrl;
  $("counter").textContent = String((parseInt(hex.slice(0, 8), 16) % 900000) + countVisit(hex)).padStart(6, "0");
  setupSlides();
  $("connect").hidden = false;
  const nip05 = params.get("nip05");
  if (config.nip05 && nip05 !== null && nip05.trim() !== "") showNip05(nip05, hex);
}

function setupSchemeToggle() {
  const buttons = [...document.querySelectorAll("[data-scheme-choice]")];
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const choice = button.dataset.schemeChoice;
      if (choice === "light" || choice === "dark") document.documentElement.dataset.scheme = choice;
      else delete document.documentElement.dataset.scheme;
      for (const b of buttons) b.setAttribute("aria-pressed", String(b === button));
    });
  }
}

function showBuilder(error, params) {
  document.title = "リンクを作る — SWING Connect";
  $("builder").hidden = false;
  $("builder-link").hidden = true;

  const keyInput = $("b-key");
  const nip05Input = $("b-nip05");
  const colorOn = $("b-color-on");
  const light = $("b-light");
  const dark = $("b-dark");

  if (error) {
    $("error-title").textContent = error.title;
    $("error-text").textContent = error.text;
    $("error").hidden = false;
    keyInput.value = params.get("key") ?? "";
  }
  if (!config.nip05) $("b-nip05-field").hidden = true;
  else if (params.get("nip05")) nip05Input.value = params.get("nip05");
  if (!config.customColors) {
    $("b-colors").hidden = true;
    $("builder-form").prepend($("b-scheme"));
  }
  setupSchemeToggle();
  light.value = defaultLight;
  dark.value = defaultDark;

  function setMsg(id, state, text) {
    const el = $(id);
    el.dataset.state = state;
    el.textContent = text;
  }

  function update() {
    const raw = keyInput.value.trim();
    let hex = null;
    if (raw === "") {
      keyInput.removeAttribute("aria-invalid");
      setMsg("b-key-msg", "", "SWING で公開に使っている鍵の公開鍵です。");
    } else {
      hex = parseKey(raw);
      if (!hex) {
        keyInput.setAttribute("aria-invalid", "true");
        setMsg("b-key-msg", "error", "公開鍵として読めません。npub1… / nprofile1… / 64 文字の hex を入れてください。");
      } else if (allowed.length > 0 && !allowed.includes(hex)) {
        keyInput.setAttribute("aria-invalid", "true");
        setMsg("b-key-msg", "error", "この公開鍵は、このページでは使えません（使える公開鍵が決められています）。");
        hex = null;
      } else {
        keyInput.removeAttribute("aria-invalid");
        setMsg("b-key-msg", "ok", `✓ ${npubFromHex(hex)}`);
      }
    }

    let domain = null;
    const rawDomain = nip05Input.value.trim();
    if (config.nip05 && rawDomain !== "") {
      domain = parseNip05Param(rawDomain);
      if (domain) {
        nip05Input.removeAttribute("aria-invalid");
        setMsg("b-nip05-msg", "ok", `✓ _@${domain}`);
      } else {
        nip05Input.setAttribute("aria-invalid", "true");
        setMsg("b-nip05-msg", "error", "ドメインとして読めません。example.com の形で入れてください（_@ は付けても付けなくても構いません）。");
      }
    } else {
      nip05Input.removeAttribute("aria-invalid");
      $("b-nip05-msg").dataset.state = "";
    }

    const useColors = config.customColors && colorOn.checked;
    light.disabled = !useColors;
    dark.disabled = !useColors;
    $("b-light-hex").textContent = light.value;
    $("b-dark-hex").textContent = dark.value;
    applyColors(useColors ? light.value : defaultLight, useColors ? dark.value : defaultDark);

    const urlEl = $("b-url");
    const preview = $("b-preview");
    const htmlEl = $("b-html");
    const domainBad = rawDomain !== "" && config.nip05 && !domain;
    if (hex === null || domainBad) {
      $("b-hint").textContent = hex === null
        ? "公開鍵を入れると、リンクと HTML がここにできます。"
        : "NIP-05 のドメインを直すと、リンクと HTML がここにできます。";
      $("b-hint").hidden = false;
      $("b-outputs").hidden = true;
      urlEl.textContent = "";
      htmlEl.textContent = "";
      delete urlEl.dataset.value;
      preview.removeAttribute("href");
      return;
    }
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("key", npubFromHex(hex));
    if (domain) url.searchParams.set("nip05", domain);
    if (useColors) {
      url.searchParams.set("light", light.value.slice(1));
      url.searchParams.set("dark", dark.value.slice(1));
    }
    urlEl.textContent = url.href;
    urlEl.dataset.value = url.href;
    const anchor = document.createElement("a");
    anchor.href = url.href;
    anchor.textContent = "SWING でこのサイトをミラーする";
    htmlEl.textContent = anchor.outerHTML;
    preview.href = url.href;
    $("b-hint").hidden = true;
    $("b-outputs").hidden = false;
  }

  for (const el of [keyInput, nip05Input, colorOn, light, dark]) el.addEventListener("input", update);
  $("builder-form").addEventListener("submit", (e) => e.preventDefault());
  update();
}

function main() {
  const params = new URLSearchParams(location.search);
  let light = defaultLight;
  let dark = defaultDark;
  if (config.customColors) {
    light = parseColor(params.get("light") ?? "") ?? light;
    dark = parseColor(params.get("dark") ?? "") ?? dark;
  }
  applyColors(light, dark);
  $("brand-link").href = swingUrl;
  $("banner-link").href = swingUrl;
  setupCopyButtons();

  const resolved = resolveKey(params.get("key"), allowed);
  $("builder-link").hidden = allowed.length === 1;
  if (resolved.status === "ok") {
    showConnect(resolved.hex, params);
  } else if (resolved.status === "invalid") {
    showBuilder({ title: "公開鍵を読めませんでした", text: "リンクの key に書かれた値が、npub・nprofile・64 文字の hex のどれとしても読めません。リンクを作った人に確かめるか、下で作り直してください。" }, params);
  } else if (resolved.status === "not-allowed") {
    showBuilder({ title: "このページでは使えない公開鍵です", text: "このページは、決められた公開鍵だけを表示するように設定されています。" }, params);
  } else {
    showBuilder(null, params);
  }
}

main();
