# Архитектура "Загрузчика документов"

## Структура кода

```
popup.js
│
├─ sources = { }              ← Конфигурация всех источников
│  ├─ familysearch: { }       ← Источник 1
│  ├─ rusneb: { }             ← Источник 2
│  └─ mynewsource: { }        ← Ваш новый источник
│
├─ detectSource()             ← Определяет источник по URL
├─ parseUrl()                 ← Парсит и обрабатывает URL
├─ downloadImage()            ← Загружает файл
└─ processCurrentTab()        ← Основная логика UI
```

## Поток обработки

```
Пользователь открывает popup
         ↓
detectSource() проверяет все источники
         ↓
Находит совпадение (detect: true)
         ↓
parseUrl() вызывает методы источника:
  • parse()          → извлекает данные
  • generateUrl()    → создает URL для скачивания
  • getFilename()    → определяет имя файла
  • displayText()    → форматирует для отображения
         ↓
Отображает результат в UI
         ↓
Пользователь нажимает "Скачать"
         ↓
downloadImage() с параметром needsAuth
  • true  → Service Worker использует cookies
  • false → Service Worker без аутентификации
```

## Каждый источник содержит 6 методов

```javascript
const newSource = {
  name: string,                      // Название
  needsAuth: boolean,                // Требует ли cookies?
  detect: (url) => boolean,          // Это мой источник?
  parse: (url) => object,            // Парси URL
  generateUrl: (parsed) => string,   // Создай URL для загрузки
  getFilename: (parsed) => string,   // Назови файл
  displayText: (parsed) => string    // Покажи результат
}
```

## Два типа аутентификации

### 1. С паролем (needsAuth: true)
```
Пример: FamilySearch
Service Worker отправляет: credentials: 'include'
Результат: Используются cookies текущей сессии браузера
```

### 2. Без пароля (needsAuth: false)
```
Пример: RusNEB
Service Worker отправляет: обычный fetch без credentials
Результат: Публичный доступ
```

## Как добавить новый источник?

### Шаг 1: Добавить конфигурацию в `sources`

```javascript
const sources = {
  familysearch: { ... },
  rusneb: { ... },
  mynewsource: {                    // ← НОВЫЙ
    name: 'My New Source',
    needsAuth: false,               // или true
    detect: (url) => url.includes('mynewsource.com'),
    parse: (url) => {
      // Ваша логика извлечения данных
      return { code, param };
    },
    generateUrl: (parsed) => {
      // URL для API загрузки
      return `https://api.mynewsource.com/download/${parsed.code}`;
    },
    getFilename: (parsed) => {
      // Формат имени файла
      return `${parsed.code}.jpeg`;
    },
    displayText: (parsed) => {
      // Что показать в UI
      return `Code: ${parsed.code}`;
    }
  }
};
```

### Шаг 2: Готово!

Всё остальное работает автоматически:
- ✅ detectSource() найдет ваш источник
- ✅ parseUrl() использует ваши методы
- ✅ UI обновится автоматически
- ✅ Загрузка произойдет с правильной аутентификацией

## Преимущества этой архитектуры

✅ **Модульность** - каждый источник изолирован
✅ **Расширяемость** - легко добавлять новые источники
✅ **Консистентность** - все источники работают одинаково
✅ **Переиспользуемость** - никакие изменения основной логики не нужны
✅ **Простота** - не нужно понимать всю архитектуру для добавления источника

## Текущие источники

### FamilySearch (familysearch)
- **Вход:** `https://familysearch.org/...?...`
- **Парсит:** подстроку между `:` и `?`
- **Загружает:** с использованием cookies (с паролем)
- **Файл:** `код.jpeg`

### RusNEB (rusneb)
- **Вход:** `https://viewer.rusneb.ru/ru/КОД?page=НОМЕР`
- **Парсит:** код и номер страницы
- **Загружает:** публичный доступ (без пароля)
- **Файл:** `код_0001.jpeg` (номер с нулями)

## Тестирование

1. Откройте URL любого источника
2. Кликните иконку расширения
3. Проверьте, что:
   - ✅ URL распарсен правильно
   - ✅ Найденные данные отображены корректно
   - ✅ URL для скачивания сформирован правильно
   - ✅ Имя файла правильное
   - ✅ Файл скачивается успешно

## Документация

Подробная документация в файле: `SOURCES_DOCUMENTATION.md`
