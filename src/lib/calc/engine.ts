/**
 * Rekenmodule thuisbatterij — pure functies, geen React/Astro-imports.
 * Alle numerieke aannames komen uit src/config/constants.ts.
 *
 * Capaciteitsmodel (Paket 3.0): de extra zelfverbruikwinst van een batterij
 * is fysiek begrensd — je kunt alleen opslaan wat je overhoudt, alleen
 * vasthouden wat de batterij kan bergen, en alleen ontladen wat je buiten
 * zonuren verbruikt. Elke beschikbare batterijgrootte wordt daarom volledig
 * doorgerekend; aanbevolen wordt de grootte met de kortste terugverdientijd.
 *
 * Invariant: nergens deling door nul. Bij besparing <= 0 is de
 * terugverdientijd null (UI: "niet rendabel binnen levensduur").
 */

import {
  SPECIFIEKE_OPBRENGST,
  ZELFVERBRUIK_BASIS,
  ZELFVERBRUIK_CAP_ZONDER,
  BONUS_OVERDAG_THUIS,
  BONUS_DEELS_THUIS,
  BONUS_EV,
  BONUS_WARMTEPOMP,
  LEVERINGSTARIEF_KWH,
  TERUGLEVERVERGOEDING_AANDEEL,
  TERUGLEVERKOSTEN_JAAR,
  BATTERIJ_PRIJS_PER_KWH,
  BATTERIJ_VASTE_KOSTEN,
  BESCHIKBARE_CAPACITEITEN,
  VERBRUIK_PER_PERSOON,
  VERBRUIK_BASIS_HUISHOUDEN,
  ROUND_TRIP_RENDEMENT,
  DEGRADATIE_PER_JAAR,
  LEVENSDUUR_JAAR,
  ONDERHOUD_PER_JAAR,
  ENERGIEPRIJS_STIJGING,
  BENUTBAARHEID_DYNAMISCH,
  DOD_BRUIKBAAR,
  AANDEEL_VERBRUIK_BUITEN_ZONUREN,
  SEIZOENSBENUTTING,
} from '../../config/constants';
import type {
  CalcInput,
  CalcResult,
  CapaciteitOptie,
  CashflowJaar,
  MarktData,
} from './types';

/** Stap 1: jaarverbruik — opgegeven waarde of schatting via huishoudengrootte */
export function schatJaarVerbruik(
  jaarVerbruikKwh: number | null,
  huishoudenGrootte: number | null,
): number {
  if (jaarVerbruikKwh !== null && jaarVerbruikKwh >= 0) return jaarVerbruikKwh;
  const personen = huishoudenGrootte ?? 1;
  return VERBRUIK_BASIS_HUISHOUDEN + personen * VERBRUIK_PER_PERSOON;
}

/** Zelfverbruikratio zonder batterij, begrensd op de cap */
export function berekenRatioZonder(input: CalcInput): number {
  let ratio = ZELFVERBRUIK_BASIS;
  if (input.overdagThuis === 'ja') ratio += BONUS_OVERDAG_THUIS;
  if (input.overdagThuis === 'deels') ratio += BONUS_DEELS_THUIS;
  if (input.heeftEV) ratio += BONUS_EV;
  if (input.heeftWarmtepomp) ratio += BONUS_WARMTEPOMP;
  return Math.min(ratio, ZELFVERBRUIK_CAP_ZONDER);
}

/** Context voor de capaciteitsafhankelijke zelfverbruikberekening */
export interface ZelfverbruikContext {
  jaarVerbruikKwh: number;
  terugleveringKwh: number;
  /** Direct zelfverbruik zónder batterij — begrenst wat er nog te winnen valt */
  zelfverbruikZonderKwh: number;
}

/**
 * Extra zelfverbruik (kWh/jaar) dat een batterij van deze grootte oplevert.
 * De kleinste van drie fysieke grenzen is bepalend:
 *   1. het dagelijkse overschot (meer valt er niet op te slaan),
 *   2. de bruikbare batterijcapaciteit (meer past er niet in),
 *   3. het verbruik buiten zonuren (meer valt er niet te ontladen).
 * Extra waarborg: het totale zelfverbruik kan nooit boven het jaarverbruik
 * uitkomen. Seizoensbenutting corrigeert voor de winter, waarin er
 * nauwelijks overschot is.
 */
