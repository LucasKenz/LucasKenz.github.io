// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// User site at the domain root: no `base`.
export default defineConfig({
  site: 'https://lucaskenz.github.io',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    react(),
    mdx(),
    sitemap({
      i18n: { defaultLocale: 'pt', locales: { pt: 'pt-BR', en: 'en' } },
      filter: (p) => !p.includes('/curriculo/print'),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
