/**
 * Consistentiebewaking tussen de rekenmodule en de content.
 *
 * Aanleiding: de rekenmotor is drie keer gewijzigd (Paket 3.0/3.1/3.2) en
 * elke keer werden FAQ-antwoorden stilzwijgend onwaar. Drie keer handmatig
 * betrapt is twee keer te vaak — deze test vangt het voortaan af.
 *
 * Draait mee met `npm test`.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const wortel = path.resolve(__dirname, '..', '..', '..');
const paginaMap = path.join(wortel, 'src', 'content', 'pages');
const srcMap = path.join(wortel, 'src');
const constantsPad = path.join(srcMap, 'config', 'constants.ts');

const constantsBron = readFileSync(constantsPad, 'utf8');

/** Alle exportnamen uit constants.ts (constanten, types en helpers). */
function geexporteerdeNamen(): Set<string> {
  const namen = new Set<string>();
  const re = /^export (?:const|function|interface|type) ([A-Za-z_][A-Za-z0-9_]*)/gm;
  let m;
  while ((m = re.exec(constantsBron)) !== null) namen.add(m[1]!);
  return namen;
}

/** Alle .mdx-bestanden, inclusief concepten. */
function mdxBestanden(): { naam: string; inhoud: string }[] {
  return readdirSync(paginaMap)
    .filter((b) => b.endsWith('.mdx'))
    .map((naam) => ({ naam, inhoud: readFileSync(path.join(paginaMap, naam), 'utf8') }));
}

/** Alle .ts/.tsx/.astro/.mdx-bestanden onder src/, recursief. */
function bronBestanden(map = srcMap): string[] {
  const uit: string[] = [];
  for (const item of readdirSync(map, { withFileTypes: true })) {
    const vol = path.join(map, item.name);
    if (item.isDirectory()) uit.push(...bronBestanden(vol));
    else if (/\.(ts|tsx|astro|mdx)$/.test(item.name) && vol !== constantsPad) uit.push(vol);
  }
  return uit;
}

describe('content ↔ constants', () => {
  it('1. geen enkele MDX importeert een constante die niet meer bestaat', () => {
    const bestaand = geexporteerdeNamen();
    const ontbrekend: string[] = [];

    for (const { naam, inhoud } of mdxBestanden()) {
      const re = /import\s*\{([^}]+)\}\s*from\s*'[^']*config\/constants'/g;
      let m;
      while ((m = re.exec(inhoud)) !== null) {
        for (const ruw of m[1]!.split(',')) {
          const symbool = ruw.trim().split(/\s+as\s+/)[0]!.trim();
          if (symbool && !bestaand.has(symbool)) {
            ontbrekend.push(`${naam} importeert ${symbool}`);
          }
        }
      }
    }

    expect(ontbrekend).toEqual([]);
  });

  it('3. elke constante uit constants.ts wordt ergens gebruikt', () => {
    // Waarschuwingsniveau: ongebruikte constanten wijzen op achterstallig
    // onderhoud (zoals ZELFVERBRUIK_MET_BATTERIJ na Paket 3.0).
    const alleBron = bronBestanden()
      .map((p) => readFileSync(p, 'utf8'))
      .join('\n');
    // UITGANGSPUNTEN verwijst intern naar veel constanten; die telt mee als gebruik.
    const zelfBron = constantsBron.split('export const UITGANGSPUNTEN')[1] ?? '';

    const ongebruikt: string[] = [];
    const re = /^export const ([A-Z][A-Z0-9_]*) =/gm;
    let m;
    while ((m = re.exec(constantsBron)) !== null) {
      const naam = m[1]!;
      const gebruikt =
        new RegExp(`\\b${naam}\\b`).test(alleBron) || new RegExp(`\\b${naam}\\b`).test(zelfBron);
      if (!gebruikt) ongebruikt.push(naam);
    }

    expect(ongebruikt, `Ongebruikte constanten: ${ongebruikt.join(', ')}`).toEqual([]);
  });
});

describe('FAQ-antwoorden spreken de rekenmotor niet tegen', () => {
  /** Alleen de frontmatter-FAQ; de body mag genuanceerder formuleren. */
  function faqBlokken(): { naam: string; tekst: string }[] {
    return mdxBestanden()
      .map(({ naam, inhoud }) => {
        const fm = /^---\n([\s\S]*?)\n---/.exec(inhoud)?.[1] ?? '';
        const faq = /^faq:\n([\s\S]*?)(?=\n[a-z_]+:|$)/m.exec(fm)?.[1] ?? '';
        return { naam, tekst: faq };
      })
      .filter((b) => b.tekst.trim() !== '');
  }

  it('2a. geen enkele FAQ beweert dat wij arbitrage/dynamisch contract niet meerekenen', () => {
    // De motor rekent arbitrage mee sinds Paket 2 (berekenArbitrage).
    const overtreders: string[] = [];
    for (const { naam, tekst } of faqBlokken()) {
      const genormaliseerd = tekst.replace(/\s+/g, ' ').toLowerCase();
      const patroon =
        /(neemt|nemen)[^.]{0,60}(niet mee)|rekenen wij niet mee|rekent[^.]{0,40}niet mee/;
      if (patroon.test(genormaliseerd)) overtreders.push(naam);
    }
    expect(overtreders).toEqual([]);
  });

  it('2b. geen enkele FAQ noemt een vast zelfverbruikpercentage met batterij', () => {
    // Sinds Paket 3.0 is er geen vaste ratio meer; de capaciteit bepaalt het.
    const overtreders: string[] = [];
    for (const { naam, tekst } of faqBlokken()) {
      const genormaliseerd = tekst.replace(/\s+/g, ' ').toLowerCase();
      if (/zelfverbruik[^.]{0,80}\b\d{2}\s?%/.test(genormaliseerd)) {
        overtreders.push(naam);
      }
    }
    expect(overtreders).toEqual([]);
  });

  it('2c. geen enkele FAQ presenteert een vuistregel voor de capaciteitskeuze', () => {
    // De motor optimaliseert over alle groottes; een vuistregel spreekt dat tegen.
    const overtreders: string[] = [];
    for (const { naam, tekst } of faqBlokken()) {
      if (/vuistregel/i.test(tekst)) overtreders.push(naam);
    }
    expect(overtreders).toEqual([]);
  });
});
