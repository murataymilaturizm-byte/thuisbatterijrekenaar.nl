/**
 * Elke claim over onszelf staat op de lijst — of de test valt om.
 *
 * Negen keer achter elkaar bleef een verouderde onafhankelijkheidsclaim staan
 * omdat het zoekpatroon net die ene formulering niet kende. Deze test draait
 * de logica om: hij zoekt géén foute zinnen, hij eist dat iedere zin waarin
 * wij iets over onze onafhankelijkheid, verkoop, inkomsten of samenwerkingen
 * beweren, in src/config/claims.ts is goedgekeurd. Nieuwe formulering =
 * rood, tot iemand haar bewust toevoegt.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GOEDGEKEURDE_CLAIMS, normaliseerClaim } from '../../config/claims';

const wortel = path.resolve(__dirname, '..', '..', '..');

/**
 * Onafhankelijkheid is een claim over ónszelf, ook zonder "wij" erin. De
 * herotekst en de metadescription luidden "Onafhankelijk, gratis en zonder
 * verplichtingen" — geen voornaamwoord, dus onzichtbaar voor een controle die
 * er één eist, terwijl dit juist de kale bewering is die sinds de
 * EnergyZero-samenwerking te veel belooft. Komt het woord over een derde
 * partij voor ("een onafhankelijk keurmerk"), dan staat die zin gewoon op de
 * goedgekeurde lijst.
 */
const ONAFHANKELIJKHEID = /onafhankelijk|\bverbonden\b/i;
/** De overige onderwerpen; daar is een voornaamwoord nodig tegen de ruis. */
const ONDERWERP_OVER_ONS =
  /\bverkopen\b|geld verdienen|\bverdienen wij\b|affiliate|\bsamenwerk|(?:ontvangen wij|wij ontvangen)[^.]{0,40}vergoeding/i;
/** Alleen uitspraken over onszelf. */
const OVER_ONS = /\b(wij|ons|onze|thuisbatterijrekenaar)\b/i;
/**
 * Wat er ná het wegknippen nog een claim maakt. Losse zelfstandige
 * naamwoorden als "affiliatelinks" in een kop zijn geen bewering; een
 * werkwoordsvorm over onszelf wel.
 */
const RESIDU_CLAIM =
  /\bonafhankelijk|\bverbonden\b|\bverkopen\b|geld verdienen|verdienen wij|ontvangen wij|wij ontvangen|werken wij samen|samenwerking met|samenwerken met/i;

/** Rekenbegrippen die toevallig een trefwoord bevatten. */
const RUIS = /terugverdientijd|terugverdien|verdient zich terug|terugleververgoeding|premietoeslag/i;

/**
 * Frontmatter is YAML, geen proza: zonder punt aan het regeleind plakken alle
 * velden aan elkaar tot één pseudo-zin, en dan is niet te zien wélk veld een
 * claim doet. Elk veld krijgt daarom een punt, zodat de description-regel als
 * eigen claimzin wordt beoordeeld.
 */
function frontmatterAlsZinnen(ruw: string): string {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(ruw);
  if (!m) return ruw;
  // Alleen een sleutelregel mét waarde krijgt een punt. Vervolgregels van een
  // blokwaarde (`antwoord: >-`) zijn doorlopende tekst; daar een punt achter
  // zetten knipt een FAQ-antwoord midden in een zin door.
  const velden = m[1]
    .split(/\r?\n/)
    .map((r) =>
      /^\s*-?\s*[A-Za-z0-9_-]+:\s*\S/.test(r) && !r.trim().endsWith('.') ? `${r}.` : r,
    )
    .join('\n');
  return ruw.replace(m[0], `${velden}\n`);
}

