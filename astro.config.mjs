// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Interne werkpagina's (zoals /concepten) bestaan alleen tijdens ontwikkeling
 * en op Vercel-previews. Het bestand heet `_concepten.astro`: Astro routeert
 * niets dat met een underscore begint, dus in een productiebuild wordt de
 * pagina niet gegenereerd — er is niets om af te schermen.
 *
 * Vercel zet VERCEL_ENV op 'preview' of 'production'; lokaal is die leeg, dus
 * een lokale `npm run build` gedraagt zich als productie.
 */
/** @returns {import('astro').AstroIntegration} */
function internePaginas() {
  return {
    name: 'interne-paginas',
    hooks: {
      'astro:config:setup': ({ command, injectRoute, logger }) => {
        const preview = process.env.VERCEL_ENV === 'preview';
        if (command !== 'dev' && !preview) {
          logger.info('Interne pagina /concepten wordt NIET gebouwd (productie).');
          return;
        }
        injectRoute({
          pattern: '/concepten',
          entrypoint: './src/pages/_concepten.astro',
        });
        logger.info('Interne pagina /concepten is beschikbaar.');
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://thuisbatterijrekenaar.nl',
  output: 'static',
  integrations: [
    react(),
    mdx(),
    internePaginas(),
    // Extra vangnet: mocht de pagina ooit tóch gebouwd worden, dan blijft ze
    // uit de sitemap (net als de noindex-tag en de robots.txt-regel).
    sitemap({ filter: (page) => !page.includes('/concepten') }),
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});