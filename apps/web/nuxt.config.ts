import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false, // SPA, generated statically and served by Caddy (ADR 0002)
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  app: { head: { htmlAttrs: { lang: 'fr' }, title: 'Battery Passport' } },
  vite: { plugins: [tailwindcss()] },
  nitro: {
    // Dev only: same /api prefix as Caddy in prod.
    devProxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
