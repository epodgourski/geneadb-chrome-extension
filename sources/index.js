import { familysearch } from './familysearch.js';
import { rusneb } from './rusneb.js';
import { yandex } from './yandex.js';

export const sources = { familysearch, rusneb, yandex };

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
