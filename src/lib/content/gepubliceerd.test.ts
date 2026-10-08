/**
 * De kwaliteitspoorten, toegepast op álle gepubliceerde pagina's.
 *
 * Tot nu toe draaide `beoordeelConcept` alleen vanuit /concepten, en die
 * pagina slaat gepubliceerde bestanden juist over — er keek dus niets naar de
 * pagina's die bezoekers te zien krijgen. Dat is hier rechtgezet.
 *
 * In één keer hard afdwingen kan niet: er staat een erfenis van eerdere
 * afspraken in de teksten. Daarom een ratel per poort. Het getal in BASISLIJN
 * is het aantal pagina's dat die poort vandaag niet haalt; komt er één bij,
 * dan valt de test om. De getallen mogen alleen omlaag.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as alleConstanten from '../../config/constants';
import { beoordeelConcept } from './quality';

const wortel = path.resolve(__dirname, '..', '..', '..');
const paginaMap = path.join(wortel, 'src', 'content', 'pages');

/** Aantal gepubliceerde pagina's dat deze rode poort nú niet haalt. */
const BASISLIJN: Record<string, number> = {
  'teyit-in-gepubliceerde-pagina': 7,
  // Vier pagina's noemen een afgeleid bedrag (0,14 euro, 3.950, 9 kWh, 2.750,
  // 45%, 100%). Alle zes zijn op 8 oktober 2026 tegen de rekenmotor gelegd en
  // kloppen; ze staan alleen niet in constants.ts omdat ze eruit vólgen.
  'onbekende-getallen': 4,
  clusterlinks: 6,
  rekenaar: 4,
  links: 0,
  faq: 5,
  'teyit-in-bronnen': 0,
  bronnummers: 0,
  constantenaam: 0,
};

const bekendeWaarden = Object.values(alleConstanten)
  .flatMap((v) => (Array.isArray(v) ? v : [v]))
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

function gepubliceerdePaginas(): Pagina[] {
  return readdirSync(paginaMap)
    .filter((b) => b.endsWith('.mdx') && !b.startsWith('_'))
    .map((naam) => {
      const ruw = readFileSync(path.join(paginaMap, naam), 'utf8');
      const fm = /^---\n([\s\S]*?)\n---/.exec(ruw)?.[1] ?? '';
      return {
        naam,
        ruw,
        body: ruw.replace(/^---[\s\S]*?\n---\n/, ''),
        url: `/${naam.replace('.mdx', '')}/`,
        cluster: /^cluster:\s*'(.+)'$/m.exec(fm)?.[1] ?? 'overig',
        faqAantal: (ruw.match(/^ {2}- vraag:/gm) ?? []).length,
      };
    })
    .filter((p) => !/^published:\s*false\s*$/m.test(p.ruw));
}

describe('kwaliteitspoorten op gepubliceerde pagina’s', () => {
  const paginas = gepubliceerdePaginas();
  const bestaandeUrls = [...paginas.map((p) => p.url), ...astroPaginas];

  /** Per rode poort: welke pagina's halen hem niet? */
  const gezakt: Record<string, string[]> = {};
  for (const p of paginas) {
    const resultaten = beoordeelConcept({
      body: p.body,
      ruw: p.ruw,
      faqAantal: p.faqAantal,
      cluster: p.cluster,
      bestaandeUrls,
      clusterUrls: paginas.filter((a) => a.cluster === p.cluster && a.url !== p.url).map((a) => a.url),
      bekendeWaarden,
      constanteNamen,
    });
    for (const r of resultaten) {
      if (r.niveau === 'rood' && !r.geslaagd) (gezakt[r.id] ??= []).push(`${p.naam}: ${r.toelichting}`);
    }
  }

  it('er zijn gepubliceerde pagina’s om te controleren', () => {
    expect(paginas.length).toBeGreaterThan(15);
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
    const onbekend = Object.keys(gezakt).filter((id) => !(id in BASISLIJN));
    expect(onbekend, `Nieuwe poort zonder basislijn: ${onbekend.join(', ')}`).toEqual([]);
  });
});
