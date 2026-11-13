// Яндекс Архивы V2: оригинал скана перехватывается хуком yandex-hook.js (MAIN world),
// а здесь — запрос к хуку через window.postMessage, имя файла из хлебных крошек
// и передача картинки в service worker для chrome.downloads.download.
// Старый механизм (sources/yandex.js) пока сохранён.

import { debugLog, runInPage } from '../utils.js';

// Сокращения архивов для имени файла. Дополняйте по мере необходимости.
export const ARCHIVE_ABBR = {
  'ГА Смоленской области': 'ГАСмО'
};

// ---------- функции, выполняемые в странице (isolated world) ----------

// Запрос к хуку в MAIN world. Должна быть самодостаточной (передаётся в executeScript).
function psAskHook(op, timeoutMs) {
  return new Promise((resolve) => {
    const reqId = 'r' + Date.now() + Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMsg);
      resolve({ error: 'hook-timeout' });
    }, timeoutMs);
    function onMsg(event) {
      if (event.source !== window) return;
      const d = event.data;
      if (!d || d.type !== 'GENEADB_YA_RES' || d.reqId !== reqId) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMsg);
      resolve(d);
    }
    window.addEventListener('message', onMsg);
    window.postMessage({ type: 'GENEADB_YA_REQ', reqId, op }, location.origin);
  });
}

// Хлебные крошки: «Главная › Каталог › ГА Смоленской области › Фонд 48 › Опись 4 › Дело 825 › Скан 643».
function psReadBreadcrumbs() {
  const KEY_RE = /^(Фонд|Опись|Дело|Скан)\s+(\S+)/;
  const SEP_RE = /^[›>»\/|·•]+$/;
  const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();

  let container = [...document.querySelectorAll('nav, [class*="readcrumb" i], [aria-label*="крошк" i]')]
    .find((el) => /Фонд\s+\S+/.test(text(el)) && /Дело\s+\S+/.test(text(el)));

  if (!container) {
    const fondLeaf = [...document.querySelectorAll('a, span, li, div, p')]
      .find((el) => el.childElementCount === 0 && /^Фонд\s+\S+/.test(text(el)));
    let el = fondLeaf ? fondLeaf.parentElement : null;
    while (el && el !== document.body && !/Дело\s+\S+/.test(text(el))) el = el.parentElement;
    if (el && el !== document.body) container = el;
  }
  if (!container) return { pathname: location.pathname, found: false };

  const items = [];
  for (const el of container.querySelectorAll('*')) {
    if (el.childElementCount !== 0) continue;
    const t = text(el);
    if (!t || SEP_RE.test(t)) continue;
    if (items[items.length - 1] !== t) items.push(t);
  }
  // «Фонд» и «48» могут быть в разных элементах — склеиваем.
  for (let i = items.length - 2; i >= 0; i--) {
    if (/^(Фонд|Опись|Дело|Скан)$/.test(items[i])) items.splice(i, 2, items[i] + ' ' + items[i + 1]);
  }

  const res = { pathname: location.pathname, found: true, items };
  const clean = (v) => v.replace(/[.,:;]+$/, '');
  items.forEach((t, i) => {
    const m = t.match(KEY_RE);
    if (!m) return;
    const key = { 'Фонд': 'fond', 'Опись': 'opis', 'Дело': 'delo', 'Скан': 'frame' }[m[1]];
    if (!res[key]) res[key] = clean(m[2]);
    if (key === 'fond' && i > 0 && !res.archive) res.archive = items[i - 1];
  });
  return res;
}

// ---------- имя файла ----------

function sanitize(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

function buildFilename(crumbs, pageUrl) {
  const urlFrame = new URL(pageUrl).pathname.split('/').filter(Boolean).pop();
  const frame = crumbs.frame || urlFrame;

  let archive = '';
  if (crumbs.archive) {
    archive = ARCHIVE_ABBR[crumbs.archive];
    if (!archive) {
      archive = crumbs.archive.replace(/\s+/g, '');
      console.warn(`[Яндекс V2] Архив «${crumbs.archive}» нет в ARCHIVE_ABBR (sources/yandex-v2.js) — используется «${archive}». Добавьте сокращение.`);
      debugLog(`Архив «${crumbs.archive}» нет в ARCHIVE_ABBR`);
    }
  } else {
    console.warn('[Яндекс V2] Хлебные крошки не найдены, имя файла только по номеру кадра');
  }

  const shifr = [crumbs.fond, crumbs.opis, crumbs.delo].filter(Boolean).join('-');
  return sanitize([archive, shifr, frame].filter(Boolean).join('.')) + '.jpg';
}

// ---------- источник ----------

export const yandexV2 = {
  name: 'Яндекс Архивы',
  needsAuth: false,
  needsPageScan: true,

  detect: (url) => /(ya\.ru|yandex\.ru)\/archive\/catalog\/[^/]+\/\d+/.test(url),

  scanPage: async (tab) => {
    debugLog('Яндекс V2: scanPage...');
    const crumbs = await runInPage(tab.id, psReadBreadcrumbs);
    const hook = await runInPage(tab.id, psAskHook, ['status', 1500]);
    debugLog('Крошки: ' + JSON.stringify(crumbs));
    debugLog('Хук: ' + JSON.stringify(hook));
    if (!crumbs) return null;
    return {
      filename: buildFilename(crumbs, tab.url),
      hookReady: !!(hook && hook.ready),
      imageId: hook && hook.id,
      cached: !!(hook && hook.cached)
    };
  },

  parse: (url, extra) => (extra ? { ...extra, pageUrl: url } : null),

  generateUrl: (parsed) =>
    parsed.imageId
      ? `https://yandex.ru/archive/api/image?id=${parsed.imageId}&type=original`
      : parsed.pageUrl,

  getFilename: (parsed) => parsed.filename,

  displayText: (parsed) => {
    let text = `Файл: ${parsed.filename}`;
    if (!parsed.hookReady) text += '<br/>⚠ Перехватчик не активен — обновите страницу (F5)';
    else text += parsed.cached ? '<br/>Оригинал уже загружен' : '<br/>Оригинал будет загружен при скачивании';
    return text;
  },

  // Собственное скачивание (вызывается из popup.js вместо downloadImage/downloadDirect).
  download: async (tab, onStatus) => {
    const crumbs = await runInPage(tab.id, psReadBreadcrumbs);
    const filename = buildFilename(crumbs || {}, tab.url);

    onStatus('⏳ Получение оригинала (увеличение масштаба, до 15 с)...');
    const r = await runInPage(tab.id, psAskHook, ['get', 20000]);
    if (!r || r.error === 'hook-timeout') {
      throw new Error('перехватчик не отвечает. Обновите страницу (F5) и попробуйте снова');
    }
    if (r.error) throw new Error(r.error);
    debugLog(`Оригинал: id=${r.id}, ${r.width}×${r.height}, ${(r.size / 1024).toFixed(0)} КБ, через ${r.via}`);

    onStatus('⏳ Сохранение файла...');
    const resp = await chrome.runtime.sendMessage({ action: 'downloadDataUrl', dataUrl: r.dataUrl, filename });
    if (!resp || !resp.success) throw new Error(resp ? resp.error : 'service worker не ответил');

    const dims = r.width ? `, ${r.width}×${r.height}` : '';
    return `${filename} (${(r.size / 1024 / 1024).toFixed(2)} МБ${dims})`;
  }
};
