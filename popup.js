// ============================================
// СИСТЕМА ТЕМ
// ============================================

const themeDefinitions = {
  'theme-1': {
    name: '🏛️ Архивный коричневый',
    colors: {
      primary: '#5D4A3D',
      primaryDark: '#4A3A2D',
      accent: '#8B6F47',
      light: '#E8DCC8',
      lightBg: '#F5F2ED',
      text: '#2C2416',
      border: '#D4C4B0'
    }
  },
  'theme-2': {
    name: '🎩 Элегантный серый',
    colors: {
      primary: '#52626F',
      primaryDark: '#3F4A56',
      accent: '#7A8B99',
      light: '#E8EAED',
      lightBg: '#F0F1F3',
      text: '#2B3E4D',
      border: '#C5CBD3'
    }
  },
  'theme-3': {
    name: '💎 Классический бордовый',
    colors: {
      primary: '#6B4552',
      primaryDark: '#563849',
      accent: '#9B6B7F',
      light: '#F4E8EE',
      lightBg: '#F8F3F6',
      text: '#3D252F',
      border: '#D4BFD0'
    }
  },
  'theme-4': {
    name: '🌿 Винтаж зелень',
    colors: {
      primary: '#4A5F52',
      primaryDark: '#3A4D42',
      accent: '#6B8472',
      light: '#E8EFE8',
      lightBg: '#F1F4F0',
      text: '#2A3F32',
      border: '#C5D5CB'
    }
  },
  'theme-5': {
    name: '👑 Знатный синий',
    colors: {
      primary: '#3F5670',
      primaryDark: '#2F4560',
      accent: '#5A7FA0',
      light: '#E8ECEF',
      lightBg: '#EFF2F7',
      text: '#1F3550',
      border: '#C5D5E5'
    }
  },
  'theme-6': {
    name: '✨ Утонченный тёмный',
    colors: {
      primary: '#4A4A52',
      primaryDark: '#3A3A42',
      accent: '#6B7079',
      light: '#E8E8EA',
      lightBg: '#F1F1F3',
      text: '#2A2A32',
      border: '#C5C5CD'
    }
  }
};

// Получить текущую тему (по умолчанию theme-1 - Архивный коричневый)
function getCurrentTheme() {
  const saved = localStorage.getItem('geneadb-theme');
  return saved || 'theme-1';
}

// Применить тему
function applyTheme(themeId) {
  const theme = themeDefinitions[themeId];
  if (!theme) return;
  
  localStorage.setItem('geneadb-theme', themeId);
  
  // Обновляем CSS переменные
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
  });
  
  // Обновляем заголовок
  const header = document.querySelector('.header');
  if (header) {
    header.style.background = `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`;
  }
  
  // Обновляем блоки
  document.querySelectorAll('#extracted-text').forEach(box => {
    box.style.background = theme.colors.light;
    box.style.borderColor = theme.colors.accent;
    box.style.color = theme.colors.text;
  });

  document.querySelectorAll('#url-display').forEach(box => {
    box.style.background = theme.colors.lightBg;
    box.style.borderColor = theme.colors.border;
    box.style.color = theme.colors.text;
  });
  
  // Обновляем кнопки
  document.querySelectorAll('#download-btn, #download-series-btn').forEach(btn => {
    btn.style.backgroundColor = theme.colors.accent;
    btn.style.borderColor = theme.colors.accent;
  });

  // Обновляем метки
  document.querySelectorAll('.label').forEach(label => {
    label.style.color = theme.colors.primary;
  });
  
  // Обновляем кнопки в меню тем
  updateThemeMenu(themeId);
}

// Осветлить цвет
function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

