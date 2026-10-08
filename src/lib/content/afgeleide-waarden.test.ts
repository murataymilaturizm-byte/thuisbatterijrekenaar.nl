/**
 * Getallen in de tekst, elke run opnieuw uitgerekend.
 *
 * In dit project zijn FAQ-antwoorden drie keer stilzwijgend onwaar geworden
 * nadat de rekenmotor veranderde. Getallen die een redacteur in een zin heeft
 * uitgerekend zijn dezelfde valkuil, en die hadden tot nu toe geen bewaking.
 * Hier worden ze herberekend uit constants.ts en vergeleken met wat er
 * werkelijk op de pagina staat.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AFGELEIDE_WAARDEN, TEKSTUELE_WAARDEN } from '../../config/afgeleide-waarden';
import { parseGetalNl } from './quality';

const paginaMap = path.resolve(__dirname, '..', '..', 'content', 'pages');
const lees = (bestand: string) => readFileSync(path.join(paginaMap, bestand), 'utf8');

describe('afgeleide getallen kloppen nog met de motor', () => {
  for (const waarde of AFGELEIDE_WAARDEN) {
    it(`${waarde.tekst} = ${waarde.afleiding}`, () => {
      const herberekend = waarde.herbereken();
      const zoalsGeschreven = parseGetalNl(waarde.tekst);
      expect(
        herberekend,
        `De tekst zegt ${waarde.tekst}, maar ${waarde.afleiding} geeft nu ${herberekend}. ` +
          `Pas de pagina('s) aan: ${waarde.paginas.join(', ')}`,
      ).toBeCloseTo(zoalsGeschreven, 4);
    });

    it(`${waarde.tekst} staat nog op de genoemde pagina('s)`, () => {
      for (const pagina of waarde.paginas) {
        expect(lees(pagina), `${waarde.tekst} niet gevonden in ${pagina}`).toContain(waarde.tekst);
      }
    });
  }
});

describe('tekstuele getallen', () => {
  it('hebben een bron en staan waar de registratie zegt', () => {
    for (const w of TEKSTUELE_WAARDEN) {
      expect(w.wat.length, `${w.tekst} mist een omschrijving`).toBeGreaterThan(10);
      expect(w.bron.length, `${w.tekst} mist een bronvermelding`).toBeGreaterThan(5);
      for (const pagina of w.paginas) {
        expect(lees(pagina), `${w.tekst} niet gevonden in ${pagina}`).toContain(w.tekst);
      }
    }
  });

  it('worden niet als afgeleide waarde geregistreerd', () => {
    // 45% komt van de Belastingdienst en 100% is een stijlfiguur; ze volgen
    // nergens uit, dus herberekenen zou een valse zekerheid zijn.
    const afgeleid = new Set(AFGELEIDE_WAARDEN.map((w) => w.tekst));
    for (const w of TEKSTUELE_WAARDEN) expect(afgeleid.has(w.tekst)).toBe(false);
  });
});
