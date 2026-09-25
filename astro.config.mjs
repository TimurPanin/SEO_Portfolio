import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://timurpanin.github.io',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !['/404.html', '/research/', '/lab/'].includes(new URL(page).pathname) })],
});
