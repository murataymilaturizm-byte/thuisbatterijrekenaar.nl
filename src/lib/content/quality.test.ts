/**
 * Gedragstests voor de kwaliteitspoorten.
 *
 * Aanleiding: op 8 oktober 2026 stond er een Turkse interne notitie
 * ([TEYIT GEREKLI: …]) live op /thuisbatterij-melden-netbeheerder/. Een poort
 * toevoegen is niet genoeg — hij moet aantoonbaar vuren op precies die tekst,
 * en zwijgen waar de markering juist hoort (in een concept).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { JURIDISCHE_TOKENS } from '../../config/juridische-waarden';
import {
  isGepubliceerd,
  onbekendeGetallen,
  publiekeFrontmatter,
  vageHoeveelheden,
  teyitInBronnen,
  teyitInGepubliceerdePagina,
} from './quality';

const wortel = path.resolve(__dirname, '..', '..', '..');
const paginaMap = path.join(wortel, 'src', 'content', 'pages');

/** De tekst zoals die live stond, inclusief frontmattervlag. */
const liveOvertreding = `---
title: 'Test'
published: true
---

Of u als eigenaar juridisch gevrijwaard bent wanneer uw installateur de
registratie vergeet, hebben wij niet kunnen vaststellen bij een officiële
bron. [TEYIT GEREKLI: blijft de aansluitinghouder verantwoordelijk als een
installateur de registratie namens hem verzuimt] Praktisch: vraag bij de
oplevering om de bevestigingsmail en bewaar die.
`;

const conceptMetMarkering = `---
title: 'Test'
published: false
---

Een bewering. [TEYIT GEREKLI: nog te verifiëren bij de primaire bron]
`;

describe('TEYIT-markering in een gepubliceerde pagina', () => {
  it('vuurt op de tekst die daadwerkelijk live stond', () => {
    expect(isGepubliceerd(liveOvertreding)).toBe(true);
    expect(teyitInGepubliceerdePagina(liveOvertreding)).toHaveLength(1);
  });

  it('zwijgt bij een concept — daar hoort de markering juist', () => {
    expect(isGepubliceerd(conceptMetMarkering)).toBe(false);
    expect(teyitInGepubliceerdePagina(conceptMetMarkering)).toEqual([]);
  });

  /**
   * Erfenis: tot 8 oktober 2026 was het beleid dat markeringen zichtbaar
   * bleven tot een bron was gevonden. Dat beleid is omgedraaid, maar de
   * bestaande markeringen zijn inhoudelijke open vragen — die verdwijnen
   * alleen door ze te beantwoorden, niet door ze te verwijderen.
   *
   * Daarom een ratel in plaats van een harde nul: nieuwe overtredingen
   * vallen om, en het getal hieronder mag alleen omlaag.
   */
  const OPENSTAANDE_MARKERINGEN = 0;

  it('het aantal zichtbare markeringen groeit niet', () => {
    const perPagina: string[] = [];
    let totaal = 0;
    for (const naam of readdirSync(paginaMap).filter((b) => b.endsWith('.mdx'))) {
      if (naam.startsWith('_')) continue;
      const treffers = teyitInGepubliceerdePagina(readFileSync(path.join(paginaMap, naam), 'utf8'));
      totaal += treffers.length;
      if (treffers.length > 0) perPagina.push(`${naam}: ${treffers.length}`);
    }
    expect(
      totaal,
      `Markeringen per pagina:\n${perPagina.join('\n')}\n` +
        'Hoger dan de ratel betekent: een nieuwe interne notitie staat live.',
    ).toBeLessThanOrEqual(OPENSTAANDE_MARKERINGEN);
  });

  it('de pagina die live een Turkse notitie toonde, is schoon', () => {
    const ruw = readFileSync(path.join(paginaMap, 'thuisbatterij-melden-netbeheerder.mdx'), 'utf8');
    expect(teyitInGepubliceerdePagina(ruw)).toEqual([]);
  });

  it('de smallere Bronnen-poort blijft nodig: concepten vallen buiten de brede poort', () => {
    const conceptMetTeyitInBronnen = `---
published: false
---

Body.

### Bronnen

- [TEYIT GEREKLI: bron nog te vinden]
`;
    // De brede poort zwijgt hier (het is een concept) …
    expect(teyitInGepubliceerdePagina(conceptMetTeyitInBronnen)).toEqual([]);
    // … maar in Bronnen hoort de markering ook in een concept niet thuis.
    expect(teyitInBronnen(conceptMetTeyitInBronnen)).toBe(true);
  });
});

