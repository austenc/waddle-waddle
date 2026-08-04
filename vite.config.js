import { defineConfig } from 'vite';

const pagesBase = process.env.PAGES_BASE
  || (process.env.GITHUB_PAGES === '1' ? '/waddle-waddle/' : '/');

export default defineConfig({
  // Main: /waddle-waddle/ · Fly preview: /waddle-waddle/fly/
  base: pagesBase,
  server: {
    port: 5173,
    open: true,
  },
});