function bestanden(): { naam: string; tekst: string }[] {
  const uit: { naam: string; tekst: string }[] = [];
  const voegToe = (rel: string, bewerk?: (s: string) => string) => {
    const vol = path.join(wortel, rel);
    const ruw = readFileSync(vol, 'utf8');
    uit.push({ naam: rel, tekst: bewerk ? bewerk(ruw) : ruw });
  };

  // Concepten (`_`-prefix) staan hier buiten: die worden in /concepten door
  // beoordeelConcept gewogen en zijn nog niet publiek. Bij publicatie valt de
  // underscore weg en komt de pagina hier wél binnen — vóór de poort groen is.
  const pagina = path.join(wortel, 'src', 'content', 'pages');
  for (const b of readdirSync(pagina).filter((x) => x.endsWith('.mdx') && !x.startsWith('_'))) {
    voegToe(`src/content/pages/${b}`, frontmatterAlsZinnen);
  }
  // .astro: het componentscript bovenaan is code, geen publiekstekst — maar
  // de teksten in dat script (FAQ-arrays, meta) tellen juist wél mee.
  const pages = path.join(wortel, 'src', 'pages');
  for (const b of readdirSync(pages).filter((x) => x.endsWith('.astro'))) {
    voegToe(`src/pages/${b}`);
  }
  for (const rel of [
    'src/components/layout/Footer.astro',
    'src/components/calculator/LeadForm.tsx',
    'src/components/calculator/Calculator.tsx',
    'src/components/calculator/ResultScreen.tsx',
    'src/lib/seo/jsonld.ts',
    'src/config/site.ts',
    'public/llms.txt',
    'scripts/generate-draft.mjs',
  ]) {
    // Importregels zijn code en bevatten woorden als "affiliate".
    voegToe(rel, (s) => s.replace(/^\s*import .+$/gm, ''));
  }
  return uit;
}

/** Claimzinnen uit een tekst, genormaliseerd. */
function claimZinnen(tekst: string): string[] {
  const uit: string[] = [];
  // Ook knippen na een punt die achter een aanhalingsteken of sluithaakje
  // staat: `verplichtingen.';` is een zinseinde. Zonder dit plakte de
  // metadescription van de homepage aan de hele FAQ erachter, en dan bepaalde
  // een voornaamwoord ergens veertig regels verderop of de zin werd gezien.
  for (const zin of tekst.replace(/\s+/g, ' ').split(/(?<=[.!?]['"’”)\];,]{0,3})\s+/)) {
    const raakt = ONAFHANKELIJKHEID.test(zin) || (ONDERWERP_OVER_ONS.test(zin) && OVER_ONS.test(zin));
    if (!raakt) continue;
    if (RUIS.test(zin) && !/affiliate|geld verdienen|\bvergoeding\b/i.test(zin)) continue;
    uit.push(normaliseerClaim(zin));
  }
  return uit;
}

const fragmenten = GOEDGEKEURDE_CLAIMS.map((c) => normaliseerClaim(c.fragment));

describe('claims over onszelf', () => {
  it('elk goedgekeurd fragment heeft een motivering', () => {
    for (const c of GOEDGEKEURDE_CLAIMS) {
      expect(c.waarom.length, `${c.fragment} mist een motivering`).toBeGreaterThan(15);
      expect(normaliseerClaim(c.fragment).length).toBeGreaterThan(5);
    }
  });

  it('geen enkele claimzin staat buiten de goedgekeurde lijst', () => {
    const onbekend: string[] = [];
    for (const { naam, tekst } of bestanden()) {
      for (const zin of claimZinnen(tekst)) {
        // Niet "bevat een goedgekeurd fragment" — dan glipt een zin erdoor die
        // een goedgekeurd stuk combineert met een verouderde claim, zoals
        // "wij verkopen zelf niets en zijn aan geen enkele leverancier
        // verbonden". Daarom: knip alle goedgekeurde fragmenten weg en kijk of
        // er nog een claim overblijft.
        let rest = zin;
        for (const f of fragmenten) rest = rest.split(f).join(' ');
        if (!RESIDU_CLAIM.test(rest)) continue;
        const trigger = RESIDU_CLAIM.exec(rest)?.[0] ?? '?';
        onbekend.push(
          `${naam}\n   "${zin.slice(0, 200)}"\n   niet gedekt: "${trigger}"`,
        );
      }
    }
    expect(
      onbekend,
      'Niet-goedgekeurde uitspraak over onze onafhankelijkheid, verkoop, ' +
        'inkomsten of samenwerkingen. Klopt de zin? Voeg hem dan bewust toe aan ' +
        `GOEDGEKEURDE_CLAIMS met een motivering.\n\n${onbekend.join('\n\n')}`,
    ).toEqual([]);
  });
});
