/**
 * Parser-tests voor de conceptgenerator: modellen verpakken hun antwoord
 * soms in fences of zetten er een inleiding boven. Drie realistische
 * varianten moeten allemaal dezelfde schone MDX opleveren, en de
 * frontmattervalidatie moet ontbrekende velden bij naam noemen.
 */
import { describe, expect, it } from 'vitest';
import {
  herstelPrefill,
  normaliseerAntwoord,
  PREFILL,
  tekstUitContent,
  valideerFrontmatter,
} from './generate-draft.mjs';

const schoneMdx = `---
title: 'Testpagina | Thuisbatterijrekenaar'
description: 'Een testbeschrijving van voldoende lengte voor de validatie.'
h1: 'Testpagina'
gepubliceerd: '2026-09-08'
cluster: 'basis'
zoekintentie: 'Wat test deze pagina?'
published: false
gegenereerd: '2026-09-08'
aiGegenereerd: true
faq:
  - vraag: 'Testvraag?'
    antwoord: >-
      Testantwoord.
---

## Kop

Body-tekst met --- als los woord, dat mag geen probleem zijn.`;

describe('normaliseerAntwoord', () => {
  it('a) laat een antwoord dat direct met --- begint ongemoeid', () => {
    expect(normaliseerAntwoord(schoneMdx)).toBe(schoneMdx);
  });

  it('a2) krimpt alleen witruimte rond een verder schoon antwoord', () => {
    expect(normaliseerAntwoord(`\n\n${schoneMdx}\n\n`)).toBe(schoneMdx);
  });

  it('b) verwijdert ```markdown-fences rond het antwoord', () => {
    const verpakt = '```markdown\n' + schoneMdx + '\n```';
    expect(normaliseerAntwoord(verpakt)).toBe(schoneMdx);
  });

  it('b2) verwijdert ook kale ``` fences en ```mdx', () => {
    expect(normaliseerAntwoord('```\n' + schoneMdx + '\n```\n')).toBe(schoneMdx);
    expect(normaliseerAntwoord('```mdx\n' + schoneMdx + '\n```')).toBe(schoneMdx);
  });

  it('c) snijdt een inleidende zin vóór de frontmatter weg', () => {
    const metAanloop = 'Hier is het gevraagde MDX-bestand:\n\n' + schoneMdx;
    expect(normaliseerAntwoord(metAanloop)).toBe(schoneMdx);
  });

  it('c2) fence én aanloop samen: eerst fence, dan aanloop', () => {
    const beide = 'Hier is het artikel:\n\n```markdown\n' + schoneMdx + '\n```';
    expect(normaliseerAntwoord(beide)).toBe(schoneMdx);
  });

  it('laat een antwoord zonder frontmatter herkenbaar ongeldig', () => {
    const zonder = 'Sorry, ik kan hier geen artikel over schrijven.';
    expect(normaliseerAntwoord(zonder).startsWith('---')).toBe(false);
  });
});

describe('herstelPrefill', () => {
  it('gesimuleerd prefill-antwoord → volledige, geldige frontmatter', () => {
    // Het model gaat verder ná de prefill '---'; het vervolg mist die tekens.
    const vervolg = schoneMdx.slice(PREFILL.length);
    const hersteld = herstelPrefill(vervolg);
    expect(hersteld).toBe(schoneMdx);
    expect(normaliseerAntwoord(hersteld)).toBe(schoneMdx);
    expect(valideerFrontmatter(normaliseerAntwoord(hersteld))).toEqual([]);
  });

  it('dwingt een regelbreuk af als het vervolg er geen heeft', () => {
    expect(herstelPrefill("title: 'x'\n---\n\nBody.")).toBe(
      "---\ntitle: 'x'\n---\n\nBody.",
    );
  });
});

describe('tekstUitContent', () => {
  it('slaat thinking-blokken over en pakt de tekst — nooit positioneel', () => {
    const content = [
      { type: 'thinking', thinking: 'interne denkstappen…' },
      { type: 'text', text: '---\ntitle: x\n---\n\nBody.' },
    ];
    expect(tekstUitContent(content)).toBe('---\ntitle: x\n---\n\nBody.');
  });

  it('voegt meerdere tekstblokken in volgorde samen', () => {
    const content = [
      { type: 'thinking', thinking: '…' },
      { type: 'text', text: 'deel een ' },
      { type: 'redacted_thinking', data: '…' },
      { type: 'text', text: 'deel twee' },
    ];
    expect(tekstUitContent(content)).toBe('deel een deel twee');
  });

  it('geeft lege string terug wanneer er alleen thinking-blokken zijn — main stopt daar met een eigen foutmelding (exit 1), niet met "geen frontmatter"', () => {
    const content = [
      { type: 'thinking', thinking: '…' },
      { type: 'redacted_thinking', data: '…' },
    ];
    expect(tekstUitContent(content)).toBe('');
  });
});

describe('valideerFrontmatter', () => {
  it('keurt volledige frontmatter goed', () => {
    expect(valideerFrontmatter(schoneMdx)).toEqual([]);
  });

  it('noemt ontbrekende velden bij naam', () => {
    const zonderZoekintentie = schoneMdx.replace(/^zoekintentie:.*\n/m, '');
    expect(valideerFrontmatter(zonderZoekintentie)).toEqual(['zoekintentie']);
  });

  it('weigert published: true — er wordt nooit automatisch gepubliceerd', () => {
    const gepubliceerd = schoneMdx.replace('published: false', 'published: true');
    expect(valideerFrontmatter(gepubliceerd)).toEqual(['published: false']);
  });

  it('weigert een antwoord zonder frontmatter-blok', () => {
    expect(valideerFrontmatter('## Alleen een body')).toEqual([
      'frontmatter-blok (--- … ---)',
    ]);
  });
});
