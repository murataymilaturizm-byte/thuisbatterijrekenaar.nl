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

function bouwPrompt({ onderwerp, paginas, constanten, vandaag, vandaagNl }) {
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

## REGELS VOOR HET GEBRUIK VAN ONZE CONSTANTEN

De constanten hierboven zijn invoer voor de rekenmotor. Je mag ze
noemen en uitleggen, maar je mag er GEEN eigen conclusies uit
afleiden en GEEN eigen vuistregels van maken.

Verboden:
- Zelf uitrekenen welke capaciteit "meestal" of "vaak" het beste is.
  De rekenmotor rekent alle groottes door en kiest per situatie.
  Elke uitspraak als "5 of 7,5 kWh is voor de meeste huishoudens
  het beste" is fout — dat is precies de vuistregel die wij hebben
  afgeschaft.
- Een constante gebruiken voor iets anders dan waarvoor die is
  gedefinieerd. LAADVENSTER_UREN is het laadvenster voor arbitrage,
  NIET het aantal zonuren per dag.
- Zelf rekenvoorbeelden verzinnen met afgeleide getallen
  (dagopbrengst, gemiddelden per dag). Gebruik alleen getallen die
  letterlijk in de constantenlijst staan.
- Een aanname presenteren als marktfeit. Schrijf altijd
  "in onze berekening rekenen wij met X" — nooit "X bedraagt".

Verplicht bij elke capaciteitsvraag:
Verwijs naar de rekenaar. De uitkomst hangt af van de individuele
situatie en wij doen daar geen algemene uitspraak over.

Noem NOOIT de programmatische naam van een constante in de lopende
tekst. Namen als AANDEEL_VERBRUIK_BUITEN_ZONUREN, ROUND_TRIP_RENDEMENT
of SEIZOENSBENUTTING zijn interne variabelen; voor de lezer betekenen
ze niets en ze maken de tekst onprofessioneel.

Fout:  "wij rekenen met 60 procent (AANDEEL_VERBRUIK_BUITEN_ZONUREN = 0,60)"
Goed:  "in onze berekening rekenen wij ermee dat 60 procent van het
        verbruik buiten de zonuren valt"

De volledige lijst met waarden staat al op /uitgangspunten/ — verwijs
daarheen in plaats van variabelenamen te noemen.

## DE DRIE GRENZEN — dit model ligt vast, verzin er geen eigen versie van

Onze rekenmotor begrenst de dagelijkse benutting door de KLEINSTE van
deze drie:

1. Het dagelijkse zonne-overschot — u kunt niet meer opslaan dan u
   overhoudt
2. De bruikbare capaciteit van de batterij — niet de volledige
   nominale capaciteit is bruikbaar
3. Het verbruik buiten zonuren — u kunt een batterij alleen ontladen
   als u die energie ook gebruikt

Het round-trip rendement is GEEN vierde grens en ook geen vervanging
voor grens 3. Het is een verliesfactor die op de opbrengst wordt
toegepast, niet op het volume.

Deze drie grenzen staan ook op /thuisbatterij-rendement/ beschreven.
Wijk er niet van af — twee pagina's die een ander model beschrijven
ondermijnen onze geloofwaardigheid.

## Verboden formuleringen

Deze formuleringen mag je NIET gebruiken:
- "vuistregel", "als vuistregel", "een goede vuistregel"
- "in veel gevallen beter" / "meestal het beste" gekoppeld aan
  een specifieke capaciteit
- "gemiddeld ... per dag" als je dat zelf hebt uitgerekend

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
zoekintentie: '${onderwerp.zoekintentie}'
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
   daaronder de zin: "Deze pagina is voor het laatst gecontroleerd op ${vandaagNl}."
   (In zichtbare tekst altijd de Nederlandse datumnotatie; ISO-datums horen
   alleen in de frontmatter.)

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
  [TEYIT GEREKLI: ...] hoort in de lopende tekst, direct bij de
  bewering waar de onzekerheid over gaat. Nooit in het Bronnen-blok —
  daar staan alleen echte bronnen.
- Beweren dat een thuisbatterij altijd rendabel is.
- Beschrijf geen technische mechanismen die niet in onze rekenmotor
  zitten. Voorbeeld van wat NIET mag: beweren dat een batterij die
  's ochtends nog halfvol is, ertoe leidt dat zonnestroom naar het net
  wordt teruggeleverd en dat dit extra kosten oplevert. Dat klinkt
  logisch, maar onze rekenmotor modelleert geen carry-over tussen
  dagen. Wat je niet in de constantenlijst of in de beschrijving van
  de drie grenzen terugvindt, bestaat voor deze site niet.
  Bij twijfel: beschrijf het niet, of markeer het met [TEYIT GEREKLI].

## Onzekerheid benoemen

Onze aannames zijn geen gemeten waarden. Waar je een aanname noemt
die per merk, model of situatie verschilt — bijvoorbeeld de
ontladingsdiepte of de prijs per kWh — markeer die met
[TEYIT GEREKLI: ...] in de lopende tekst.

Een concept zonder enkele markering is verdacht: het betekent
meestal dat je onzekerheid hebt weggeschreven in plaats van benoemd.

Geef uitsluitend de inhoud van het MDX-bestand terug, zonder codeblok-hekjes
eromheen en zonder begeleidende tekst.

BELANGRIJK — uitvoerformaat:
Begin je antwoord direct met de regel \`---\` (het begin van de
frontmatter). Geen inleiding, geen uitleg, geen codeblok-fences,
geen afsluitende opmerking. Het volledige antwoord is het
MDX-bestand zelf en niets anders.`;
}

