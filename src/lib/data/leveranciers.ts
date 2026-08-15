/**
 * Typen voor de leverancierstabel (src/data/leveranciers.json).
 *
 * REGEL: geen tarief in de data zonder controle op de tarievenpagina van
 * de leverancier zelf, mét gecontroleerdOp-datum per rij. De JSON start
 * als lege array; rijen worden pas toegevoegd na verificatie.
 */

export type TypeVergoeding =
  | 'marktprijs_plus_opslag'
  | 'vast_bedrag'
  | 'marktprijs'
  | 'onbekend';

export type TerugleverkostenType =
  | 'geen'
  | 'vast_maandbedrag'
  | 'afhankelijk_van_teruglevering'
  | 'onbekend';

export type Facturering = 'per_uur' | 'per_kwartier' | 'onbekend';

export type LeverancierContractType = 'dynamisch' | 'vast' | 'variabel';

export interface Leverancier {
  naam: string;
  typeVergoeding: TypeVergoeding;
  /** Korte toelichting, bijv. "+ € 0,02/kWh" */
  vergoedingDetail: string;
  terugleverkosten: TerugleverkostenType;
  terugleverkostenDetail: string;
  facturering: Facturering;
  contractType: LeverancierContractType;
  /** Tarievenpagina van de leverancier zelf */
  bronUrl: string;
  /** Verificatiedatum per rij (YYYY-MM-DD) — verplicht, wordt getoond */
  gecontroleerdOp: string;
}

// Weergavelabels (nl) voor de enumwaarden — één bron voor de tabel
export const TYPE_VERGOEDING_LABEL: Record<TypeVergoeding, string> = {
  marktprijs_plus_opslag: 'Marktprijs + opslag',
  vast_bedrag: 'Vast bedrag per kWh',
  marktprijs: 'Marktprijs',
  onbekend: 'Onbekend',
};

export const TERUGLEVERKOSTEN_LABEL: Record<TerugleverkostenType, string> = {
  geen: 'Geen',
  vast_maandbedrag: 'Vast maandbedrag',
  afhankelijk_van_teruglevering: 'Afhankelijk van teruglevering',
  onbekend: 'Onbekend',
};

export const FACTURERING_LABEL: Record<Facturering, string> = {
  per_uur: 'Per uur',
  per_kwartier: 'Per kwartier',
  onbekend: 'Onbekend',
};

export const CONTRACT_TYPE_LABEL: Record<LeverancierContractType, string> = {
  dynamisch: 'Dynamisch',
  vast: 'Vast',
  variabel: 'Variabel',
};
