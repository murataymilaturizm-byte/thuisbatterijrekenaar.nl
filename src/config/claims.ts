/**
 * Wat wij over onszelf beweren — op één plek.
 *
 * Aanleiding: sinds de EnergyZero-samenwerking is negen keer een verouderde
 * onafhankelijkheidsclaim blijven staan. Elke keer breidden wij het zoekpatroon
 * uit, en elke keer ontsnapte een nieuwe formulering ("niet verbonden aan",
 * "aan geen enkele leverancier verbonden", "wij zijn onafhankelijk"). Patronen
 * jagen werkt niet.
 *
 * Daarom het omgekeerde: elke zin waarin wij iets beweren over onze
 * onafhankelijkheid, wat wij verkopen, hoe wij geld verdienen of met wie wij
 * samenwerken, moet hieronder goedgekeurd staan. Schrijft iemand een nieuwe
 * formulering, dan valt claims.test.ts om tot die zin hier bewust is
 * toegevoegd. Niet het patroon bewaakt ons, maar de lijst.
 */

/**
 * Het bijvoeglijk naamwoord dat wij gebruiken in plaats van kaal
 * "onafhankelijk" waar het over de berekening gaat. Preciezer én waar: de
 * uitkomst hangt niet af van welke leverancier dan ook.
 */
export const ONAFHANKELIJK_BIJVOEGLIJK = 'leverancieronafhankelijk';

/** De volledige claim, voor plekken waar wij het onderwerp echt behandelen. */
export const VERDIENMODEL_ZIN =
  'Onze rekenmethode is leverancieronafhankelijk; onze inkomsten komen uit ' +
  'affiliatelinks via het netwerk Daisycon. Hoe wij geld verdienen, staat op ' +
  'de pagina over ons.';

export interface GoedgekeurdeClaim {
  /** Herkenbaar fragment van de zin, genormaliseerd vergeleken. */
  fragment: string;
  /** Waarom deze formulering klopt — en dus mag blijven staan. */
  waarom: string;
}

/**
 * Normaliseren: kleine letters, leestekens en opmaak weg, één spatie. Zo
 * struikelt de controle niet over een afbreking of een markdown-link.
 */
