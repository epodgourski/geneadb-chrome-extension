// Яндекс Архивы V2: хук в MAIN world страницы (content script, document_start).
//
// Страница грузит скан через fetch('/archive/api/image?id=...&type=original&exp=...&sig=...')
// с заголовками X-Archive-Image-Token и др. Повторить такой запрос извне нельзя (403),
// поэтому перехватываем ответ самой страницы и кэшируем Blob оригинала.
//
// Связь с расширением: window.postMessage
//   запрос  { type: 'GENEADB_YA_REQ', reqId, op: 'status' | 'get' }
//   ответ   { type: 'GENEADB_YA_RES', reqId, ... }
(() => {
  const REQ = 'GENEADB_YA_REQ';
  const RES = 'GENEADB_YA_RES';
  const WAIT_MS = 15000;
  const MAX_CACHE = 20;

  const blobs = new Map();       // imageId -> Blob оригинала
  const idByPath = new Map();    // location.pathname -> imageId текущего кадра
  const lastOriginalReq = new Map(); // imageId -> { url, headers } последнего запроса original
  const requestedOriginal = new Set(); // imageId, для которых страница уже запросила original

  const origFetch = window.fetch;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function parseImageUrl(url) {
    try {
      const u = new URL(url, location.href);
      if (!u.pathname.endsWith('/archive/api/image')) return null;
      const id = u.searchParams.get('id');
      const type = u.searchParams.get('type');
      if (!id || !type) return null;
      return { id, type, url: u.href };
    } catch (e) {
      return null;
    }
  }

  function headersToObject(h) {
    const out = {};
    if (!h) return out;
    if (h instanceof Headers) h.forEach((v, k) => { out[k] = v; });
    else if (Array.isArray(h)) h.forEach(([k, v]) => { out[k] = v; });
    else Object.entries(h).forEach(([k, v]) => { out[k] = String(v); });
    return out;
  }

  function noteRequest(info, headers) {
    if (info.type !== 'preview' && info.type !== 'original') return;
    idByPath.set(location.pathname, info.id);
    if (info.type === 'original') {
      requestedOriginal.add(info.id);
      lastOriginalReq.set(info.id, { url: info.url, headers });
    }
  }

  function storeBlob(id, blob) {
    if (!blob || !blob.size) return;
    blobs.delete(id);
    blobs.set(id, blob);
    while (blobs.size > MAX_CACHE) blobs.delete(blobs.keys().next().value);
    // Оригинал пришёл, пока открыт этот кадр — закрепляем связь pathname -> id.
    idByPath.set(location.pathname, id);
    console.log('[geneadb] Оригинал перехвачен: id=' + id + ', ' + blob.size + ' байт');
  }

  // ---------- fetch ----------
  window.fetch = function (input, init) {
    let info = null;
    try {
      const url = input instanceof Request ? input.url : String(input);
      info = parseImageUrl(url);
      if (info) {
        const headers = {
          ...(input instanceof Request ? headersToObject(input.headers) : {}),
          ...headersToObject(init && init.headers)
        };
        noteRequest(info, headers);
      }
    } catch (e) { /* хук не должен ломать страницу */ }

    const p = origFetch.apply(this, arguments);
    if (info && info.type === 'original') {
      p.then((resp) => {
        if (resp.ok) resp.clone().blob().then((b) => storeBlob(info.id, b)).catch(() => {});
      }).catch(() => {});
    }
    return p;
  };

  // ---------- XMLHttpRequest (на всякий случай) ----------
  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const xhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      this.__geneadbInfo = parseImageUrl(String(url));
      this.__geneadbHeaders = {};
    } catch (e) { /* ignore */ }
    return xhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (this.__geneadbHeaders) this.__geneadbHeaders[k] = String(v);
    return xhrSetHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    const info = this.__geneadbInfo;
    if (info) {
      noteRequest(info, this.__geneadbHeaders || {});
      if (info.type === 'original') {
        this.addEventListener('load', () => {
          try {
            if (this.status < 200 || this.status >= 300) return;
            const type = this.getResponseHeader('content-type') || 'image/jpeg';
            if (this.responseType === 'blob') storeBlob(info.id, this.response);
            else if (this.responseType === 'arraybuffer') storeBlob(info.id, new Blob([this.response], { type }));
          } catch (e) { /* ignore */ }
        });
      }
    }
    return xhrSend.apply(this, arguments);
  };

  // ---------- получение оригинала ----------
  function findZoomInButton() {
    const buttons = [...document.querySelectorAll('button, [role="button"]')];
    const label = (el) =>
      [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('data-tooltip'), el.textContent]
        .filter(Boolean).join(' ').trim().toLowerCase();

    // 1) по подписи / aria-label
    const byLabel = buttons.find((el) => /увелич|приблиз|zoom.?in|zoomin|масштаб\s*\+/.test(label(el)));
    if (byLabel) return byLabel;
    // 2) кнопка с текстом «+»
    const byPlus = buttons.find((el) => el.textContent.trim() === '+');
    if (byPlus) return byPlus;
    // 3) по классам
    const byClass = document.querySelector('[class*="ZoomIn" i], [class*="zoom-in" i], [class*="zoom_in" i]');
    if (byClass) return byClass.closest('button, [role="button"]') || byClass;
    // 4) прежняя эвристика: третья кнопка в шапке просмотрщика
    const header = document.querySelector('[class*="ViewerHeader"]');
    const hb = header && header.querySelectorAll('button, [role="button"]');
    return hb && hb.length >= 3 ? hb[2] : null;
  }

  async function replayOriginal(id) {
    const req = lastOriginalReq.get(id);
    if (!req) return 'no-request';
    try {
      const resp = await origFetch(req.url, { headers: req.headers, credentials: 'include' });
      if (resp.status === 403) return 'expired';
      if (!resp.ok) return 'http-' + resp.status;
      storeBlob(id, await resp.blob());
      return 'ok';
    } catch (e) {
      return 'error: ' + e.message;
    }
  }

  async function getOriginal() {
    const path = location.pathname;
    let id = idByPath.get(path);
    if (id && blobs.has(id)) return { id, blob: blobs.get(id), via: 'cache' };

    // Запасной вариант: повтор запроса страницы с теми же заголовками (если подпись ещё жива).
    if (id) {
      const r = await replayOriginal(id);
      console.log('[geneadb] Повтор запроса оригинала: ' + r);
      if (r === 'ok') return { id, blob: blobs.get(id), via: 'replay' };
    }

    // Основной путь: увеличиваем масштаб, страница сама запросит original.
    const btn = findZoomInButton();
    if (!btn) return { error: 'Не найдена кнопка увеличения масштаба в просмотрщике' };

    const deadline = Date.now() + WAIT_MS;
    let clicks = 0;
    while (Date.now() < deadline) {
      if (location.pathname !== path) return { error: 'Кадр сменился во время ожидания' };
      id = idByPath.get(path);
      if (id && blobs.has(id)) return { id, blob: blobs.get(id), via: 'zoom' };
      if (clicks < 8 && !(id && requestedOriginal.has(id))) {
        btn.click();
        clicks++;
        await sleep(300);
      } else {
        await sleep(250);
      }
    }
    return { error: 'Оригинал не загрузился за ' + WAIT_MS / 1000 + ' с' + (id ? ' (id=' + id + ')' : '') };
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('FileReader: ошибка чтения'));
      fr.readAsDataURL(blob);
    });
  }

  async function handle(op) {
    if (op === 'status') {
      const id = idByPath.get(location.pathname) || null;
      return { ready: true, id, cached: !!(id && blobs.has(id)) };
    }
    if (op === 'get') {
      const r = await getOriginal();
      if (r.error) return r;
      let width = null, height = null;
      try {
        const bmp = await createImageBitmap(r.blob);
        width = bmp.width; height = bmp.height;
        bmp.close();
      } catch (e) { /* не критично */ }
      return {
        id: r.id, via: r.via, size: r.blob.size, mime: r.blob.type,
        width, height, dataUrl: await blobToDataUrl(r.blob)
      };
    }
    return { error: 'Неизвестная операция: ' + op };
  }

  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.type !== REQ) return;
    let result;
    try {
      result = await handle(msg.op);
    } catch (e) {
      result = { error: e.message };
    }
    window.postMessage({ type: RES, reqId: msg.reqId, ...result }, location.origin);
  });
})();
