# Архитектура "Загрузчика документов"

## Структура кода

```
popup.js                          ← Основная логика UI, темы
│
├─ sources/index.js               ← Реестр источников, detectSource(), parseUrl()
│  ├─ sources/familysearch.js     ← Источник FamilySearch + серии
│  ├─ sources/rusneb.js           ← Источник RusNEB
│  └─ sources/yandex.js           ← Источник Яндекс Архивы
│
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
  scanPage: (url, tabId) => object,  // Сканирование DOM страницы
  directDownload: boolean            // Скачивание через fetch в контексте страницы
}
```

## Три типа загрузки

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
Пример: Яндекс Архивы
fetch выполняется в контексте страницы (world: 'MAIN')
Результат: Используются cookies ya.ru
```

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

### Яндекс Архивы (sources/yandex.js)
- **Вход:** `https://ya.ru/archive/catalog/{каталог}/{N}`
- **Парсит:** метаданные из `__NEXT_DATA__`, SPA-навигация через Next.js data API
- **Загружает:** fetch в контексте страницы (directDownload: true)
- **Файл:** реальное архивное имя из `namepath` (например `609-2-95-00000038.jpeg`)

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
