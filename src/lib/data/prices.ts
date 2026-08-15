/**
 * Marktprijslaag: ophalen, parsen en normaliseren van day-ahead uurprijzen.
 *
 * Bron: EnergyZero public API (geen sleutel nodig).
 * Werkelijk gevalideerd antwoordschema (2026-08-14):
 *   {
 *     "Prices": [ { "readingDate": "2026-08-14T10:00:00Z", "price": 0.04 }, ... ],
 *     "intervalType": 4,
 *     "fromDate": "...", "tillDate": "...",
 *     "average": 0.17
 *   }
 * Prijzen zijn €/kWh incl. btw (kale marktprijs, excl. energiebelasting en inkoopvergoeding).
 *
 * Dit bestand draait op BUILD-tijd (via scripts/fetch-prices.mjs) en schrijft
 * src/data/prices.json. Puur TypeScript, geen React/Astro-imports; alleen
 * "erasable" syntax zodat Node het direct kan draaien (type stripping).
 */

export interface UurPrijs {
  /** Uur in Europe/Amsterdam, "00:00" t/m "23:00" */
  uur: string;
  /** €/kWh incl. btw */
  prijs: number;
}

export interface PrijsData {
  bron: string;
  /** ISO-tijdstip waarop de data is opgehaald */
  opgehaaldOp: string;
  /** Gemiddelde uurprijs over de afgelopen 30 dagen, €/kWh */
  gemiddeldeDagprijs30d: number;
  /** Gemiddelde dagelijkse (max - min), afgelopen 90 dagen, €/kWh */
  piekDalSpread90d: number;
  /** Aantal uren met prijs < 0 in de afgelopen 30 dagen */
  negatieveUren30d: number;
  /** Datum (YYYY-MM-DD, Amsterdam) van "vandaag" op het moment van ophalen */
  datumVandaag: string;
  uurprijzenVandaag: UurPrijs[];
  /** Leeg als de day-ahead prijzen van morgen nog niet gepubliceerd zijn */
  uurprijzenMorgen: UurPrijs[];
}

interface EnergyZeroPrijs {
  readingDate: string;
  price: number;
}

interface EnergyZeroResponse {
  Prices: EnergyZeroPrijs[];
}

const API_BASIS = 'https://api.energyzero.nl/v1/energyprices';

/** "YYYY-MM-DD" van een tijdstip in Europe/Amsterdam */
export function amsterdamDatum(d: Date): string {
  // sv-SE-notatie is YYYY-MM-DD
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
}

/** "HH:00" van een tijdstip in Europe/Amsterdam */
export function amsterdamUur(d: Date): string {
  const uur = d.toLocaleTimeString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    hour12: false,
  });
  return `${uur}:00`;
}

/** Haalt uurprijzen op voor het gegeven bereik. Gooit bij HTTP- of schemafouten. */
export async function haalUurprijzenOp(
  van: Date,
  tot: Date,
): Promise<EnergyZeroPrijs[]> {
  const url =
    `${API_BASIS}?fromDate=${encodeURIComponent(van.toISOString())}` +
    `&tillDate=${encodeURIComponent(tot.toISOString())}` +
    `&interval=4&usageType=1&inclBtw=true`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`EnergyZero API gaf status ${res.status}`);
  }
  const data = (await res.json()) as EnergyZeroResponse;
  if (!Array.isArray(data.Prices) || data.Prices.length === 0) {
    throw new Error('EnergyZero API gaf een leeg of onverwacht antwoord');
  }
  for (const p of data.Prices) {
    if (typeof p.readingDate !== 'string' || typeof p.price !== 'number') {
      throw new Error('EnergyZero API-schema wijkt af van het verwachte formaat');
    }
  }
  return data.Prices;
}

/** Berekent alle afgeleide statistieken uit ruwe uurprijzen. Pure functie. */
export function normaliseer(
  prijzen: EnergyZeroPrijs[],
  nu: Date,
): PrijsData {
  const nuMs = nu.getTime();
  const ms30d = 30 * 24 * 3600 * 1000;
  const ms90d = 90 * 24 * 3600 * 1000;

  const metTijd = prijzen
    .map((p) => ({ tijd: new Date(p.readingDate), prijs: p.price }))
    .sort((a, b) => a.tijd.getTime() - b.tijd.getTime());

  const afgelopen30d = metTijd.filter(
    (p) => p.tijd.getTime() >= nuMs - ms30d && p.tijd.getTime() <= nuMs,
  );
  const afgelopen90d = metTijd.filter(
    (p) => p.tijd.getTime() >= nuMs - ms90d && p.tijd.getTime() <= nuMs,
  );

  const gemiddelde =
    afgelopen30d.length > 0
      ? afgelopen30d.reduce((som, p) => som + p.prijs, 0) / afgelopen30d.length
      : 0;

  // Piek-dalspread: per Amsterdam-dag (max - min), daarna het gemiddelde
  const perDag = new Map<string, number[]>();
  for (const p of afgelopen90d) {
    const dag = amsterdamDatum(p.tijd);
    const lijst = perDag.get(dag) ?? [];
    lijst.push(p.prijs);
    perDag.set(dag, lijst);
  }
  let spreadSom = 0;
  let spreadDagen = 0;
  for (const dagPrijzen of perDag.values()) {
    if (dagPrijzen.length < 2) continue;
    spreadSom += Math.max(...dagPrijzen) - Math.min(...dagPrijzen);
    spreadDagen++;
  }
  const piekDalSpread = spreadDagen > 0 ? spreadSom / spreadDagen : 0;

  const negatieveUren = afgelopen30d.filter((p) => p.prijs < 0).length;

  const vandaag = amsterdamDatum(nu);
  const morgenDate = new Date(nuMs + 24 * 3600 * 1000);
  const morgen = amsterdamDatum(morgenDate);

  const uurLijst = (dag: string): UurPrijs[] =>
    metTijd
      .filter((p) => amsterdamDatum(p.tijd) === dag)
      .map((p) => ({ uur: amsterdamUur(p.tijd), prijs: p.prijs }));

  const afronden = (n: number) => Math.round(n * 10000) / 10000;

  return {
    bron: 'EnergyZero (day-ahead uurprijzen NL, incl. btw)',
    opgehaaldOp: nu.toISOString(),
    gemiddeldeDagprijs30d: afronden(gemiddelde),
    piekDalSpread90d: afronden(piekDalSpread),
    negatieveUren30d: negatieveUren,
    datumVandaag: vandaag,
    uurprijzenVandaag: uurLijst(vandaag),
    uurprijzenMorgen: uurLijst(morgen),
  };
}

/** Volledige pijplijn: ophalen (90 dagen terug t/m morgen) + normaliseren */
export async function haalPrijsDataOp(nu: Date): Promise<PrijsData> {
  const van = new Date(nu.getTime() - 91 * 24 * 3600 * 1000);
  const tot = new Date(nu.getTime() + 48 * 3600 * 1000);
  const prijzen = await haalUurprijzenOp(van, tot);
  return normaliseer(prijzen, nu);
}
