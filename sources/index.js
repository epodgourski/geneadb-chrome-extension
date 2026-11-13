import { familysearch } from './familysearch.js';
import { rusneb } from './rusneb.js';
import { yandex } from './yandex.js';
import { yandexV2 } from './yandex-v2.js';

// yandexV2 стоит перед yandex и перехватывает те же URL. Старый yandex оставлен
// на время перехода: чтобы вернуться к нему, уберите yandexV2 из списка.
export const sources = { familysearch, rusneb, yandexV2, yandex };

export function detectSource(url) {
  for (const [key, config] of Object.entries(sources)) {
    if (config.detect(url)) {
      return { key, config };
    }
  }
  return null;
}

function sanitizeFilename(name) {
  return name
    .replace(/[\\/:*?"<>|,]/g, '')
    .trim();
}

export function parseUrl(url, sourceConfig, extra = null) {
  try {
    const parsed = sourceConfig.parse(url, extra);
    if (!parsed) return null;

    const downloadUrl = sourceConfig.generateUrl(parsed);
    if (!downloadUrl) return null;

    return {
      parsed,
      downloadUrl,
      needsAuth: sourceConfig.needsAuth,
      displayText: sourceConfig.displayText(parsed),
      filename: sanitizeFilename(sourceConfig.getFilename(parsed))
    };
  } catch (error) {
    console.error('Ошибка при парсинге:', error);
    return null;
  }
}
