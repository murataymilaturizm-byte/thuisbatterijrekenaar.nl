// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://thuisbatterijrekenaar.nl',
  output: 'static',
  integrations: [
    react(),
    mdx(),
    // Interne werkpagina's horen niet in de sitemap
    sitemap({ filter: (page) => !page.includes('/concepten') }),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});