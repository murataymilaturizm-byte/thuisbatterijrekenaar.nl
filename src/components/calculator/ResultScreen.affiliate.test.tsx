/**
 * Gedragstest voor de affiliateplaatsing op het resultaatscherm.
 *
 * De regel is inhoudelijk, niet cosmetisch: wie al een dynamisch contract
 * heeft, krijgt géén overstaplink te zien. Dat mag niet stilzwijgend
 * omvallen bij een refactor, en een blik op de broncode is geen bewijs —
 * daarom renderen wij het scherm echt.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { bereken } from '../../lib/calc/engine';
import type { CalcInput, HuidigContract, MarktData } from '../../lib/calc/types';
import ResultScreen from './ResultScreen';

const marktData: MarktData = {
  piekDalSpreadEurPerKwh: 0.23,
  laatstBijgewerkt: new Date().toISOString(),
};

const invoer = (huidigContract: HuidigContract): CalcInput => ({
  postcode: '1234 AB',
  jaarVerbruikKwh: 3500,
  huishoudenGrootte: null,
  wattpiek: 4300,
  huidigContract,
  overdagThuis: 'deels',
  heeftEV: false,
  heeftWarmtepomp: false,
});

const markup = (contract: HuidigContract) =>
  renderToStaticMarkup(
    <ResultScreen
      result={bereken(invoer(contract), marktData)}
      marktData={marktData}
      wasDynamisch={contract === 'dynamisch'}
      onOfferteClick={() => {}}
    />,
  );

describe('affiliate-CTA op het resultaatscherm', () => {
  it('toont de partnerlink bij een vast contract', () => {
    expect(markup('vast')).toContain('d.energyzero.nl');
  });

  it('toont de partnerlink NIET bij een dynamisch contract', () => {
    expect(markup('dynamisch')).not.toContain('d.energyzero.nl');
  });

  it('markeert de link als betaalde link en opent hem in een nieuw tabblad', () => {
    const html = markup('vast');
    expect(html).toContain('rel="sponsored nofollow noopener"');
    expect(html).toContain('target="_blank"');
  });

  it('gebruikt de Sub ID van deze plaatsing', () => {
    expect(markup('vast')).toContain('ws=resultaat-scherm');
  });

  it('meldt de vergoeding direct bij de link', () => {
    expect(markup('vast')).toContain('Wij ontvangen een vergoeding');
  });
});
