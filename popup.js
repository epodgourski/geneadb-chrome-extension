import { detectSource, parseUrl } from './sources/index.js';
import { psSeriesInfo } from './sources/familysearch.js';
import { debugLog, runInPage } from './utils.js';

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

function getCurrentTheme() {
  const saved = localStorage.getItem('geneadb-theme');
  return saved || 'theme-1';
}

function applyTheme(themeId) {
  const theme = themeDefinitions[themeId];
  if (!theme) return;

  localStorage.setItem('geneadb-theme', themeId);

  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
  });

  const header = document.querySelector('.header');
  if (header) {
    header.style.background = `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`;
  }

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

  document.querySelectorAll('#download-btn, #download-series-btn').forEach(btn => {
    btn.style.backgroundColor = theme.colors.accent;
    btn.style.borderColor = theme.colors.accent;
  });

  document.querySelectorAll('.label').forEach(label => {
    label.style.color = theme.colors.primary;
  });

  updateThemeMenu(themeId);
}

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

function initThemeMenu() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const themeMenu = document.getElementById('theme-menu');

  if (!toggleBtn || !themeMenu) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!themeMenu.contains(e.target) && e.target !== toggleBtn) {
      themeMenu.classList.remove('active');
    }
  });

  document.addEventListener('scroll', () => {
    themeMenu.classList.remove('active');
  });
}

// ============================================
// ЗАГРУЗКА ФАЙЛОВ
// ============================================

let currentSourceConfig = null;

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

let seriesTotalForLabel = 0;

function sendToBackground(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (resp) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(resp);
    });
  });
}

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

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.action === 'seriesProgress') {
    updateSeriesUI(msg.state);
  }
});

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

// ============================================
// ОБРАБОТКА ТЕКУЩЕЙ ВКЛАДКИ
// ============================================

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

    await setupSeriesButton(tab, sourceDetection.key);

  } catch (error) {
    console.error('Ошибка:', error);
    document.getElementById('url-display').textContent = 'Ошибка при обработке URL';
    document.getElementById('download-btn').disabled = true;
  }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const currentTheme = getCurrentTheme();
  applyTheme(currentTheme);

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      processCurrentTab(tabs[0]);
    }
  });
});