/**
 * Modeluitvoer → schone MDX. Modellen verpakken het antwoord soms in een
 * codeblok of zetten er een inleidende zin boven; dat is verpakking, geen
 * inhoud. Volgorde bewust: eerst fences strippen, dán de aanloop wegsnijden —
 * anders blijft een fence-regel vóór de frontmatter staan.
 */
export function normaliseerAntwoord(ruw) {
  let tekst = ruw.trim();

  // 1) Codeblok-fences: ```markdown / ```mdx / ``` aan het begin,
  //    bijbehorende ``` aan het eind (indien aanwezig).
  const fence = /^```[a-z]*[ \t]*\r?\n/i.exec(tekst);
  if (fence) {
    tekst = tekst.slice(fence[0].length);
    tekst = tekst.replace(/\r?\n```[ \t]*$/, '');
    tekst = tekst.trim();
  }

  // 2) Aanloop: begint het antwoord nog niet met frontmatter, snijd dan
  //    alles weg vóór de eerste regel die met --- begint. Bevatte de
  //    weggesneden aanloop zelf een openende fence ("Hier is het artikel:"
  //    gevolgd door ```markdown), verwijder dan ook de bijbehorende
  //    sluitende fence aan het eind.
  if (!tekst.startsWith('---')) {
    const m = /^---/m.exec(tekst);
    if (m) {
      const aanloop = tekst.slice(0, m.index);
      tekst = tekst.slice(m.index);
      if (/```/.test(aanloop)) {
        tekst = tekst.replace(/\r?\n```[ \t]*$/, '');
      }
    }
  }

  return tekst.trim();
}

/**
 * Alle tekstblokken uit een antwoord, in volgorde samengevoegd.
 * Nooit positioneel (content[0]) lezen: met extended thinking staan er
 * eerst thinking-/redacted_thinking-blokken vóór de tekst.
 */
export function tekstUitContent(content) {
  return content
    .filter((blok) => blok.type === 'text')
    .map((blok) => blok.text)
    .join('');
}

/**
 * Controleert de verplichte frontmattervelden van een concept.
 * Retourneert de lijst ontbrekende velden (leeg = in orde).
 */
