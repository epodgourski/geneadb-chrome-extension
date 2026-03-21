// ============================================
// КОНФИГУРАЦИЯ ИСТОЧНИКОВ
// ============================================

const sources = {
  familysearch: {
    name: 'FamilySearch',
    needsAuth: true,
    
    // Определяет, является ли URL этим источником
    detect: (url) => url.includes('familysearch.org'),
    
    // Парсит URL и извлекает нужные данные
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
    
    // Генерирует URL для загрузки на основе распарсенных данных
    generateUrl: (parsed) => {
      if (!parsed.code) return null;
      const template = 'https://sg30p0.familysearch.org/service/records/storage/deepzoomcloud/dz/v1/3:1:***/$dist';
      return template.replace('***', parsed.code);
    },
    
    // Генерирует имя файла для сохранения
    getFilename: (parsed) => parsed.code,
    
    // Форматирует строку для отображения извлеченных данных
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
  }
};

// ============================================
// ГЛАВНАЯ ЛОГИКА
// ============================================

let currentSourceConfig = null;

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
function parseUrl(url, sourceConfig) {
  try {
    const parsed = sourceConfig.parse(url);
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

// Обработчик загрузки popup
document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      // Автоматически определяем источник
      const sourceDetection = detectSource(tabs[0].url);
      
      if (!sourceDetection) {
        document.getElementById('url-display').textContent = 'Ошибка: эта страница не поддерживается. Откройте URL с поддерживаемого источника';
        document.getElementById('download-btn').disabled = true;
        return;
      }
      
      currentSourceConfig = sourceDetection.config;
      processCurrentTab(tabs[0]);
    }
  });
});

// Функция для загрузки файла через Service Worker
async function downloadImage(resultUrl, filename, needsAuth = true) {
  try {
    // Показываем статус загрузки
    const status = document.getElementById('status');
    status.textContent = '⏳ Загрузка документа...';
    status.classList.remove('success', 'error');
    status.classList.add('info');
    
    console.log('Отправляем запрос на загрузку в Service Worker:', resultUrl);
    
    // Отправляем сообщение в Service Worker
    const response = await new Promise((resolve, reject) => {
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
          } else if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error));
          }
        }
      );
    });
    
    // После успешной загрузки
    status.textContent = `✓ Документ скачан! (${filename}.jpeg)`;
    status.classList.remove('info', 'error');
    status.classList.add('success');
    
    // Скрываем сообщение через 3 секунды
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

// Функция обработки текущей вкладки
function processCurrentTab(tab) {
  try {
    // Определяем источник
    const sourceDetection = detectSource(tab.url);
    
    if (!sourceDetection) {
      document.getElementById('url-display').textContent = 'Ошибка: эта страница не поддерживается. Откройте URL с familysearch.org или viewer.rusneb.ru';
      document.getElementById('download-btn').disabled = true;
      return;
    }
    
    currentSourceConfig = sourceDetection.config;
    
    // Парсим URL
    const result = parseUrl(tab.url, currentSourceConfig);
    
    if (!result) {
      document.getElementById('url-display').textContent = 'Ошибка: не удалось распарсить URL этого источника';
      document.getElementById('download-btn').disabled = true;
      return;
    }
    
    // Выводим найденную подстроку
    document.getElementById('extracted-text').innerHTML = result.displayText;
    
    // Выводим результат на страницу
    const urlDisplay = document.getElementById('url-display');
    urlDisplay.textContent = result.downloadUrl;
    
    // Обработчик кнопки копирования
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
    
    // Обработчик кнопки загрузки файла
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.disabled = false;
    downloadBtn.onclick = async () => {
      await downloadImage(result.downloadUrl, result.filename, result.needsAuth);
    };
    
  } catch (error) {
    console.error('Ошибка:', error);
    document.getElementById('url-display').textContent = 'Ошибка при обработке URL';
    document.getElementById('download-btn').disabled = true;
  }
}
