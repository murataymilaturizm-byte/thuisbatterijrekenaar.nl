/**
 * Kwaliteitspoorten voor gegenereerde concepten.
 *
 * Rood = blokkerend: dit concept mag niet gepubliceerd worden.
 * Geel = waarschuwing: menselijke controle nodig, maar niet blokkerend.
 *
 * Pure functies, geen Astro/React — testbaar en herbruikbaar.
 */

import { AFGELEIDE_TOKENS } from '../../config/afgeleide-waarden';
import { JURIDISCHE_TOKENS } from '../../config/juridische-waarden';

export type PoortNiveau = 'rood' | 'geel';

export interface PoortResultaat {
  id: string;
  label: string;
  niveau: PoortNiveau;
  geslaagd: boolean;
  toelichting: string;
}

export interface ConceptInvoer {
  /** De body van het MDX-bestand, zonder frontmatter */
  body: string;
  /** Volledig bestand inclusief frontmatter (voor datum-/broncontroles) */
  ruw: string;
  faqAantal: number;
  cluster: string;
  /** URL's van alle bestaande pagina's, met trailing slash (bijv. "/terugleverkosten/") */
  bestaandeUrls: string[];
  /** URL's van pagina's in hetzelfde cluster */
  clusterUrls: string[];
  /**
   * Alle numerieke waarden uit constants.ts. Voedt de poort die getallen
   * signaleert die NIET uit onze constanten komen (afgeleide of verzonnen
   * cijfers). Optioneel: zonder deze lijst wordt die poort overgeslagen.
   */
  bekendeWaarden?: number[];
  /**
   * Exportnamen van de constanten (HOOFDLETTERS_MET_UNDERSCORE) uit
   * constants.ts. Voedt de poort die programmatische constantennamen in de
   * lopende tekst signaleert. Optioneel: zonder lijst wordt de poort
   * overgeslagen.
   */
  constanteNamen?: string[];
}

export const MIN_WOORDEN = 800;
/**
 * Geen harde bovengrens meer.
 *
 * De oude grens van 1200 had geen empirische basis en werkte averechts: hij
 * dwong om geverifieerde inhoud weg te knippen. De zoekdata spreekt hem ook
 * tegen — een pagina van 593 woorden staat op positie 3,5, een van 1261 op 72.
 * Lengte voorspelt de positie niet. Alleen echt opgeblazen teksten verdienen
 * nog een blik, en dat is een signaal, geen blokkade.
 */
export const WAARSCHUWING_WOORDEN = 1600;
export const MIN_FAQ = 4;
export const MIN_CLUSTERLINKS = 2;

/** Woorden in de body, exclusief markdown-linkdoelen en importregels. */
export function telWoorden(body: string): number {
  const schoon = body
    .replace(/^import .+$/gm, '')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/[#>*_`-]/g, ' ');
  return schoon.split(/\s+/).filter(Boolean).length;
}

/** Alle interne links (beginnend met /) uit de body. */
export function interneLinks(body: string): string[] {
  const links = new Set<string>();
  const re = /\]\((\/[^)\s]*)\)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    links.add(m[1]!);
  }
  return [...links];
}

/** Getallen in de lopende tekst — heuristisch, voor de bronpoorten. */
export function losseGetallen(body: string): string[] {
  const zonderImports = body.replace(/^import .+$/gm, '');
  // Getallen binnen {…} komen uit constants.ts en tellen niet mee.
  const zonderExpressies = zonderImports.replace(/\{[^}]*\}/g, '');
  const treffers = zonderExpressies.match(
    /(?<![\w/-])\d+(?:[.,]\d+)*\s*(?:%|kWh|kW|Wp|euro|procent|jaar)/gi,
  );
  return treffers ? [...new Set(treffers.map((t) => t.trim()))] : [];
}

/** "3.784" → 3784 (duizendtal), "0,88" → 0.88, "7.5" → 7.5. */
export function parseGetalNl(token: string): number {
  let t = token.replace(/[^\d.,]/g, '');
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  }
  return Number(t);
}

/**
 * Getal-plus-eenheidcombinaties waarvan de waarde NIET in constants.ts
 * voorkomt — het kenmerk van zelf uitgerekende of verzonnen cijfers
 * ("3.784 kWh", "10 kWh per dag"). Heuristiek: fracties (0,9) tellen ook
 * als hun percentage (90), zodat "90 procent" DOD_BRUIKBAAR matcht.
 */
