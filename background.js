// Service Worker: одиночные загрузки и пакетное скачивание серии (FamilySearch).
// Цикл серии выполняется здесь (а не в попапе), поэтому он продолжается даже
// после закрытия или потери фокуса попапом.

// ============================================
// СОСТОЯНИЕ СЕРИИ
// ============================================
const seriesState = {
  running: false,
  cancel: false,
  tabId: null,
  total: 0,
  done: 0,
  phase: null, // 'running' | 'done' | 'partial' | 'cancelled' | 'error'
  message: ''
};

function seriesSnapshot() {
  return {
    running: seriesState.running,
    total: seriesState.total,
    done: seriesState.done,
    phase: seriesState.phase,
    message: seriesState.message
  };
}

// Оповестить попап (если открыт). Нет получателя — тихо игнорируем.
function broadcastSeries() {
  chrome.runtime
    .sendMessage({ action: 'seriesProgress', state: seriesSnapshot() })
    .catch(() => {});
}

// ============================================
// ОБРАБОТКА СООБЩЕНИЙ
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadImage') {
    downloadImage(request.url, request.filename, request.needsAuth)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // async
  }

  if (request.action === 'startSeries') {
    if (seriesState.running) {
      sendResponse({ ok: false, error: 'Серия уже скачивается' });
      return false;
    }
    // Запускаем цикл, не дожидаясь его завершения: попап получит прогресс
    // через сообщения seriesProgress, а сам цикл живёт в service worker.
    runSeries(request.tabId).catch((e) => console.error('Серия:', e));
    sendResponse({ ok: true });
    return false;
  }

  if (request.action === 'cancelSeries') {
    if (seriesState.running) seriesState.cancel = true;
    sendResponse({ ok: true });
    return false;
  }

  if (request.action === 'getSeriesState') {
    sendResponse(seriesSnapshot());
    return false;
  }
});

// ============================================
// ЦИКЛ СКАЧИВАНИЯ СЕРИИ
// ============================================
async function runInPage(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return results && results[0] ? results[0].result : undefined;
}

async function runSeries(tabId) {
  seriesState.running = true;
  seriesState.cancel = false;
  seriesState.tabId = tabId;
  seriesState.total = 0;
  seriesState.done = 0;
  seriesState.phase = 'running';
  seriesState.message = 'Поиск снимков серии...';
  broadcastSeries();

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    const info = await runInPage(tabId, psSeriesInfo);
    let total = info && info.total ? info.total : null;

    const res = await runInPage(tabId, psCollectArks, [total || 9999]);
    const items = res && res.items ? res.items : [];
    if (!items.length) {
      throw new Error('не удалось найти снимки серии на странице');
    }
    if (!total) total = items.length;

    seriesState.total = total;
    // Ширина префикса: минимум 2 знака (01_), 3 знака при total >= 100
    const padLength = Math.max(2, String(total).length);

    for (const it of items) {
      if (seriesState.cancel) break;

      const frameNum = it.index + 1;
      // it.ark всегда формата "3:1:XXXX"; подставляем его в шаблон deepzoom.
      const url = `https://sg30p0.familysearch.org/service/records/storage/deepzoomcloud/dz/v1/${it.ark}/$dist`;
      // Имя файла — ключевая часть после "3:1:" (например 3QHK-V7TF-73W2).
      const code = it.ark.split(':').pop();
      const filename = String(frameNum).padStart(padLength, '0') + '_' + code;

      seriesState.message = `Скачивается ${frameNum} / ${total}...`;
      broadcastSeries();

      await downloadImage(url, filename, true);
      seriesState.done++;
      broadcastSeries();

      // Пауза, чтобы не перегружать сервер
      await sleep(400);
    }

    if (seriesState.cancel) {
      seriesState.phase = 'cancelled';
      seriesState.message = `Отменено. Скачано ${seriesState.done} из ${total}`;
    } else if (seriesState.done < total) {
      seriesState.phase = 'partial';
      seriesState.message = `Скачано ${seriesState.done} из ${total} (не все кадры удалось найти)`;
    } else {
      seriesState.phase = 'done';
      seriesState.message = `Серия скачана! (${seriesState.done} из ${total})`;
    }
  } catch (error) {
    console.error('Ошибка при скачивании серии:', error);
    seriesState.phase = 'error';
    seriesState.message = `Ошибка серии: ${error.message}`;
  } finally {
    seriesState.running = false;
    seriesState.cancel = false;
    broadcastSeries();
  }
}

