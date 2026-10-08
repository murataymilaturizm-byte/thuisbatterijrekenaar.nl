/**
 * Minimale bewaking van de .astro-routepagina's.
 *
 * De poorten lazen alleen MDX, waardoor /uitgangspunten/,
 * /stroomprijzen-vandaag/, /kennisbank/, /terugleververgoeding-vergelijken/ en
 * de homepage door geen enkele controle kwamen — terwijl /uitgangspunten/ de
 * pagina is waarop onze hele eerlijkheidsclaim rust.
 *
 * Gecontroleerd wordt de BRON, niet de gerenderde HTML. Reden: de test moet
 * zonder voorafgaande build kunnen draaien, anders is hij stil precies wanneer
 * iemand hem overslaat. De drie controles gaan bovendien over wat in dit
 * bestand is geschreven, niet over de samenstelling met layout en componenten.
 * Blinde vlek: tekst die een geïmporteerde component aanlevert. Die componenten
 * zijn zelf .astro of .mdx en vallen onder deze test of onder gepubliceerd.test.
 *
 * Drie poorten, de rest is hier zinloos: een datapagina heeft geen FAQ en
 * hoort niet in een cluster.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as alleConstanten from '../../config/constants';

const wortel = path.resolve(__dirname, '..', '..', '..');
const pagesMap = path.join(wortel, 'src', 'pages');
const contentMap = path.join(wortel, 'src', 'content', 'pages');

const constanteNamen = Object.keys(alleConstanten).filter((n) => /^[A-Z][A-Z0-9_]*$/.test(n));

/** Routepagina's die in productie bestaan (underscore = niet gerouteerd). */
function astroRoutes(): { naam: string; bron: string }[] {
  return readdirSync(pagesMap)
    .filter((b) => b.endsWith('.astro') && !b.startsWith('_'))
    .map((naam) => ({ naam, bron: readFileSync(path.join(pagesMap, naam), 'utf8') }));
}

/**
 * De tekst zoals een lezer die ziet: zonder het componentscript bovenaan en
 * zonder {expressies} — daar hóren constantennamen juist te staan.
 */
function proza(bron: string): string {
  return bron
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/\{[^}]*\}/g, '');
}

/** Alle interne links die als statische string in de bron staan. */
function interneHrefs(bron: string): string[] {
  return [...bron.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]!);
}

describe('astro-routepagina’s', () => {
  const routes = astroRoutes();

  const bestaandeUrls = new Set<string>([
    '/',
    ...readdirSync(contentMap)
      .filter((b) => b.endsWith('.mdx') && !b.startsWith('_'))
      .filter((b) => !/^published:\s*false\s*$/m.test(readFileSync(path.join(contentMap, b), 'utf8')))
      .map((b) => `/${b.replace('.mdx', '')}/`),
    ...routes.map((r) => (r.naam === 'index.astro' ? '/' : `/${r.naam.replace('.astro', '')}/`)),
  ]);

  it('er zijn routepagina’s gevonden', () => {
    expect(routes.length).toBeGreaterThan(4);
  });

  it('geen TEYIT-markering in een gerouteerde pagina', () => {
    const overtreders = routes
      .filter((r) => /TEYIT/i.test(r.bron))
      .map((r) => r.naam);
    expect(overtreders, `Interne markering zichtbaar op: ${overtreders.join(', ')}`).toEqual([]);
  });

  it('geen kapotte interne links', () => {
    const kapot: string[] = [];
    for (const r of routes) {
      for (const href of interneHrefs(r.bron)) {
        // Bestanden (favicon, sitemap, afbeeldingen) vallen buiten de routes.
        if (/\.[a-z0-9]+$/i.test(href)) continue;
        if (!bestaandeUrls.has(href)) kapot.push(`${r.naam} → ${href}`);
      }
    }
    expect(kapot, `Kapotte links:\n${kapot.join('\n')}`).toEqual([]);
  });

  it('geen programmatische constantennaam in de lopende tekst', () => {
    const overtreders: string[] = [];
    for (const r of routes) {
      const tekst = proza(r.bron);
      const gevonden = constanteNamen.filter((n) => new RegExp(`\\b${n}\\b`).test(tekst));
      if (gevonden.length > 0) overtreders.push(`${r.naam}: ${gevonden.join(', ')}`);
    }
    expect(overtreders, `Variabelenamen zichtbaar:\n${overtreders.join('\n')}`).toEqual([]);
  });
});
