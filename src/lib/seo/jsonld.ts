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
    inLanguage: SITE.taal,
    description: SITE.beschrijving,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    author: { '@type': 'Person', name: SITE.eigenaar.naam },
  };
}