// ============================================
// ИНЪЕКТИРУЕМЫЕ В СТРАНИЦУ ФУНКЦИИ (DOM FamilySearch)
// Языконезависимы: groupId/i в URL, input[type=number][min=1],
// role=option[image-index], ARK формата 3:1: из id/src/pathname.
// ============================================

// Определить наличие серии и общее число кадров
function psSeriesInfo() {
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

// Собрать ARK всех кадров серии по порядку (0-based image-index).
// Стратегия A: чтение сетки role=option[image-index] с прокруткой (обход
// виртуального скролла). Стратегия B (фолбэк): навигация кнопкой «вперёд»,
// найденной по позиции, с чтением ARK текущего кадра.
async function psCollectArks(total) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Интересует только storage-ARK формата "3:1:XXXX-XXXX".
  // Ключевая часть для имени файла — то, что после "3:1:" (например 3QHK-V7TF-73W2).
  const ARK_RE = /(\d+:\d+:[A-Za-z0-9-]+)/;
  const arkFromText = (s) => {
    const m = (s || '').match(ARK_RE);
    return m ? m[1] : null;
  };
  // У ячеек сетки id бывает "grid-item-3:1:XXXX" (ARK прямо в id) либо служебный
  // "grid-item-TH-..." — в последнем случае нужный 3:1:-ARK берётся из src миниатюры.
  const arkFromId = (id) => arkFromText(String(id || '').replace(/^grid-item-/, ''));

  const map = {}; // image-index (0-based) -> ARK
  const record = (idx, ark) => {
    if (ark && idx >= 0 && map[idx] === undefined) map[idx] = ark;
  };

  // --- Языконезависимые сигналы текущего положения ---
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
  // Прокрутка нужна только при виртуальном скролле (отрендерены не все кадры).
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

  // --- Стратегия B: навигация кнопкой «вперёд» (поиск по позиции) ---
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

    // Перемотка к первому кадру
    let guard = 0;
    while (guard++ < total + 5) {
      if (curIndex() === 0) break;
      const { prev } = navButtons();
      if (!(await clickWait(prev))) break;
    }
    // Проход вперёд с записью ARK
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

// ============================================
// ЗАГРУЗКА ОДНОГО ФАЙЛА
// ============================================
async function downloadImage(resultUrl, filename, needsAuth = true) {
  console.log('Service Worker: Начинаем загрузку с URL:', resultUrl);

  try {
    const fetchOptions = { method: 'GET' };
    if (needsAuth) {
      fetchOptions.credentials = 'include';
      fetchOptions.mode = 'cors';
    }

    const response = await fetch(resultUrl, fetchOptions);
    console.log('Service Worker: Статус ответа:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ошибка! Статус: ${response.status}`);
    }

    const blob = await response.blob();
    console.log('Service Worker: Размер файла:', blob.size);

    if (blob.size === 0) {
      throw new Error('Полученный файл пустой');
    }

    // Преобразуем blob в data URL через FileReader
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const base64Data = reader.result;
        const dataUrl = `data:${blob.type};base64,${base64Data.split(',')[1]}`;

        chrome.downloads.download(
          {
            url: dataUrl,
            filename: `${filename}.jpeg`,
            saveAs: false
          },
          (downloadId) => {
            if (downloadId) {
              console.log('Service Worker: Загрузка успешна, ID:', downloadId);
              resolve({ success: true, downloadId });
            } else {
              reject(new Error('Не удалось загрузить файл браузером'));
            }
          }
        );
      };

      reader.onerror = () => {
        reject(new Error('Ошибка при чтении файла'));
      };

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Service Worker: Ошибка при загрузке:', error);
    throw error;
  }
}
