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

// Получить текущую тему (по умолчанию theme-4 - Винтаж зелень)
function getCurrentTheme() {
  const saved = localStorage.getItem('geneadb-theme');
  return saved || 'theme-4';
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
  document.querySelectorAll('#copy-btn, #download-btn, #download-series-btn').forEach(btn => {
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

    detect: (url) => /ya\.ru\/archive\/catalog\/[^/]+\/\d+/.test(url),

    scanPage: async (url) => {
      const response = await fetch(url);
      const html = await response.text();
      const pathMatch = html.match(/"thumb":\{"path":"([^"]+)"/);
      if (!pathMatch) return null;
      const path = pathMatch[1].replace(/\\u0026/g, '&');
      const idMatch = path.match(/[?&]id=([a-f0-9-]+)/);
      return idMatch ? { imageId: idMatch[1] } : null;
    },

    parse: (url, extra) => {
      const cleanUrl = url.split('?')[0];
      const match = cleanUrl.match(/ya\.ru\/archive\/catalog\/[^/]+\/(\d+)/);
      if (!match) return null;
      const page = match[1];
      if (!extra || !extra.imageId) return null;
      return { page, imageId: extra.imageId };
    },

    generateUrl: (parsed) => {
      if (!parsed.imageId) return null;
      return `https://ya.ru/archive/api/image?id=${parsed.imageId}&type=original`;
    },

    getFilename: (parsed) => `f${String(parsed.page).padStart(4, '0')}`,

    displayText: (parsed) => `Страница: ${parsed.page}<br/>ID: ${parsed.imageId}`
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

// Состояние процесса скачивания серии
const seriesState = { running: false, cancel: false };

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

// Собрать ARK всех кадров серии по порядку (0-based image-index).
// Стратегия A: чтение сетки role=option[image-index] с прокруткой
// (обходит виртуальный скролл). Стратегия B (фолбэк): навигация кнопкой
// «вперёд», найденной по позиции, с чтением ARK текущего кадра из
// выбранного элемента сетки / location.pathname / src изображения.
async function psCollectArks(total) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ARK_RE = /(\d+:\d+:[A-Za-z0-9-]{4,})/;
  const arkFrom = (s) => {
    const m = (s || '').match(ARK_RE);
    return m ? m[1] : null;
  };

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
      const a = arkFrom(sel.id) || arkFrom((sel.querySelector('[id]') || {}).id);
      if (a) return a;
    }
    const fromPath = arkFrom(location.pathname);
    if (fromPath) return fromPath;
    const fromImg = [...document.querySelectorAll('img[src]')].map((x) => arkFrom(x.src)).find(Boolean);
    return fromImg || null;
  };

  // --- Стратегия A: чтение сетки с прокруткой ---
  const collectGrid = () => {
    document.querySelectorAll('[role="option"][image-index]').forEach((opt) => {
      const idx = parseInt(opt.getAttribute('image-index'));
      if (isNaN(idx)) return;
      const ark =
        arkFrom(opt.id) ||
        arkFrom((opt.querySelector('[id]') || {}).id) ||
        arkFrom((opt.querySelector('img[src]') || {}).src);
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
  if (document.querySelector('[role="option"][image-index]')) {
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

// Основной цикл скачивания серии (оркестрация в popup)
async function downloadSeries(tab) {
  const btn = document.getElementById('download-series-btn');
  const status = document.getElementById('status');

  // Повторное нажатие во время работы — отмена
  if (seriesState.running) {
    seriesState.cancel = true;
    btn.textContent = '⏹ Остановка...';
    return;
  }

  seriesState.running = true;
  seriesState.cancel = false;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let total = null;
  let count = 0;

  try {
    // Определяем общее число кадров
    const info = await runInPage(tab.id, psSeriesInfo);
    total = info && info.total ? info.total : null;

    // Собираем ARK всех кадров серии
    btn.textContent = '⏳ Поиск снимков серии...';
    const res = await runInPage(tab.id, psCollectArks, [total || 9999]);
    const items = res && res.items ? res.items : [];

    if (!items.length) {
      throw new Error('не удалось найти снимки серии на странице');
    }
    if (!total) total = items.length;

    // Ширина префикса: минимум 2 знака (01_), 3 знака при total >= 100
    const padLength = Math.max(2, String(total).length);

    for (const it of items) {
      if (seriesState.cancel) break;

      const frameNum = it.index + 1;
      const code = it.ark.split(':').pop();
      const url = sources.familysearch.generateUrl({ code });
      const prefix = String(frameNum).padStart(padLength, '0') + '_';
      const filename = prefix + code;

      btn.textContent = `⏳ Скачивается ${frameNum} / ${total}...`;
      await requestDownload(url, filename, true);
      count++;

      // Пауза, чтобы не перегружать сервер
      await sleep(400);
    }

    if (seriesState.cancel) {
      status.textContent = `⏹ Отменено. Скачано ${count} из ${total}`;
      status.className = 'status info';
    } else if (count < total) {
      status.textContent = `⚠ Скачано ${count} из ${total} (не все кадры удалось найти)`;
      status.className = 'status info';
    } else {
      status.textContent = `✓ Серия скачана! (${count} из ${total})`;
      status.className = 'status success';
      setTimeout(() => {
        status.className = 'status';
      }, 4000);
    }
  } catch (error) {
    console.error('Ошибка при скачивании серии:', error);
    status.textContent = `✗ Ошибка серии: ${error.message}${total ? ` (скачано ${count} из ${total})` : ''}`;
    status.className = 'status error';
  } finally {
    seriesState.running = false;
    seriesState.cancel = false;
    btn.textContent = total ? `📦 Скачать серию (${total})` : '📦 Скачать серию';
  }
}

// Проверить наличие серии на FamilySearch и настроить кнопку
async function setupSeriesButton(tab, sourceKey) {
  const btn = document.getElementById('download-series-btn');
  btn.style.display = 'none';

  if (sourceKey !== 'familysearch' || !tab.id) return;

  try {
    const info = await runInPage(tab.id, psSeriesInfo);
    if (info && info.hasSeries) {
      btn.style.display = '';
      btn.textContent = info.total ? `📦 Скачать серию (${info.total})` : '📦 Скачать серию';
      btn.onclick = () => downloadSeries(tab);
    }
  } catch (error) {
    console.warn('Серия не обнаружена или нет доступа к странице:', error);
  }
}

// Функция обработки текущей вкладки
async function processCurrentTab(tab) {
  try {
    const sourceDetection = detectSource(tab.url);

    if (!sourceDetection) {
      document.getElementById('url-display').textContent = 'Ошибка: эта страница не поддерживается. Откройте URL с поддерживаемого источника';
      document.getElementById('download-btn').disabled = true;
      return;
    }

    currentSourceConfig = sourceDetection.config;

    let extra = null;
    if (currentSourceConfig.needsPageScan) {
      document.getElementById('url-display').textContent = 'Сканирование страницы...';
      extra = await currentSourceConfig.scanPage(tab.url);
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

    const urlDisplay = document.getElementById('url-display');
    urlDisplay.textContent = result.downloadUrl;

    const copyBtn = document.getElementById('copy-btn');
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(result.downloadUrl);

        const status = document.getElementById('status');
        status.textContent = '✓ URL скопирован в буфер обмена!';
        status.classList.remove('error', 'info');
        status.classList.add('success');

        setTimeout(() => {
          status.classList.remove('success');
        }, 2000);
      } catch (err) {
        console.error('Ошибка при копировании:', err);
      }
    };

    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.disabled = false;
    downloadBtn.onclick = async () => {
      await downloadImage(result.downloadUrl, result.filename, result.needsAuth);
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
