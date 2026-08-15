import { describe, expect, it } from 'vitest';
import {
  AANDEEL_VERBRUIK_BUITEN_ZONUREN,
  AANSLUITVERMOGEN_KW,
  BATTERIJ_PRIJS_PER_KWH,
  BATTERIJ_VASTE_KOSTEN,
  BENUTBAARHEID_DYNAMISCH,
  BESCHIKBARE_CAPACITEITEN,
  DOD_BRUIKBAAR,
  LAADVENSTER_UREN,
  LEVENSDUUR_JAAR,
  LEVERINGSTARIEF_KWH,
  MAX_CYCLI_PER_DAG_ARBITRAGE,
  ROUND_TRIP_RENDEMENT,
  SEIZOENSBENUTTING,
  TERUGLEVERKOSTEN_JAAR,
  TERUGLEVERVERGOEDING_AANDEEL,
  VERBRUIK_BASIS_HUISHOUDEN,
  VERBRUIK_PER_PERSOON,
} from '../../config/constants';
import {
  bereken,
  berekenArbitrage,
  berekenCashflow,
  berekenDagelijksBenut,
  berekenExtraZelfverbruik,
} from './engine';
import type { ZelfverbruikContext } from './engine';
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
  laatstBijgewerkt: '2026-08-15',
};

describe('bereken — normaal scenario (vast contract)', () => {
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

  it('geeft bij een vast contract eerlijk aan dat geen grootte rendabel is', () => {
    expect(r.jaarlijkseBesparing).toBeGreaterThan(0);
    expect(r.aanbevolenCapaciteitKwh).toBeNull();
    expect(r.geenRendabeleCapaciteit).toBe(true);
    expect(r.terugverdientijdJaren).toBeNull();
    expect(r.roiPercentage).toBeLessThan(0);
  });

  it('gebruikt als referentie de minst ongunstige grootte uit de reeks', () => {
    expect(BESCHIKBARE_CAPACITEITEN).toContain(r.referentieCapaciteitKwh);
    expect(r.batterijKosten).toBe(
      r.referentieCapaciteitKwh * BATTERIJ_PRIJS_PER_KWH + BATTERIJ_VASTE_KOSTEN,
    );
    const beste = [...r.capaciteitVergelijking].sort(
      (a, b) => b.roiPercentage - a.roiPercentage,
    )[0]!;
    expect(r.referentieCapaciteitKwh).toBe(beste.capaciteitKwh);
  });
});

describe('bereken — nul teruglevering (geen productie)', () => {
  const r = bereken({ ...basisInput, wattpiek: 0 });

  it('deelt nergens door nul en geeft null terugverdientijd', () => {
    expect(r.jaarProductieKwh).toBe(0);
    expect(r.terugleveringKwh).toBe(0);
    expect(r.jaarlijkseBesparing).toBe(0);
    expect(r.terugverdientijdJaren).toBeNull();
    expect(r.geenRendabeleCapaciteit).toBe(true);
    expect(Number.isFinite(r.verliesNa2027)).toBe(true);
  });

  it('verlies bestaat alleen uit vaste terugleverkosten', () => {
    expect(r.verliesNa2027).toBe(TERUGLEVERKOSTEN_JAAR);
  });
});

describe('bereken — grenzen', () => {
  it('begrenst ratioZonder met bonussen en houdt ratioMet fysiek (≤ 1)', () => {
    const r = bereken({
      ...basisInput,
      overdagThuis: 'ja',
      heeftEV: true,
      heeftWarmtepomp: true,
    });
    // zonder cap: 0.30 + 0.07 + 0.05 + 0.05 = 0.47
    expect(r.ratioZonderBatterij).toBeCloseTo(0.47, 5);
    expect(r.ratioMetBatterij).toBeGreaterThanOrEqual(r.ratioZonderBatterij);
    expect(r.ratioMetBatterij).toBeLessThanOrEqual(1);
  });

  it('laat het totale zelfverbruik nooit boven het jaarverbruik uitkomen', () => {
    const r = bereken({ ...basisInput, jaarVerbruikKwh: 800, wattpiek: 12000 });
    expect(r.zelfverbruikKwh).toBeLessThanOrEqual(800);
    expect(r.zelfverbruikMetBatterijKwh).toBeLessThanOrEqual(800);
  });

  it('schat jaarverbruik uit huishoudengrootte als kWh onbekend is', () => {
    const r = bereken({ ...basisInput, jaarVerbruikKwh: null, huishoudenGrootte: 4 });
    expect(r.jaarVerbruikKwh).toBe(VERBRUIK_BASIS_HUISHOUDEN + 4 * VERBRUIK_PER_PERSOON);
  });
});

