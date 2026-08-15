/**
 * ENIGE BRON van alle numerieke aannames op deze site.
 * Geen enkel getal mag ergens anders hardcoded staan —
 * niet in componenten, niet in content, niet in de rekenmodule.
 *
 * Elke wijziging hier: LAATST_BIJGEWERKT mee updaten.
 */

export const LAATST_BIJGEWERKT = '2026-08-14';

// ── Zonnepanelen / opbrengst ────────────────────────────────────────────────

/** kWh per Wp per jaar, Nederlands gemiddelde (bron: o.a. Milieu Centraal / KNMI-instraling) */
export const SPECIFIEKE_OPBRENGST = 0.88;

/** Wp per zonnepaneel, gangbaar modern paneel (indicatief, 2025–2026) */
export const WATTPIEK_PER_PANEEL = 430;

// ── Zelfverbruik ────────────────────────────────────────────────────────────

/** Aandeel eigen verbruik zonder batterij (bron: Milieu Centraal) */
export const ZELFVERBRUIK_BASIS = 0.30;

/** Bovengrens zelfverbruik zonder batterij, incl. gedragsbonussen */
export const ZELFVERBRUIK_CAP_ZONDER = 0.55;

/**
 * Aandeel eigen verbruik mét thuisbatterij, middenwaarde (indicatief).
 * Sinds Paket 3.0 alleen nog gebruikt als illustratief cijfer in content;
 * de rekenmodule rekent capaciteitsafhankelijk via berekenExtraZelfverbruik.
 */
export const ZELFVERBRUIK_MET_BATTERIJ = 0.65;

/** Bonus op zelfverbruik: overdag thuis (schatting) */
export const BONUS_OVERDAG_THUIS = 0.07;

/** Bonus op zelfverbruik: deels overdag thuis (schatting) */
export const BONUS_DEELS_THUIS = 0.03;

/** Bonus op zelfverbruik: elektrische auto aanwezig (schatting) */
export const BONUS_EV = 0.05;

/** Bonus op zelfverbruik: warmtepomp aanwezig (schatting) */
export const BONUS_WARMTEPOMP = 0.05;

// ── Saldering / tarieven ────────────────────────────────────────────────────

/** Einddatum salderingsregeling (wet: afschaffing per 1 januari 2027) */
export const SALDERING_EINDDATUM = '2027-01-01';

/** Leveringstarief per kWh, incl. belastingen (indicatief gemiddelde) */
export const LEVERINGSTARIEF_KWH = 0.28;

/** Wettelijk minimum terugleververgoeding als aandeel van het leveringstarief, t/m 2030 */
export const TERUGLEVERVERGOEDING_AANDEEL = 0.50;

/** Terugleverkosten per jaar (indicatief gemiddelde over leveranciers) */
export const TERUGLEVERKOSTEN_JAAR = 150;

// ── Thuisbatterij ───────────────────────────────────────────────────────────

/** Prijs per kWh opslagcapaciteit, geïnstalleerd (indicatief) */
export const BATTERIJ_PRIJS_PER_KWH = 550;

/** Vaste kosten: omvormer + installatie (indicatief) */
export const BATTERIJ_VASTE_KOSTEN = 1200;

/** Beschikbare batterijcapaciteiten in kWh */
export const BESCHIKBARE_CAPACITEITEN = [5, 7.5, 10, 12.5, 15] as const;

/** Bruikbare fractie van de nominale capaciteit (depth of discharge, LFP) — AANNAME */
export const DOD_BRUIKBAAR = 0.90;

/**
 * Deel van het jaarverbruik dat buiten zonuren valt — bepaalt hoeveel je
 * 's avonds/'s nachts kunt ontladen — AANNAME
 */
export const AANDEEL_VERBRUIK_BUITEN_ZONUREN = 0.60;

/**
 * Fractie van de theoretisch mogelijke cycli die haalbaar is; in de winter
 * is er nauwelijks overschot — AANNAME
 */
export const SEIZOENSBENUTTING = 0.65;

/** Round-trip rendement (laden + ontladen), LFP indicatief */
export const ROUND_TRIP_RENDEMENT = 0.90;

/** Capaciteitsverlies per jaar door degradatie (indicatief) */
export const DEGRADATIE_PER_JAAR = 0.02;

/** Economische levensduur waarover wij rekenen, in jaren */
export const LEVENSDUUR_JAAR = 15;

/** Onderhoudskosten per jaar (indicatief, aanpasbaar) */
export const ONDERHOUD_PER_JAAR = 0;

/** Jaarlijkse energieprijsstijging — conservatief: geen stijging aannemen */
export const ENERGIEPRIJS_STIJGING = 0;

/** Benutbaarheidsfactor arbitrage bij dynamisch contract (niet elke dag wordt de volle spread gehaald) */
export const BENUTBAARHEID_DYNAMISCH = 0.6;

/**
 * Maximaal aantal arbitragecycli per etmaal — AANNAME: de day-ahead markt
 * heeft doorgaans één bruikbaar prijsdal en één piek per etmaal
 */
export const MAX_CYCLI_PER_DAG_ARBITRAGE = 1.0;

/** Gangbaar omvormervermogen van een thuisbatterij in kW — AANNAME */
export const AANSLUITVERMOGEN_KW = 3.7;

/** Duur van het bruikbare laadvenster (prijsdal) in uren — AANNAME */
export const LAADVENSTER_UREN = 4;

// ── Marktdata ───────────────────────────────────────────────────────────────

/** Maximale leeftijd van de marktprijsdata voordat de UI een waarschuwing toont, in uren */
export const PRIJS_DATA_MAX_LEEFTIJD_UUR = 48;

