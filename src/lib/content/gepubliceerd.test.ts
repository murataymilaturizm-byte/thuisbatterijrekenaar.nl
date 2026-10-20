/**
 * De kwaliteitspoorten, toegepast op álle gepubliceerde pagina's.
 *
 * Tot 8 oktober 2026 draaide `beoordeelConcept` alleen vanuit /concepten, en
 * die pagina slaat gepubliceerde bestanden juist over — er keek dus niets naar
 * wat bezoekers te zien krijgen.
 *
 * Poorten gelden per paginatype. Een privacyverklaring hoort geen FAQ en geen
 * link naar de rekenaar te hebben; die daar afdwingen levert rood op dat niets
 * betekent, en een poort die altijd rood staat wordt genegeerd.
 *
 * Het type volgt uit de frontmatter: een pagina mét `cluster` hoort bij de
 * kennisbank en krijgt alle poorten; een pagina zonder cluster is juridisch of
 * overig. Daar is geen nieuw veld voor nodig.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as alleConstanten from '../../config/constants';
import { beoordeelConcept } from './quality';

const wortel = path.resolve(__dirname, '..', '..', '..');
const paginaMap = path.join(wortel, 'src', 'content', 'pages');

/** Poorten die voor een juridische of overige pagina zinnig zijn. */
const POORTEN_JURIDISCH_OVERIG = new Set([
  'links',
  'teyit-in-gepubliceerde-pagina',
  'teyit-in-bronnen',
  'constantenaam',
  'bronnummers',
]);

/**
 * Aantal pagina's dat een poort nú niet haalt. Alleen omlaag.
 *
 * Alles staat sinds 8 oktober 2026 op nul: elke poort moet voor elke
 * gepubliceerde pagina slagen. Wie hier een getal boven nul zet, legt vast dat
 * de site een bekend gebrek heeft — dan hoort er een regel bij wélke pagina's
 * het zijn en waarom dat voorlopig zo blijft.
 *
 * De drie uitzonderingen van 8 oktober zijn opgelost in plaats van geboekt:
 * de getallen die uit de motor vólgen staan in afgeleide-waarden.ts, de
 * clustereis kan niet hoger liggen dan er pagina's te linken zijn, en de
 * ontbrekende rekenaarlink is gelegd.
 */
const BASISLIJN: Record<string, number> = {
  'teyit-in-gepubliceerde-pagina': 0,
  'teyit-in-bronnen': 0,
  bronnummers: 0,
  constantenaam: 0,
  links: 0,
  faq: 0,
  'onbekende-getallen': 0,
  clusterlinks: 0,
  rekenaar: 0,
  // 20 oktober 2026, na uitbreiding van de woordenlijst: één pagina.
  // thuisbatterij-bij-vast-contract.mdx zegt vier keer dat een thuisbatterij
  // "in de meeste huishoudsituaties" niet uitkomt "binnen 15 jaar". Dat is
  // geen marktgeneralisatie maar een uitkomst van onze eigen motor over onze
  // eigen scenarioreeks, en 15 jaar is LEVENSDUUR_JAAR. Het patroon klopt,
  // de zorg niet. Bewust gemeld en blijven staan; besluit ligt bij de
  // eigenaar.
  'vage-hoeveelheid': 1,
  // 20 oktober 2026: vier pagina's, en ze vallen in twee soorten.
  //
  // Terecht geen externe bron — het Bronnenblok zegt zelf waarom:
  //   thuisbatterij-huurwoning-en-vve.mdx, thuisbatterij-verzekering.mdx
  //   ("voor huurrecht/verzekeringsvoorwaarden bestaat geen centrale
  //   officiële bron" — de lezer wordt naar zijn eigen contract gestuurd).
  //   Precies waarom deze poort geel is en niet rood.
  //
  // Wél hetzelfde gebrek als in de concepten — alleen eigen pagina's als
  // "bron", een rondje om onszelf:
  //   thuisbatterij-bij-vast-contract.mdx, welke-capaciteit-thuisbatterij.mdx
  //
  // Gemeld, niet gerepareerd; het besluit ligt bij de eigenaar.
  'externe-bron': 4,
};

const bekendeWaarden = Object.values(alleConstanten)
  // Een unie met arrays erin laat zich niet door Array.isArray narrowen;
  // het returntype expliciet maken houdt astro check stil zonder cast.
  .flatMap((v): unknown[] => (Array.isArray(v) ? v : [v]))
  .filter((v): v is number => typeof v === 'number');
const constanteNamen = Object.keys(alleConstanten).filter((n) => /^[A-Z][A-Z0-9_]*$/.test(n));

/** Routes die als linkdoel mogen gelden, net als in /concepten. */
const astroPaginas = [
  '/',
  '/uitgangspunten/',
  '/stroomprijzen-vandaag/',
  '/terugleververgoeding-vergelijken/',
  '/kennisbank/',
];

interface Pagina {
  naam: string;
  ruw: string;
  body: string;
  url: string;
  cluster: string;
  faqAantal: number;
}

function leesPagina(naam: string, ruw: string): Pagina {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(ruw)?.[1] ?? '';
  return {
    naam,
    ruw,
    body: ruw.replace(/^---[\s\S]*?\r?\n---\r?\n/, ''),
    url: `/${naam.replace('.mdx', '')}/`,
    cluster: /^cluster:\s*'(.+)'$/m.exec(fm)?.[1] ?? '',
    faqAantal: (ruw.match(/^ {2}- vraag:/gm) ?? []).length,
  };
}

