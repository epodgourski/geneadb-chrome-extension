# Архитектура "Загрузчика документов"

## Структура кода

```
popup.js                          ← Основная логика UI, темы
│
├─ sources/index.js               ← Реестр источников, detectSource(), parseUrl()
│  ├─ sources/familysearch.js     ← Источник FamilySearch + серии
│  ├─ sources/rusneb.js           ← Источник RusNEB
│  ├─ sources/yandex-v2.js        ← Яндекс Архивы V2 (ARCHIVE_ABBR, имя из крошек)
│  └─ sources/yandex.js           ← Яндекс Архивы, старый механизм (пока сохранён)
│
├─ yandex-hook.js                 ← Content script (MAIN world) на yandex.ru/archive
├─ utils.js                       ← debugLog(), runInPage()
├─ background.js                  ← Service Worker для загрузок и серий
└─ popup.html                     ← Интерфейс с темами
```

## Поток обработки

```
Пользователь открывает popup
         ↓
detectSource() проверяет все источники
         ↓
Находит совпадение (detect: true)
         ↓
Если needsPageScan — вызывает scanPage()
         ↓
parseUrl() вызывает методы источника:
  • parse()          → извлекает данные
  • generateUrl()    → создает URL для скачивания
  • getFilename()    → определяет имя файла
  • displayText()    → форматирует для отображения
         ↓
sanitizeFilename() очищает имя файла
  (удаляет \ / : * ? " < > | , )
         ↓
Отображает результат в UI
         ↓
Пользователь нажимает "Скачать"
         ↓
source.download() — если источник его определяет (Яндекс V2), иначе
downloadImage() / downloadDirect() с параметром needsAuth
  • needsAuth: true  → Service Worker с cookies
  • needsAuth: false → без аутентификации
  • directDownload   → fetch в контексте страницы
```

## Каждый источник содержит обязательные и опциональные методы

```javascript
const newSource = {
  // Обязательные
  name: string,                      // Название
  needsAuth: boolean,                // Требует ли cookies?
  detect: (url) => boolean,          // Это мой источник?
  parse: (url, extra) => object,     // Парси URL
  generateUrl: (parsed) => string,   // Создай URL для загрузки
  getFilename: (parsed) => string,   // Назови файл (автоматически санитизируется)
  displayText: (parsed) => string,   // Покажи результат

  // Опциональные
  needsPageScan: boolean,            // Нужно ли сканировать страницу перед парсингом?
  scanPage: (tab) => object,         // Сканирование DOM страницы
  directDownload: boolean,           // Скачивание через fetch в контексте страницы
  download: async (tab, onStatus) => string  // Своё скачивание целиком; возвращает текст для статуса
}
```

## Типы загрузки

### 1. С аутентификацией (needsAuth: true)
```
Пример: FamilySearch
Service Worker отправляет: credentials: 'include'
Результат: Используются cookies текущей сессии браузера
```

### 2. Без аутентификации (needsAuth: false)
```
Пример: RusNEB
Service Worker отправляет: обычный fetch без credentials
Результат: Публичный доступ
```

### 3. Прямая загрузка (directDownload: true)
```
Пример: старый механизм Яндекс Архивов (sources/yandex.js)
fetch выполняется в контексте страницы (world: 'MAIN')
Результат: Используются cookies ya.ru
```

### 4. Своё скачивание источника (download)
```
Пример: Яндекс Архивы V2 (sources/yandex-v2.js)
popup.js вызывает source.download(tab, onStatus) вместо стандартной загрузки
```

## Яндекс Архивы V2: перехват оригинала

Оригинал скана грузится страницей через
`fetch('/archive/api/image?id=<imageId>&type=original&exp=<unix>&sig=<подпись>')`
с заголовками `X-Archive-Image-Token`, `X-Requested-With`, `X-Retpath-Y`.
Подпись живёт несколько минут, без заголовков сервер отвечает 403, поэтому
повторить запрос из расширения нельзя — ответ перехватывается в самой странице.

```
yandex-hook.js (MAIN world, document_start)
  • оборачивает window.fetch и XMLHttpRequest
  • запросы type=preview|original → idByPath[location.pathname] = imageId
  • ответ type=original → response.clone().blob() → кэш Map<imageId, Blob>
    (+ URL и заголовки запроса для повтора)
  • ответ странице возвращается без изменений
         ↕ window.postMessage  GENEADB_YA_REQ { op: 'status' | 'get' }
         ↕                     GENEADB_YA_RES { ... }   (проверка event.source === window)
sources/yandex-v2.js (функции, внедряемые в isolated world через executeScript)
  • psReadBreadcrumbs() — хлебные крошки → архив, фонд, опись, дело, кадр
  • psAskHook(op)       — запрос к хуку
         ↓
op 'get' в хуке:
  1. blob текущего кадра есть в кэше → отдать
  2. есть сохранённый запрос original → повторить с теми же заголовками
     (403 = подпись истекла → дальше)
  3. нажать «+» в просмотрщике (поиск по aria-label/title/тексту/классам),
     ждать blob до 15 с
  4. иначе — ошибка (preview молча не скачивается)
         ↓
blob → data URL → popup → background.js { action: 'downloadDataUrl' }
         ↓
chrome.downloads.download({ url: dataUrl, filename, conflictAction: 'uniquify' })
```

