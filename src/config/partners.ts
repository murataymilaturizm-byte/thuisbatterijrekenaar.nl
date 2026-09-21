/**
 * Affiliatepartners — enige bron.
 *
 * Een nieuwe samenwerking is één regel hier; pagina's veranderen niet mee.
 * Zet `actief: false` als een samenwerking eindigt: alle affiliatecomponenten
 * verdwijnen dan vanzelf uit de site.
 *
 * GEEN geheimen: dit zijn openbare tracking-URL's, geen sleutels.
 */

export interface Partner {
  id: string;
  naam: string;
  /** Waar de partner bij past; bepaalt op welke plekken hij getoond mag worden. */
  categorie: 'dynamisch-contract';
  /** Affiliatenetwerk dat de samenwerking en de vergoeding afhandelt. */
  netwerk: string;
  /** Deeplink zonder ws (Sub ID) en dl (landingspagina). */
  basisUrl: string;
  actief: boolean;
  /** True als wij ook data van deze partij gebruiken — dat moeten wij melden. */
  ookDatabron?: boolean;
}

/**
 * Verplichte linkattributen voor betaalde links. Google eist `sponsored`;
 * `noopener` hoort bij target="_blank". Staat hier zodat geen enkele
 * plaatsing hem kan vergeten.
 */
export const AFFILIATE_REL = 'sponsored nofollow noopener';

export const PARTNERS: Partner[] = [
  {
    id: 'energyzero',
    naam: 'EnergyZero',
    categorie: 'dynamisch-contract',
    netwerk: 'Daisycon',
    basisUrl: 'https://d.energyzero.nl/c/?si=20943&li=1892250&wi=429763',
    actief: true,
    // De uurprijzen op /stroomprijzen-vandaag/ komen van EnergyZero.
    ookDatabron: true,
  },
];

/** Actieve partners, eventueel gefilterd op categorie. */
export const actievePartners = (categorie?: Partner['categorie']): Partner[] =>
  PARTNERS.filter((p) => p.actief && (categorie === undefined || p.categorie === categorie));

/** De eerste actieve partner in een categorie, of null. */
export const actievePartner = (categorie: Partner['categorie']): Partner | null =>
  actievePartners(categorie)[0] ?? null;

/** Is er überhaupt een lopende samenwerking? Stuurt de tekst over onze inkomsten. */
export const heeftActieveSamenwerking = (): boolean => actievePartners().length > 0;

/**
 * Trackinglink voor één plaatsing. De subId (Sub ID / ws) vertelt ons later
 * wélke plek een overstap opleverde; dl blijft leeg zodat de standaard
 * landingspagina van de partner wordt gebruikt.
 */
export function partnerLink(id: string, subId: string): string | null {
  const partner = PARTNERS.find((p) => p.id === id && p.actief);
  if (!partner) return null;
  return `${partner.basisUrl}&ws=${encodeURIComponent(subId)}&dl=`;
}
