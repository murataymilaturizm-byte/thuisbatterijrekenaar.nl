/**
 * Site-identiteit: naam, eigenaar, contact.
 * Geen numerieke rekenconstanten hier — die staan in constants.ts.
 */

export const SITE = {
  naam: 'Thuisbatterijrekenaar',
  url: 'https://thuisbatterijrekenaar.nl',
  taal: 'nl-NL',
  beschrijving:
    'Onafhankelijke rekenaar voor thuisbatterijen: bereken uw verlies na het einde van de salderingsregeling en wat een thuisbatterij u oplevert.',
  eigenaar: {
    naam: 'Sıtkı Murat Oğrak',
    rol: 'Onafhankelijk beheerder',
  },
  // PLACEHOLDER: contact-e-mailadres nog niet bevestigd door eigenaar
  contactEmail: 'info@thuisbatterijrekenaar.nl',
  social: {
    // PLACEHOLDER: nog geen socialmediaprofielen
  },
} as const;
