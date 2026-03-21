// VUETIFY-THEMES.JS - Полная конфигурация тем для Vuetify

export const genealogicalThemes = {
  light: {
    'theme-1': {
      dark: false,
      colors: {
        background: '#FFFFFF',
        surface: '#F5F2ED',
        primary: '#5D4A3D',
        primaryDark: '#4A3A2D',
        accent: '#8B6F47',
        accentLight: '#A0824F',
        light: '#E8DCC8',
        text: '#2C2416',
        border: '#D4C4B0',
        success: '#4CAF50',
        warning: '#FFC107',
        error: '#F44336',
        info: '#2196F3'
      }
    },
    'theme-2': {
      dark: false,
      colors: {
        background: '#FFFFFF',
        surface: '#F0F1F3',
        primary: '#52626F',
        primaryDark: '#3F4A56',
        accent: '#7A8B99',
        accentLight: '#8A9BA9',
        light: '#E8EAED',
        text: '#2B3E4D',
        border: '#C5CBD3',
        success: '#4CAF50',
        warning: '#FFC107',
        error: '#F44336',
        info: '#2196F3'
      }
    },
    'theme-3': {
      dark: false,
      colors: {
        background: '#FFFFFF',
        surface: '#F8F3F6',
        primary: '#6B4552',
        primaryDark: '#563849',
        accent: '#9B6B7F',
        accentLight: '#AB7B8F',
        light: '#F4E8EE',
        text: '#3D252F',
        border: '#D4BFD0',
        success: '#4CAF50',
        warning: '#FFC107',
        error: '#F44336',
        info: '#2196F3'
      }
    },
    'theme-4': {
      dark: false,
      colors: {
        background: '#FFFFFF',
        surface: '#F1F4F0',
        primary: '#4A5F52',
        primaryDark: '#3A4D42',
        accent: '#6B8472',
        accentLight: '#7B9482',
        light: '#E8EFE8',
        text: '#2A3F32',
        border: '#C5D5CB',
        success: '#4CAF50',
        warning: '#FFC107',
        error: '#F44336',
        info: '#2196F3'
      }
    },
    'theme-5': {
      dark: false,
      colors: {
        background: '#FFFFFF',
        surface: '#EFF2F7',
        primary: '#3F5670',
        primaryDark: '#2F4560',
        accent: '#5A7FA0',
        accentLight: '#6A8FB0',
        light: '#E8ECEF',
        text: '#1F3550',
        border: '#C5D5E5',
        success: '#4CAF50',
        warning: '#FFC107',
        error: '#F44336',
        info: '#2196F3'
      }
    },
    'theme-6': {
      dark: false,
      colors: {
        background: '#FFFFFF',
        surface: '#F1F1F3',
        primary: '#4A4A52',
        primaryDark: '#3A3A42',
        accent: '#6B7079',
        accentLight: '#7B8089',
        light: '#E8E8EA',
        text: '#2A2A32',
        border: '#C5C5CD',
        success: '#4CAF50',
        warning: '#FFC107',
        error: '#F44336',
        info: '#2196F3'
      }
    }
  }
};

// Карта с названиями тем
export const themeNames = {
  'theme-1': '🏛️ Архивный коричневый',
  'theme-2': '🎩 Элегантный серый',
  'theme-3': '💎 Классический бордовый',
  'theme-4': '🌿 Винтаж зелень',
  'theme-5': '👑 Знатный синий',
  'theme-6': '✨ Утонченный тёмный'
};

// Получить все доступные темы
export function getAllThemes() {
  return Object.entries(themeNames).map(([id, name]) => ({
    id,
    name,
    colors: genealogicalThemes.light[id].colors
  }));
}

// Получить тему по ID
export function getThemeById(themeId) {
  return genealogicalThemes.light[themeId];
}

// Сохранить текущую тему в localStorage
export function saveCurrentTheme(themeId) {
  localStorage.setItem('geneadb-theme', themeId);
}

// Получить сохраненную тему или тему по умолчанию
export function getCurrentTheme() {
  return localStorage.getItem('geneadb-theme') || 'theme-1';
}
