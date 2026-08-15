// Externe ankers, geraadpleegd 15 augustus 2026 (10 kWh, dynamisch
// contract, huishouden met zonnepanelen):
//
//   batterijenplan.nl — simulatie over 20 zonprofielen, marktjaar 2025,
//     vergeleken met gerealiseerde vlootdata: gewogen gemiddelde € 750
//     [sterkste anker: gebaseerd op werkelijke data]
//
//   salderingswijzer.nl/calculator : € 360 - 470 per jaar
//   clyma.nl                       : € 350 - 600 uit handel
//     [zwakkere ankers: dit zijn zelf ook modelschattingen,
//      geen metingen]
//
// Ons model komt uit op € 611 — binnen de band, onder het sterkste
// anker. Bij herijking weegt batterijenplan zwaarder.
//
// Ons model hoort binnen deze band te vallen. Valt het erbuiten,
// dan klopt het model niet — pas het model aan, niet deze test.
//
// Deze band hoort periodiek opnieuw gecontroleerd te worden.
// Marktomstandigheden (spread, prijzen, verzadiging onbalansmarkt)
// veranderen; als de ankers verschuiven, verschuift de band mee.
//
// Referentiescenario: 3.500 kWh verbruik, 4.300 Wp, dynamisch contract,
// overdag deels thuis, geen EV, geen warmtepomp, 10 kWh batterij.
// Vaste testwaarden (bewust niet gekoppeld aan de live data):
//   piekDalSpread = 0,23 €/kWh; gemiddeldeDagprijs = 0,14 €/kWh
//   (de gemiddelde dagprijs wordt door de engine niet gebruikt, maar is
//   vastgelegd zodat het anker reproduceerbaar blijft).

import { describe, expect, it } from 'vitest';
import {
  BENUTBAARHEID_DYNAMISCH,
  BESCHIKBARE_CAPACITEITEN,
  DOD_BRUIKBAAR,
  MAX_CYCLI_PER_DAG,
  ROUND_TRIP_RENDEMENT,
} from '../../config/constants';
import { bereken, berekenArbitrage, berekenDagelijksBenut } from './engine';
import type { ZelfverbruikContext } from './engine';
import type { CalcInput, MarktData } from './types';

const kalibratieMarktData: MarktData = {
  piekDalSpreadEurPerKwh: 0.23,
  laatstBijgewerkt: '2026-08-15',
};

const referentieInput: CalcInput = {
  postcode: '1234 AB',
  jaarVerbruikKwh: 3500,
  huishoudenGrootte: null,
  wattpiek: 4300,
  huidigContract: 'dynamisch',
  overdagThuis: 'deels',
  heeftEV: false,
  heeftWarmtepomp: false,
};

describe('kalibratie tegen externe ankers', () => {
  it('referentiescenario (10 kWh, dynamisch): besparing tussen € 350 en € 700 per jaar', () => {
    const r = bereken(referentieInput, kalibratieMarktData);
    const rij10 = r.capaciteitVergelijking.find((o) => o.capaciteitKwh === 10);
    expect(rij10).toBeDefined();
    expect(rij10!.jaarlijkseBesparing).toBeGreaterThanOrEqual(350);
    expect(rij10!.jaarlijkseBesparing).toBeLessThanOrEqual(700);
  });

  it('1. totale dagelijkse throughput blijft binnen bruikbareCapaciteit × MAX_CYCLI_PER_DAG', () => {
    const context: ZelfverbruikContext = {
      jaarVerbruikKwh: 3500,
      terugleveringKwh: 2535.3,
      zelfverbruikZonderKwh: 1248.7,
    };
    const arbFactor =
      365 *
      kalibratieMarktData.piekDalSpreadEurPerKwh *
      ROUND_TRIP_RENDEMENT *
      BENUTBAARHEID_DYNAMISCH;
    for (const cap of BESCHIKBARE_CAPACITEITEN) {
      const benut = berekenDagelijksBenut(cap, context);
      const dagelijksArbitrage =
        berekenArbitrage(cap, kalibratieMarktData, benut) / arbFactor;
      expect(benut + dagelijksArbitrage).toBeLessThanOrEqual(
        cap * DOD_BRUIKBAAR * MAX_CYCLI_PER_DAG + 1e-9,
      );
    }
  });

  it('2. arbitrage stijgt concaaf met capaciteit en verzadigt', () => {
    const caps = [5, 7.5, 10, 12.5, 15, 20, 30];
    const waarden = caps.map((c) => berekenArbitrage(c, kalibratieMarktData, 0));
    const hellingen: number[] = [];
    for (let i = 1; i < waarden.length; i++) {
      const helling = (waarden[i]! - waarden[i - 1]!) / (caps[i]! - caps[i - 1]!);
      expect(helling).toBeGreaterThanOrEqual(0);
      hellingen.push(helling);
    }
    for (let i = 1; i < hellingen.length; i++) {
      expect(hellingen[i]!).toBeLessThanOrEqual(hellingen[i - 1]! + 1e-9);
    }
    // Boven het vermogensplafond levert extra capaciteit niets meer op
    expect(berekenArbitrage(30, kalibratieMarktData, 0)).toBeCloseTo(
      berekenArbitrage(20, kalibratieMarktData, 0),
      5,
    );
  });

  it('3. hoog zelfverbruik verlaagt de arbitrage, maar niet tot nul (budgetmodel)', () => {
    for (const cap of BESCHIKBARE_CAPACITEITEN) {
      const bruikbaar = cap * DOD_BRUIKBAAR;
      // Zelfverbruik dat de batterij dagelijks volledig vult
      const zonder = berekenArbitrage(cap, kalibratieMarktData, 0);
      const met = berekenArbitrage(cap, kalibratieMarktData, bruikbaar);
      expect(met).toBeLessThan(zonder);
      // Dankzij het budget van MAX_CYCLI_PER_DAG (> 1) blijft er ruimte over
      expect(met).toBeGreaterThan(0);
    }
  });

  it('4. bij een vast contract is de arbitrage nul', () => {
    const vast = bereken(
      { ...referentieInput, huidigContract: 'vast' },
      kalibratieMarktData,
    );
    expect(vast.arbitrageOpbrengst).toBe(0);
  });
});
