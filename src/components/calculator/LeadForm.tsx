import { useState } from 'react';
import { submitLead } from '../../lib/lead/adapter';
import type { LeadPayload } from '../../lib/lead/adapter';

interface Props {
  postcode: string;
  capaciteitKwh: number;
  jaarVerbruikKwh: number;
  onVerzonden: () => void;
}

/**
 * Offerteformulier. Velden zijn VAST (afgestemd op de toekomstige
 * lead-ontvanger): postcode, capaciteit, jaarverbruik, naam, email,
 * telefoon, akkoordPrivacy.
 */
export default function LeadForm({
  postcode,
  capaciteitKwh,
  jaarVerbruikKwh,
  onVerzonden,
}: Props) {
  const [naam, setNaam] = useState('');
  const [email, setEmail] = useState('');
  const [telefoon, setTelefoon] = useState('');
  const [akkoordPrivacy, setAkkoordPrivacy] = useState(false);
  // Honeypot: onzichtbaar veld; mensen laten het leeg, bots vullen het in
  const [website, setWebsite] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (website !== '') {
      // Bot gedetecteerd: doe alsof het gelukt is, maar verstuur niets
      onVerzonden();
      return;
    }
    if (!naam.trim() || !email.trim() || !telefoon.trim()) {
      setFout('Vul alstublieft alle velden in.');
      return;
    }
    if (!akkoordPrivacy) {
      setFout('U dient akkoord te gaan met de privacyverklaring.');
      return;
    }
    setFout(null);
    setBezig(true);
    const payload: LeadPayload = {
      postcode,
      capaciteitKwh,
      jaarVerbruikKwh,
      naam: naam.trim(),
      email: email.trim(),
      telefoon: telefoon.trim(),
      akkoordPrivacy,
    };
    const result = await submitLead(payload);
    setBezig(false);
    if (result.ok) onVerzonden();
    else setFout('Er ging iets mis. Probeer het later opnieuw.');
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <h3 className="text-xl font-bold text-slate-900">Vraag 3 offertes aan</h3>
      <p className="text-sm text-slate-600">
        Wij zijn onafhankelijk en verkopen zelf geen batterijen. Uw aanvraag
        wordt doorgestuurd naar maximaal drie installateurs.
      </p>

      <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3">
        <div>
          <span className="block font-semibold">Postcode</span>
          {postcode}
        </div>
        <div>
          <span className="block font-semibold">Capaciteit</span>
          {capaciteitKwh} kWh
        </div>
        <div>
          <span className="block font-semibold">Jaarverbruik</span>
          {Math.round(jaarVerbruikKwh)} kWh
        </div>
      </div>

      {/* Honeypot — visueel en voor schermlezers verborgen */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website (niet invullen)
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block font-medium text-slate-700">Naam</span>
        <input
          type="text"
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
          className={inputClass}
          autoComplete="name"
          required
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-medium text-slate-700">E-mailadres</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          autoComplete="email"
          required
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-medium text-slate-700">Telefoonnummer</span>
        <input
          type="tel"
          value={telefoon}
          onChange={(e) => setTelefoon(e.target.value)}
          className={inputClass}
          autoComplete="tel"
          required
        />
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={akkoordPrivacy}
          onChange={(e) => setAkkoordPrivacy(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-slate-300 accent-emerald-600"
          required
        />
        <span className="text-sm text-slate-600">
          Ik ga akkoord met de{' '}
          <a href="/privacyverklaring" className="underline" target="_blank">
            privacyverklaring
          </a>{' '}
          en met het delen van mijn gegevens met maximaal drie installateurs.
        </span>
      </label>

      {fout && <p className="text-sm font-medium text-red-600">{fout}</p>}

      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-lg bg-emerald-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {bezig ? 'Bezig met verzenden…' : 'Verstuur aanvraag'}
      </button>
    </form>
  );
}
