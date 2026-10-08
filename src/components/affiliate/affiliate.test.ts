/**
 * De EnergyZero-plaatsing: zichtbaarheid, trackinglink en linkattributen.
 *
 * ⚠️ DEZE TEST DOET GEEN ENKEL NETWERKVERZOEK NAAR DE AFFILIATE-URL — en dat
 * moet zo blijven.
 *
 * De voorwaarden van Daisycon (artikel 2.2) staan één klik op je eigen
 * affiliatelink toe, uitsluitend om te controleren dat hij werkt. Kunstmatige
 * klikken maken álle commissies ongeldig. Een test die bij elke CI-run die
 * URL opvraagt, produceert precies zulke kunstmatige klikken en zet daarmee
 * de inkomsten van de site op nul. Daarom controleren wij hier de string en
 * de gerenderde DOM, nooit het doel van de link. Dat de link echt aankomt, is
 * eenmalig met de hand nagegaan.
 *
 * Verander dit niet naar een echt verzoek, ook niet "even om te debuggen",
 * ook niet achter een vlag: een vlag die per ongeluk aanstaat kost geld dat
 * niet terugkomt. Wil je weten of de bestemming nog bestaat, klik dan zelf
 * één keer.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { AFFILIATE_REL, PARTNERS, actievePartner, partnerLink } from '../../config/partners';
import { bereken } from '../../lib/calc/engine';
import type { CalcInput, MarktData } from '../../lib/calc/types';
import ResultScreen from '../calculator/ResultScreen';

/**
 * Het verbod uit de kop, afgedwongen in plaats van opgeschreven. Elk verzoek
 * dat deze test alsnog zou doen, laat haar omvallen met de reden erbij.
 */
beforeAll(() => {
  globalThis.fetch = (() => {
    throw new Error(
      'Deze test mag geen netwerkverzoek doen: een klik op onze eigen ' +
        'affiliatelink in CI is een kunstmatige klik (Daisycon 2.2) en maakt ' +
        'alle commissies ongeldig. Controleer de string en de DOM.',
    );
  }) as typeof fetch;
});

const marktData: MarktData = { piekDalSpreadEurPerKwh: 0.09, laatstBijgewerkt: '2026-10-08' };

/** Een huishouden met overschot, zodat het resultaatscherm volledig vult. */
const basisInvoer: Omit<CalcInput, 'huidigContract'> = {
  postcode: '1011',
  jaarVerbruikKwh: 3500,
  huishoudenGrootte: 3,
  wattpiek: 4000,
  overdagThuis: 'nee',
  heeftEV: false,
  heeftWarmtepomp: false,
};

function render(contract: CalcInput['huidigContract'], wasDynamisch: boolean): string {
  const input: CalcInput = { ...basisInvoer, huidigContract: contract };
  return renderToStaticMarkup(
    createElement(ResultScreen, {
      result: bereken(input, marktData),
      marktData,
      wasDynamisch,
      onOfferteClick: () => {},
    }),
  );
}

/** De <a> met het affiliatemerkje uit de gerenderde HTML. */
function affiliateAnker(html: string): string | null {
  const m = /<a\b[^>]*data-affiliate="energyzero"[^>]*>/.exec(html);
  return m ? m[0] : null;
}

/**
 * De href zoals de browser hem gebruikt. In HTML staat een & in een attribuut
 * als &amp; — correct, en niet hetzelfde als de string uit partnerLink. Zonder
 * deze stap vergelijk je markup met een URL.
 */
function hrefVan(anker: string): string {
  return (/href="([^"]+)"/.exec(anker)?.[1] ?? '').replace(/&amp;/g, '&');
}

