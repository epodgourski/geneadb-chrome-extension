export const rusneb = {
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
};
