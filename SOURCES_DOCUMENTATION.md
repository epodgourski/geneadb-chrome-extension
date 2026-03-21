# Документация: Добавление новых источников

Расширение теперь модульное и легко расширяется для поддержки новых источников.

## Архитектура

Каждый источник определяется в объекте `sources` в файле `popup.js`.

## Как добавить новый источник?

### 1. Откройте `popup.js`

### 2. Найдите объект `sources` в начале файла

### 3. Добавьте новый источник (пример для гипотетического источника):

```javascript
const sources = {
  familysearch: { ... },
  rusneb: { ... },
  
  // ← ВАША НОВЫЙ ИСТОЧНИК
  mynewsource: {
    name: 'My New Source',              // Название источника
    needsAuth: true,                     // Требует ли аутентификацию (cookies)
    
    // Определяет, является ли URL этим источником
    detect: (url) => url.includes('mynewsource.com'),
    
    // Парсит URL и извлекает нужные данные
    // Возвращает объект с полученными данными
    parse: (url) => {
      // Ваша логика парсинга
      // Например: { code: '12345', type: 'manuscript' }
      return { code, type };
    },
    
    // Генерирует URL для загрузки на основе распарсенных данных
    generateUrl: (parsed) => {
      // Ваша логика формирования URL
      // Например: https://api.mynewsource.com/download/{code}
      return downloadUrl;
    },
    
    // Генерирует имя файла для сохранения
    getFilename: (parsed) => {
      // Ваша логика именования файлов
      // Например: `${parsed.code}_${parsed.type}.jpeg`
      return filename;
    },
    
    // Форматирует строку для отображения извлеченных данных в UI
    displayText: (parsed) => {
      // Ваша логика форматирования для отображения
      return `Код: ${parsed.code}<br/>Тип: ${parsed.type}`;
    }
  }
};
```

## Параметры источника

| Параметр | Тип | Описание |
|----------|-----|---------|
| `name` | string | Название источника для отображения |
| `needsAuth` | boolean | `true` - использует cookies текущей сессии (как FamilySearch)<br/>`false` - публичный доступ без аутентификации (как RusNEB) |
| `detect(url)` | функция | Проверяет, является ли URL этим источником. Возвращает `true/false` |
| `parse(url)` | функция | Парсит URL и возвращает объект с извлеченными данными или `null` |
| `generateUrl(parsed)` | функция | Формирует URL для скачивания на основе распарсенных данных |
| `getFilename(parsed)` | функция | Возвращает имя файла для сохранения |
| `displayText(parsed)` | функция | Возвращает HTML текст для отображения извлеченных данных |

## Примеры

### Пример 1: Источник с простым кодом

```javascript
myarchive: {
  name: 'My Archive',
  needsAuth: false,
  detect: (url) => url.includes('archive.mysite.com'),
  parse: (url) => {
    const match = url.match(/\/document\/([^?]+)/);
    return match ? { code: match[1] } : null;
  },
  generateUrl: (parsed) => `https://archive.mysite.com/api/download/${parsed.code}`,
  getFilename: (parsed) => parsed.code,
  displayText: (parsed) => `Document ID: ${parsed.code}`
}
```

### Пример 2: Источник с несколькими параметрами

```javascript
mybookbase: {
  name: 'My Book Base',
  needsAuth: true,
  detect: (url) => url.includes('books.mybookbase.net'),
  parse: (url) => {
    const bookMatch = url.match(/\/book\/([^/]+)/);
    const pageMatch = url.match(/page=(\d+)/);
    if (!bookMatch) return null;
    return {
      bookId: bookMatch[1],
      pageNum: pageMatch ? parseInt(pageMatch[1]) : 1
    };
  },
  generateUrl: (parsed) => {
    return `https://books.mybookbase.net/api/v2/book/${parsed.bookId}/page/${parsed.pageNum}/image`;
  },
  getFilename: (parsed) => {
    const paddedPage = String(parsed.pageNum).padStart(4, '0');
    return `${parsed.bookId}_${paddedPage}`;
  },
  displayText: (parsed) => `Book: ${parsed.bookId}<br/>Page: ${parsed.pageNum}`
}
```

## Как это работает?

1. **Когда пользователь открывает popup:**
   - Расширение получает текущий URL
   - Функция `detectSource()` проходит по всем источникам и вызывает их `detect()` функции
   - Находит первый совпадающий источник

2. **Парсинг URL:**
   - Вызывается функция `parse()` найденного источника
   - Извлекаются нужные данные (коды, номера, параметры и т.д.)

3. **Формирование URL для скачивания:**
   - Вызывается `generateUrl()` с распарсенными данными
   - Создается готовый URL для загрузки

4. **Отображение и загрузка:**
   - `getFilename()` определяет, как назвать файл
   - `displayText()` показывает информацию в UI
   - Service Worker использует `needsAuth` для определения способа загрузки

## Типы аутентификации

### С аутентификацией (needsAuth: true)
- Используются cookies текущей сессии браузера
- Применяется для источников с защитой доступом
- Пример: FamilySearch
- В Service Worker: `credentials: 'include'`

### Без аутентификации (needsAuth: false)
- Публичный доступ
- Применяется для открытых источников
- Пример: RusNEB
- В Service Worker: без опции credentials

## Проверка правильности

Убедитесь, что:
1. ✅ Функция `detect()` правильно определяет URL источника
2. ✅ Функция `parse()` корректно извлекает данные из URL
3. ✅ Функция `generateUrl()` возвращает валидный URL для API
4. ✅ Функция `getFilename()` возвращает правильное имя файла
5. ✅ Параметр `needsAuth` установлен правильно
6. ✅ Тестирование: откройте URL источника и проверьте результат в popup

## Трублшутинг

**Расширение не распознает мой источник:**
- Проверьте функцию `detect()` - она должна возвращать `true` для вашего URL

**Ошибка "не удалось распарсить URL":**
- Функция `parse()` возвращает `null` - проверьте логику парсинга
- Убедитесь, что URL соответствует ожидаемому формату

**Ошибка при загрузке:**
- Проверьте, что `generateUrl()` возвращает валидный URL
- Проверьте параметр `needsAuth` - может ли API быть доступна без cookies?

**Неправильное имя файла:**
- Проверьте функцию `getFilename()` - она должна возвращать строку
- Для нумерованных файлов используйте `.padStart(4, '0')` как в RusNEB
