import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project site: https://austenc.github.io/waddle-waddle/
  base: process.env.GITHUB_PAGES === '1' ? '/waddle-waddle/' : '/',
  server: {
    port: 5173,
    open: true,
  },
});
