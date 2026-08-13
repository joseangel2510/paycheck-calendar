import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/config';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // Per-month pages are thin/templated and marked noindex — keep them out of the sitemap.
      filter: (page) => !/\/months\//.test(page),
    }),
  ],
});