// Обновить меню выбора тем
function updateThemeMenu(currentTheme) {
  const themeButtons = document.getElementById('theme-buttons');
  if (!themeButtons) return;
  
  themeButtons.innerHTML = '';
  
  Object.entries(themeDefinitions).forEach(([themeId, themeDef]) => {
    const btn = document.createElement('button');
    btn.textContent = themeDef.name;
    btn.style.cssText = `
      padding: 8px 12px !important;
      border: 0.5px solid ${themeDef.colors.border} !important;
      background: ${themeDef.colors.lightBg} !important;
      color: ${themeDef.colors.text} !important;
      border-radius: 4px !important;
      cursor: pointer !important;
      font-size: 12px !important;
      font-weight: 400 !important;
      transition: all 0.2s !important;
      width: 100% !important;
      margin: 0 !important;
      text-align: left !important;
    `;
    
    if (themeId === currentTheme) {
      btn.style.background = `${themeDef.colors.accent} !important`;
      btn.style.color = 'white !important';
      btn.style.borderColor = `${themeDef.colors.accent} !important`;
      btn.style.fontWeight = '500 !important';
    }
    
    btn.addEventListener('click', () => {
      applyTheme(themeId);
      document.getElementById('theme-menu').classList.remove('active');
    });
    
    btn.addEventListener('mouseenter', () => {
      if (themeId !== currentTheme) {
        btn.style.background = `${themeDef.colors.light} !important`;
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      if (themeId !== currentTheme) {
        btn.style.background = `${themeDef.colors.lightBg} !important`;
      }
    });
    
    themeButtons.appendChild(btn);
  });
}

// Инициализировать меню тем
function initThemeMenu() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const themeMenu = document.getElementById('theme-menu');
  
  if (!toggleBtn || !themeMenu) return;
  
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu.classList.toggle('active');
  });
  
  // Закрываем меню при клике вне его
  document.addEventListener('click', (e) => {
    if (!themeMenu.contains(e.target) && e.target !== toggleBtn) {
      themeMenu.classList.remove('active');
    }
  });
  
  // Закрываем меню при скролле
  document.addEventListener('scroll', () => {
    themeMenu.classList.remove('active');
  });
}

// ============================================
// УТИЛИТЫ
// ============================================

function debugLog(msg) {
  const el = document.getElementById('debug-log');
  if (!el) return;
  // debug-блок скрыт по умолчанию; для отладки раскомментировать строку ниже
  // el.style.display = 'block';
  el.textContent += msg + '\n';
  el.scrollTop = el.scrollHeight;
  console.log('[debug]', msg);
}

async function runInPage(tabId, func, args = [], world) {
  const options = { target: { tabId }, func, args };
  if (world) options.world = world;
  const results = await chrome.scripting.executeScript(options);
  return results && results[0] ? results[0].result : undefined;
}

// ============================================
// КОНФИГУРАЦИЯ ИСТОЧНИКОВ
// ============================================

