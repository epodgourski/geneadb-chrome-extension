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

// Определить, есть ли на странице серия снимков
function psSeriesInfo() {
  const input = document.querySelector('input[aria-label="Ввести номер Снимок"]');
  if (!input) return { hasSeries: false };
  const total = parseInt(input.max);
  const current = parseInt(input.value);
  if (!(total > 1)) return { hasSeries: false };
  return { hasSeries: true, total, current };
}

// Получить ARK и номер текущего (выбранного) снимка
function psCurrentArk() {
  const input = document.querySelector('input[aria-label="Ввести номер Снимок"]');
  const num = input ? parseInt(input.value) : null;
  let el = null;
  if (num) el = document.querySelector('[data-testid="Снимок ' + num + '"]');
  if (!el) {
    const sel = document.querySelector('[role="option"][aria-selected="true"]');
    if (sel) el = sel.querySelector('[data-testid^="Снимок"]') || sel;
  }
  if (!el) {
    const all = document.querySelectorAll('[data-testid^="Снимок"]');
    if (all.length === 1) el = all[0];
  }
  if (!el) return null;
  const id = (el.id || '').replace('grid-item-', '');
  if (!id) return null;
  return { num, ark: id };
}

// Кнопка "Следующий снимок" отключена (мы на последнем снимке)?
function psIsNextDisabled() {
  const b = document.querySelector('button[aria-label="Следующий снимок"]');
  if (!b) return true;
  return b.getAttribute('aria-disabled') === 'true' || b.disabled === true;
}

// Перейти к первому снимку серии
async function psGoToFirst() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const input = () => document.querySelector('input[aria-label="Ввести номер Снимок"]');
  const val = () => (input() ? parseInt(input().value) : null);
  let guard = 0;
  while (guard++ < 2000) {
    if (val() === 1) break;
    const before = val();
    const prev = document.querySelector('button[aria-label="Предыдущий снимок"]');
    if (prev && prev.getAttribute('aria-disabled') !== 'true' && !prev.disabled) {
      prev.click();
    } else {
      // Запасной вариант: кликнуть по первому снимку в сетке
      const item =
        document.querySelector('[data-testid="Снимок 1"]') ||
        document.querySelector('[role="option"][image-index="0"]');
      if (!item) break;
      item.click();
    }
    let waited = 0;
    while (waited < 8000) {
      await sleep(100);
      waited += 100;
      if (val() !== before && val() !== null) break;
    }
  }
  return val();
}

// Кликнуть "Следующий снимок" и дождаться смены номера снимка
async function psClickNextAndWait() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const input = () => document.querySelector('input[aria-label="Ввести номер Снимок"]');
  const val = () => (input() ? parseInt(input().value) : null);
  const before = val();
  const btn = document.querySelector('button[aria-label="Следующий снимок"]');
  if (!btn) return { ok: false, error: 'no-next-button' };
  btn.click();
  let waited = 0;
  while (waited < 8000) {
    await sleep(100);
    waited += 100;
    const v = val();
    if (v !== before && v !== null) return { ok: true, num: v };
  }
  return { ok: false, error: 'timeout' };
}

// Основной цикл скачивания серии (оркестрация в popup)
async function downloadSeries(tab, total) {
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

  // Ширина префикса: минимум 2 знака (01_), 3 знака при total >= 100
  const padLength = Math.max(2, String(total).length);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let count = 0;

  try {
    btn.textContent = '⏳ Переход к первому снимку...';
    await runInPage(tab.id, psGoToFirst);

    while (true) {
      if (seriesState.cancel) break;

      const cur = await runInPage(tab.id, psCurrentArk);
      if (!cur || !cur.ark) {
        throw new Error('Не удалось определить ARK текущего снимка');
      }

      const frameNum = cur.num || count + 1;
      const code = cur.ark.split(':').pop();
      const url = sources.familysearch.generateUrl({ code });
      const prefix = String(frameNum).padStart(padLength, '0') + '_';
      const filename = prefix + code;

      btn.textContent = `⏳ Скачивается ${frameNum} / ${total}...`;
      await requestDownload(url, filename, true);
      count++;

      if (seriesState.cancel) break;

      // Последний снимок — выходим
      const nextDisabled = await runInPage(tab.id, psIsNextDisabled);
      if (nextDisabled) break;

      const res = await runInPage(tab.id, psClickNextAndWait);
      if (!res || !res.ok) break;

      // Пауза, чтобы не перегружать сервер
      await sleep(400);
    }

    if (seriesState.cancel) {
      status.textContent = `⏹ Отменено. Скачано ${count} из ${total}`;
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
    status.textContent = `✗ Ошибка серии: ${error.message} (скачано ${count} из ${total})`;
    status.className = 'status error';
  } finally {
    seriesState.running = false;
    seriesState.cancel = false;
    btn.textContent = `📦 Скачать серию (${total})`;
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
      btn.textContent = `📦 Скачать серию (${info.total})`;
      btn.onclick = () => downloadSeries(tab, info.total);
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
