import { describe, expect, it } from 'vitest';
import {
  BATTERIJ_PRIJS_PER_KWH,
  BATTERIJ_VASTE_KOSTEN,
  BENUTBAARHEID_DYNAMISCH,
  LEVENSDUUR_JAAR,
  LEVERINGSTARIEF_KWH,
  ROUND_TRIP_RENDEMENT,
  TERUGLEVERKOSTEN_JAAR,
  TERUGLEVERVERGOEDING_AANDEEL,
  VERBRUIK_BASIS_HUISHOUDEN,
  VERBRUIK_PER_PERSOON,
  ZELFVERBRUIK_CAP_MET,
} from '../../config/constants';
import { bereken, berekenCashflow } from './engine';
import type { CalcInput, MarktData } from './types';

const basisInput: CalcInput = {
  postcode: '1234 AB',
  jaarVerbruikKwh: 3500,
  huishoudenGrootte: null,
  wattpiek: 4300, // 10 panelen × 430 Wp
  huidigContract: 'vast',
  overdagThuis: 'nee',
  heeftEV: false,
  heeftWarmtepomp: false,
};

const testMarktData: MarktData = {
  piekDalSpreadEurPerKwh: 0.3,
  laatstBijgewerkt: '2026-08-14',
};

describe('bereken — normaal scenario', () => {
  const r = bereken(basisInput);

  it('rekent productie en zelfverbruik correct door', () => {
    expect(r.jaarProductieKwh).toBeCloseTo(4300 * 0.88, 5); // 3784
    expect(r.ratioZonderBatterij).toBeCloseTo(0.3, 5);
    expect(r.zelfverbruikKwh).toBeCloseTo(3784 * 0.3, 5); // 1135.2
    expect(r.terugleveringKwh).toBeCloseTo(3784 - 1135.2, 5); // 2648.8
  });

  it('berekent verlies na 2027 met terugleverkosten', () => {
    const vergoeding = LEVERINGSTARIEF_KWH * TERUGLEVERVERGOEDING_AANDEEL;
    const verwacht =
      r.terugleveringKwh * (LEVERINGSTARIEF_KWH - vergoeding) + TERUGLEVERKOSTEN_JAAR;
    expect(r.verliesNa2027).toBeCloseTo(verwacht, 5);
    expect(r.verliesNa2027).toBeGreaterThan(0);
  });

  it('geeft een positieve besparing en een consistente cashflow-terugverdientijd', () => {
    expect(r.jaarlijkseBesparing).toBeGreaterThan(0);
    // Bij dit scenario (kleine besparing t.o.v. investering) is de batterij
    // binnen de levensduur niet rendabel — dat moet eerlijk null zijn.
    expect(r.terugverdientijdJaren).toBeNull();
    expect(r.totaalBesparing15Jaar).toBeLessThan(r.batterijKosten);
    expect(r.roiPercentage).toBeLessThan(0);
  });

  it('kiest een capaciteit uit de beschikbare reeks', () => {
    // dagelijks overschot ≈ 2648.8 / 365 * 1.5 ≈ 10.88 → eerstvolgende: 12.5
    expect(r.aanbevolenCapaciteitKwh).toBe(12.5);
    expect(r.batterijKosten).toBe(12.5 * BATTERIJ_PRIJS_PER_KWH + BATTERIJ_VASTE_KOSTEN);
  });
});

describe('bereken — nul teruglevering (geen productie)', () => {
  const r = bereken({ ...basisInput, wattpiek: 0 });

  it('deelt nergens door nul en geeft null terugverdientijd', () => {
    expect(r.jaarProductieKwh).toBe(0);
    expect(r.terugleveringKwh).toBe(0);
    expect(r.jaarlijkseBesparing).toBe(0);
    expect(r.terugverdientijdJaren).toBeNull();
    expect(Number.isFinite(r.verliesNa2027)).toBe(true);
  });

  it('verlies bestaat alleen uit vaste terugleverkosten', () => {
    expect(r.verliesNa2027).toBe(TERUGLEVERKOSTEN_JAAR);
  });
});

