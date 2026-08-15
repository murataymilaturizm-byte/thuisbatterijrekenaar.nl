/**
 * Typen voor de rekenmodule. Puur TypeScript — geen React/Astro.
 */

export type HuidigContract = 'vast' | 'dynamisch' | 'onbekend';
export type OverdagThuis = 'ja' | 'nee' | 'deels';

export interface CalcInput {
  postcode: string;
  /** null → wordt geschat op basis van huishoudenGrootte */
  jaarVerbruikKwh: number | null;
  huishoudenGrootte: number | null;
  wattpiek: number;
  huidigContract: HuidigContract;
  overdagThuis: OverdagThuis;
  heeftEV: boolean;
  heeftWarmtepomp: boolean;
}

/** Marktprijsstatistieken (uit src/data/prices.json), nodig voor het dynamisch-contractscenario */
export interface MarktData {
  /** Gemiddelde dagelijkse piek-dalspread in €/kWh over de afgelopen 90 dagen */
  piekDalSpreadEurPerKwh: number;
  /** ISO-datum van de laatste data-update */
  laatstBijgewerkt: string;
}

/** Doorrekening van één beschikbare batterijgrootte */
export interface CapaciteitOptie {
  capaciteitKwh: number;
  kosten: number;
  extraZelfverbruikKwh: number;
  jaarlijkseBesparing: number;
  /** null = verdient zich niet terug binnen de levensduur */
  terugverdientijdJaren: number | null;
  roiPercentage: number;
}

/** Eén jaar uit de cashflowprojectie */
export interface CashflowJaar {
  jaar: number;
  /** (1 - degradatie)^(jaar-1) */
  capaciteitsFactor: number;
  /** Besparing in dit jaar, na degradatie en onderhoud */
  besparing: number;
  /** Cumulatieve besparing t/m dit jaar */
  cumulatief: number;
}

export interface CalcResult {
  // Tussenwaarden (nodig voor het transparantieblok)
  jaarVerbruikKwh: number;
  jaarProductieKwh: number;
  ratioZonderBatterij: number;
  zelfverbruikKwh: number;
  terugleveringKwh: number;
  terugleververgoedingPerKwh: number;
  ratioMetBatterij: number;
  zelfverbruikMetBatterijKwh: number;
  extraZelfverbruikKwh: number;

  // Eindresultaten
  /** € per jaar dat verloren gaat zodra salderen stopt */
  verliesNa2027: number;
  /** € per jaar besparing via extra zelfverbruik (incl. round-trip verlies) */
  besparingZelfverbruik: number;
  /** € per jaar arbitragewinst bij dynamisch contract (0 bij vast/onbekend of zonder marktdata) */
  arbitrageOpbrengst: number;
  /** € per jaar totale besparing dankzij de thuisbatterij */
  jaarlijkseBesparing: number;
  /**
   * kWh, gekozen uit BESCHIKBARE_CAPACITEITEN: de grootte met de kortste
   * terugverdientijd. null als geen enkele grootte binnen de levensduur
   * terugverdient (zie geenRendabeleCapaciteit).
   */
  aanbevolenCapaciteitKwh: number | null;
  /**
   * Grootte waarop de detailcijfers (kosten, cashflow, besparing) betrekking
   * hebben: gelijk aan de aanbevolen grootte, of — als niets rendabel is —
   * de minst ongunstige grootte (hoogste ROI). Altijd gezet.
   */
  referentieCapaciteitKwh: number;
  /** true als geen enkele batterijgrootte binnen de levensduur terugverdient */
  geenRendabeleCapaciteit: boolean;
  /** Volledige doorrekening per beschikbare batterijgrootte (transparantie) */
  capaciteitVergelijking: CapaciteitOptie[];
  /** € geïnstalleerd — van de aanbevolen (of, indien geen, minst ongunstige) grootte */
  batterijKosten: number;
  /** Cashflowprojectie over LEVENSDUUR_JAAR jaren */
  cashflow: CashflowJaar[];
  /** Cumulatieve besparing over de volledige levensduur */
  totaalBesparing15Jaar: number;
  /** Rendement over de levensduur t.o.v. de investering, in procenten (negatief = verlies) */
  roiPercentage: number;
  /**
   * Eerste jaar waarin de cumulatieve besparing de investering overstijgt;
   * null als dat binnen de levensduur niet gebeurt (UI: "niet rendabel binnen levensduur")
   */
  terugverdientijdJaren: number | null;
}
