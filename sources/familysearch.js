export const familysearch = {
  name: 'FamilySearch',
  needsAuth: true,

  detect: (url) => url.includes('familysearch.org'),

  parse: (url) => {
    const protocolEnd = url.indexOf('://');
    if (protocolEnd === -1) return null;

    const firstSlashAfterProtocol = url.indexOf('/', protocolEnd + 3);
    if (firstSlashAfterProtocol === -1) return null;

    const pathAndQuery = url.substring(firstSlashAfterProtocol);
    const questionIndex = pathAndQuery.indexOf('?');
    const searchArea = questionIndex === -1 ? pathAndQuery : pathAndQuery.substring(0, questionIndex);
    const colonIndex = searchArea.lastIndexOf(':');

    if (colonIndex === -1) return null;

    if (questionIndex === -1) {
      return { code: searchArea.substring(colonIndex + 1) };
    }

    return { code: pathAndQuery.substring(colonIndex + 1, questionIndex) };
  },

  generateUrl: (parsed) => {
    if (!parsed.code) return null;
    const template = 'https://sg30p0.familysearch.org/service/records/storage/deepzoomcloud/dz/v1/3:1:***/$dist';
    return template.replace('***', parsed.code);
  },

  getFilename: (parsed) => parsed.code,

  displayText: (parsed) => `Код: ${parsed.code}`
};

// Инъектируемая в страницу функция: определить наличие серии и общее число кадров.
// Языконезависима: использует groupId/i в URL, input[type=number][min=1],
// role=option[image-index].
export function psSeriesInfo() {
  const url = new URL(location.href);
  const groupId = url.searchParams.get('groupId');
  const iRaw = url.searchParams.get('i');
  const currentIndex = iRaw !== null ? parseInt(iRaw) : null;

  const input =
    document.querySelector('input[type="number"][min="1"]') ||
    [...document.querySelectorAll('input[type="number"]')].find((i) => parseInt(i.max) > 1) ||
    [...document.querySelectorAll('input')].find((i) => !isNaN(parseInt(i.max)) && parseInt(i.max) > 1) ||
    null;

  const total = input && !isNaN(parseInt(input.max)) ? parseInt(input.max) : null;
  const gridCount = document.querySelectorAll('[role="option"][image-index]').length;

  const hasSeries = !!groupId || (total && total > 1) || gridCount > 1;
  if (!hasSeries) return { hasSeries: false };

  const current =
    currentIndex !== null && !isNaN(currentIndex)
      ? currentIndex + 1
      : input
      ? parseInt(input.value)
      : null;

  return { hasSeries: true, total, current, groupId, currentIndex };
}

