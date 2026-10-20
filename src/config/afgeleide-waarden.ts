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
  DEGRADATIE_PER_JAAR,
  DOD_BRUIKBAAR,
  LEVENSDUUR_JAAR,
  LEVERINGSTARIEF_KWH,
  TERUGLEVERVERGOEDING_AANDEEL,
} from './constants';

/**
 * De capaciteitsfactor zoals berekenCashflow() hem toepast: de factor geldt
 * vanaf het begin van jaar N, dus de exponent is N − 1 en jaar één rekent met
 * de volle capaciteit. Afgerond op hele procenten, want de pagina schrijft
 * hele getallen.
 *
 * Dit is precies de val waar het concept van 19 oktober in liep: het noemde
 * 90, 80 en 70 procent — de LINEAIRE reeks (15 × 2 procent eraf), terwijl de
 * motor samengesteld rekent. Alleen het derde getal viel op; de eerste twee
 * leken te kloppen. Daarom staan ze nu alle drie hier.
 */
const capaciteitsfactorPct = (jaar: number): number =>
  Math.round(Math.pow(1 - DEGRADATIE_PER_JAAR, jaar - 1) * 100);

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
  // De degradatiereeks. Staat nu nog op het concept; bij publicatie wordt de
  // underscore eruit gehaald en valt deze test om tot de bestandsnaam hier is
  // bijgewerkt. Dat is de bedoeling: luid op het moment dat het misgaat.
  {
    tekst: '92 procent',
    paginas: ['_concept-thuisbatterij-levensduur-en-degradatie.mdx'],
    afleiding: '(1 − DEGRADATIE_PER_JAAR)^4 × 100, afgerond — capaciteitsfactor van jaar 5',
    herbereken: () => capaciteitsfactorPct(5),
  },
  {
    tekst: '83 procent',
    paginas: ['_concept-thuisbatterij-levensduur-en-degradatie.mdx'],
    afleiding: '(1 − DEGRADATIE_PER_JAAR)^9 × 100, afgerond — capaciteitsfactor van jaar 10',
    herbereken: () => capaciteitsfactorPct(10),
  },
  {
    tekst: '75 procent',
    paginas: ['_concept-thuisbatterij-levensduur-en-degradatie.mdx'],
    afleiding: '(1 − DEGRADATIE_PER_JAAR)^14 × 100, afgerond — capaciteitsfactor van jaar 15',
    herbereken: () => capaciteitsfactorPct(15),
  },
  {
    // Bewust het FOUTE getal: de pagina laat zien waar je uitkomt als je het
    // verlies lineair uitrekent. Ook dat volgt uit de constante, dus het moet
    // meeveranderen — anders klopt het tegenvoorbeeld niet meer.
    tekst: '70 procent',
    paginas: ['_concept-thuisbatterij-levensduur-en-degradatie.mdx'],
    afleiding:
      '(1 − LEVENSDUUR_JAAR × DEGRADATIE_PER_JAAR) × 100 — de lineaire uitkomst, als tegenvoorbeeld',
    herbereken: () => Math.round((1 - LEVENSDUUR_JAAR * DEGRADATIE_PER_JAAR) * 100),
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
