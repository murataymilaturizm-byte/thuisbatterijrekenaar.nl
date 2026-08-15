# thuisbatterijrekenaar.nl

Onafhankelijke thuisbatterij-rekenaar en kennisbank voor de Nederlandse
markt. Astro (statisch) + React-island voor de rekenaar + Tailwind + MDX.

## Commando's

| Commando            | Actie                                                    |
| :------------------ | :------------------------------------------------------- |
| `npm install`       | Dependencies installeren                                 |
| `npm run dev`       | Dev-server op `localhost:4321`                           |
| `npm run build`     | Productiebuild naar `./dist/` (haalt eerst marktprijzen) |
| `npm test`          | Unit tests (vitest) voor de rekenmodule                  |
| `npm run fetch-prices` | Marktprijzen handmatig verversen (`src/data/prices.json`) |

## Architectuurregels

- **Alle numerieke aannames** staan in `src/config/constants.ts` — nergens
  anders. UI en content lezen daaruit (incl. de `UITGANGSPUNTEN`-tabel).
- `src/lib/calc/engine.ts` is puur TypeScript, zonder React/Astro-imports.
- Marktprijzen: `scripts/fetch-prices.mjs` draait vóór elke build
  (prebuild), schrijft `src/data/prices.json`. Bij API-falen bouwt de site
  door op de laatst bekende data (fallback, build breekt niet).
- Dagelijkse refresh op Vercel: `vercel.json` cron → `api/trigger-rebuild.js`
  → Deploy Hook. Vereist env-vars `DEPLOY_HOOK_URL` en `CRON_SECRET`
  (zie `.env.example`). Geen geheimen in de code.

## Prinsjesdag-draaiboek (btw-besluit thuisbatterij)

Klaarstaand concept: `src/content/pages/_draft-prinsjesdag-btw.mdx`
(`published: false`, geen route — bestanden met `_`-prefix krijgen ook geen
route en de kennisbank filtert op `published`).

Zodra het besluit bekend is:

1. Vul alle `[INVULLEN...]`-blokken in het concept in (besluit,
   ingangsdatum, bron met link) en zet `gepubliceerd` op de publicatiedatum.
2. Zet `published: true` en hernoem het bestand naar
   `prinsjesdag-btw-thuisbatterij.mdx` (zonder `_`).
3. Maak de routepagina `src/pages/prinsjesdag-btw-thuisbatterij.astro`
   (kopieer een bestaande wrapper, bijv. `btw-thuisbatterij.astro`, en pas
   het importpad aan).
4. Werk `src/content/pages/btw-thuisbatterij.mdx` bij (huidige situatie →
   nieuw besluit) en pas zo nodig `BATTERIJ_PRIJS_PER_KWH` /
   `LAATST_BIJGEWERKT` aan in `src/config/constants.ts`.
5. `npm test`, `npm run build`, deploy.