// Инъектируемая в страницу функция: собрать ARK всех кадров серии.
// Стратегия A: чтение сетки role=option[image-index] с прокруткой.
// Стратегия B (фолбэк): навигация кнопкой «вперёд» с чтением ARK текущего кадра.
export async function psCollectArks(total) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ARK_RE = /(\d+:\d+:[A-Za-z0-9-]+)/;
  const arkFromText = (s) => {
    const m = (s || '').match(ARK_RE);
    return m ? m[1] : null;
  };
  const arkFromId = (id) => arkFromText(String(id || '').replace(/^grid-item-/, ''));

  const map = {};
  const record = (idx, ark) => {
    if (ark && idx >= 0 && map[idx] === undefined) map[idx] = ark;
  };

  const numInput = () =>
    document.querySelector('input[type="number"][min="1"]') ||
    [...document.querySelectorAll('input[type="number"]')].find((i) => parseInt(i.max) > 1) ||
    [...document.querySelectorAll('input')].find((i) => !isNaN(parseInt(i.max)) && parseInt(i.max) > 1) ||
    null;

  const curIndex = () => {
    const sel = document.querySelector('[role="option"][aria-selected="true"][image-index]');
    if (sel) {
      const n = parseInt(sel.getAttribute('image-index'));
      if (!isNaN(n)) return n;
    }
    const iRaw = new URL(location.href).searchParams.get('i');
    if (iRaw !== null && !isNaN(parseInt(iRaw))) return parseInt(iRaw);
    const inp = numInput();
    if (inp && !isNaN(parseInt(inp.value))) return parseInt(inp.value) - 1;
    return null;
  };

  const curArk = () => {
    const sel = document.querySelector('[role="option"][aria-selected="true"]');
    if (sel) {
      const a =
        arkFromId(sel.id) ||
        arkFromText((sel.querySelector('img[src]') || {}).src) ||
        arkFromId((sel.querySelector('[id]') || {}).id);
      if (a) return a;
    }
    const fromPath = arkFromText(location.pathname);
    if (fromPath) return fromPath;
    const fromImg = [...document.querySelectorAll('img[src]')].map((x) => arkFromText(x.src)).find(Boolean);
    return fromImg || null;
  };

  // --- Стратегия A: чтение сетки с прокруткой ---
  const collectGrid = () => {
    document.querySelectorAll('[role="option"][image-index]').forEach((opt) => {
      const idx = parseInt(opt.getAttribute('image-index'));
      if (isNaN(idx)) return;
      const ark =
        arkFromId(opt.id) ||
        arkFromText((opt.querySelector('img[src]') || {}).src) ||
        arkFromId((opt.querySelector('[id]') || {}).id);
      record(idx, ark);
    });
  };

  const findScroller = () => {
    const opt = document.querySelector('[role="option"][image-index]');
    let node = opt ? opt.parentElement : null;
    while (node && node !== document.body) {
      const st = getComputedStyle(node);
      if (/(auto|scroll)/.test(st.overflowY) && node.scrollHeight > node.clientHeight + 8) return node;
      node = node.parentElement;
    }
    return document.querySelector('[role="listbox"]') || null;
  };

  collectGrid();
  if (Object.keys(map).length < total && document.querySelector('[role="option"][image-index]')) {
    const scroller = findScroller();
    if (scroller) {
      scroller.scrollTop = 0;
      await sleep(200);
      collectGrid();
      let stalls = 0;
      let lastCount = -1;
      let lastTop = -1;
      while (Object.keys(map).length < total && stalls < 6) {
        scroller.scrollTop = Math.min(
          scroller.scrollTop + Math.max(200, scroller.clientHeight * 0.8),
          scroller.scrollHeight
        );
        await sleep(250);
        collectGrid();
        const c = Object.keys(map).length;
        if (c === lastCount && scroller.scrollTop === lastTop) stalls++;
        else stalls = 0;
        lastCount = c;
        lastTop = scroller.scrollTop;
      }
    }
  }

  // --- Стратегия B: навигация кнопкой «вперёд» ---
  const haveAll = () => Object.keys(map).length >= total;
  if (!haveAll()) {
    const navButtons = () => {
      const input = numInput();
      if (!input) return {};
      const ir = input.getBoundingClientRect();
      const ix = ir.left + ir.width / 2;
      const iy = ir.top + ir.height / 2;
      let scope = input;
      let buttons = [];
      for (let k = 0; k < 6 && scope; k++) {
        scope = scope.parentElement;
        if (!scope) break;
        const b = [...scope.querySelectorAll('button')].filter((btn) => {
          const r = btn.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && Math.abs(r.top + r.height / 2 - iy) < r.height * 2 + 40;
        });
        if (b.length >= 2) {
          buttons = b;
          break;
        }
      }
      let prev = null;
      let next = null;
      for (const b of buttons) {
        const r = b.getBoundingClientRect();
        const x = r.left + r.width / 2;
        if (x < ix) {
          if (!prev || x > prev.getBoundingClientRect().left) prev = b;
        } else if (x > ix) {
          if (!next || x < next.getBoundingClientRect().left) next = b;
        }
      }
      return { prev, next };
    };
    const disabled = (b) => !b || b.getAttribute('aria-disabled') === 'true' || b.disabled === true;
    const clickWait = async (btn) => {
      if (disabled(btn)) return false;
      const before = curIndex();
      btn.click();
      let w = 0;
      while (w < 8000) {
        await sleep(120);
        w += 120;
        const n = curIndex();
        if (n !== null && n !== before) return true;
      }
      return false;
    };

    let guard = 0;
    while (guard++ < total + 5) {
      if (curIndex() === 0) break;
      const { prev } = navButtons();
      if (!(await clickWait(prev))) break;
    }
    guard = 0;
    while (guard++ < total + 5) {
      const idx = curIndex();
      if (idx !== null) record(idx, curArk());
      if (haveAll()) break;
      const { next } = navButtons();
      if (disabled(next)) break;
      if (!(await clickWait(next))) break;
    }
  }

  const items = [];
  for (let i = 0; i < total; i++) if (map[i]) items.push({ index: i, ark: map[i] });
  return { total, found: items.length, items };
}