/**
 * Programmatische constantennamen (ROUND_TRIP_RENDEMENT) in de lopende
 * tekst. Importregels en {…}-expressies tellen niet mee: dáár horen de
 * namen juist — dat is het single-source-mechanisme.
 */
export function constantenInTekst(body: string, constanteNamen: string[]): string[] {
  const proza = body
    // Ook meerregelige imports (import {\n  NAAM,\n} from '…';) volledig weg.
    .replace(/^import\s[\s\S]*?from\s*'[^']*';?/gm, '')
    .replace(/\{[^}]*\}/g, '');
  return constanteNamen.filter((naam) => new RegExp(`\\b${naam}\\b`).test(proza));
}

/**
 * Is deze pagina gepubliceerd?
 *
 * Let op de richting. De meeste gepubliceerde pagina's hebben helemaal geen
 * `published`-veld — alleen de contentpijplijn schrijft het. Een pagina is dus
 * gepubliceerd tenzij er expliciet `published: false` staat, precies zoals
 * /concepten het bepaalt. Op `published: true` testen zou juist de oudste
 * live pagina's ongecontroleerd laten.
 */
export function isGepubliceerd(ruw: string): boolean {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(ruw)?.[1] ?? '';
  return !/^published:\s*false\s*$/m.test(fm);
}

/**
 * TEYIT-markeringen in een pagina die al gepubliceerd is.
 *
 * In een concept hoort de markering juist thuis — daar is het werk. Zodra
 * `published: true` staat, is elke markering een interne notitie die de
 * lezer te zien krijgt; dat is precies wat er op
 * /thuisbatterij-melden-netbeheerder/ live stond.
 */
export function teyitInGepubliceerdePagina(ruw: string): string[] {
  if (!isGepubliceerd(ruw)) return [];
  return [...ruw.matchAll(/\[TEYIT[^\]]*\]?/g)].map((m) => m[0].slice(0, 70));
}

/**
 * Staat er een [TEYIT GEREKLI]-markering in het Bronnenblok?
 *
 * De markering hoort in de lopende tekst, bij de bewering waarover de
 * onzekerheid gaat. In Bronnen staan alleen echte bronnen; een markering
 * daar maakt van een ontbrekende bron een bronvermelding.
 */
