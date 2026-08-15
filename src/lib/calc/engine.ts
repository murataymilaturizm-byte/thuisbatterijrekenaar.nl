/**
 * Rekenmodule thuisbatterij — pure functies, geen React/Astro-imports.
 * Alle numerieke aannames komen uit src/config/constants.ts.
 *
 * Invariant: nergens deling door nul. Bij besparing <= 0 is
 * terugverdientijdJaren null (UI toont dan "niet rendabel").
 */

import {
  SPECIFIEKE_OPBRENGST,
  ZELFVERBRUIK_BASIS,
  ZELFVERBRUIK_CAP_ZONDER,
  ZELFVERBRUIK_MET_BATTERIJ,
  ZELFVERBRUIK_CAP_MET,
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
  CAPACITEIT_OVERSCHOT_FACTOR,
  VERBRUIK_PER_PERSOON,
  VERBRUIK_BASIS_HUISHOUDEN,
  ROUND_TRIP_RENDEMENT,
  DEGRADATIE_PER_JAAR,
  LEVENSDUUR_JAAR,
  ONDERHOUD_PER_JAAR,
  ENERGIEPRIJS_STIJGING,
  BENUTBAARHEID_DYNAMISCH,
} from '../../config/constants';
import type { CalcInput, CalcResult, CashflowJaar, MarktData } from './types';

/** Stap 1: jaarverbruik — opgegeven waarde of schatting via huishoudengrootte */
export function schatJaarVerbruik(
  jaarVerbruikKwh: number | null,
  huishoudenGrootte: number | null,
): number {
  if (jaarVerbruikKwh !== null && jaarVerbruikKwh >= 0) return jaarVerbruikKwh;
  const personen = huishoudenGrootte ?? 1;
  return VERBRUIK_BASIS_HUISHOUDEN + personen * VERBRUIK_PER_PERSOON;
}

/** Stap 3: zelfverbruikratio zonder batterij, begrensd op de cap */
export function berekenRatioZonder(input: CalcInput): number {
  let ratio = ZELFVERBRUIK_BASIS;
  if (input.overdagThuis === 'ja') ratio += BONUS_OVERDAG_THUIS;
  if (input.overdagThuis === 'deels') ratio += BONUS_DEELS_THUIS;
  if (input.heeftEV) ratio += BONUS_EV;
  if (input.heeftWarmtepomp) ratio += BONUS_WARMTEPOMP;
  return Math.min(ratio, ZELFVERBRUIK_CAP_ZONDER);
}

/** Stap 12: kleinste beschikbare capaciteit >= behoefte, begrensd op min/max van de reeks */
export function kiesCapaciteit(dagelijksOverschotKwh: number): number {
  const caps = BESCHIKBARE_CAPACITEITEN;
  const min = caps[0];
  const max = caps[caps.length - 1]!;
  const behoefte = dagelijksOverschotKwh * CAPACITEIT_OVERSCHOT_FACTOR;
  for (const cap of caps) {
    if (cap >= behoefte) return cap;
  }
  return max ?? min;
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
 * levensduur niet gebeurt ("niet rendabel binnen levensduur").
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
  // 1
  const jaarVerbruikKwh = schatJaarVerbruik(input.jaarVerbruikKwh, input.huishoudenGrootte);
  // 2
  const jaarProductieKwh = input.wattpiek * SPECIFIEKE_OPBRENGST;
  // 3
  const ratioZonderBatterij = berekenRatioZonder(input);
  // 4
  const zelfverbruikKwh = Math.min(jaarProductieKwh * ratioZonderBatterij, jaarVerbruikKwh);
  // 5
  const terugleveringKwh = Math.max(0, jaarProductieKwh - zelfverbruikKwh);
  // 6
  const terugleververgoedingPerKwh = LEVERINGSTARIEF_KWH * TERUGLEVERVERGOEDING_AANDEEL;
  // 7
  const verliesNa2027 =
    terugleveringKwh * (LEVERINGSTARIEF_KWH - terugleververgoedingPerKwh) +
    TERUGLEVERKOSTEN_JAAR;
  // 8
  const ratioMetBatterij = Math.min(
    ratioZonderBatterij + (ZELFVERBRUIK_MET_BATTERIJ - ZELFVERBRUIK_BASIS),
    ZELFVERBRUIK_CAP_MET,
  );
  // 9
  const zelfverbruikMetBatterijKwh = Math.min(
    jaarProductieKwh * ratioMetBatterij,
    jaarVerbruikKwh,
  );
  // 10
  const extraZelfverbruikKwh = zelfverbruikMetBatterijKwh - zelfverbruikKwh;
  // 11 — round-trip verlies: uit de batterij komt minder dan erin ging
  const besparingZelfverbruik =
    extraZelfverbruikKwh *
    (LEVERINGSTARIEF_KWH - terugleververgoedingPerKwh) *
    ROUND_TRIP_RENDEMENT;
  // 12
  const dagelijksOverschotKwh = terugleveringKwh / 365;
  const aanbevolenCapaciteitKwh = kiesCapaciteit(dagelijksOverschotKwh);
  // Arbitrage alleen bij dynamisch contract mét marktdata
  const arbitrageOpbrengst =
    input.huidigContract === 'dynamisch' && marktData
      ? berekenArbitrage(aanbevolenCapaciteitKwh, marktData)
      : 0;
  const jaarlijkseBesparing = besparingZelfverbruik + arbitrageOpbrengst;
  // 13
  const batterijKosten =
    aanbevolenCapaciteitKwh * BATTERIJ_PRIJS_PER_KWH + BATTERIJ_VASTE_KOSTEN;
  // 14 — cashflow over de levensduur; terugverdientijd volgt daaruit.
  // Geen deling door nul: bij besparing <= 0 is de cumulatief nooit positief
  // en is de terugverdientijd null.
  const cashflow = berekenCashflow(jaarlijkseBesparing);
  const laatsteJaar = cashflow[cashflow.length - 1];
  const totaalBesparing15Jaar = laatsteJaar ? laatsteJaar.cumulatief : 0;
  const roiPercentage =
    ((totaalBesparing15Jaar - batterijKosten) / batterijKosten) * 100;
  const terugverdientijdJaren =
    jaarlijkseBesparing > 0
      ? berekenTerugverdientijd(cashflow, batterijKosten)
      : null;

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
    aanbevolenCapaciteitKwh,
    batterijKosten,
    cashflow,
    totaalBesparing15Jaar,
    roiPercentage,
    terugverdientijdJaren,
  };
}