describe('round-trip rendement', () => {
  it('verlaagt de besparing uit zelfverbruik met het round-trip verlies', () => {
    const r = bereken(basisInput);
    const marge = LEVERINGSTARIEF_KWH * (1 - TERUGLEVERVERGOEDING_AANDEEL);
    const zonderVerlies = r.extraZelfverbruikKwh * marge;
    expect(r.besparingZelfverbruik).toBeCloseTo(zonderVerlies * ROUND_TRIP_RENDEMENT, 5);
    expect(r.besparingZelfverbruik).toBeLessThan(zonderVerlies);
  });
});

describe('cashflow en terugverdientijd', () => {
  // Puur-arbitragescenario (geen panelen): batterij volledig vrij voor
  // handel op uurprijzen — met deze testspread rendabel.
  const arbitrageInput: CalcInput = {
    ...basisInput,
    wattpiek: 0,
    huidigContract: 'dynamisch',
  };
  const r = bereken(arbitrageInput, testMarktData);

  it('cashflow heeft precies LEVENSDUUR_JAAR elementen met monotoon stijgende cumulatief', () => {
    expect(r.jaarlijkseBesparing).toBeGreaterThan(0);
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

  it('berekent arbitrage volgens de begrensde formule (dagelijks volume × 365 × spread × rendement × benutbaarheid)', () => {
    const cap = r.aanbevolenCapaciteitKwh!;
    const bruikbaar = cap * DOD_BRUIKBAAR;
    const dagelijksVolume = Math.min(
      bruikbaar * MAX_CYCLI_PER_DAG_ARBITRAGE,
      AANSLUITVERMOGEN_KW * LAADVENSTER_UREN,
      bruikbaar, // geen zelfverbruik in dit scenario
    );
    const verwacht =
      dagelijksVolume *
      365 *
      testMarktData.piekDalSpreadEurPerKwh *
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

describe('capaciteitsmodel (Paket 3.0)', () => {
  const context: ZelfverbruikContext = {
    jaarVerbruikKwh: 3500,
    terugleveringKwh: 2648.8,
    zelfverbruikZonderKwh: 1135.2,
  };

  it('1. extra zelfverbruik stijgt met capaciteit, maar steeds langzamer (concaaf)', () => {
    const waarden = BESCHIKBARE_CAPACITEITEN.map((cap) =>
      berekenExtraZelfverbruik(cap, context),
    );
    const stappen: number[] = [];
    for (let i = 1; i < waarden.length; i++) {
      const stap = waarden[i]! - waarden[i - 1]!;
      expect(stap).toBeGreaterThanOrEqual(0); // monotoon niet-dalend
      stappen.push(stap);
    }
    for (let i = 1; i < stappen.length; i++) {
      expect(stappen[i]!).toBeLessThanOrEqual(stappen[i - 1]! + 1e-9); // concaaf
    }
  });

  it('2. avond/nachtverbruik begrenst het extra zelfverbruik', () => {
    // Laag verbruik, hoge productie: de ontlaadgrens moet bepalend zijn
    const laagVerbruik: ZelfverbruikContext = {
      jaarVerbruikKwh: 2000,
      terugleveringKwh: 8000,
      zelfverbruikZonderKwh: 500,
    };
    const plafond =
      ((2000 * AANDEEL_VERBRUIK_BUITEN_ZONUREN) / 365) * 365 * SEIZOENSBENUTTING;
    for (const cap of BESCHIKBARE_CAPACITEITEN) {
      expect(berekenExtraZelfverbruik(cap, laagVerbruik)).toBeLessThanOrEqual(
        plafond + 1e-9,
      );
    }
  });

  it('3. het optimum is niet automatisch de grootste batterij', () => {
    // Puur-arbitragescenario: rendabel, maar het optimum ligt niet bij 15 kWh
    const r = bereken(
      { ...basisInput, wattpiek: 0, huidigContract: 'dynamisch' },
      testMarktData,
    );
    expect(r.aanbevolenCapaciteitKwh).not.toBeNull();
    expect(r.aanbevolenCapaciteitKwh!).toBeLessThan(
      BESCHIKBARE_CAPACITEITEN[BESCHIKBARE_CAPACITEITEN.length - 1]!,
    );
  });

  it('4. het nieuwe model adviseert nooit groter dan de oude heuristiek (12,5 kWh)', () => {
    // Zelfde huishouden als het oude voorbeeldscenario, dynamisch contract.
    // Sinds de arbitragebegrenzing (3.1) kan de uitkomst ook "niet rendabel" zijn.
    const r = bereken({ ...basisInput, huidigContract: 'dynamisch' }, testMarktData);
    expect(
      r.aanbevolenCapaciteitKwh === null || r.aanbevolenCapaciteitKwh < 12.5,
    ).toBe(true);
  });

  it('5. als geen enkele grootte rendabel is: null + geenRendabeleCapaciteit', () => {
    const r = bereken(basisInput); // vast contract, klein systeem
    expect(r.aanbevolenCapaciteitKwh).toBeNull();
    expect(r.geenRendabeleCapaciteit).toBe(true);
    for (const optie of r.capaciteitVergelijking) {
      expect(optie.terugverdientijdJaren).toBeNull();
    }
  });

  it('6. capaciteitVergelijking beslaat exact de beschikbare reeks', () => {
    const r = bereken(basisInput);
    expect(r.capaciteitVergelijking).toHaveLength(BESCHIKBARE_CAPACITEITEN.length);
    expect(r.capaciteitVergelijking.map((o) => o.capaciteitKwh)).toEqual([
      ...BESCHIKBARE_CAPACITEITEN,
    ]);
  });
});

describe('arbitragebegrenzing (Paket 3.1)', () => {
  const md: MarktData = testMarktData;

  it('1. arbitrage groeit niet onbegrensd lineair met capaciteit (verzadiging)', () => {
    // Puur-arbitrageregime (geen zelfverbruik): tot het vermogensplafond
    // stijgt de winst hooguit lineair, daarna niet meer.
    const caps = [5, 7.5, 10, 12.5, 15, 20, 30];
    const waarden = caps.map((c) => berekenArbitrage(c, md, 0));
    const stappen: number[] = [];
    for (let i = 1; i < waarden.length; i++) {
      const stapPerKwh = (waarden[i]! - waarden[i - 1]!) / (caps[i]! - caps[i - 1]!);
      expect(stapPerKwh).toBeGreaterThanOrEqual(0);
      stappen.push(stapPerKwh);
    }
    for (let i = 1; i < stappen.length; i++) {
      expect(stappen[i]!).toBeLessThanOrEqual(stappen[i - 1]! + 1e-9); // concaaf
    }
    // Boven het vermogensplafond levert extra capaciteit niets meer op
    expect(berekenArbitrage(30, md, 0)).toBeCloseTo(berekenArbitrage(20, md, 0), 5);
  });

  it('2. hoog zelfverbruik verlaagt de arbitrage (capaciteit wordt gedeeld)', () => {
    for (const cap of BESCHIKBARE_CAPACITEITEN) {
      const zonderZelfverbruik = berekenArbitrage(cap, md, 0);
      const metZelfverbruik = berekenArbitrage(cap, md, 5);
      expect(metZelfverbruik).toBeLessThan(zonderZelfverbruik);
    }
  });

  it('3. zelfverbruik + arbitrage overschrijdt samen nooit de cyclusgrens', () => {
    const context: ZelfverbruikContext = {
      jaarVerbruikKwh: 3500,
      terugleveringKwh: 2648.8,
      zelfverbruikZonderKwh: 1135.2,
    };
    const arbFactor =
      365 * md.piekDalSpreadEurPerKwh * ROUND_TRIP_RENDEMENT * BENUTBAARHEID_DYNAMISCH;
    for (const cap of BESCHIKBARE_CAPACITEITEN) {
      const benut = berekenDagelijksBenut(cap, context);
      const dagelijksArbitrage = berekenArbitrage(cap, md, benut) / arbFactor;
      expect(benut + dagelijksArbitrage).toBeLessThanOrEqual(
        cap * DOD_BRUIKBAAR * MAX_CYCLI_PER_DAG_ARBITRAGE + 1e-9,
      );
    }
  });

  it('4. scenario b adviseert na de begrenzing niet groter dan voorheen (7,5 kWh)', () => {
    const b: CalcInput = {
      postcode: '1234 AB',
      huishoudenGrootte: null,
      jaarVerbruikKwh: 5000,
      wattpiek: 6000,
      huidigContract: 'dynamisch',
      overdagThuis: 'ja',
      heeftEV: true,
      heeftWarmtepomp: false,
    };
    const r = bereken(b, md);
    expect(
      r.aanbevolenCapaciteitKwh === null || r.aanbevolenCapaciteitKwh <= 7.5,
    ).toBe(true);
  });
});
