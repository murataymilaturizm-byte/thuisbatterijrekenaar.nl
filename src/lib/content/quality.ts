/**
 * Kwaliteitspoorten voor gegenereerde concepten.
 *
 * Rood = blokkerend: dit concept mag niet gepubliceerd worden.
 * Geel = waarschuwing: menselijke controle nodig, maar niet blokkerend.
 *
 * Pure functies, geen Astro/React — testbaar en herbruikbaar.
 */

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
}

export const MIN_WOORDEN = 800;
export const MAX_WOORDEN = 1200;
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

/** Getallen in de lopende tekst — heuristisch, voor de gele bronpoort. */
export function losseGetallen(body: string): string[] {
  const zonderImports = body.replace(/^import .+$/gm, '');
  // Getallen binnen {…} komen uit constants.ts en tellen niet mee.
  const zonderExpressies = zonderImports.replace(/\{[^}]*\}/g, '');
  const treffers = zonderExpressies.match(/(?<![\w/-])\d+(?:[.,]\d+)?\s*(?:%|kWh|kW|Wp|euro|jaar)/gi);
  return treffers ? [...new Set(treffers.map((t) => t.trim()))] : [];
}

const EERLIJKHEIDSSIGNALEN = [
  'niet geschikt',
  'niet verstandig',
  'let op',
  'geen bevestiging',
  'niet rendabel',
  'wij vonden geen',
  'niet aan te raden',
];

export function beoordeelConcept(invoer: ConceptInvoer): PoortResultaat[] {
  const { body, ruw, faqAantal, bestaandeUrls, clusterUrls } = invoer;
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

  return [
    {
      id: 'woorden',
      label: `Lengte ${MIN_WOORDEN}–${MAX_WOORDEN} woorden`,
      niveau: 'rood',
      geslaagd: woorden >= MIN_WOORDEN && woorden <= MAX_WOORDEN,
      toelichting: `${woorden} woorden geteld.`,
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
      geslaagd: clusterLinks.length >= MIN_CLUSTERLINKS,
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