**Имя файла:** `<Архив>.<фонд>-<опись>-<дело>.<кадр>.jpg`, например `ГАСмО.48-4-825.643.jpg`.
Архив сокращается по словарю `ARCHIVE_ABBR` в начале `sources/yandex-v2.js`; если его там нет —
полное название без пробелов и `console.warn`. Если крошек нет — номер кадра из URL.
Удаляются символы `\ / : * ? " < > |`. Расширение `.jpg` добавляется в источнике,
а не в background (в отличие от других источников с `.jpeg`).

## Как добавить новый источник?

### Шаг 1: Создайте файл `sources/mynewsource.js`

```javascript
export const mynewsource = {
  name: 'My New Source',
  needsAuth: false,               // или true
  detect: (url) => url.includes('mynewsource.com'),
  parse: (url) => {
    // Ваша логика извлечения данных
    return { code, param };
  },
  generateUrl: (parsed) => {
    return `https://api.mynewsource.com/download/${parsed.code}`;
  },
  getFilename: (parsed) => {
    // Имя автоматически пройдёт через sanitizeFilename()
    return `${parsed.code}`;
  },
  displayText: (parsed) => {
    return `Code: ${parsed.code}`;
  }
};
```

### Шаг 2: Зарегистрируйте в `sources/index.js`

```javascript
import { mynewsource } from './mynewsource.js';

export const sources = { familysearch, rusneb, yandex, mynewsource };
```

### Шаг 3: Добавьте host_permissions в `manifest.json` (при необходимости)

### Шаг 4: Готово!

Всё остальное работает автоматически:
- ✅ detectSource() найдет ваш источник
- ✅ parseUrl() использует ваши методы
- ✅ sanitizeFilename() очистит имя файла
- ✅ UI обновится автоматически
- ✅ Загрузка произойдет с правильной аутентификацией

## Преимущества этой архитектуры

✅ **Модульность** — каждый источник в отдельном ES-модуле
✅ **Расширяемость** — легко добавлять новые источники
✅ **Консистентность** — все источники работают одинаково
✅ **Безопасность** — имена файлов автоматически санитизируются
✅ **Простота** — не нужно понимать всю архитектуру для добавления источника

## Текущие источники

### FamilySearch (sources/familysearch.js)
- **Вход:** `https://familysearch.org/...?...`
- **Парсит:** подстроку между `:` и `?`
- **Загружает:** с использованием cookies (needsAuth: true)
- **Файл:** `код.jpeg`
- **Серии:** пакетное скачивание через Service Worker с keep-alive

### RusNEB (sources/rusneb.js)
- **Вход:** `https://viewer.rusneb.ru/ru/КОД?page=НОМЕР`
- **Парсит:** код и номер страницы
- **Загружает:** публичный доступ (needsAuth: false)
- **Файл:** `код_0001.jpeg` (номер с нулями)

### Яндекс Архивы V2 (sources/yandex-v2.js + yandex-hook.js)
- **Вход:** `https://yandex.ru/archive/catalog/{uuid}/{N}`
- **Парсит:** хлебные крошки страницы; imageId — из перехваченных запросов
- **Загружает:** перехват ответа страницы в MAIN world, при необходимости — автонажатие «+»
- **Файл:** `ГАСмО.48-4-825.643.jpg`

### Яндекс Архивы, старый механизм (sources/yandex.js)
- Сохранён на время перехода, в реестре стоит после `yandexV2` и не срабатывает
- Метаданные из `__NEXT_DATA__`, URL оригинала из `performance` entries
  (больше не работает: сервер требует заголовки, которых нет при повторном запросе)

## Тестирование

1. Откройте URL любого источника
2. Кликните иконку расширения
3. Проверьте, что:
   - ✅ URL распарсен правильно
   - ✅ Найденные данные отображены корректно
   - ✅ URL для скачивания сформирован правильно
   - ✅ Имя файла правильное (без спецсимволов)
   - ✅ Файл скачивается успешно

## Документация

Подробная документация в файле: `SOURCES_DOCUMENTATION.md`
