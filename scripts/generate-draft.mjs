/**
 * Conceptgenerator voor de contentpijplijn.
 *
 * Draait wekelijks via GitHub Actions (of handmatig: npm run generate-draft).
 * Neemt het eerste onderwerp met status "wachtrij" uit content-queue.json,
 * genereert een MDX-concept en schrijft dat naar
 * src/content/pages/_concept-{slug}.mdx met published: false.
 *
 * HARDE REGELS:
 * - Er wordt NOOIT automatisch gepubliceerd. Het concept is een PR, geen release.
 * - Een onderwerp zonder `informatiewinst` wordt overgeslagen: zonder
 *   gedefinieerde informatiewinst schrijven wij het stuk niet.
 * - Geen API-sleutel in de code; uitsluitend via ANTHROPIC_API_KEY.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL = 'claude-sonnet-4-6';

const hier = path.dirname(fileURLToPath(import.meta.url));
const wortel = path.join(hier, '..');
const queuePad = path.join(wortel, 'content-queue.json');
const paginaMap = path.join(wortel, 'src', 'content', 'pages');
const constantsPad = path.join(wortel, 'src', 'config', 'constants.ts');

/** Bestaande pagina's: nodig voor interne links én om herhaling te voorkomen. */
async function bestaandePaginas() {
  const bestanden = await readdir(paginaMap);
  const paginas = [];
  for (const bestand of bestanden) {
    if (!bestand.endsWith('.mdx') || bestand.startsWith('_')) continue;
    const inhoud = await readFile(path.join(paginaMap, bestand), 'utf8');
    const titel = /^h1:\s*'(.+)'$/m.exec(inhoud)?.[1] ?? bestand;
    const cluster = /^cluster:\s*'(.+)'$/m.exec(inhoud)?.[1] ?? 'overig';
    paginas.push({ url: `/${bestand.replace('.mdx', '')}/`, titel, cluster });
  }
  // .astro-only pagina's die ook doelwit van interne links mogen zijn
  paginas.push(
    { url: '/', titel: 'De rekenaar', cluster: 'tool' },
    { url: '/uitgangspunten/', titel: 'Onze uitgangspunten', cluster: 'tool' },
    { url: '/stroomprijzen-vandaag/', titel: 'Stroomprijzen vandaag', cluster: 'data' },
    {
      url: '/terugleververgoeding-vergelijken/',
      titel: 'Terugleververgoeding vergelijken',
      cluster: 'data',
    },
    { url: '/kennisbank/', titel: 'Kennisbank', cluster: 'index' },
  );
  return paginas;
}

/** De actuele constanten, zodat de tekst niet met eigen cijfers op de loop gaat. */
async function constantenSamenvatting() {
  const bron = await readFile(constantsPad, 'utf8');
  const regels = [];
  const re = /^export const ([A-Z_]+) = (.+?);/gm;
  let m;
  while ((m = re.exec(bron)) !== null) {
    regels.push(`${m[1]} = ${m[2]}`);
  }
  return regels.join('\n');
}

function bouwPrompt({ onderwerp, paginas, constanten, vandaag }) {
  const paginalijst = paginas
    .map((p) => `- ${p.url} — ${p.titel} (cluster: ${p.cluster})`)
    .join('\n');

  return `Je schrijft een concept-artikel voor thuisbatterijrekenaar.nl.

## Wie wij zijn
Een onafhankelijke rekenaar voor thuisbatterijen, beheerd door Sıtkı Murat Oğrak.
Wij verkopen zelf GEEN batterijen en zijn niet verbonden aan een energieleverancier
of installateur. Onze inkomsten komen uit vrijblijvende offerteaanvragen. Onze
positionering is eerlijkheid: wij zeggen het ook wanneer een thuisbatterij niet
uit kan.

## Taal en toon
- Nederlands (nl-NL), aanspreekvorm "u".
- Informatief, nuchter, geen verkooptaal, geen uitroeptekens, geen superlatieven.
- Geen emoji.

## Het onderwerp
- slug: ${onderwerp.slug}
- titel (richting): ${onderwerp.titel}
- cluster: ${onderwerp.cluster}
- zoekintentie: ${onderwerp.zoekintentie}
- informatiewinst (dit is de kern — dit hebben concurrenten NIET):
  ${onderwerp.informatiewinst}

## Onze actuele rekenconstanten (bron: src/config/constants.ts)
Gebruik uitsluitend deze waarden wanneer je een getal uit onze berekening noemt.
Verzin er geen bij en herhaal ze alleen waar ze de tekst echt helpen.
${constanten}

## Bestaande pagina's (voor interne links en om herhaling te vermijden)
${paginalijst}

## Wat je schrijft
Een MDX-bestand. Begin met frontmatter tussen ---, exact in deze vorm:

---
title: '<SEO-titel, max ~65 tekens> | Thuisbatterijrekenaar'
description: '<meta description, 140-160 tekens>'
h1: '<H1 van de pagina>'
gepubliceerd: '${vandaag}'
cluster: '${onderwerp.cluster}'
published: false
gegenereerd: '${vandaag}'
aiGegenereerd: true
faq:
  - vraag: '...'
    antwoord: >-
      ...
  (minimaal 4 vragen)
---

Daarna de body in Markdown (## voor koppen, geen H1 in de body — die staat in de
frontmatter).

## Harde eisen aan de body
1. Lengte: 800 tot 1200 woorden.
2. Verplichte eerlijkheidssectie: een kop met "Voor wie is dit NIET geschikt"
   (of een even duidelijke tegenwicht-sectie waarin staat wanneer dit géén goed
   idee is). Dit is niet optioneel.
3. Minstens één link naar de rekenaar: [de rekenaar](/).
4. Minstens twee links naar andere bestaande pagina's uit de lijst hierboven,
   bij voorkeur uit hetzelfde cluster.
5. Sluit af met een sectie "### Bronnen" met de bronnen die je noemt, en
   daaronder de zin: "Deze pagina is voor het laatst gecontroleerd op ${vandaag}."

## Absoluut verboden
- Statistieken, percentages, tarieven of bedragen verzinnen. Noem alleen
  getallen uit de constantenlijst hierboven, of getallen die je expliciet
  markeert als onbevestigd.
- Tarieven of voorwaarden van een specifieke energieleverancier of verzekeraar
  noemen.
- Juridische, fiscale of verzekeringstechnische stelligheid. Waar je niet zeker
  bent, schrijf je de bewering NIET als feit, maar zet je op die plek:
  [TEYIT GEREKLI: <precies wat er geverifieerd moet worden>]
  Dat markeringspatroon is bewust; laat het letterlijk zo staan.
- Beweren dat een thuisbatterij altijd rendabel is.

Geef uitsluitend de inhoud van het MDX-bestand terug, zonder codeblok-hekjes
eromheen en zonder begeleidende tekst.`;
}