const sources = {
  familysearch: {
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
  },

  rusneb: {
    name: 'RusNEB',
    needsAuth: false,

    detect: (url) => url.includes('viewer.rusneb.ru'),

    parse: (url) => {
      const questionIndex = url.indexOf('?');
      let searchUrl = questionIndex === -1 ? url : url.substring(0, questionIndex);

      const lastSlashIndex = searchUrl.lastIndexOf('/');
      if (lastSlashIndex === -1) return null;

      const code = searchUrl.substring(lastSlashIndex + 1);

      const params = new URLSearchParams(questionIndex === -1 ? '' : url.substring(questionIndex));
      const page = params.get('page') || '1';

      return { code, page };
    },

    generateUrl: (parsed) => {
      if (!parsed.code || !parsed.page) return null;
      return `https://viewer.rusneb.ru/api/v1/document/${parsed.code}/page/${parsed.page}`;
    },

    getFilename: (parsed) => {
      const paddedPage = String(parsed.page).padStart(4, '0');
      return `${parsed.code}_${paddedPage}`;
    },

    displayText: (parsed) => `Код: ${parsed.code}<br/>Страница: ${parsed.page}`
  },

  yandex: {
    name: 'Яндекс Архивы',
    needsAuth: false,
    needsPageScan: true,
    directDownload: true,

    detect: (url) => /ya\.ru\/archive\/catalog\/[^/]+\/\d+/.test(url),

    scanPage: async (tab) => {
      debugLog('Запуск scanPage для Яндекс...');

      // buildId из <script> (стабилен), parentId/pageNum из URL (актуальны при SPA)
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

        // Проверяем: совпадает ли currentNode с текущей страницей
        const cachedNode = nextData?.props?.pageProps?.currentNode;
        const cachedPage = cachedNode?.namepath?.match(/(\d+)\.\w+$/)?.[1];
        const isStale = !cachedNode || cachedPage !== pageNum.padStart(cachedPage?.length || 1, '0');

        let node = cachedNode;
        if (isStale) {
          // SPA-навигация: данные устарели, фетчим актуальные
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
  }
};

// Функция для определения источника по URL
function detectSource(url) {
  for (const [key, config] of Object.entries(sources)) {
    if (config.detect(url)) {
      return { key, config };
    }
  }
  return null;
}

// Функция для парсинга URL (использует конфиг источника)
function parseUrl(url, sourceConfig, extra = null) {
  try {
    const parsed = sourceConfig.parse(url, extra);
    if (!parsed) return null;

    const downloadUrl = sourceConfig.generateUrl(parsed);
    if (!downloadUrl) return null;

    return {
      parsed: parsed,
      downloadUrl: downloadUrl,
      needsAuth: sourceConfig.needsAuth,
      displayText: sourceConfig.displayText(parsed),
      filename: sourceConfig.getFilename(parsed)
    };
  } catch (error) {
    console.error('Ошибка при парсинге:', error);
    return null;
  }
}

let currentSourceConfig = null;

// Низкоуровневый запрос на загрузку файла через Service Worker.
// Возвращает Promise, который резолвится при успехе и реджектится при ошибке.
function requestDownload(resultUrl, filename, needsAuth = true) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'downloadImage',
        url: resultUrl,
        filename: filename,
        needsAuth: needsAuth
      },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (result && result.success) {
          resolve(result);
        } else {
          reject(new Error(result ? result.error : 'Неизвестная ошибка'));
        }
      }
    );
  });
}

// Прямая загрузка: fetch в контексте страницы (cookies ya.ru), затем chrome.downloads
async function downloadDirect(resultUrl, filename, tabId) {
  const status = document.getElementById('status');
  status.textContent = '⏳ Загрузка документа...';
  status.classList.remove('success', 'error');
  status.classList.add('info');

  console.log('Загрузка через fetch в контексте страницы:', resultUrl);
  debugLog('downloadDirect: fetch в контексте страницы...');

  const dataUrl = await runInPage(tabId, async (url) => {
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) return { error: 'HTTP ' + response.status };
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ dataUrl: reader.result, size: blob.size });
        reader.onerror = () => resolve({ error: 'FileReader error' });
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return { error: e.message };
    }
  }, [resultUrl], 'MAIN');

  if (!dataUrl || dataUrl.error) {
    const errMsg = dataUrl ? dataUrl.error : 'Скрипт не выполнился';
    debugLog('Ошибка fetch: ' + errMsg);
    status.textContent = `✗ Ошибка: ${errMsg}`;
    status.classList.remove('info', 'success');
    status.classList.add('error');
    return;
  }

  debugLog('Получен blob: ' + (dataUrl.size / 1024 / 1024).toFixed(1) + ' MB');

  chrome.downloads.download(
    { url: dataUrl.dataUrl, filename: `${filename}.jpeg`, saveAs: false },
    (downloadId) => {
      const err = chrome.runtime.lastError;
      if (err) {
        debugLog('Ошибка downloads: ' + err.message);
        status.textContent = `✗ Ошибка: ${err.message}`;
        status.classList.remove('info', 'success');
        status.classList.add('error');
      } else {
        debugLog('Скачан, ID: ' + downloadId);
        status.textContent = `✓ Документ скачан! (${filename}.jpeg)`;
        status.classList.remove('info', 'error');
        status.classList.add('success');
        setTimeout(() => { status.classList.remove('success'); }, 3000);
      }
    }
  );
}

