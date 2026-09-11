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
  // Google Search Console-verificatie (openbaar, geen geheim)
  googleSiteVerification: 'Vlej5eWe44v-KxJo-YMTD9jaNo7U621ILKwn20F1YLw',
  // Daisycon-verificatie (openbaar, geen geheim); de metanaam is de sleutel
  daisyconVerification: {
    naam: '5e445b1ef1c18c8',
    waarde: '61d17c613cb042d6ec4e995a3227efe7',
  },
  social: {
    // PLACEHOLDER: nog geen socialmediaprofielen
  },
} as const;