describe('bereken — caps grijpen in', () => {
  it('begrenst ratioMet op ZELFVERBRUIK_CAP_MET bij alle bonussen', () => {
    const r = bereken({
      ...basisInput,
      overdagThuis: 'ja',
      heeftEV: true,
      heeftWarmtepomp: true,
    });
    // zonder cap: 0.47 + 0.35 = 0.82 → moet op 0.80 blijven
    expect(r.ratioZonderBatterij).toBeCloseTo(0.47, 5);
    expect(r.ratioMetBatterij).toBeCloseTo(ZELFVERBRUIK_CAP_MET, 5);
  });

  it('begrenst zelfverbruik op het jaarverbruik bij zeer hoog vermogen', () => {
    const r = bereken({ ...basisInput, jaarVerbruikKwh: 800, wattpiek: 12000 });
    expect(r.zelfverbruikMetBatterijKwh).toBe(800);
    expect(r.zelfverbruikKwh).toBeLessThanOrEqual(800);
  });

  it('schat jaarverbruik uit huishoudengrootte als kWh onbekend is', () => {
    const r = bereken({ ...basisInput, jaarVerbruikKwh: null, huishoudenGrootte: 4 });
    expect(r.jaarVerbruikKwh).toBe(VERBRUIK_BASIS_HUISHOUDEN + 4 * VERBRUIK_PER_PERSOON);
  });
});

describe('round-trip rendement (nieuw)', () => {
  it('verlaagt de besparing uit zelfverbruik met het round-trip verlies', () => {
    const r = bereken(basisInput);
    const margin = LEVERINGSTARIEF_KWH * (1 - TERUGLEVERVERGOEDING_AANDEEL);
    const zonderVerlies = r.extraZelfverbruikKwh * margin;
    expect(r.besparingZelfverbruik).toBeCloseTo(zonderVerlies * ROUND_TRIP_RENDEMENT, 5);
    expect(r.besparingZelfverbruik).toBeLessThan(zonderVerlies);
  });
});

describe('cashflow en terugverdientijd (nieuw)', () => {
  const dynamischInput: CalcInput = { ...basisInput, huidigContract: 'dynamisch' };
  const r = bereken(dynamischInput, testMarktData);

  it('cashflow heeft precies LEVENSDUUR_JAAR elementen met monotoon stijgende cumulatief', () => {
    expect(r.cashflow).toHaveLength(LEVENSDUUR_JAAR);
    for (let i = 1; i < r.cashflow.length; i++) {
      expect(r.cashflow[i]!.cumulatief).toBeGreaterThan(r.cashflow[i - 1]!.cumulatief);
    }
    expect(r.totaalBesparing15Jaar).toBeCloseTo(
      r.cashflow[r.cashflow.length - 1]!.cumulatief,
      5,
    );
  });

  it('degradatie maakt de terugverdientijd langer dan de oude simpele deling', () => {
    const oudeTerugverdientijd = r.batterijKosten / r.jaarlijkseBesparing;
    expect(r.terugverdientijdJaren).not.toBeNull();
    expect(r.terugverdientijdJaren!).toBeGreaterThan(oudeTerugverdientijd);
  });

  it('scenario dat niet binnen de levensduur terugverdient geeft null', () => {
    // Basisscenario (vast contract): besparing > 0 maar te klein voor de investering
    const traag = bereken(basisInput);
    expect(traag.jaarlijkseBesparing).toBeGreaterThan(0);
    expect(traag.terugverdientijdJaren).toBeNull();
  });

  it('berekent arbitrage volgens spread × capaciteit × 365 × rendement × benutbaarheid', () => {
    const verwacht =
      testMarktData.piekDalSpreadEurPerKwh *
      r.aanbevolenCapaciteitKwh *
      365 *
      ROUND_TRIP_RENDEMENT *
      BENUTBAARHEID_DYNAMISCH;
    expect(r.arbitrageOpbrengst).toBeCloseTo(verwacht, 5);
    expect(r.jaarlijkseBesparing).toBeCloseTo(
      r.besparingZelfverbruik + r.arbitrageOpbrengst,
      5,
    );
  });

  it('rekent géén arbitrage bij vast contract, ook mét marktdata', () => {
    const vast = bereken(basisInput, testMarktData);
    expect(vast.arbitrageOpbrengst).toBe(0);
  });

  it('berekenCashflow past degradatie per jaar toe', () => {
    const flow = berekenCashflow(1000);
    expect(flow[0]!.besparing).toBeCloseTo(1000, 5);
    expect(flow[1]!.besparing).toBeCloseTo(1000 * 0.98, 5);
    expect(flow[14]!.besparing).toBeCloseTo(1000 * Math.pow(0.98, 14), 5);
  });
});
