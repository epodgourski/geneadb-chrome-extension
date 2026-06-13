import { debugLog, runInPage } from '../utils.js';

export const yandex = {
  name: 'Яндекс Архивы',
  needsAuth: false,
  needsPageScan: true,
  directDownload: true,

  detect: (url) => /ya\.ru\/archive\/catalog\/[^/]+\/\d+/.test(url),

  scanPage: async (tab) => {
    debugLog('Запуск scanPage для Яндекс...');

    const parentId = tab.url.match(/\/catalog\/([a-f0-9-]{36})/)?.[1];
    const pageNum = tab.url.match(/\/(\d+)(?:\?.*)?$/)?.[1];
    debugLog('URL: parentId=' + (parentId || 'null') + ' pageNum=' + (pageNum || 'null'));

    const meta = await runInPage(tab.id, async (parentId, pageNum) => {
      const scriptEl = document.getElementById('__NEXT_DATA__');
      if (!scriptEl) return { error: '#__NEXT_DATA__ не найден' };
      let nextData;
      try { nextData = JSON.parse(scriptEl.textContent); } catch (e) { return { error: 'JSON: ' + e.message }; }

      const buildId = nextData.buildId;
      if (!buildId) return { error: 'buildId не найден' };

      const cachedNode = nextData?.props?.pageProps?.currentNode;
      const cachedPage = cachedNode?.namepath?.match(/(\d+)\.\w+$/)?.[1];
      const isStale = !cachedNode || cachedPage !== pageNum.padStart(cachedPage?.length || 1, '0');

      let node = cachedNode;
      if (isStale) {
        try {
          const resp = await fetch(
            '/archive/_next/data/' + buildId + '/catalog/' + parentId + '/' + pageNum + '.json?parentNodeId=' + parentId,
            { credentials: 'include' }
          );
          if (resp.ok) {
            const data = await resp.json();
            node = data?.pageProps?.currentNode;
          }
        } catch (e) { /* fallback to cached */ }
      }

      if (!node) return { error: 'currentNode не найден' };

      const currentId = node.thumbNodeId || node.id;
      const filename = node.namepath ? node.namepath.split('/').pop() : '';

      const pattern = '/archive/api/image?id=' + currentId + '&type=original';
      const entries = performance.getEntriesByType('resource');
      const entry = entries.find(e => e.name.includes(pattern));

      return { pageNum, filename, currentId, imageUrl: entry ? entry.name : null, stale: isStale };
    }, [parentId, pageNum]);

    if (!meta || meta.error) {
      debugLog(meta ? 'Ошибка: ' + meta.error : 'runInPage вернул null');
      return null;
    }

    debugLog('currentId: ' + meta.currentId + (meta.stale ? ' (обновлён через data API)' : ' (из кэша)'));
    debugLog('pageNum: ' + meta.pageNum);
    debugLog('filename: ' + meta.filename);

    if (meta.imageUrl) {
      debugLog('Оригинал уже загружен: ' + meta.imageUrl);
      console.log('[Яндекс] Оригинал уже загружен:', meta.imageUrl);
      return meta;
    }

    debugLog('Оригинал id=' + meta.currentId + ' не загружен — делаем zoom...');
    console.log('[Яндекс] Оригинал не найден в entries, запускаем zoom');

    const imageUrl = await runInPage(tab.id, async (currentId) => {
      const pattern = '/archive/api/image?id=' + currentId + '&type=original';

      const header = document.querySelector('[class*="ViewerHeader"]');
      const btns = header?.querySelectorAll('button, [role="button"]');
      if (!btns || btns.length < 3) {
        console.log('[Яндекс] Кнопки zoom не найдены');
        return null;
      }

      console.log('[Яндекс] Кликаем zoom+ 8 раз...');
      for (let i = 0; i < 8; i++) {
        btns[2].click();
        await new Promise(r => setTimeout(r, 200));
      }
      console.log('[Яндекс] Zoom выполнен, ожидаем загрузку оригинала...');

      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const entries = performance.getEntriesByType('resource');
        const entry = entries.find(e => e.name.includes(pattern));
        if (entry) {
          console.log('[Яндекс] Оригинал загружен:', entry.name);
          return entry.name;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      console.log('[Яндекс] Таймаут: оригинал не загружен за 15 сек');
      return null;
    }, [meta.currentId], 'MAIN');

    if (imageUrl) {
      debugLog('Оригинал получен после zoom: ' + imageUrl);
      console.log('[Яндекс] Итого URL:', imageUrl);
    } else {
      debugLog('Ошибка: оригинал не загружен за 15 сек');
      console.log('[Яндекс] Ошибка: таймаут ожидания оригинала');
      return null;
    }

    return { pageNum: meta.pageNum, filename: meta.filename, imageUrl };
  },

  parse: (url, extra) => {
    if (!extra || !extra.pageNum) return null;
    return {
      page: extra.pageNum,
      filename: extra.filename ? extra.filename.replace(/\.[^.]+$/, '') : null,
      imageUrl: extra.imageUrl
    };
  },

  generateUrl: (parsed) => parsed.imageUrl || null,

  getFilename: (parsed) => parsed.filename || `f${String(parsed.page).padStart(4, '0')}`,

  displayText: (parsed) => {
    let text = `Страница: ${parsed.page}`;
    if (parsed.filename) text += `<br/>Файл: ${parsed.filename}`;
    return text;
  }
};