// Функция для загрузки одного файла через Service Worker (с индикацией в UI)
async function downloadImage(resultUrl, filename, needsAuth = true) {
  try {
    const status = document.getElementById('status');
    status.textContent = '⏳ Загрузка документа...';
    status.classList.remove('success', 'error');
    status.classList.add('info');

    console.log('Отправляем запрос на загрузку в Service Worker:', resultUrl);

    await requestDownload(resultUrl, filename, needsAuth);

    status.textContent = `✓ Документ скачан! (${filename}.jpeg)`;
    status.classList.remove('info', 'error');
    status.classList.add('success');
    
    setTimeout(() => {
      status.classList.remove('success');
    }, 3000);
    
  } catch (error) {
    console.error('Ошибка при загрузке:', error);
    const status = document.getElementById('status');
    status.textContent = `✗ Ошибка: ${error.message}`;
    status.classList.remove('info', 'success');
    status.classList.add('error');
  }
}

// ============================================
// ПАКЕТНОЕ СКАЧИВАНИЕ СЕРИИ (FamilySearch)
// ============================================

// Общее число кадров текущей серии (для подписи кнопки)
let seriesTotalForLabel = 0;

// Выполнить функцию в контексте страницы активной вкладки.
// func сериализуется и не должна замыкать внешние переменные.
async function runInPage(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args
  });
  return results && results[0] ? results[0].result : undefined;
}

// --- Инъектируемые в страницу функции (выполняются в DOM FamilySearch) ---
// Все селекторы языконезависимы: используются технические признаки
// (groupId/i в URL, input[type=number][min=1], role=option[image-index],
// ARK из location.pathname/id/src), а кнопки навигации ищутся по их
// положению относительно поля ввода, а не по тексту aria-label.

// Определить, есть ли на странице серия снимков, и узнать общее число кадров
function psSeriesInfo() {
  const url = new URL(location.href);
  const groupId = url.searchParams.get('groupId');
  const iRaw = url.searchParams.get('i');
  const currentIndex = iRaw !== null ? parseInt(iRaw) : null;

  // Поле ввода номера кадра: числовое, с min=1 (без привязки к языку)
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

// Примечание: сбор ARK (psCollectArks) и сам цикл скачивания серии перенесены
// в service worker (background.js), чтобы процесс не прерывался при закрытии или
// потере фокуса попапом. Здесь остаётся только детекция серии и связь с фоном.

// Запрос к фоновому service worker (обёртка над sendMessage)
function sendToBackground(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (resp) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(resp);
    });
  });
}

// Обновить UI серии по состоянию, полученному из фона
function updateSeriesUI(state) {
  const btn = document.getElementById('download-series-btn');
  const status = document.getElementById('status');
  if (!btn || !state) return;

  if (state.running) {
    btn.style.display = '';
    btn.textContent = '⏳ ' + (state.message || 'Скачивание серии...');
    return;
  }

  btn.textContent = seriesTotalForLabel
    ? `📦 Скачать серию (${seriesTotalForLabel})`
    : '📦 Скачать серию';

  if (state.phase && state.message) {
    if (state.phase === 'done') {
      status.textContent = '✓ ' + state.message;
      status.className = 'status success';
      setTimeout(() => {
        status.className = 'status';
      }, 4000);
    } else if (state.phase === 'error') {
      status.textContent = '✗ ' + state.message;
      status.className = 'status error';
    } else if (state.phase === 'cancelled') {
      status.textContent = '⏹ ' + state.message;
      status.className = 'status info';
    } else {
      status.textContent = '⚠ ' + state.message;
      status.className = 'status info';
    }
  }
}

// Клик по кнопке серии: старт нового скачивания или отмена текущего (через фон)
async function onSeriesButtonClick(tabId) {
  const state = await sendToBackground({ action: 'getSeriesState' });
  if (state && state.running) {
    document.getElementById('download-series-btn').textContent = '⏹ Остановка...';
    await sendToBackground({ action: 'cancelSeries' });
    return;
  }
  const res = await sendToBackground({ action: 'startSeries', tabId });
  if (res && res.ok === false) {
    const status = document.getElementById('status');
    status.textContent = '✗ ' + (res.error || 'Не удалось запустить скачивание серии');
    status.className = 'status error';
  }
}

// Слушаем прогресс серии из фонового процесса (пока попап открыт)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.action === 'seriesProgress') {
    updateSeriesUI(msg.state);
  }
});

