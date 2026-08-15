/**
 * Clusterindeling: één bron voor de kennisbank, de kruimelpaden en de
 * BreadcrumbList-schema's. Voorheen stond deze indeling alleen in
 * kennisbank.astro; kruimelpaden zouden dan een tweede waarheid worden.
 */

export interface ClusterDefinitie {
  key: string;
  titel: string;
  intro: string;
}

export const CLUSTERS: ClusterDefinitie[] = [
  {
    key: 'basis',
    titel: 'Saldering en tarieven: de basis',
    intro: 'Wat er verandert in 2027 en hoe de rekensom van een thuisbatterij werkt.',
  },
  {
    key: 'regelgeving',
    titel: 'Regelgeving, belasting en procedures',
    intro:
      'Belasting, verzekering, meldplicht en installatienormen — wat u formeel moet regelen.',
  },
  {
    key: 'segment',
    titel: 'Uw situatie',
    intro: 'Huurwoning, VvE, geen zonnepanelen of liever een stekkerbatterij.',
  },
  {
    key: 'dynamisch',
    titel: 'Dynamisch contract',
    intro: 'Uurprijzen benutten — met of zonder thuisbatterij.',
  },
  {
    key: 'data',
    titel: 'Actuele marktdata',
    intro: 'Live cijfers waarop onze rekenaar rekent.',
  },
];

/** Ankerlink naar de clustersectie op de kennisbankpagina. */
export const clusterUrl = (key: string) => `/kennisbank/#cluster-${key}`;

export const clusterTitel = (key: string) =>
  CLUSTERS.find((c) => c.key === key)?.titel ?? 'Kennisbank';