function gepubliceerdePaginas(): Pagina[] {
  return readdirSync(paginaMap)
    .filter((b) => b.endsWith('.mdx') && !b.startsWith('_'))
    .map((naam) => leesPagina(naam, readFileSync(path.join(paginaMap, naam), 'utf8')))
    .filter((p) => !/^published:\s*false\s*$/m.test(p.ruw));
}

/**
 * Eén bestand met Windows-regeleindes zette op 8 oktober 2026 een hele poort
 * uit: `^---\n` matchte niet, de frontmatter werd leeg gelezen, de pagina gold
 * als clusterloos en verdween uit haar eigen cluster. De poort werd niet rood,
 * hij hield op te bestaan. Daarom deze test: dezelfde tekst met CRLF moet
 * exact hetzelfde opleveren.
 */
describe('frontmatter leest hetzelfde met CRLF', () => {
  it('cluster, body en faq-aantal zijn onafhankelijk van regeleindes', () => {
    const afwijkend: string[] = [];
    for (const p of gepubliceerdePaginas()) {
      const crlf = leesPagina(p.naam, p.ruw.replace(/\r?\n/g, '\r\n'));
      if (
        crlf.cluster !== p.cluster ||
        crlf.faqAantal !== p.faqAantal ||
        crlf.body.replace(/\r/g, '') !== p.body.replace(/\r/g, '')
      ) {
        afwijkend.push(`${p.naam}: cluster "${p.cluster}" → "${crlf.cluster}"`);
      }
    }
    expect(afwijkend, afwijkend.join('\n')).toEqual([]);
  });

  it('elke inhoudspagina heeft een leesbaar cluster', () => {
    const zonder = gepubliceerdePaginas()
      .filter((p) => /^cluster:/m.test(p.ruw) && p.cluster === '')
      .map((p) => p.naam);
    expect(zonder, `cluster staat in het bestand maar wordt niet gelezen:\n${zonder.join('\n')}`).toEqual(
      [],
    );
  });
});

describe('kwaliteitspoorten op gepubliceerde pagina’s', () => {
  const paginas = gepubliceerdePaginas();
  const bestaandeUrls = [...paginas.map((p) => p.url), ...astroPaginas];

  const gezakt: Record<string, string[]> = {};
  /** Elke poort-id die werkelijk is beoordeeld; zie de test eronder. */
  const beoordeeldeIds = new Set<string>();
  /** Alleen de rode poorten, voor de eis dat geen rode poort buiten de ratel valt. */
  const rodeIds = new Set<string>();
  for (const p of paginas) {
    const isInhoudspagina = p.cluster !== '';
    const resultaten = beoordeelConcept({
      body: p.body,
      ruw: p.ruw,
      faqAantal: p.faqAantal,
      cluster: p.cluster,
      bestaandeUrls,
      clusterUrls: isInhoudspagina
        ? paginas.filter((a) => a.cluster === p.cluster && a.url !== p.url).map((a) => a.url)
        : [],
      bekendeWaarden,
      constanteNamen,
    });
    for (const r of resultaten) {
      if (!isInhoudspagina && !POORTEN_JURIDISCH_OVERIG.has(r.id)) continue;
      beoordeeldeIds.add(r.id);
      // Ook gele poorten tellen mee. Hiervóór werden ze overgeslagen, waardoor
      // 'onbekende-getallen' en 'vage-hoeveelheid' wel in de ratel stonden
      // maar nooit werden nagerekend: de regel zag eruit als bewaking en deed
      // niets. Welke poorten worden geratelt, bepaalt BASISLIJN — niet de
      // kleur.
      if (r.niveau === 'rood') rodeIds.add(r.id);
      if (r.geslaagd) continue;
      (gezakt[r.id] ??= []).push(`${p.naam}: ${r.toelichting}`);
    }
  }

  it('elke geratelde poort is ook echt beoordeeld', () => {
    // Een ratelregel voor een poort die nooit wordt bekeken, slaagt altijd.
    // Zo stond 'vage-hoeveelheid' een week op nul zonder iets te doen.
    const spook = Object.keys(BASISLIJN).filter((id) => !beoordeeldeIds.has(id));
    expect(
      spook,
      `Deze poorten staan in BASISLIJN maar worden niet beoordeeld — ` +
        `de regel bewaakt niets:\n${spook.join('\n')}`,
    ).toEqual([]);
  });

  it('er zijn gepubliceerde pagina’s om te controleren', () => {
    expect(paginas.length).toBeGreaterThan(15);
    expect(paginas.filter((p) => p.cluster === '').length).toBeGreaterThan(0);
  });

  for (const [poort, maximum] of Object.entries(BASISLIJN)) {
    it(`${poort}: niet meer dan ${maximum} pagina’s zakken`, () => {
      const lijst = gezakt[poort] ?? [];
      expect(
        lijst.length,
        `Pagina's die deze poort niet halen:\n${lijst.join('\n')}`,
      ).toBeLessThanOrEqual(maximum);
    });
  }

  it('geen onbekende rode poort buiten de ratel om', () => {
    // Alleen rood: een gele poort mag bestaan zonder ratel (die signaleert,
    // hij blokkeert niet). Rood zonder ratel is wel een gat.
    const onbekend = Object.keys(gezakt).filter((id) => rodeIds.has(id) && !(id in BASISLIJN));
    expect(onbekend, `Nieuwe poort zonder basislijn: ${onbekend.join(', ')}`).toEqual([]);
  });
});
