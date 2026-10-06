if (window.top !== window) {
  const forward = (ev) => {
    const r = window.frameElement.getBoundingClientRect();
    window.top.__swingCursor?.(ev.type, ev.clientX + r.left, ev.clientY + r.top);
  };
  for (const type of ['pointermove', 'pointerdown', 'pointerup']) window.addEventListener(type, forward, true);
} else {
  const shapes = {
    default: [0, 0, `
K...........
KK..........
KWK.........
KWWK........
KWWWK.......
KWWWWK......
KWWWWWK.....
KWWWWWWK....
KWWWWWWWK...
KWWWWWWWWK..
KWWWWWWWWWK.
KWWWWWWKKKKK
KWWWKWWK....
KWWK.KWWK...
KWK..KWWK...
KK....KWWK..
K.....KWWK..
.......KWWK.
.......KWWK.
........KK..`],
    pointer: [5, 0, `
.....KK.........
....KWWK........
....KWWK........
....KWWK........
....KWWK........
....KWWKKK......
....KWWKWWKKK...
....KWWKWWKWWKK.
.KK.KWWKWWKWWKWK
KWWKKWWWWWWWWKWK
KWWWKWWWWWWWWWWK
.KWWKWWWWWWWWWWK
..KWWWWWWWWWWWWK
..KWWWWWWWWWWWK.
...KWWWWWWWWWWK.
...KWWWWWWWWWK..
....KWWWWWWWWK..
....KWWWWWWWWK..
....KKKKKKKKKK..`],
    grab: [8, 8, `
.......KK.......
...KK.KWWKKK....
..KWWKKWWKWWK...
..KWWKKWWKWWK.K.
...KWWKWWKWWKKWK
...KWWKWWKWWKWWK
.KK.KWWWWWWWKWWK
KWWKKWWWWWWWWWWK
KWWWKWWWWWWWWWK.
.KWWWWWWWWWWWWK.
..KWWWWWWWWWWWK.
..KWWWWWWWWWWK..
...KWWWWWWWWWK..
....KWWWWWWWK...
.....KWWWWWWK...
.....KWWWWWWK...`],
    grabbing: [8, 8, `
....KK.KK.KK....
...KWWKWWKWWKK..
...KWWWWWWWWKWK.
....KWWWWWWWWWK.
...KKWWWWWWWWWK.
..KWWWWWWWWWWWK.
..KWWWWWWWWWWWK.
...KWWWWWWWWWK..
....KWWWWWWWWK..
.....KWWWWWWK...
.....KWWWWWWK...`, 4],
    'ns-resize': [4, 7, `
....K....
...KWK...
..KWWWK..
.KWWWWWK.
KKKKWKKKK
...KWK...
...KWK...
...KWK...
...KWK...
...KWK...
KKKKWKKKK
.KWWWWWK.
..KWWWK..
...KWK...
....K....`],
    'nwse-resize': [6, 6, `
KKKKKKK......
KWWWWK.......
KWWWK........
KWWWWK.......
KWKWWWK......
KK.KWWWK.....
K...KWWWK...K
.....KWWWK.KK
......KWWWKWK
.......KWWWWK
........KWWWK
.......KWWWWK
......KKKKKKK`],
  };
  const rows = (s) => s.trim().split('\n');
  const transpose = (s) => rows(s)[0].split('').map((_, x) => rows(s).map((r) => r[x]).join('')).join('\n');
  const mirror = (s) => rows(s).map((r) => [...r].reverse().join('')).join('\n');
  shapes['ew-resize'] = [7, 4, transpose(shapes['ns-resize'][2])];
  shapes['nesw-resize'] = [6, 6, mirror(shapes['nwse-resize'][2])];
  const images = {};
  for (const [name, [hx, hy, art, top = 0]] of Object.entries(shapes)) {
    const lines = rows(art);
    const c = document.createElement('canvas');
    c.width = lines[0].length;
    c.height = lines.length + top;
    const g = c.getContext('2d');
    lines.forEach((line, y) => [...line].forEach((p, x) => {
      if (p === '.') return;
      g.fillStyle = p === 'K' ? '#000' : '#fff';
      g.fillRect(x, y + top, 1, 1);
    }));
    images[name] = { hx, hy, w: c.width, h: c.height, url: `url(${c.toDataURL()})` };
  }
  const cursor = document.createElement('div');
  cursor.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;display:none;background-repeat:no-repeat;image-rendering:pixelated';
  let x = 0, y = 0, held = null, shown = '';
  const hovered = () => {
    let doc = document, px = x, py = y, el;
    for (;;) {
      el = doc.elementFromPoint(px, py);
      if (!(el instanceof HTMLIFrameElement) || !el.contentDocument) break;
      const r = el.getBoundingClientRect();
      doc = el.contentDocument;
      px -= r.left;
      py -= r.top;
    }
    const kw = el ? getComputedStyle(el).cursor : 'default';
    return images[kw] ? kw : 'default';
  };
  window.__swingCursor = (type, cx, cy) => {
    x = cx;
    y = cy;
    if (type === 'pointerdown') held = hovered() === 'grab' ? 'grabbing' : hovered();
    if (type === 'pointerup') held = null;
    if (!cursor.isConnected) document.documentElement.append(cursor);
    cursor.style.display = '';
  };
  for (const type of ['pointermove', 'pointerdown', 'pointerup']) {
    window.addEventListener(type, (ev) => window.__swingCursor(ev.type, ev.clientX, ev.clientY), true);
  }
  const draw = () => {
    const name = held ?? hovered();
    const img = images[name];
    if (name !== shown) {
      Object.assign(cursor.style, { width: `${img.w}px`, height: `${img.h}px`, backgroundImage: img.url });
      shown = name;
    }
    cursor.style.transform = `translate(${x - img.hx}px, ${y - img.hy}px)`;
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

}