export function normaliseerClaim(zin: string): string {
  return zin
    .toLowerCase()
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>|]/g, ' ')
    // Turkse letters horen erbij: de naam van de beheerder staat in meerdere
    // claims, en zonder ı/ğ/ş werd "Sıtkı Murat Oğrak" tot "s tk murat o rak"
    // vermalen — waardoor het goedgekeurde fragment nooit matchte.
    .replace(/[^a-z0-9äëïöüáéíóúàèìòùçıİğş\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const GOEDGEKEURDE_CLAIMS: GoedgekeurdeClaim[] = [
  // ── Onafhankelijk beheer: waar, en los van de samenwerking ───────────────
  {
    fragment: 'wordt onafhankelijk beheerd door',
    waarom: 'Gaat over eigendom en redactie: de site is van geen leverancier. Dat verandert niet door een affiliatelink.',
  },
  {
    fragment: 'onafhankelijk beheerd door',
    waarom:
      'Gaat over het beheer van de site, niet over commerciële banden: geen enkele leverancier heeft zeggenschap over wat hier staat.',
  },
  {
    fragment: 'onafhankelijk beheerd door sıtkı murat oğrak',
    waarom: 'Zelfde claim met naam, in het Person-schema en in llms.txt.',
  },
  {
    fragment: 'onafhankelijk beheerder',
    waarom: 'De rol van de eigenaar in site.ts en het Person-schema; zelfde beheerclaim.',
  },
  // ── Wat wij niet verkopen: onveranderd waar ──────────────────────────────
  {
    fragment: 'wij verkopen zelf geen thuisbatterijen',
    waarom: 'Wij verkopen geen hardware; de samenwerking gaat over energiecontracten.',
  },
  {
    fragment: 'wij verkopen geen thuisbatterijen',
    waarom: 'Zelfde claim in de algemene voorwaarden.',
  },
  {
    fragment: 'wij verkopen geen batterijen',
    waarom: 'Zelfde claim, kortere vorm.',
  },
  {
    fragment: 'wij verkopen zelf geen batterijen',
    waarom: 'Offerteformulier en generatorprompt; gevolgd door de leverancieronafhankelijke rekenmethode.',
  },
  {
    fragment: 'wij verkopen zelf niets',
    waarom: 'Zelfde claim, gevolgd door de leverancieronafhankelijke rekenmethode.',
  },
  {
    fragment: 'wij verkopen geen thuisbatterijen zonnepanelen of installaties',
    waarom: 'llms.txt, zelfde claim.',
  },
  {
    fragment: 'wij verkopen uw gegevens niet',
    waarom: 'Privacyclaim, raakt het verdienmodel niet.',
  },
  // ── De rekenmethode: preciezer dan kaal "onafhankelijk" ──────────────────
  {
    fragment: 'leverancieronafhankelijk',
    waarom: 'De canonieke formulering: de uitkomst hangt van geen enkele leverancier af.',
  },
  {
    fragment: 'onafhankelijke rekenaar',
    waarom:
      'Gaat over de rekenaar, niet over onze commerciële banden, en op elke pagina staat in de voettekst hoe wij geld verdienen.',
  },
  {
    fragment: 'rekent onafhankelijk voor',
    waarom: 'Zelfde claim over de berekening.',
  },
  {
    fragment: 'onafhankelijk met alle aannames open op tafel',
    waarom: 'Zelfde claim over de berekening, met verwijzing naar de uitgangspunten.',
  },
  {
    fragment: 'bereken het gratis en onafhankelijk',
    waarom: 'Call to action over de berekening.',
  },
  {
    fragment: 'onafhankelijke nederlandse rekenaar voor thuisbatterijen',
    waarom: 'llms.txt-samenvatting; het verdienmodel staat in hetzelfde bestand uitgeschreven.',
  },
  {
    fragment: 'onafhankelijke rekenaar voor thuisbatterijen bereken uw verlies',
    waarom: 'site.ts-beschrijving, zelfde strekking.',
  },
  {
    fragment: 'een onafhankelijke rekenaar voor thuisbatterijen beheerd door',
    waarom: 'Generatorprompt; de volgende zin noemt de samenwerking expliciet.',
  },
  // ── Het verdienmodel zelf ────────────────────────────────────────────────
  {
    fragment: 'affiliatenetwerk daisycon',
    waarom: 'De samenwerking met naam genoemd — de kern van de canonieke claim.',
  },
  {
    fragment: 'hoe wij geld verdienen',
    waarom: 'Verwijzing naar de pagina waar het verdienmodel staat.',
  },
  {
    fragment: 'ontvangen wij daarvoor een vergoeding',
    waarom: 'Expliciete melding van de vergoeding bij de link.',
  },
  {
    fragment: 'wij ontvangen een vergoeding als u via deze link overstapt',
    waarom: 'Melding direct bij de affiliatelink.',
  },
  {
    fragment: 'affiliatesamenwerking',
    waarom: 'Algemene voorwaarden, artikel 2.',
  },
  {
    fragment: 'via een affiliatenetwerk samenwerken',
    waarom: 'Algemene voorwaarden, artikel 3.',
  },
  {
    fragment: 'werken wij samen via affiliatelinks',
    waarom: 'Voettekst en over-ons.',
  },
  {
    fragment: 'elke affiliatelink op deze site wordt ter plekke als betaalde link gemeld',
    waarom: 'Belofte over hoe wij links markeren; wordt door de poorten afgedwongen.',
  },
  {
    fragment: 'wij gebruiken wel affiliatelinks naar één energieleverancier',
    waarom: 'llms.txt, expliciet.',
  },
  {
    fragment: 'een link naar een energieleverancier waarmee wij samenwerken',
    waarom: 'Privacyverklaring, affiliatesectie.',
  },
  {
    fragment: 'waar wij belang bij hebben',
    waarom: 'Kop van de belangenverklaring op de keuzepagina.',
  },
  {
    fragment: 'zodra wij samenwerken met installateurs',
    waarom: 'Gaat over installateurs; daar is nog geen samenwerking.',
  },
  {
    fragment: 'wij werken nog niet samen met installateurs',
    waarom: 'Waar: de offerteservice is niet actief.',
  },
  {
    fragment: 'een samenwerking verandert daar niets aan',
    waarom: 'Precies de grens die wij willen bewaken.',
  },
  {
    fragment: 'geen enkele samenwerking verandert',
    waarom: 'Zelfde grens, andere pagina.',
  },
  {
    fragment: 'die beinvloedt de uitkomst van de rekenaar niet',
    waarom: 'Algemene voorwaarden.',
  },
  {
    fragment: 'samenwerkingen via affiliatelinks hebben geen invloed op de rekenmethode',
    waarom: 'Staat op /uitgangspunten/ en bewaakt precies de grens tussen samenwerking en rekenmethode.',
  },
  {
    fragment: 'komt daar een samenwerking voor dan vermelden wij dat hier',
    waarom: 'Belofte over toekomstige samenwerkingen.',
  },
  {
    fragment: 'die datarelatie bestond al vóór de samenwerking',
    waarom: 'Over EnergyZero als databron; feitelijk en relevant.',
  },
  {
    fragment: 'dat vermelden wij bij elke link',
    waarom: 'Homepage-FAQ: belofte dat elke affiliatelink ter plekke wordt gemeld.',
  },
  {
    fragment: 'wij geven daarbij geen gegevens van u door',
    waarom: 'Privacyclaim bij affiliatelinks.',
  },
  {
    fragment: 'met welke partij wij wél samenwerken staat op deze pagina',
    waarom: 'Over-ons description.',
  },
  {
    fragment: 'hieronder leest u met wie en wat dat betekent',
    waarom: 'Over-ons intro: verwijst door naar het verdienmodel verderop op die pagina.',
  },
  {
    fragment: 'ja beperkt en wij zeggen precies hoe',
    waarom: 'Opening van de verdienmodelsectie.',
  },
  {
    fragment: 'wij vergelijken geen leveranciers',
    waarom: 'Grens die wij onszelf opleggen.',
  },
  {
    fragment: 'aansprakelijkheid affiliatelinks en de offerteservice',
    waarom: 'Beschrijving van de algemene voorwaarden; benoemt de affiliatelinks juist expliciet.',
  },
  {
    fragment: 'wat er gebeurt bij affiliatelinks',
    waarom: 'Beschrijving van de privacyverklaring; verwijst naar de sectie over affiliateklikken.',
  },
  {
    fragment: 'onafhankelijk beheerder van thuisbatterijrekenaar',
    waarom: 'Person-schema; gaat over het beheer, niet over commerciële banden, en noemt de affiliatelinks in dezelfde beschrijving.',
  },
  {
    fragment: 'kunnen wij dan een vergoeding van de deelnemende partijen ontvangen',
    waarom: 'Voorwaardelijk en toekomstig: geldt pas als de offerteservice actief wordt.',
  },
  {
    fragment: 'wij hebben nog geen samenwerking met installateurs',
    waarom: 'Waar zolang de offerteservice niet actief is.',
  },
  {
    fragment: 'is de rekenaar echt onafhankelijk',
    waarom:
      'Een vraag in de FAQ, geen bewering: het antwoord eronder nuanceert hem meteen met het verdienmodel en de samenwerking.',
  },
  // ── "Onafhankelijk" over een derde partij: geen claim over onszelf ───────
  {
    fragment: 'geen onafhankelijk keurmerk',
    waarom: 'Gaat over CE-markering, niet over ons: een zelfverklaring is geen keuring door een derde.',
  },
  {
    fragment: 'door een onafhankelijk testinstituut',
    waarom: 'Gaat over certificering van batterijen door een extern instituut, niet over onze positie.',
  },
  {
    fragment: 'reken het onafhankelijk door',
    waarom: 'Advies aan een VvE om een extern doorrekening te laten maken; zegt niets over onze inkomsten.',
  },
  {
    fragment: 'of er kosten aan verbonden zijn',
    waarom: '"Verbonden" in de betekenis "eraan vastzitten", over meterkosten — geen uitspraak over onze banden.',
  },
];
