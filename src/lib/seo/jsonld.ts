/**
 * JSON-LD schema-generatoren. Pure functies; de layout rendert de output
 * server-side in de HTML (géén client-side injectie).
 */

import { SITE } from '../../config/site';

export interface FaqItem {
  vraag: string;
  antwoord: string;
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.eigenaar.naam,
    url: SITE.url,
    description:
      'Onafhankelijk beheerder van Thuisbatterijrekenaar. Verkoopt zelf geen thuisbatterijen en is niet verbonden aan een energieleverancier of installateur.',
  };
}

export function articleSchema(opts: {
  titel: string;
  beschrijving: string;
  url: string;
  gepubliceerd: string; // ISO-datum
  gewijzigd?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.titel,
    description: opts.beschrijving,
    url: opts.url,
    inLanguage: SITE.taal,
    datePublished: opts.gepubliceerd,
    dateModified: opts.gewijzigd ?? opts.gepubliceerd,
    author: { '@type': 'Person', name: SITE.eigenaar.naam },
    publisher: { '@type': 'Person', name: SITE.eigenaar.naam },
  };
}

export function faqPageSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.vraag,
      acceptedAnswer: { '@type': 'Answer', text: item.antwoord },
    })),
  };
}

export function webApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${SITE.naam} — rekenaar`,
    url: SITE.url,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Werkt in elke moderne browser; geen account nodig.',
    inLanguage: SITE.taal,
    description: SITE.beschrijving,
    // Wat de rekenaar feitelijk doet — dit is waarop wij ons onderscheiden.
    featureList: [
      'Berekent het jaarlijkse verlies zodra de salderingsregeling stopt',
      'Berekent de jaarlijkse besparing met een thuisbatterij',
      'Rekent elke beschikbare batterijgrootte door en toont de kortste terugverdientijd',
      'Rekent met werkelijke day-ahead marktprijzen van de afgelopen 90 dagen',
      'Toont de volledige berekening: tussenstappen, cashflow over 15 jaar en alle aannames',
      'Zegt het expliciet wanneer een thuisbatterij zich niet terugverdient',
    ],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    author: { '@type': 'Person', name: SITE.eigenaar.naam },
    isAccessibleForFree: true,
  };
}

export interface Kruimel {
  naam: string;
  url: string;
}

/** BreadcrumbList: Home → Kennisbank → cluster → pagina */
export function breadcrumbSchema(kruimels: Kruimel[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: kruimels.map((k, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: k.naam,
      item: new URL(k.url, SITE.url).toString(),
    })),
  };
}

/**
 * Dataset: /stroomprijzen-vandaag publiceert werkelijke marktdata. Dit schema
 * maakt die databron machineleesbaar voor zoekmachines én AI-systemen.
 */
export function datasetSchema(opts: {
  url: string;
  temporalCoverage: string;
  dateModified: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Nederlandse day-ahead stroomprijzen per uur',
    description:
      'Uurlijkse day-ahead elektriciteitsprijzen voor Nederland, inclusief btw en exclusief energiebelasting, met afgeleide statistieken: gemiddelde dagprijs over 30 dagen, gemiddelde piek-dalspread over 90 dagen en het aantal uren met een negatieve prijs.',
    url: opts.url,
    inLanguage: SITE.taal,
    license: 'https://thuisbatterijrekenaar.nl/algemene-voorwaarden/',
    isAccessibleForFree: true,
    temporalCoverage: opts.temporalCoverage,
    dateModified: opts.dateModified,
    creator: { '@type': 'Person', name: SITE.eigenaar.naam, url: SITE.url },
    publisher: { '@type': 'Person', name: SITE.eigenaar.naam },
    measurementTechnique: 'Day-ahead marktprijzen, opgehaald via de publieke EnergyZero-API',
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Uurprijs', unitText: 'EUR/kWh' },
      { '@type': 'PropertyValue', name: 'Gemiddelde dagprijs (30 dagen)', unitText: 'EUR/kWh' },
      { '@type': 'PropertyValue', name: 'Piek-dalspread (90 dagen)', unitText: 'EUR/kWh' },
      { '@type': 'PropertyValue', name: 'Uren met negatieve prijs (30 dagen)', unitText: 'uur' },
    ],
  };
}