export function valideerFrontmatter(mdx) {
  const blok = /^---\r?\n([\s\S]*?)\r?\n---/.exec(mdx);
  if (!blok) return ['frontmatter-blok (--- … ---)'];
  const fm = blok[1];

  const ontbreekt = [];
  for (const veld of [
    'title',
    'description',
    'cluster',
    'gegenereerd',
    'aiGegenereerd',
    'zoekintentie',
  ]) {
    if (!new RegExp(`^${veld}:`, 'm').test(fm)) ontbreekt.push(veld);
  }
  // published moet niet alleen bestaan, maar expliciet false zijn:
  // nooit automatisch publiceren.
  if (!/^published:\s*false\s*$/m.test(fm)) ontbreekt.push('published: false');
  return ontbreekt;
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
  // Zichtbare datum in Nederlandse notatie ("15 augustus 2026"); ISO alleen
  // voor frontmatter-velden.
  const vandaagNl = new Date().toLocaleDateString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const prompt = bouwPrompt({
    onderwerp,
    paginas: await bestaandePaginas(),
    constanten: await constantenSamenvatting(),
    vandaag,
    vandaagNl,
  });

  const client = new Anthropic({ apiKey });
  console.log(`[generate-draft] Genereren: ${onderwerp.slug} (${MODEL})…`);

  // Streamen: een artikel van 1200 woorden met denkstappen loopt anders tegen
  // de HTTP-timeout van de SDK aan.
  // Zonder extended thinking: artikelproductie is geen diepe redeneertaak,
  // en in de praktijk at het denken het volledige tokenbudget op
  // (stop_reason max_tokens bij 24000, artikel alsnog afgekapt).
  // Assistant-prefill wordt door dit model niet ondersteund (API 400);
  // normaliseerAntwoord() is daarom de enige verdediging tegen inleidingen
  // en codeblok-fences.
  const stream = client.messages.stream({
    model: MODEL,
    // 1200 woorden Nederlands + frontmatter + FAQ ≈ 2000-2500 tokens;
    // 8000 is ruim zonder een afgekapt artikel te riskeren.
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });
  const bericht = await stream.finalMessage();

  const blokTypes = bericht.content.map((blok) => blok.type).join(', ');
  console.log(`[generate-draft] stop_reason: ${bericht.stop_reason}`);
  console.log(`[generate-draft] content blokken: ${bericht.content.length}`);
  console.log(`[generate-draft] blok types: ${blokTypes}`);
  console.log(
    `[generate-draft] usage: ${bericht.usage.input_tokens}/${bericht.usage.output_tokens}`,
  );

  if (bericht.stop_reason === 'refusal') {
    console.error('[generate-draft] Model weigerde het verzoek — geen concept geschreven.');
    process.exit(1);
  }

  const ruw = tekstUitContent(bericht.content);

  if (ruw.trim() === '') {
    console.error('[generate-draft] Geen tekstblok in het antwoord.');
    console.error(`  stop_reason: ${bericht.stop_reason}`);
    console.error(`  blok types: ${blokTypes}`);
    console.error(
      '[generate-draft] Mogelijke oorzaken: max_tokens te laag (thinking verbruikt budget), ' +
        'of alleen thinking-blokken teruggekomen.',
    );
    process.exit(1);
  }

  if (bericht.stop_reason === 'max_tokens') {
    // Er ís tekst, maar het artikel is halverwege afgekapt: zo'n concept
    // lijkt geldig en glipt door de checks — daarom hard stoppen.
    console.error(
      '[generate-draft] Antwoord afgekapt (stop_reason: max_tokens) — onvolledig concept niet weggeschreven.',
    );
    process.exit(1);
  }

  const mdx = normaliseerAntwoord(ruw);

  if (!mdx.startsWith('---')) {
    console.error('[generate-draft] Antwoord begint niet met frontmatter — niet weggeschreven.');
    console.error('[generate-draft] Eerste 500 tekens van het antwoord:');
    console.error(ruw.slice(0, 500));
    process.exit(1);
  }

  const ontbrekend = valideerFrontmatter(mdx);
  if (ontbrekend.length > 0) {
    console.error(
      `[generate-draft] Frontmatter onvolledig — niet weggeschreven. Ontbreekt: ${ontbrekend.join(', ')}`,
    );
    console.error('[generate-draft] Eerste 500 tekens van het antwoord:');
    console.error(ruw.slice(0, 500));
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

// Alleen draaien bij directe aanroep (node scripts/generate-draft.mjs);
// bij import (parser-tests) draait main() niet.
const directGestart =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (directGestart) await main();