/** Maximale leeftijd van een geverifieerde leveranciersrij voordat de tabel "mogelijk verouderd" toont, in dagen */
export const LEVERANCIER_DATA_MAX_LEEFTIJD_DAGEN = 60;

// ── Verbruiksschatting ──────────────────────────────────────────────────────

/** kWh/jaar per persoon in het huishouden (schatting) */
export const VERBRUIK_PER_PERSOON = 1100;

/** kWh/jaar vaste basis per huishouden (schatting) */
export const VERBRUIK_BASIS_HUISHOUDEN = 1200;

// ── Transparantieblok ───────────────────────────────────────────────────────
// Gestructureerde weergave van dezelfde constanten (verwijst naar de waarden
// hierboven — GEEN gedupliceerde getallen). Gebruikt door het
// "Onze uitgangspunten"-blok in de rekenaar en door /uitgangspunten.

export interface Uitgangspunt {
  label: string;
  waarde: string;
  bron: string;
}

export const euro = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`;
export const pct = (n: number) => `${Math.round(n * 100)}%`;

export const UITGANGSPUNTEN: Uitgangspunt[] = [
  {
    label: 'Opbrengst zonnepanelen',
    waarde: `${SPECIFIEKE_OPBRENGST} kWh per Wp per jaar`,
    bron: 'Nederlands gemiddelde (o.a. Milieu Centraal)',
  },
  {
    label: 'Zelfverbruik zonder batterij',
    waarde: `${pct(ZELFVERBRUIK_BASIS)} (max. ${pct(ZELFVERBRUIK_CAP_ZONDER)})`,
    bron: 'Milieu Centraal',
  },
  {
    label: 'Bruikbare capaciteit batterij (DoD)',
    waarde: pct(DOD_BRUIKBAAR),
    bron: 'Aanname, gangbaar voor LFP-batterijen',
  },
  {
    label: 'Verbruik buiten zonuren',
    waarde: `${pct(AANDEEL_VERBRUIK_BUITEN_ZONUREN)} van het jaarverbruik`,
    bron: 'Aanname: bepaalt hoeveel de batterij ’s avonds/’s nachts kan ontladen',
  },
  {
    label: 'Seizoensbenutting batterij',
    waarde: pct(SEIZOENSBENUTTING),
    bron: 'Aanname: in de winter is er nauwelijks overschot om op te slaan',
  },
  {
    label: 'Einde salderingsregeling',
    waarde: '1 januari 2027',
    bron: 'Wetgeving afbouw salderingsregeling',
  },
  {
    label: 'Leveringstarief',
    waarde: `${euro(LEVERINGSTARIEF_KWH)} per kWh (incl. belastingen)`,
    bron: 'Indicatief gemiddelde',
  },
  {
    label: 'Minimale terugleververgoeding',
    waarde: `${pct(TERUGLEVERVERGOEDING_AANDEEL)} van het leveringstarief (t/m 2030)`,
    bron: 'Wettelijk minimum',
  },
  {
    label: 'Terugleverkosten',
    waarde: `€ ${TERUGLEVERKOSTEN_JAAR} per jaar`,
    bron: 'Indicatief gemiddelde over energieleveranciers',
  },
  {
    label: 'Prijs thuisbatterij',
    waarde: `€ ${BATTERIJ_PRIJS_PER_KWH} per kWh + € ${BATTERIJ_VASTE_KOSTEN} vaste kosten, geïnstalleerd`,
    bron: 'Indicatieve marktprijs',
  },
  {
    label: 'Verbruiksschatting',
    waarde: `${VERBRUIK_BASIS_HUISHOUDEN} kWh basis + ${VERBRUIK_PER_PERSOON} kWh per persoon`,
    bron: 'Schatting op basis van openbare verbruikscijfers',
  },
  {
    label: 'Vermogen per zonnepaneel',
    waarde: `${WATTPIEK_PER_PANEEL} Wp`,
    bron: 'Gangbaar modern paneel, indicatief',
  },
  {
    label: 'Round-trip rendement batterij',
    waarde: pct(ROUND_TRIP_RENDEMENT),
    bron: 'LFP-batterijen, indicatief (laad- en ontlaadverlies)',
  },
  {
    label: 'Degradatie batterij',
    waarde: `${pct(DEGRADATIE_PER_JAAR)} capaciteitsverlies per jaar`,
    bron: 'Indicatief, op basis van fabrieksgaranties',
  },
  {
    label: 'Levensduur batterij',
    waarde: `${LEVENSDUUR_JAAR} jaar`,
    bron: 'Economische rekenperiode, indicatief',
  },
  {
    label: 'Onderhoudskosten',
    waarde: `€ ${ONDERHOUD_PER_JAAR} per jaar`,
    bron: 'Indicatief; thuisbatterijen zijn vrijwel onderhoudsvrij',
  },
  {
    label: 'Energieprijsstijging',
    waarde: `${pct(ENERGIEPRIJS_STIJGING)} per jaar`,
    bron: 'Conservatieve aanname: geen stijging',
  },
  {
    label: 'Benutbaarheid arbitrage (dynamisch contract)',
    waarde: pct(BENUTBAARHEID_DYNAMISCH),
    bron: 'Schatting: niet elke dag wordt de volledige piek-dalspread benut',
  },
  {
    label: 'Arbitragecycli per etmaal',
    waarde: `maximaal ${MAX_CYCLI_PER_DAG_ARBITRAGE}`,
    bron: 'Aanname: één bruikbaar prijsdal en één piek per etmaal',
  },
  {
    label: 'Omvormervermogen',
    waarde: `${AANSLUITVERMOGEN_KW} kW, laadvenster ${LAADVENSTER_UREN} uur`,
    bron: 'Aanname, gangbaar voor thuisbatterijen',
  },
];
