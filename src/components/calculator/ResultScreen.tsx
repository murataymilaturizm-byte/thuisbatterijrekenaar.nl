import { useEffect, useState } from 'react';
import {
  LAATST_BIJGEWERKT,
  LEVENSDUUR_JAAR,
  PRIJS_DATA_MAX_LEEFTIJD_UUR,
  UITGANGSPUNTEN,
} from '../../config/constants';
import type { CalcResult, MarktData } from '../../lib/calc/types';
import { fmtEuro, fmtKwh } from './format';

interface Props {
  result: CalcResult;
  marktData: MarktData;
  wasDynamisch: boolean;
  onOfferteClick: () => void;
}

const fmtDatum = (iso: string) =>
  new Date(iso).toLocaleDateString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const pctFmt = (n: number) => `${Math.round(n * 100)}%`;

export default function ResultScreen({
  result,
  marktData,
  wasDynamisch,
  onOfferteClick,
}: Props) {
  const rendabel = result.terugverdientijdJaren !== null;

  // Client-side leeftijdscontrole (na mount, om hydration-mismatch te vermijden)
  const [dataVerouderd, setDataVerouderd] = useState(false);
  useEffect(() => {
    const leeftijdUur =
      (Date.now() - new Date(marktData.laatstBijgewerkt).getTime()) / 3600000;
    setDataVerouderd(leeftijdUur > PRIJS_DATA_MAX_LEEFTIJD_UUR);
  }, [marktData.laatstBijgewerkt]);

  const rij = (label: string, waarde: string) => (
    <tr className="border-b border-slate-100">
      <th scope="row" className="py-2 pr-3 text-left font-medium text-slate-600">
        {label}
      </th>
      <td className="py-2 text-right tabular-nums">{waarde}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Uw resultaat</h2>

      {dataVerouderd && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Let op: onze marktprijsdata is ouder dan {PRIJS_DATA_MAX_LEEFTIJD_UUR}{' '}
          uur (laatst bijgewerkt: {fmtDatum(marktData.laatstBijgewerkt)}). De
          dynamische-contractcijfers kunnen licht afwijken.
        </p>
      )}

      {/* a) Drie grote getallen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-red-50 p-5 text-center">
          <p className="text-sm font-medium text-red-800">Uw verlies vanaf 2027</p>
          <p className="mt-1 text-3xl font-extrabold text-red-700">
            {fmtEuro(result.verliesNa2027)}
          </p>
          <p className="text-sm text-red-800">per jaar</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-5 text-center">
          <p className="text-sm font-medium text-emerald-800">
            Besparing met thuisbatterij
          </p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-700">
            {fmtEuro(result.jaarlijkseBesparing)}
          </p>
          <p className="text-sm text-emerald-800">per jaar</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-5 text-center">
          <p className="text-sm font-medium text-slate-700">Terugverdientijd</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">
            {rendabel ? `${result.terugverdientijdJaren} jaar` : '—'}
          </p>
          {!rendabel && (
            <p className="text-sm text-slate-700">
              Niet rendabel binnen de levensduur van {LEVENSDUUR_JAAR} jaar.
            </p>
          )}
        </div>
      </div>

      {result.geenRendabeleCapaciteit &&
        (wasDynamisch ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-700">
            <p>
              Bij geen enkele batterijgrootte komt deze investering binnen{' '}
              {LEVENSDUUR_JAAR} jaar uit — ook niet met uw dynamische
              contract. Dat komt meestal doordat uw overschot of uw verbruik
              buiten zonuren te klein is om een batterij vol te benutten.
            </p>
            <p>
              Wat u wél kunt doen zonder investering: uw verbruik verschuiven
              naar de goedkoopste uren.{' '}
              <a href="/stroomprijzen-vandaag/" className="font-semibold underline">
                Bekijk de actuele uurprijzen.
              </a>
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-700">
            Bij geen enkele batterijgrootte komt deze investering binnen{' '}
            {LEVENSDUUR_JAAR} jaar uit. Wat wél verschil maakt:{' '}
            <a
              href="/dynamisch-energiecontract-met-zonnepanelen/"
              className="font-semibold underline"
            >
              een dynamisch energiecontract
            </a>
            .
          </p>
        ))}

      {/* Marktprijszin — ons onderscheid */}
      <p className="text-center text-sm text-slate-600">
        {wasDynamisch ? (
          <>
            Gebaseerd op <strong>werkelijke marktprijzen</strong> van de
            afgelopen 90 dagen (laatst bijgewerkt:{' '}
            {fmtDatum(marktData.laatstBijgewerkt)}).
          </>
        ) : (
          <>
            Tip: bij een dynamisch contract rekenen wij met{' '}
            <strong>werkelijke marktprijzen</strong> van de afgelopen 90 dagen
            (laatst bijgewerkt: {fmtDatum(marktData.laatstBijgewerkt)}).
          </>
        )}
      </p>

      {result.arbitrageOpbrengst > 0 && (
        <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-700">
          Opbouw besparing: {fmtEuro(result.besparingZelfverbruik)} extra
          zelfverbruik + {fmtEuro(result.arbitrageOpbrengst)} handel op
          uurprijzen (dynamisch contract).
        </p>
      )}

      {/* b) Aanbevolen capaciteit */}
      {result.aanbevolenCapaciteitKwh !== null && (
        <p className="rounded-lg bg-slate-50 p-4 text-center text-lg text-slate-800">
          Aanbevolen capaciteit:{' '}
          <strong>{result.aanbevolenCapaciteitKwh} kWh</strong>{' '}
          <span className="text-slate-500">
            (indicatieve kosten: {fmtEuro(result.batterijKosten)}, geïnstalleerd)
          </span>
        </p>
      )}

      <p className="text-center text-sm text-slate-500">
        Wij rekenen alle beschikbare batterijgroottes door en tonen degene
        met de kortste terugverdientijd. Grotere batterijen leveren niet
        automatisch meer op: u kunt een batterij alleen ontladen als u
        &rsquo;s avonds en &rsquo;s nachts genoeg verbruikt.
      </p>

      {/* Vergelijking per batterijgrootte — bewust zichtbaar, niet in een
          uitklapblok: dit is het antwoord op "waarom deze grootte" */}
      <div>
        <h3 className="mb-2 font-semibold text-slate-800">
          Wij hebben alle batterijgroottes voor u doorgerekend
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
          <table className="w-full border-collapse text-right text-sm tabular-nums">
            <thead>
              <tr className="border-b border-slate-300 text-slate-600">
                <th className="py-1 pr-2 text-left font-medium">Capaciteit</th>
                <th className="py-1 pr-2 font-medium">Kosten</th>
                <th className="py-1 pr-2 font-medium">Besparing/jaar</th>
                <th className="py-1 pr-2 font-medium">Terugverdientijd</th>
                <th className="py-1 font-medium">Rendement {LEVENSDUUR_JAAR} jaar</th>
              </tr>
            </thead>
            <tbody>
              {result.capaciteitVergelijking.map((o) => (
                <tr
                  key={o.capaciteitKwh}
                  className={
                    result.aanbevolenCapaciteitKwh === o.capaciteitKwh
                      ? 'border-b border-slate-100 bg-emerald-50 font-semibold'
                      : 'border-b border-slate-100'
                  }
                >
                  <td className="py-1 pr-2 text-left">{o.capaciteitKwh} kWh</td>
                  <td className="py-1 pr-2">{fmtEuro(o.kosten)}</td>
                  <td className="py-1 pr-2">{fmtEuro(o.jaarlijkseBesparing)}</td>
                  <td className="py-1 pr-2">
                    {o.terugverdientijdJaren !== null
                      ? `${o.terugverdientijdJaren} jaar`
                      : `> ${LEVENSDUUR_JAAR} jaar`}
                  </td>
                  <td className="py-1">{Math.round(o.roiPercentage)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {result.aanbevolenCapaciteitKwh !== null
            ? 'Groen gemarkeerd: de aanbevolen grootte (kortste terugverdientijd).'
            : 'Geen enkele grootte verdient zich binnen de levensduur terug; de overige cijfers gaan uit van de minst ongunstige grootte.'}
        </p>
      </div>

      {/* c) CTA — het resultaat blijft altijd zichtbaar, de offerte is optioneel.
          Bij dynamisch + niet rendabel tonen wij de batterij-CTA niet: wij
          hebben zojuist gezegd dat een batterij hier niet past. */}
      {!(result.geenRendabeleCapaciteit && wasDynamisch) && (
        <button
          type="button"
          onClick={onOfferteClick}
          className="w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-emerald-700"
        >
          Vraag 3 offertes aan
        </button>
      )}

      {/* Volledige berekening — transparantie als onderscheid */}
      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-slate-800">
          Bekijk de volledige berekening
        </summary>
        <div className="mt-3 space-y-5 text-sm text-slate-700">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {rij('Jaarverbruik', fmtKwh(result.jaarVerbruikKwh))}
              {rij('Jaarproductie zonnepanelen', fmtKwh(result.jaarProductieKwh))}
              {rij('Zelfverbruikratio zonder batterij', pctFmt(result.ratioZonderBatterij))}
              {rij('Zelfverbruik zonder batterij', fmtKwh(result.zelfverbruikKwh))}
              {rij('Teruglevering zonder batterij', fmtKwh(result.terugleveringKwh))}
              {rij('Zelfverbruikratio met batterij', pctFmt(result.ratioMetBatterij))}
              {rij('Zelfverbruik met batterij', fmtKwh(result.zelfverbruikMetBatterijKwh))}
              {rij('Extra zelfverbruik door batterij', fmtKwh(result.extraZelfverbruikKwh))}
              {rij(
                'Terugleververgoeding',
                `${fmtEuro(result.terugleververgoedingPerKwh)} per kWh`,
              )}
              {rij('Besparing via zelfverbruik', `${fmtEuro(result.besparingZelfverbruik)} per jaar`)}
              {rij('Arbitrage (dynamisch contract)', `${fmtEuro(result.arbitrageOpbrengst)} per jaar`)}
              {rij('Investering batterij', fmtEuro(result.batterijKosten))}
              {rij(
                `Totale besparing over ${LEVENSDUUR_JAAR} jaar`,
                fmtEuro(result.totaalBesparing15Jaar),
              )}
              {rij('Rendement over de levensduur', `${Math.round(result.roiPercentage)}%`)}
            </tbody>
          </table>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-slate-800">
              Cashflow over {LEVENSDUUR_JAAR} jaar (met degradatie)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right tabular-nums">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600">
                    <th className="py-1 pr-2 text-left font-medium">Jaar</th>
                    <th className="py-1 pr-2 font-medium">Capaciteit</th>
                    <th className="py-1 pr-2 font-medium">Besparing</th>
                    <th className="py-1 font-medium">Cumulatief</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cashflow.map((c) => (
                    <tr
                      key={c.jaar}
                      className={
                        result.terugverdientijdJaren === c.jaar
                          ? 'border-b border-slate-100 bg-emerald-50 font-semibold'
                          : 'border-b border-slate-100'
                      }
                    >
                      <td className="py-1 pr-2 text-left">{c.jaar}</td>
                      <td className="py-1 pr-2">{pctFmt(c.capaciteitsFactor)}</td>
                      <td className="py-1 pr-2">{fmtEuro(c.besparing)}</td>
                      <td className="py-1">{fmtEuro(c.cumulatief)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Groen gemarkeerd: het jaar waarin de investering is terugverdiend.
            </p>
          </div>
        </div>
      </details>

      {/* d) Transparantieblok */}
      <details className="rounded-lg border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-slate-800">
          Onze uitgangspunten
        </summary>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>
            Alle aannames zijn gebaseerd op openbare bronnen. Laatst bijgewerkt:{' '}
            <strong>{LAATST_BIJGEWERKT}</strong>. Zie ook{' '}
            <a href="/uitgangspunten" className="underline">
              de volledige toelichting
            </a>
            .
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {UITGANGSPUNTEN.map((u) => (
              <li key={u.label}>
                <strong>{u.label}:</strong> {u.waarde}{' '}
                <span className="text-slate-400">({u.bron})</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}