export function berekenExtraZelfverbruik(
  capaciteitKwh: number,
  context: ZelfverbruikContext,
): number {
  const dagelijksOverschot = context.terugleveringKwh / 365;
  const bruikbareCapaciteit = capaciteitKwh * DOD_BRUIKBAAR;
  const dagelijksAvondNachtVerbruik =
    (context.jaarVerbruikKwh * AANDEEL_VERBRUIK_BUITEN_ZONUREN) / 365;
  const dagelijksResterendVerbruik =
    Math.max(0, context.jaarVerbruikKwh - context.zelfverbruikZonderKwh) / 365;

  const dagelijksBenut = Math.min(
    dagelijksOverschot,
    bruikbareCapaciteit,
    dagelijksAvondNachtVerbruik,
    dagelijksResterendVerbruik,
  );

  return dagelijksBenut * 365 * SEIZOENSBENUTTING;
}

/**
 * Cashflowprojectie over de levensduur. Per jaar N (1-gebaseerd):
 *   capaciteitsFactor = (1 - DEGRADATIE_PER_JAAR)^(N-1)
 *   besparing_N = jaarlijkseBesparing * capaciteitsFactor
 *                   * (1 + ENERGIEPRIJS_STIJGING)^(N-1) - ONDERHOUD_PER_JAAR
 *   cumulatief_N = som van besparing t/m jaar N
 */
export function berekenCashflow(jaarlijkseBesparing: number): CashflowJaar[] {
  const cashflow: CashflowJaar[] = [];
  let cumulatief = 0;
  for (let jaar = 1; jaar <= LEVENSDUUR_JAAR; jaar++) {
    const capaciteitsFactor = Math.pow(1 - DEGRADATIE_PER_JAAR, jaar - 1);
    const prijsFactor = Math.pow(1 + ENERGIEPRIJS_STIJGING, jaar - 1);
    const besparing =
      jaarlijkseBesparing * capaciteitsFactor * prijsFactor - ONDERHOUD_PER_JAAR;
    cumulatief += besparing;
    cashflow.push({ jaar, capaciteitsFactor, besparing, cumulatief });
  }
  return cashflow;
}

/**
 * Terugverdientijd op basis van de cashflow: het eerste jaar waarin de
 * cumulatieve besparing de investering overstijgt. Null als dat binnen de
 * levensduur niet gebeurt.
 */
export function berekenTerugverdientijd(
  cashflow: CashflowJaar[],
  batterijKosten: number,
): number | null {
  for (const rij of cashflow) {
    if (rij.cumulatief >= batterijKosten) return rij.jaar;
  }
  return null;
}

/** Arbitragewinst per jaar bij een dynamisch contract, op basis van de werkelijke piek-dalspread */
export function berekenArbitrage(
  capaciteitKwh: number,
  marktData: MarktData,
): number {
  return (
    marktData.piekDalSpreadEurPerKwh *
    capaciteitKwh *
    365 *
    ROUND_TRIP_RENDEMENT *
    BENUTBAARHEID_DYNAMISCH
  );
}

/**
 * Volledige rekenketen. marktData is optioneel: alleen bij een dynamisch
 * contract mét marktdata wordt arbitragewinst meegerekend.
 */