// Проверить наличие серии на FamilySearch и настроить кнопку.
// Цикл скачивания выполняется в service worker и переживает закрытие попапа.
async function setupSeriesButton(tab, sourceKey) {
  const btn = document.getElementById('download-series-btn');
  btn.style.display = 'none';

  if (sourceKey === 'familysearch' && tab.id) {
    try {
      const info = await runInPage(tab.id, psSeriesInfo);
      if (info && info.hasSeries) {
        seriesTotalForLabel = info.total || 0;
        btn.style.display = '';
        btn.textContent = info.total ? `📦 Скачать серию (${info.total})` : '📦 Скачать серию';
        btn.onclick = () => onSeriesButtonClick(tab.id);
      }
    } catch (error) {
      console.warn('Серия не обнаружена или нет доступа к странице:', error);
    }
  }

  // Если серия уже скачивается в фоне (попап переоткрыли) — показать прогресс
  try {
    const state = await sendToBackground({ action: 'getSeriesState' });
    if (state && state.running) {
      if (!seriesTotalForLabel && state.total) seriesTotalForLabel = state.total;
      btn.style.display = '';
      if (!btn.onclick) btn.onclick = () => onSeriesButtonClick(tab.id);
      updateSeriesUI(state);
    }
  } catch (error) {
    /* фон недоступен — игнорируем */
  }
}

// Функция обработки текущей вкладки
async function processCurrentTab(tab) {
  try {
    debugLog('URL: ' + tab.url);
    const sourceDetection = detectSource(tab.url);

    if (!sourceDetection) {
      debugLog('Источник не определён');
      document.getElementById('url-display').textContent = 'Ошибка: эта страница не поддерживается. Откройте URL с поддерживаемого источника';
      document.getElementById('download-btn').disabled = true;
      return;
    }

    debugLog('Источник: ' + sourceDetection.key);
    currentSourceConfig = sourceDetection.config;

    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.disabled = true;
    downloadBtn.textContent = '⏳ Подготовка...';

    let extra = null;
    if (currentSourceConfig.needsPageScan) {
      document.getElementById('url-display').textContent = '⏳ Сканирование страницы...';
      extra = await currentSourceConfig.scanPage(tab);
      debugLog('scanPage результат: ' + (extra ? JSON.stringify(extra).substring(0, 120) : 'null'));
      if (!extra) {
        document.getElementById('url-display').textContent = 'Ошибка: не удалось найти изображение на странице';
        document.getElementById('download-btn').disabled = true;
        return;
      }
    }

    const result = parseUrl(tab.url, currentSourceConfig, extra);

    if (!result) {
      document.getElementById('url-display').textContent = 'Ошибка: не удалось распарсить URL этого источника';
      document.getElementById('download-btn').disabled = true;
      return;
    }

    document.getElementById('extracted-text').innerHTML = result.displayText;
    document.getElementById('url-display').textContent = result.downloadUrl;

    downloadBtn.disabled = false;
    downloadBtn.textContent = '⬇️ Скачать документ';
    downloadBtn.onclick = async () => {
      downloadBtn.disabled = true;
      downloadBtn.textContent = '⏳ Загрузка...';
      if (currentSourceConfig.directDownload) {
        await downloadDirect(result.downloadUrl, result.filename, tab.id);
      } else {
        await downloadImage(result.downloadUrl, result.filename, result.needsAuth);
      }
      downloadBtn.disabled = false;
      downloadBtn.textContent = '⬇️ Скачать документ';
    };

    // Проверяем, есть ли на странице серия снимков (FamilySearch)
    await setupSeriesButton(tab, sourceDetection.key);

  } catch (error) {
    console.error('Ошибка:', error);
    document.getElementById('url-display').textContent = 'Ошибка при обработке URL';
    document.getElementById('download-btn').disabled = true;
  }
}

// Обработчик загрузки popup
document.addEventListener('DOMContentLoaded', () => {
  const currentTheme = getCurrentTheme();
  applyTheme(currentTheme);

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      processCurrentTab(tabs[0]);
    }
  });
});
