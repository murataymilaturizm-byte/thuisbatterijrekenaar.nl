/**
 * Geverifieerde juridische en fiscale waarden.
 *
 * Bewust GESCHEIDEN van constants.ts: dat bestand bevat rekenaannames die wij
 * zelf kiezen en mogen bijstellen. Hieronder staan getallen die wij niet
 * kiezen — ze komen uit wet- en regelgeving of van de Belastingdienst, en de
 * enige juiste reactie op een wijziging is de bron opnieuw raadplegen.
 *
 * Deze lijst voedt de kwaliteitspoort "alle getallen komen uit constants.ts":
 * een getal dat hier staat is geverifieerd en mag in de tekst; een getal dat
 * noch hier noch in constants.ts staat, is rood — en dat hoort zo.
 *
 * REGEL: niets toevoegen zonder primaire bron. Twijfel = niet opnemen; dan is
 * rood het juiste signaal.
 */

export interface JuridischeWaarde {
  /** Precies zoals het in de lopende tekst verschijnt. */
  tekst: string;
  /** Waar het getal over gaat. */
  wat: string;
  /** Primaire bron. */
  bron: string;
}

export const JURIDISCHE_WAARDEN: JuridischeWaarde[] = [
  {
    tekst: '0,8 kW',
    wat: 'Registratiedrempel voor elektriciteitsopslageenheden (vermogen, niet capaciteit) uit de Netcode Elektriciteit',
    bron: 'https://www.rvo.nl/onderwerpen/netcongestie/registreer-uw-batterijsysteem',
  },
  {
    tekst: '0,8 kWh',
    wat: 'Uitsluitend als correctie: de drempel wordt elders ten onrechte in kWh genoemd. Nooit als eigen bewering gebruiken',
    bron: 'https://www.rvo.nl/onderwerpen/netcongestie/registreer-uw-batterijsysteem',
  },
  {
    tekst: '1 MW',
    wat: 'Bovengrens van type A; daarboven geldt de zwaardere ESMD-procedure',
    bron: 'https://www.rvo.nl/onderwerpen/netcongestie/registreer-uw-batterijsysteem',
  },
  {
    tekst: '3 maanden',
    wat: 'Termijn vóór ingebruikname voor systemen vanaf 1 MW (type B en hoger)',
    bron: 'https://www.rvo.nl/form/stappenplan-registratie-batterij',
  },
  {
    tekst: '21 procent',
    wat: 'Algemeen btw-tarief; het nultarief voor zonnepanelen geldt niet voor thuisbatterijen',
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/thuisbatterij-btw',
  },
  {
    // Zelfde feit, andere notatie: /btw-thuisbatterij/ schrijft het met procentteken.
    tekst: '21%',
    wat: 'Algemeen btw-tarief, geschreven met procentteken',
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/thuisbatterij-btw',
  },
  {
    tekst: '5 jaar',
    wat: 'Herzieningsperiode voor de correctie privégebruik na btw-teruggaaf',
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/thuisbatterij-btw',
  },
  {
    tekst: '5 voorwaarden',
    wat: 'Aantal voorwaarden van de Belastingdienst voor btw-teruggaaf op een thuisbatterij',
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/thuisbatterij-btw',
  },
];

/** Genormaliseerde vormen, voor vergelijking met losse getallen uit een tekst. */
export const JURIDISCHE_TOKENS: ReadonlySet<string> = new Set(
  JURIDISCHE_WAARDEN.map((j) => j.tekst.toLowerCase().replace(/\s+/g, ' ')),
);