describe('geverifieerde juridische waarden', () => {
  it('laat een waarde uit de bronvermelde lijst door', () => {
    const body = 'De drempel is 0,8 kW en het tarief is 21 procent.';
    expect(onbekendeGetallen(body, [])).toEqual([]);
  });

  it('markeert een getal dat nergens is vastgelegd', () => {
    expect(onbekendeGetallen('Een batterij van 7,3 kWh.', [])).toEqual(['7,3 kWh']);
  });

  it('elke whitelist-waarde heeft een primaire bron', async () => {
    const { JURIDISCHE_WAARDEN } = await import('../../config/juridische-waarden');
    for (const w of JURIDISCHE_WAARDEN) {
      expect(w.bron, `${w.tekst} mist een bron`).toMatch(/^https:\/\//);
      expect(w.wat.length, `${w.tekst} mist een omschrijving`).toBeGreaterThan(10);
    }
    expect(JURIDISCHE_TOKENS.size).toBe(JURIDISCHE_WAARDEN.length);
  });
});

describe('publiekstekst uit de frontmatter', () => {
  // Een FAQ staat in de frontmatter en is voor de lezer net zo zichtbaar als
  // de lopende tekst. De getallenpoort keek er niet naar; zo stond
  // "70 tot 80 procent" live zonder dat één poort iets zei.
  const pagina = [
    '---',
    "title: 'Garantie op een thuisbatterij | Thuisbatterijrekenaar'",
    "description: 'Wat een garantie wel en niet dekt.'",
    "gepubliceerd: '2026-10-08'",
    "cluster: 'regelgeving'",
    'faq:',
    "  - vraag: 'Hoeveel capaciteit blijft er over?'",
    '    antwoord: >-',
    '      Fabrikanten garanderen vaak 70 tot 80 procent restcapaciteit na tien',
    '      jaar.',
    '---',
    '',
    'De lopende tekst noemt geen los getal.',
    '',
  ].join('\n');

  it('haalt de FAQ en de description op, zonder de datumvelden', () => {
    const tekst = publiekeFrontmatter(pagina);
    expect(tekst).toContain('70 tot 80 procent');
    expect(tekst).toContain('Wat een garantie wel en niet dekt.');
    expect(tekst, 'een datumveld hoort er niet bij').not.toContain('2026-10-08');
    expect(tekst, 'een structuurveld hoort er niet bij').not.toContain('regelgeving');
  });

  it('de getallenpoort ziet een getal dat alleen in de FAQ staat', () => {
    const body = pagina.replace(/^---[\s\S]*?\r?\n---\r?\n/, '');
    expect(
      onbekendeGetallen(body, []),
      'alleen de body gelezen: het getal in de FAQ blijft onzichtbaar',
    ).toEqual([]);
    expect(onbekendeGetallen(`${body}\n${publiekeFrontmatter(pagina)}`, [])).toContain(
      '80 procent',
    );
  });
});

describe('vaagheidswoord bij een hoeveelheid', () => {
  // Deze poort is geel en opzettelijk smal. Hij moet vuren op het patroon dat
  // als marktfeit leest zonder bron, en zwijgen bij "vaak twee dingen".
  it('vuurt op een hoeveelheid achter een vaagheidswoord', () => {
    expect(
      vageHoeveelheden('Fabrikanten garanderen vaak 70 tot 80 procent restcapaciteit.'),
    ).toHaveLength(1);
    expect(vageHoeveelheden('Een cyclusgarantie van zes duizend cycli is gangbaar.')).toHaveLength(
      1,
    );
    expect(vageHoeveelheden('Tien jaar garantie is gebruikelijk.')).toHaveLength(1);
    expect(
      vageHoeveelheden('Een terugverdientijd van vijftien jaar is veelvoorkomend.'),
    ).toHaveLength(1);
  });

  it('zwijgt waar geen hoeveelheid staat', () => {
    expect(vageHoeveelheden('Hier worden vaak twee dingen door elkaar gehaald.')).toEqual([]);
    expect(vageHoeveelheden('Die derde grens wordt vaak vergeten.')).toEqual([]);
    expect(vageHoeveelheden('Corporaties hebben vaak een standaardbeleid.')).toEqual([]);
    // Zonder vaagheidswoord is een getal de taak van de getallenpoort.
    expect(vageHoeveelheden('De garantie loopt tien jaar.')).toEqual([]);
  });
});