async function main() {
  // Eerst de wachtrij: is er niets te doen, dan is er ook geen sleutel nodig.
  // BOM strippen: editors op Windows schrijven die er graag voor.
  const queueRuw = (await readFile(queuePad, 'utf8')).replace(/^﻿/, '');
  const queue = JSON.parse(queueRuw);
  const wachtrij = queue.filter((o) => o.status === 'wachtrij');

  if (wachtrij.length === 0) {
    console.log('[generate-draft] Wachtrij is leeg — niets te doen.');
    return;
  }

  const onderwerp = wachtrij.find(
    (o) => typeof o.informatiewinst === 'string' && o.informatiewinst.trim() !== '',
  );
  const overgeslagen = wachtrij.filter(
    (o) => !o.informatiewinst || o.informatiewinst.trim() === '',
  );
  for (const o of overgeslagen) {
    console.warn(
      `[generate-draft] OVERGESLAGEN: "${o.slug}" heeft geen informatiewinst. ` +
        'Zonder gedefinieerde informatiewinst schrijven wij het onderwerp niet.',
    );
  }
  if (!onderwerp) {
    console.log('[generate-draft] Geen bruikbaar onderwerp — niets te doen.');
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[generate-draft] ANTHROPIC_API_KEY ontbreekt — gestopt.');
    process.exit(1);
  }

  const vandaag = new Date().toISOString().slice(0, 10);
  const prompt = bouwPrompt({
    onderwerp,
    paginas: await bestaandePaginas(),
    constanten: await constantenSamenvatting(),
    vandaag,
  });

  const client = new Anthropic({ apiKey });
  console.log(`[generate-draft] Genereren: ${onderwerp.slug} (${MODEL})…`);

  // Streamen: een artikel van 1200 woorden met denkstappen loopt anders tegen
  // de HTTP-timeout van de SDK aan.
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    messages: [{ role: 'user', content: prompt }],
  });
  const bericht = await stream.finalMessage();

  if (bericht.stop_reason === 'refusal') {
    console.error('[generate-draft] Model weigerde het verzoek — geen concept geschreven.');
    process.exit(1);
  }

  const mdx = bericht.content
    .filter((blok) => blok.type === 'text')
    .map((blok) => blok.text)
    .join('')
    .trim();

  if (!mdx.startsWith('---')) {
    console.error('[generate-draft] Antwoord begint niet met frontmatter — niet weggeschreven.');
    process.exit(1);
  }

  const doel = path.join(paginaMap, `_concept-${onderwerp.slug}.mdx`);
  await writeFile(doel, mdx + '\n', 'utf8');

  // Wachtrijstatus bijwerken zodat de volgende run het volgende onderwerp pakt.
  const bijgewerkt = queue.map((o) =>
    o.slug === onderwerp.slug ? { ...o, status: 'concept' } : o,
  );
  await writeFile(queuePad, JSON.stringify(bijgewerkt, null, 2) + '\n', 'utf8');

  const woorden = mdx.split(/\s+/).filter(Boolean).length;
  console.log(
    `[generate-draft] Geschreven: ${path.relative(wortel, doel)} ` +
      `(~${woorden} woorden, tokens in/uit: ${bericht.usage.input_tokens}/${bericht.usage.output_tokens})`,
  );
  console.log(`[generate-draft] SLUG=${onderwerp.slug}`);
  console.log(`[generate-draft] TITEL=${onderwerp.titel}`);
}

await main();
