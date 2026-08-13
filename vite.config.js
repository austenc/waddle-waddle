import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

const pagesBase = process.env.PAGES_BASE
  || (process.env.GITHUB_PAGES === '1' ? '/waddle-waddle/' : '/');

export default defineConfig({
  // Main: /waddle-waddle/ · Fly preview: /waddle-waddle/fly/
  base: pagesBase,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'character-editor': resolve(__dirname, 'tools/character-editor/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
