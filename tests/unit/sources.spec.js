import { test, expect } from '@playwright/test';

// Unit tests for source detection and URL parsing logic.
// These run in Node.js — no browser or Chrome APIs needed.

// We can't import ES modules with chrome.* deps directly,
// so we inline the pure logic from sources/*.js here.

const familysearch = {
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
};

const rusneb = {
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
};

const yandex = {
  detect: (url) => /(ya\.ru|yandex\.ru)\/archive\/catalog\/[^/]+\/\d+/.test(url),
};

// --- FamilySearch ---

test.describe('FamilySearch', () => {
  test('detect — positive', () => {
    expect(familysearch.detect('https://www.familysearch.org/ark:/61903/3:1:3QS7-L9S1-ZSRZ?i=5&wc=M6ZY-RN5')).toBe(true);
  });

  test('detect — negative', () => {
    expect(familysearch.detect('https://example.com')).toBe(false);
  });

  test('parse — extracts code from URL with query params', () => {
    const result = familysearch.parse('https://www.familysearch.org/ark:/61903/3:1:3QS7-L9S1-ZSRZ?i=5&wc=M6ZY-RN5');
    expect(result).not.toBeNull();
    expect(result.code).toBe('3QS7-L9S1-ZSRZ');
  });

  test('parse — extracts code from URL without query params', () => {
    const result = familysearch.parse('https://www.familysearch.org/ark:/61903/3:1:3QS7-ABC-DEF');
    expect(result).not.toBeNull();
    expect(result.code).toBe('3QS7-ABC-DEF');
  });

  test('parse — returns null for URL without colon in path', () => {
    const result = familysearch.parse('https://www.familysearch.org/home');
    expect(result).toBeNull();
  });

  test('generateUrl — produces correct download URL', () => {
    const url = familysearch.generateUrl({ code: '3QS7-L9S1-ZSRZ' });
    expect(url).toBe('https://sg30p0.familysearch.org/service/records/storage/deepzoomcloud/dz/v1/3:1:3QS7-L9S1-ZSRZ/$dist');
  });

  test('generateUrl — returns null for empty code', () => {
    expect(familysearch.generateUrl({ code: '' })).toBeNull();
  });
});

// --- RusNEB ---

test.describe('RusNEB', () => {
  test('detect — positive', () => {
    expect(rusneb.detect('https://viewer.rusneb.ru/ru/rsl01003456789?page=5')).toBe(true);
  });

  test('detect — negative', () => {
    expect(rusneb.detect('https://rusneb.ru/catalog/123')).toBe(false);
  });

  test('parse — extracts code and page', () => {
    const result = rusneb.parse('https://viewer.rusneb.ru/ru/rsl01003456789?page=5');
    expect(result).toEqual({ code: 'rsl01003456789', page: '5' });
  });

  test('parse — defaults page to 1', () => {
    const result = rusneb.parse('https://viewer.rusneb.ru/ru/rsl01003456789');
    expect(result).toEqual({ code: 'rsl01003456789', page: '1' });
  });

  test('generateUrl — correct API URL', () => {
    const url = rusneb.generateUrl({ code: 'rsl01003456789', page: '5' });
    expect(url).toBe('https://viewer.rusneb.ru/api/v1/document/rsl01003456789/page/5');
  });
});

// --- Yandex ---

test.describe('Yandex', () => {
  test('detect — ya.ru positive', () => {
    expect(yandex.detect('https://ya.ru/archive/catalog/abc-def-123/42')).toBe(true);
  });

  test('detect — yandex.ru positive', () => {
    expect(yandex.detect('https://yandex.ru/archive/catalog/abc-def-123/42')).toBe(true);
  });

  test('detect — negative', () => {
    expect(yandex.detect('https://ya.ru/search?q=test')).toBe(false);
  });

  test('detect — negative, no page number', () => {
    expect(yandex.detect('https://ya.ru/archive/catalog/abc-def-123')).toBe(false);
  });
});