describe('EnergyZero-plaatsing in het resultaatscherm', () => {
  it('(a) staat er bij een vast contract', () => {
    const anker = affiliateAnker(render('vast', false));
    expect(anker, 'bij een vast contract is overstappen juist het advies').not.toBeNull();
    expect(render('vast', false)).toContain('Direct een dynamisch contract bekijken bij EnergyZero');
  });

  it('(b) staat er niet bij een dynamisch contract', () => {
    const html = render('dynamisch', true);
    expect(
      affiliateAnker(html),
      'wie al dynamisch zit, hoeft niet over te stappen — dan is de link alleen verdienmodel',
    ).toBeNull();
    expect(html).not.toContain('EnergyZero');
  });

  it('(b2) de melding over de vergoeding verdwijnt mee', () => {
    // Anders blijft er een disclaimer staan zonder link waar hij over gaat.
    expect(render('dynamisch', true)).not.toContain('ontvangen een vergoeding');
    expect(render('vast', false)).toContain('ontvangen een vergoeding');
  });

  it('(c) de link bevat de Sub ID van deze plaatsing en de juiste attributen', () => {
    const anker = affiliateAnker(render('vast', false))!;
    const href = hrefVan(anker);

    const partner = actievePartner('dynamisch-contract')!;
    expect(href).toBe(partnerLink(partner.id, 'resultaat-scherm'));
    expect(href).toContain(partner.basisUrl);
    expect(href, 'Sub ID (ws) vertelt welke plek de overstap opleverde').toContain(
      'ws=resultaat-scherm',
    );
    expect(href, 'dl leeg: de standaard landingspagina van de partner').toMatch(/&dl=$/);

    expect(anker).toContain(`rel="${AFFILIATE_REL}"`);
    expect(AFFILIATE_REL).toBe('sponsored nofollow noopener');
    expect(anker).toContain('target="_blank"');
  });

  it('(c2) partnerLink codeert de Sub ID en zwijgt over inactieve partners', () => {
    expect(partnerLink('energyzero', 'dynamisch-pagina')).toContain('ws=dynamisch-pagina');
    expect(partnerLink('energyzero', 'a b&c')).toContain('ws=a%20b%26c');
    expect(partnerLink('bestaat-niet', 'x'), 'onbekende partner levert geen link op').toBeNull();
  });

  it('(c3) zet je de partner op inactief, dan verdwijnt de plaatsing', () => {
    const partner = PARTNERS.find((p) => p.id === 'energyzero')!;
    partner.actief = false;
    try {
      expect(partnerLink('energyzero', 'resultaat-scherm')).toBeNull();
      expect(affiliateAnker(render('vast', false))).toBeNull();
    } finally {
      partner.actief = true;
    }
    // En daarna weer wél, zodat een vergeten herstel hier opvalt.
    expect(affiliateAnker(render('vast', false))).not.toBeNull();
  });
});

const wortel = path.resolve(__dirname, '..', '..', '..');
const lees = (rel: string) => readFileSync(path.join(wortel, rel), 'utf8');

describe('EnergyZero-plaatsing op /dynamisch-energiecontract-met-zonnepanelen/', () => {
  // Deze route is .astro/.mdx; die rendert niet in vitest zonder build. Wat
  // hier telt is dat de plaatsing via het component loopt en niet via een
  // losse <a> — want dan kan rel="sponsored" ontbreken. De attributen zelf
  // zijn hierboven op de gerenderde React-variant bewezen; beide varianten
  // halen ze uit dezelfde AFFILIATE_REL.
  const pagina = lees('src/content/pages/dynamisch-energiecontract-met-zonnepanelen.mdx');

  it('gebruikt het component met een eigen Sub ID', () => {
    expect(pagina).toMatch(/<AffiliateLink\s+partnerId="energyzero"\s+subId="dynamisch-pagina">/);
    expect(partnerLink('energyzero', 'dynamisch-pagina')).toContain('ws=dynamisch-pagina');
  });

  it('meldt de vergoeding op de plek zelf', () => {
    expect(pagina).toContain('Wij ontvangen een vergoeding als u via deze link overstapt');
  });

  it('benoemt het belang vóór het advies', () => {
    const belang = pagina.indexOf('Waar wij belang bij hebben');
    const link = pagina.indexOf('<AffiliateLink');
    expect(belang, 'de belangenverklaring moet op de pagina staan').toBeGreaterThan(-1);
    expect(belang, 'en vóór de link komen, niet erna').toBeLessThan(link);
  });

  it('geen enkele plaatsing omzeilt het component', () => {
    const verdacht: string[] = [];
    for (const rel of [
      ...['dynamisch-energiecontract-met-zonnepanelen', 'over-ons', 'thuisbatterij-rendement'].map(
        (n) => `src/content/pages/${n}.mdx`,
      ),
      'src/components/calculator/ResultScreen.tsx',
      'src/components/layout/Footer.astro',
      'src/pages/index.astro',
    ]) {
      for (const m of lees(rel).matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g)) {
        if (/d\.energyzero\.nl|daisycon/i.test(m[1]!)) verdacht.push(`${rel}: ${m[0]}`);
      }
    }
    expect(verdacht, `handmatige affiliatelink buiten het component:\n${verdacht.join('\n')}`).toEqual(
      [],
    );
  });

  it('de .astro-variant zet dezelfde verplichte attributen', () => {
    const component = lees('src/components/affiliate/AffiliateLink.astro');
    expect(component).toContain('rel={AFFILIATE_REL}');
    expect(component).toContain('target="_blank"');
    expect(component, 'niets renderen als de partner weg is').toContain('href &&');
  });
});