export function teyitInBronnen(body: string): boolean {
  const delen = body.split(/###\s*Bronnen/i);
  if (delen.length < 2) return false;
  return /\[TEYIT/i.test(delen.slice(1).join('\n'));
}

/**
 * Wet-, richtlijn- of normnummers die alleen in het Bronnenblok staan én
 * geen vindplaats hebben.
 *
 * Aanleiding: een concept voerde "Europese richtlijn 2019/944" op als bron,
 * terwijl die richtlijn nergens in de tekst werd aangehaald en er geen
 * vindplaats bij stond. Twee signalen samen, want elk apart geeft valse
 * treffers: een echte bron (Kamerstuk 36202, nr. 156) staat mét link in
 * Bronnen zonder dat het nummer in de lopende tekst hoeft te staan.
 * Heuristisch: het gaat om opvallen, niet om volledigheid.
 */
export function ongebruikteBronnummers(body: string): string[] {
  const delen = body.split(/###\s*Bronnen/i);
  if (delen.length < 2) return [];
  const romp = delen[0]!;
  const bronnen = delen.slice(1).join('\n');

  // Een juridisch/normatief trefwoord gevolgd door een nummer.
  const re =
    /\b(?:richtlijn|verordening|wet|besluit|regeling|norm|kamerstuk|NEN|EN|IEC|ISO)\b[^\n.;,]{0,20}?(\d{2,5}(?:[/:-]\d{1,5})+|\d{4})\b/gi;

  const ongebruikt = new Set<string>();
  // Per bronvermelding beoordelen: een regel met vindplaats is controleerbaar.
  for (const regel of bronnen.split(/\n(?=\s*[-*])/)) {
    if (/https?:\/\//.test(regel)) continue;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(regel)) !== null) {
      if (!romp.includes(m[1]!)) ongebruikt.add(m[0]!.trim());
    }
  }
  return [...ongebruikt];
}
export function onbekendeGetallen(body: string, bekendeWaarden: number[]): string[] {
  const bekend = new Set<number>();
  for (const w of bekendeWaarden) {
    bekend.add(w);
    if (w > 0 && w < 1) bekend.add(Math.round(w * 100));
  }
  return losseGetallen(body).filter((token) => {
    const genormaliseerd = token.toLowerCase().replace(/\s+/g, ' ');
    // Wettelijke en fiscale waarden staan in een eigen, bronvermelde lijst.
    if (JURIDISCHE_TOKENS.has(genormaliseerd)) return false;
    // Uit onze eigen cijfers afgeleid; afgeleide-waarden.test.ts herberekent
    // ze bij elke run en valt om zodra een constante verschuift.
    if (AFGELEIDE_TOKENS.has(genormaliseerd)) return false;
    return !bekend.has(parseGetalNl(token));
  });
}

const EERLIJKHEIDSSIGNALEN = [
  'niet geschikt',
  'niet verstandig',
  'let op',
  'geen bevestiging',
  'niet rendabel',
  'wij vonden geen',
  'niet aan te raden',
  // 'Voor wie is dit géén goed argument' is ook een tegenwichtsectie.
  'geen goed argument',
  'minder geschikt',
];

export function beoordeelConcept(invoer: ConceptInvoer): PoortResultaat[] {
  const { body, ruw, faqAantal, bestaandeUrls, clusterUrls, bekendeWaarden, constanteNamen } =
    invoer;
  const woorden = telWoorden(body);
  const links = interneLinks(body);
  const lower = body.toLowerCase();

  const rekenaarLink = links.some((l) => l === '/' || l === '/#rekenaar');
  const bestaandeSet = new Set(bestaandeUrls);
  const kapotteLinks = links.filter((l) => !bestaandeSet.has(l) && l !== '/');
  const clusterSet = new Set(clusterUrls);
  const clusterLinks = links.filter((l) => clusterSet.has(l));
  const getallen = losseGetallen(body);
  const eerlijkheid = EERLIJKHEIDSSIGNALEN.filter((s) => lower.includes(s));
  const onbekend = bekendeWaarden ? onbekendeGetallen(body, bekendeWaarden) : [];

  const bronnummers = ongebruikteBronnummers(body);
  const teyitInBron = teyitInBronnen(body);
  const teyitGepubliceerd = teyitInGepubliceerdePagina(ruw);

  const poorten: PoortResultaat[] = [
    {
      id: 'teyit-in-gepubliceerde-pagina',
      label: 'Geen TEYIT-markering in een gepubliceerde pagina',
      niveau: 'rood',
      geslaagd: teyitGepubliceerd.length === 0,
      toelichting:
        teyitGepubliceerd.length === 0
          ? 'Geen interne markeringen zichtbaar voor de lezer.'
          : `Zichtbaar voor de lezer: ${teyitGepubliceerd.join(' | ')}`,
    },
    {
      id: 'teyit-in-bronnen',
      label: 'Geen TEYIT-markering in het Bronnenblok',
      niveau: 'rood',
      geslaagd: !teyitInBron,
      toelichting: teyitInBron
        ? 'Een TEYIT-markering hoort in de lopende tekst, niet tussen de bronnen.'
        : 'Bronnen bevat alleen bronvermeldingen.',
    },
    {
      id: 'bronnummers',
      label: 'Bronnenblok noemt geen ongebruikte wet-/richtlijnnummers',
      niveau: 'rood',
      geslaagd: bronnummers.length === 0,
      toelichting:
        bronnummers.length === 0
          ? 'Elke genoemde regelgeving komt ook in de tekst voor.'
          : `Alleen in Bronnen, niet in de tekst: ${bronnummers.join('; ')}`,
    },
  ];
  if (constanteNamen) {
    const gevonden = constantenInTekst(body, constanteNamen);
    poorten.push({
      id: 'constantenaam',
      label: 'Geen programmatische constantennaam in lopende tekst',
      niveau: 'rood',
      geslaagd: gevonden.length === 0,
      toelichting:
        gevonden.length === 0
          ? 'Geen interne variabelenamen gevonden.'
          : `In de tekst: ${gevonden.join(', ')}`,
    });
  }
  if (bekendeWaarden) {
    // Rood: een getal+eenheid dat niet uit constants.ts komt, is vrijwel
    // altijd een afgeleide berekening of een verzonnen cijfer — precies wat
    // de schrijfregels verbieden. Heuristisch; de mens beslist in de PR.
    poorten.push({
      id: 'onbekende-getallen',
      label: 'Alle getallen komen uit constants.ts',
      niveau: 'rood',
      geslaagd: onbekend.length === 0,
      toelichting:
        onbekend.length === 0
          ? 'Geen afwijkende getal+eenheidcombinaties gevonden.'
          : `Niet in constants.ts: ${onbekend.join(', ')}`,
    });
  }

  return [
    ...poorten,
    {
      id: 'woorden',
      label: `Lengte (richtlijn vanaf ${MIN_WOORDEN}, signaal boven ${WAARSCHUWING_WOORDEN})`,
      niveau: 'geel',
      geslaagd: woorden >= MIN_WOORDEN && woorden <= WAARSCHUWING_WOORDEN,
      toelichting:
        woorden < MIN_WOORDEN
          ? `${woorden} woorden — kort voor een concept; geen reden om te rekken.`
          : woorden > WAARSCHUWING_WOORDEN
            ? `${woorden} woorden — controleer op herhaling, niet op lengte alleen.`
            : `${woorden} woorden geteld.`,
    },
    {
      id: 'faq',
      label: `Minimaal ${MIN_FAQ} FAQ-vragen`,
      niveau: 'rood',
      geslaagd: faqAantal >= MIN_FAQ,
      toelichting: `${faqAantal} vragen in de frontmatter.`,
    },
    {
      id: 'rekenaar',
      label: 'Link naar de rekenaar',
      niveau: 'rood',
      geslaagd: rekenaarLink,
      toelichting: rekenaarLink ? 'Aanwezig.' : 'Geen link naar / gevonden.',
    },
    {
      id: 'clusterlinks',
      label: `Minimaal ${MIN_CLUSTERLINKS} links binnen het cluster`,
      niveau: 'rood',
      // Een cluster van twee pagina's kan er maar één aanbieden; de eis kan
      // nooit hoger liggen dan wat er te linken valt.
      geslaagd: clusterLinks.length >= Math.min(MIN_CLUSTERLINKS, clusterUrls.length),
      toelichting:
        clusterLinks.length > 0
          ? `${clusterLinks.length} gevonden: ${clusterLinks.join(', ')}`
          : 'Geen links naar pagina’s in hetzelfde cluster.',
    },
    {
      id: 'links',
      label: 'Alle interne links bestaan',
      niveau: 'rood',
      geslaagd: kapotteLinks.length === 0,
      toelichting:
        kapotteLinks.length === 0
          ? `${links.length} links gecontroleerd.`
          : `Kapot: ${kapotteLinks.join(', ')}`,
    },
    {
      id: 'getallen',
      label: 'Getallen komen uit constants.ts of hebben een bron',
      niveau: 'geel',
      geslaagd: getallen.length === 0,
      toelichting:
        getallen.length === 0
          ? 'Geen losse getallen in de lopende tekst.'
          : `Controleer handmatig: ${getallen.join(', ')}`,
    },
    {
      id: 'eerlijkheid',
      label: 'Tegenwicht-/eerlijkheidssectie aanwezig',
      niveau: 'geel',
      geslaagd: eerlijkheid.length > 0,
      toelichting:
        eerlijkheid.length > 0
          ? `Signaal gevonden: ${eerlijkheid.join(', ')}`
          : 'Geen "niet geschikt"-achtige sectie herkend.',
    },
    {
      id: 'datum',
      label: '"Laatst gecontroleerd"-datum aanwezig',
      niveau: 'geel',
      geslaagd: /laatst gecontroleerd/i.test(ruw),
      toelichting: /laatst gecontroleerd/i.test(ruw)
        ? 'Aanwezig.'
        : 'Geen controledatum in de tekst.',
    },
    {
      id: 'bronnen',
      label: 'Bronnenblok aanwezig',
      niveau: 'geel',
      geslaagd: /###\s*Bronnen/i.test(body),
      toelichting: /###\s*Bronnen/i.test(body)
        ? 'Aanwezig.'
        : 'Geen "### Bronnen"-sectie gevonden.',
    },
  ];
}

export function isPubliceerbaar(resultaten: PoortResultaat[]): boolean {
  return resultaten.every((r) => r.niveau !== 'rood' || r.geslaagd);
}
