import { useEffect, useRef, useState } from 'react';
import { WATTPIEK_PER_PANEEL } from '../../config/constants';
import { bereken } from '../../lib/calc/engine';
import type {
  CalcInput,
  CalcResult,
  HuidigContract,
  MarktData,
  OverdagThuis,
} from '../../lib/calc/types';
import { POSTCODE_REGEX } from './format';
import LeadForm from './LeadForm';
import ProgressBar from './ProgressBar';
import ResultScreen from './ResultScreen';

const TOTAAL_STAPPEN = 6;

interface CalculatorProps {
  /** Marktprijsstatistieken uit src/data/prices.json, doorgegeven op build-tijd */
  marktData: MarktData;
}

type Scherm =
  | { fase: 'vraag'; stap: number }
  | { fase: 'resultaat' }
  | { fase: 'offerte' }
  | { fase: 'bedankt' };

/**
 * Rekenaar-island: 6 vragen (één per scherm), resultaat, offerteformulier.
 * Alleen React-state — bewust geen localStorage/sessionStorage.
 * Alle rekenlogica zit in lib/calc/engine.ts; hier alleen UI.
 */
export default function Calculator({ marktData }: CalculatorProps) {
  const [scherm, setScherm] = useState<Scherm>({ fase: 'vraag', stap: 1 });

  // Schermwissels vervangen de complete inhoud van het island. Wordt een
  // lang scherm (offerteformulier) vervangen door een kort scherm
  // (bedankt-kaart), dan wijst de bewaarde scrollpositie ineens naar
  // content vér onder het island — op mobiel "springt" de pagina dan naar
  // de FAQ of de footer. Daarom bij elke wissel: focus op de container
  // (zonder scroll) en daarna gecontroleerd in beeld scrollen.
  const containerRef = useRef<HTMLDivElement>(null);
  const eersteWeergave = useRef(true);
  const schermSleutel = scherm.fase === 'vraag' ? `vraag-${scherm.stap}` : scherm.fase;
  useEffect(() => {
    if (eersteWeergave.current) {
      eersteWeergave.current = false;
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({
      // De korte bedankt-kaart gecentreerd; vraag-/resultaatschermen met
      // de bovenkant in beeld, zodat de vraag zelf zichtbaar is.
      block: schermSleutel === 'bedankt' ? 'center' : 'start',
    });
  }, [schermSleutel]);

  // Antwoorden
  const [postcode, setPostcode] = useState('');
  const [verbruikBekend, setVerbruikBekend] = useState(true);
  const [jaarVerbruik, setJaarVerbruik] = useState('');
  const [huishouden, setHuishouden] = useState<number | null>(null);
  const [wpInvoer, setWpInvoer] = useState<'wattpiek' | 'panelen'>('panelen');
  const [wattpiek, setWattpiek] = useState('');
  const [aantalPanelen, setAantalPanelen] = useState('');
  const [contract, setContract] = useState<HuidigContract | null>(null);
  const [overdagThuis, setOverdagThuis] = useState<OverdagThuis | null>(null);
  const [heeftEV, setHeeftEV] = useState(false);
  const [heeftWarmtepomp, setHeeftWarmtepomp] = useState(false);

  const [fout, setFout] = useState<string | null>(null);
  const [result, setResult] = useState<CalcResult | null>(null);

  const knop =
    'w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40';
  const keuzeKnop = (actief: boolean) =>
    `w-full rounded-lg border-2 px-4 py-3 text-left text-base font-medium transition ${
      actief
        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
        : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
    }`;
  const invoer =
    'w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200';

  function naarStap(stap: number) {
    setFout(null);
    setScherm({ fase: 'vraag', stap });
  }

  function berekenWattpiek(): number {
    if (wpInvoer === 'wattpiek') return Number(wattpiek);
    return Number(aantalPanelen) * WATTPIEK_PER_PANEEL;
  }

  function valideerEnVerder(stap: number) {
    setFout(null);
    if (stap === 1 && !POSTCODE_REGEX.test(postcode.trim())) {
      setFout('Vul een geldige Nederlandse postcode in, bijvoorbeeld 1234 AB.');
      return;
    }
    if (stap === 2) {
      if (verbruikBekend) {
        const v = Number(jaarVerbruik);
        if (!jaarVerbruik || Number.isNaN(v) || v <= 0) {
          setFout('Vul uw jaarverbruik in kWh in, of kies "Ik weet het niet".');
          return;
        }
      } else if (huishouden === null) {
        setFout('Kies het aantal personen in uw huishouden.');
        return;
      }
    }
    if (stap === 3) {
      const wp = berekenWattpiek();
      if (Number.isNaN(wp) || wp <= 0) {
        setFout('Vul het aantal zonnepanelen of het totale wattpiek in.');
        return;
      }
    }
    if (stap === 4 && contract === null) {
      setFout('Kies uw huidige contractvorm.');
      return;
    }
    if (stap === 5 && overdagThuis === null) {
      setFout('Kies een van de opties.');
      return;
    }
    if (stap < TOTAAL_STAPPEN) {
      naarStap(stap + 1);
      return;
    }
    // Laatste stap → berekenen
    const input: CalcInput = {
      postcode: postcode.trim().toUpperCase(),
      jaarVerbruikKwh: verbruikBekend ? Number(jaarVerbruik) : null,
      huishoudenGrootte: verbruikBekend ? null : huishouden,
      wattpiek: berekenWattpiek(),
      huidigContract: contract ?? 'onbekend',
      overdagThuis: overdagThuis ?? 'nee',
      heeftEV,
      heeftWarmtepomp,
    };
    setResult(bereken(input, marktData));
    setScherm({ fase: 'resultaat' });
  }

  if (scherm.fase === 'bedankt') {
    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm outline-none sm:p-8"
      >
        <h2 className="text-2xl font-bold text-slate-900">Bedankt voor uw interesse!</h2>
        <p className="mt-3 text-slate-600">
          De offerteservice is nog niet actief: wij nemen deze functie
          binnenkort in gebruik. Uw gegevens zijn niet verstuurd en niet
          opgeslagen. Zodra wij samenwerken met installateurs, leest u dat
          op deze site.
        </p>
      </div>
    );
  }

  if (scherm.fase === 'offerte' && result) {
    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm outline-none sm:p-8"
      >
        <LeadForm
          postcode={postcode.trim().toUpperCase()}
          capaciteitKwh={result.referentieCapaciteitKwh}
          jaarVerbruikKwh={result.jaarVerbruikKwh}
          onVerzonden={() => setScherm({ fase: 'bedankt' })}
        />
      </div>
    );
  }

  if (scherm.fase === 'resultaat' && result) {
    return (
      <div
        ref={containerRef}
        tabIndex={-1}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm outline-none sm:p-8"
      >
        <ResultScreen
          result={result}
          marktData={marktData}
          wasDynamisch={contract === 'dynamisch'}
          onOfferteClick={() => setScherm({ fase: 'offerte' })}
        />
      </div>
    );
  }

  const stap = scherm.fase === 'vraag' ? scherm.stap : 1;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm outline-none sm:p-8"
    >
      <ProgressBar huidigeStap={stap} totaalStappen={TOTAAL_STAPPEN} />

      {stap === 1 && (
        <fieldset className="space-y-4">
          <legend className="text-xl font-bold text-slate-900">
            Wat is uw postcode?
          </legend>
          <p className="text-sm text-slate-500">
            Alleen gebruikt om installateurs uit uw regio te vinden.
          </p>
          <input
            type="text"
            inputMode="text"
            placeholder="1234 AB"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            className={invoer}
            autoComplete="postal-code"
          />
        </fieldset>
      )}

      {stap === 2 && (
        <fieldset className="space-y-4">
          <legend className="text-xl font-bold text-slate-900">
            Wat is uw jaarverbruik aan stroom?
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={keuzeKnop(verbruikBekend)}
              onClick={() => setVerbruikBekend(true)}
            >
              Ik weet het (kWh)
            </button>
            <button
              type="button"
              className={keuzeKnop(!verbruikBekend)}
              onClick={() => setVerbruikBekend(false)}
            >
              Ik weet het niet
            </button>
          </div>
          {verbruikBekend ? (
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Bijv. 3500"
              value={jaarVerbruik}
              onChange={(e) => setJaarVerbruik(e.target.value)}
              className={invoer}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">
                Hoeveel personen telt uw huishouden? Wij maken dan een schatting.
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={keuzeKnop(huishouden === n)}
                    onClick={() => setHuishouden(n)}
                  >
                    {n === 5 ? '5+' : n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </fieldset>
      )}

      {stap === 3 && (
        <fieldset className="space-y-4">
          <legend className="text-xl font-bold text-slate-900">
            Hoe groot is uw zonnepaneleninstallatie?
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={keuzeKnop(wpInvoer === 'panelen')}
              onClick={() => setWpInvoer('panelen')}
            >
              Aantal panelen
            </button>
            <button
              type="button"
              className={keuzeKnop(wpInvoer === 'wattpiek')}
              onClick={() => setWpInvoer('wattpiek')}
            >
              Totaal wattpiek
            </button>
          </div>
          {wpInvoer === 'panelen' ? (
            <div className="space-y-1">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Bijv. 10"
                value={aantalPanelen}
                onChange={(e) => setAantalPanelen(e.target.value)}
                className={invoer}
              />
              <p className="text-sm text-slate-500">
                Wij rekenen met {WATTPIEK_PER_PANEEL} Wp per paneel.
              </p>
            </div>
          ) : (
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Bijv. 4300"
              value={wattpiek}
              onChange={(e) => setWattpiek(e.target.value)}
              className={invoer}
            />
          )}
        </fieldset>
      )}

      {stap === 4 && (
        <fieldset className="space-y-3">
          <legend className="text-xl font-bold text-slate-900">
            Wat voor energiecontract heeft u nu?
          </legend>
          {(
            [
              ['vast', 'Vast contract'],
              ['dynamisch', 'Dynamisch contract'],
              ['onbekend', 'Weet ik niet'],
            ] as const
          ).map(([waarde, label]) => (
            <button
              key={waarde}
              type="button"
              className={keuzeKnop(contract === waarde)}
              onClick={() => setContract(waarde)}
            >
              {label}
            </button>
          ))}
        </fieldset>
      )}

      {stap === 5 && (
        <fieldset className="space-y-3">
          <legend className="text-xl font-bold text-slate-900">
            Is er overdag meestal iemand thuis?
          </legend>
          {(
            [
              ['ja', 'Ja, meestal wel'],
              ['deels', 'Deels / wisselend'],
              ['nee', 'Nee, meestal niet'],
            ] as const
          ).map(([waarde, label]) => (
            <button
              key={waarde}
              type="button"
              className={keuzeKnop(overdagThuis === waarde)}
              onClick={() => setOverdagThuis(waarde)}
            >
              {label}
            </button>
          ))}
        </fieldset>
      )}

      {stap === 6 && (
        <fieldset className="space-y-3">
          <legend className="text-xl font-bold text-slate-900">
            Heeft u een elektrische auto of warmtepomp?
          </legend>
          <p className="text-sm text-slate-500">Meerdere antwoorden mogelijk.</p>
          <button
            type="button"
            className={keuzeKnop(heeftEV)}
            onClick={() => setHeeftEV(!heeftEV)}
          >
            Elektrische auto {heeftEV ? '✓' : ''}
          </button>
          <button
            type="button"
            className={keuzeKnop(heeftWarmtepomp)}
            onClick={() => setHeeftWarmtepomp(!heeftWarmtepomp)}
          >
            Warmtepomp {heeftWarmtepomp ? '✓' : ''}
          </button>
        </fieldset>
      )}

      {fout && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {fout}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        {stap > 1 && (
          <button
            type="button"
            onClick={() => naarStap(stap - 1)}
            className="rounded-lg border border-slate-300 px-5 py-4 font-medium text-slate-600 hover:bg-slate-50"
          >
            Terug
          </button>
        )}
        <button type="button" onClick={() => valideerEnVerder(stap)} className={knop}>
          {stap === TOTAAL_STAPPEN ? 'Bereken mijn resultaat' : 'Volgende'}
        </button>
      </div>
    </div>
  );
}