export function bereken(input: CalcInput, marktData?: MarktData): CalcResult {
  // Verbruik, productie en teruglevering — capaciteitsonafhankelijk
  const jaarVerbruikKwh = schatJaarVerbruik(input.jaarVerbruikKwh, input.huishoudenGrootte);
  const jaarProductieKwh = input.wattpiek * SPECIFIEKE_OPBRENGST;
  const ratioZonderBatterij = berekenRatioZonder(input);
  const zelfverbruikKwh = Math.min(jaarProductieKwh * ratioZonderBatterij, jaarVerbruikKwh);
  const terugleveringKwh = Math.max(0, jaarProductieKwh - zelfverbruikKwh);
  const terugleververgoedingPerKwh = LEVERINGSTARIEF_KWH * TERUGLEVERVERGOEDING_AANDEEL;
  const verliesNa2027 =
    terugleveringKwh * (LEVERINGSTARIEF_KWH - terugleververgoedingPerKwh) +
    TERUGLEVERKOSTEN_JAAR;

  const context: ZelfverbruikContext = {
    jaarVerbruikKwh,
    terugleveringKwh,
    zelfverbruikZonderKwh: zelfverbruikKwh,
  };
  const marge = LEVERINGSTARIEF_KWH - terugleververgoedingPerKwh;
  const dynamisch = input.huidigContract === 'dynamisch' && marktData !== undefined;

  // Elke beschikbare batterijgrootte volledig doorrekenen
  const capaciteitVergelijking: CapaciteitOptie[] = BESCHIKBARE_CAPACITEITEN.map(
    (capaciteit) => {
      const extra = berekenExtraZelfverbruik(capaciteit, context);
      const besparingZelf = extra * marge * ROUND_TRIP_RENDEMENT;
      const arbitrage = dynamisch ? berekenArbitrage(capaciteit, marktData!) : 0;
      const besparing = besparingZelf + arbitrage;
      const kosten = capaciteit * BATTERIJ_PRIJS_PER_KWH + BATTERIJ_VASTE_KOSTEN;
      const flow = berekenCashflow(besparing);
      const laatste = flow[flow.length - 1];
      const totaal = laatste ? laatste.cumulatief : 0;
      return {
        capaciteitKwh: capaciteit,
        kosten,
        extraZelfverbruikKwh: extra,
        jaarlijkseBesparing: besparing,
        terugverdientijdJaren:
          besparing > 0 ? berekenTerugverdientijd(flow, kosten) : null,
        roiPercentage: ((totaal - kosten) / kosten) * 100,
      };
    },
  );

  // Keuze: kortste terugverdientijd; bij gelijke stand de kleinste grootte
  // (de lijst is oplopend, dus de eerste met het minimum wint).
  const rendabele = capaciteitVergelijking.filter(
    (o) => o.terugverdientijdJaren !== null,
  );
  let gekozen: CapaciteitOptie;
  let geenRendabeleCapaciteit: boolean;
  if (rendabele.length > 0) {
    geenRendabeleCapaciteit = false;
    gekozen = rendabele.reduce((beste, o) =>
      o.terugverdientijdJaren! < beste.terugverdientijdJaren! ? o : beste,
    );
  } else {
    // Geen enkele grootte rendabel: toon de minst ongunstige (hoogste ROI)
    // als referentie, maar beveel niets aan.
    geenRendabeleCapaciteit = true;
    gekozen = capaciteitVergelijking.reduce((beste, o) =>
      o.roiPercentage > beste.roiPercentage ? o : beste,
    );
  }

  // Afgeleide waarden van de gekozen/referentiegrootte
  const extraZelfverbruikKwh = gekozen.extraZelfverbruikKwh;
  const besparingZelfverbruik = extraZelfverbruikKwh * marge * ROUND_TRIP_RENDEMENT;
  const arbitrageOpbrengst = dynamisch
    ? berekenArbitrage(gekozen.capaciteitKwh, marktData!)
    : 0;
  const jaarlijkseBesparing = gekozen.jaarlijkseBesparing;
  const batterijKosten = gekozen.kosten;
  const cashflow = berekenCashflow(jaarlijkseBesparing);
  const laatsteJaar = cashflow[cashflow.length - 1];
  const totaalBesparing15Jaar = laatsteJaar ? laatsteJaar.cumulatief : 0;
  const roiPercentage = gekozen.roiPercentage;
  const terugverdientijdJaren = gekozen.terugverdientijdJaren;

  const zelfverbruikMetBatterijKwh = zelfverbruikKwh + extraZelfverbruikKwh;
  const ratioMetBatterij =
    jaarProductieKwh > 0 ? zelfverbruikMetBatterijKwh / jaarProductieKwh : 0;

  return {
    jaarVerbruikKwh,
    jaarProductieKwh,
    ratioZonderBatterij,
    zelfverbruikKwh,
    terugleveringKwh,
    terugleververgoedingPerKwh,
    ratioMetBatterij,
    zelfverbruikMetBatterijKwh,
    extraZelfverbruikKwh,
    verliesNa2027,
    besparingZelfverbruik,
    arbitrageOpbrengst,
    jaarlijkseBesparing,
    aanbevolenCapaciteitKwh: geenRendabeleCapaciteit ? null : gekozen.capaciteitKwh,
    referentieCapaciteitKwh: gekozen.capaciteitKwh,
    geenRendabeleCapaciteit,
    capaciteitVergelijking,
    batterijKosten,
    cashflow,
    totaalBesparing15Jaar,
    roiPercentage,
    terugverdientijdJaren,
  };
}
