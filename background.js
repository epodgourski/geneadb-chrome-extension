// Service Worker для обработки загрузок
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadImage') {
    downloadImage(request.url, request.filename, request.needsAuth)
      .then((result) => {
        sendResponse({ success: true, result: result });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

async function downloadImage(resultUrl, filename, needsAuth = true) {
  console.log('Service Worker: Начинаем загрузку с URL:', resultUrl);
  
  try {
    // Подготавливаем опции fetch
    const fetchOptions = {
      method: 'GET'
    };
    
    // Добавляем credentials только если требуется аутентификация
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
    
    // Преобразуем blob в base64
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const base64Data = reader.result;
        console.log('Service Worker: Blob преобразован в base64');
        
        // Создаем data URL
        const dataUrl = `data:${blob.type};base64,${base64Data.split(',')[1]}`;
        
        // Загружаем файл
        chrome.downloads.download({
          url: dataUrl,
          filename: `${filename}.jpeg`,
          saveAs: false
        }, (downloadId) => {
          if (downloadId) {
            console.log('Service Worker: Загрузка успешна, ID:', downloadId);
            resolve({ success: true, downloadId: downloadId });
          } else {
            reject(new Error('Не удалось загрузить файл браузером'));
          }
        });
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

