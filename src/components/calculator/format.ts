/** Weergavehelpers (nl-NL). Geen rekenlogica — die zit in lib/calc/engine.ts. */

export const fmtEuro = (n: number): string =>
  new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

export const fmtKwh = (n: number): string =>
  `${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(n)} kWh`;

export const fmtJaren = (n: number): string =>
  `${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(n)} jaar`;

export const POSTCODE_REGEX = /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/;
