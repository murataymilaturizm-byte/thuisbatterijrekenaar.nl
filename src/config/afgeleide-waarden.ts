/**
 * Getallen die in de lopende tekst staan maar uit onze eigen cijfers volgen.
 *
 * Waarom dit bestand bestaat: de rekenmotor is vier keer veranderd en in dit
 * project zijn FAQ-antwoorden drie keer stilzwijgend onwaar geworden. Getallen
 * die een redacteur in een zin heeft uitgerekend, zijn precies dezelfde
 * valkuil — en ze hadden tot nu toe geen enkele bewaking. Dat ze op 8 oktober
 * 2026 nog klopten, was geluk.
 *
 * Elke regel hieronder wordt bij iedere testrun opnieuw berekend uit
 * constants.ts en vergeleken met het getal zoals het op de pagina staat. Wijkt
 * een constante, dan valt de test om en wijst hij de pagina aan.
 */
import {
  BATTERIJ_PRIJS_PER_KWH,
  BATTERIJ_VASTE_KOSTEN,
  DOD_BRUIKBAAR,
  LEVERINGSTARIEF_KWH,
  TERUGLEVERVERGOEDING_AANDEEL,
} from './constants';

export interface AfgeleideWaarde {
  /** Precies zoals het in de tekst verschijnt. */
  tekst: string;
  /** Bestandsnamen waarin dit getal voorkomt. */
  paginas: string[];
  /** Leesbare afleiding, voor wie de test ziet omvallen. */
  afleiding: string;
  /** Dezelfde afleiding, uitvoerbaar. */
  herbereken: () => number;
}

export const AFGELEIDE_WAARDEN: AfgeleideWaarde[] = [
  {
    tekst: '0,14 euro',
    paginas: ['thuisbatterij-bij-vast-contract.mdx'],
    afleiding: 'LEVERINGSTARIEF_KWH × TERUGLEVERVERGOEDING_AANDEEL',
    herbereken: () => LEVERINGSTARIEF_KWH * TERUGLEVERVERGOEDING_AANDEEL,
  },
  {
    tekst: '3.950 euro',
    paginas: ['thuisbatterij-bij-vast-contract.mdx'],
    afleiding: '5 × BATTERIJ_PRIJS_PER_KWH + BATTERIJ_VASTE_KOSTEN',
    herbereken: () => 5 * BATTERIJ_PRIJS_PER_KWH + BATTERIJ_VASTE_KOSTEN,
  },
  {
    tekst: '9 kWh',
    paginas: ['welke-capaciteit-thuisbatterij.mdx'],
    afleiding: '10 kWh nominaal × DOD_BRUIKBAAR',
    herbereken: () => 10 * DOD_BRUIKBAAR,
  },
  {
    tekst: '2.750 euro',
    paginas: ['welke-capaciteit-thuisbatterij.mdx'],
    afleiding: '5 kWh extra × BATTERIJ_PRIJS_PER_KWH',
    herbereken: () => 5 * BATTERIJ_PRIJS_PER_KWH,
  },
];

/**
 * Getallen die wél in de tekst staan maar niets met onze rekenmotor te maken
 * hebben. Ze volgen uit niets en moeten dus ook nooit "opnieuw kloppen" —
 * ze hebben een bron, geen formule.
 */
export interface TekstueleWaarde {
  tekst: string;
  paginas: string[];
  wat: string;
  bron: string;
}

export const TEKSTUELE_WAARDEN: TekstueleWaarde[] = [
  {
    tekst: '45%',
    paginas: ['btw-thuisbatterij.mdx'],
    wat: 'Aandeel privégebruik in het rekenvoorbeeld van de Belastingdienst bij de correctie privégebruik',
    bron: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/thuisbatterij-btw',
  },
  {
    tekst: '100%',
    paginas: ['thuisbatterij-rendement.mdx'],
    wat: 'Retorisch: "100% wordt het nooit" over het round-trip rendement — geen rekenwaarde',
    bron: 'n.v.t. — stijlfiguur, geen cijfer uit een bron',
  },
];

/** Genormaliseerde vormen voor vergelijking met losse getallen uit een tekst. */
export const AFGELEIDE_TOKENS: ReadonlySet<string> = new Set(
  [...AFGELEIDE_WAARDEN, ...TEKSTUELE_WAARDEN].map((w) =>
    w.tekst.toLowerCase().replace(/\s+/g, ' '),
  ),
);
