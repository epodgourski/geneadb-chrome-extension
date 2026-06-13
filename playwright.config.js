import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  use: {
    headless: false,
  },
  projects: [
    {
      name: 'unit',
      testMatch: /unit\/.*\.spec\.js/,
    },
    {
      name: 'extension',
      testMatch: /e2e\/.*\.spec\.js/,
    },
  ],
});
