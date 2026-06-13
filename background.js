// Service Worker: одиночные загрузки и пакетное скачивание серии (FamilySearch).
// Цикл серии выполняется здесь (а не в попапе), поэтому он продолжается даже
// после закрытия или потери фокуса попапом.
//
// Устойчивость к длинным сериям (300+ кадров): прогресс сохраняется в
// chrome.storage.session, а keep-alive через chrome.alarms будит service
// worker. Если Chrome всё же выгрузит SW посреди серии, при его перезапуске
// скачивание автоматически продолжается с последнего сохранённого кадра.

import { runInPage } from './utils.js';
import { psSeriesInfo, psCollectArks } from './sources/familysearch.js';

const KEEPALIVE_ALARM = 'series-keepalive';

let loopActive = false;

// ============================================
// СОСТОЯНИЕ СЕРИИ (персистентное)
// ============================================
async function getSeries() {
  const { series } = await chrome.storage.session.get('series');
  return series || null;
}

async function setSeries(series) {
  await chrome.storage.session.set({ series });
  return series;
}

async function patchSeries(patch) {
  const current = (await getSeries()) || {};
  return setSeries({ ...current, ...patch });
}

function snapshotOf(s) {
  if (!s) return { running: false, total: 0, done: 0, phase: null, message: '' };
  return {
    running: !!s.running,
    total: s.total || 0,
    done: s.done || 0,
    phase: s.phase || null,
    message: s.message || ''
  };
}

function broadcast(s) {
  chrome.runtime
    .sendMessage({ action: 'seriesProgress', state: snapshotOf(s) })
    .catch(() => {});
}

// ============================================
// KEEP-ALIVE
// ============================================
function ensureKeepAlive() {
  chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 0.5 });
}

function clearKeepAlive() {
  chrome.alarms.clear(KEEPALIVE_ALARM);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== KEEPALIVE_ALARM) return;
  getSeries().then((s) => {
    if (s && s.running && !loopActive) proceedSeries();
    else if (!s || !s.running) clearKeepAlive();
  });
});

getSeries().then((s) => {
  if (s && s.running && !loopActive) proceedSeries();
});

// ============================================
// ОБРАБОТКА СООБЩЕНИЙ
// ============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadImage') {
    downloadImage(request.url, request.filename, request.needsAuth)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'downloadDirect') {
    console.log('Service Worker: downloadDirect, URL:', request.url, 'filename:', request.filename);
    try {
      chrome.downloads.download(
        { url: request.url, filename: `${request.filename}.jpeg`, saveAs: false },
        (downloadId) => {
          const err = chrome.runtime.lastError;
          if (err) {
            console.error('Service Worker: Ошибка загрузки:', err.message);
            sendResponse({ success: false, error: err.message });
          } else if (downloadId) {
            console.log('Service Worker: Прямая загрузка, ID:', downloadId);
            sendResponse({ success: true, downloadId });
          } else {
            sendResponse({ success: false, error: 'Не удалось запустить загрузку' });
          }
        }
      );
    } catch (e) {
      console.error('Service Worker: downloadDirect exception:', e.message);
      sendResponse({ success: false, error: e.message });
    }
    return true;
  }

  if (request.action === 'startSeries') {
    getSeries().then((s) => {
      if (s && s.running) {
        sendResponse({ ok: false, error: 'Серия уже скачивается' });
        return;
      }
      startSeries(request.tabId);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (request.action === 'cancelSeries') {
    cancelSeries().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (request.action === 'getSeriesState') {
    getSeries().then((s) => sendResponse(snapshotOf(s)));
    return true;
  }
});

// ============================================
// ЦИКЛ СКАЧИВАНИЯ СЕРИИ
// ============================================
async function startSeries(tabId) {
  await setSeries({
    running: true,
    cancel: false,
    tabId,
    total: 0,
    done: 0,
    items: null,
    phase: 'running',
    message: 'Поиск снимков серии...'
  });
  ensureKeepAlive();
  proceedSeries();
}

async function cancelSeries() {
  const s = await getSeries();
  if (!s || !s.running) return;
  await patchSeries({ cancel: true });
  if (!loopActive) {
    const cur = await patchSeries({
      running: false,
      phase: 'cancelled',
      message: `Отменено. Скачано ${s.done || 0} из ${s.total || 0}`
    });
    broadcast(cur);
    clearKeepAlive();
  }
}

async function proceedSeries() {
  if (loopActive) return;
  loopActive = true;
  ensureKeepAlive();

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    let s = await getSeries();
    if (!s || !s.running) return;

    if (s.cancel) {
      s = await patchSeries({
        running: false,
        phase: 'cancelled',
        message: `Отменено. Скачано ${s.done || 0} из ${s.total || 0}`
      });
      broadcast(s);
      return;
    }

    if (!s.items) {
      broadcast(await patchSeries({ message: 'Поиск снимков серии...' }));
      const info = await runInPage(s.tabId, psSeriesInfo);
      let total = info && info.total ? info.total : null;

      const res = await runInPage(s.tabId, psCollectArks, [total || 9999]);
      const items = res && res.items ? res.items : [];
      if (!items.length) {
        s = await patchSeries({
          running: false,
          phase: 'error',
          message: 'Ошибка серии: не удалось найти снимки серии на странице'
        });
        broadcast(s);
        return;
      }
      if (!total) total = items.length;
      s = await patchSeries({ total, items });
    }

    const total = s.total;
    const items = s.items;
    const padLength = Math.max(2, String(total).length);

    for (let i = s.done || 0; i < items.length; i++) {
      const cur = await getSeries();
      if (!cur || !cur.running || cur.cancel) {
        s = cur || s;
        break;
      }

      const it = items[i];
      const frameNum = it.index + 1;
      const url = `https://sg30p0.familysearch.org/service/records/storage/deepzoomcloud/dz/v1/${it.ark}/$dist`;
      const code = it.ark.split(':').pop();
      const filename = String(frameNum).padStart(padLength, '0') + '_' + code;

      broadcast(await patchSeries({ message: `Скачивается ${frameNum} / ${total}...` }));

      await downloadImage(url, filename, true);
      s = await patchSeries({ done: i + 1 });
      broadcast(s);

      await sleep(400);
    }

    const fin = await getSeries();
    if (fin && fin.cancel) {
      s = await patchSeries({
        running: false,
        phase: 'cancelled',
        message: `Отменено. Скачано ${fin.done || 0} из ${total}`
      });
    } else if (fin && (fin.done || 0) < total) {
      s = await patchSeries({
        running: false,
        phase: 'partial',
        message: `Скачано ${fin.done || 0} из ${total} (не все кадры удалось найти)`
      });
    } else {
      s = await patchSeries({
        running: false,
        phase: 'done',
        message: `Серия скачана! (${total} из ${total})`
      });
    }
    broadcast(s);
  } catch (error) {
    console.error('Ошибка при скачивании серии:', error);
    const s = await patchSeries({
      running: false,
      phase: 'error',
      message: `Ошибка серии: ${error.message}`
    });
    broadcast(s);
  } finally {
    loopActive = false;
    const s = await getSeries();
    if (!s || !s.running) clearKeepAlive();
  }
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
