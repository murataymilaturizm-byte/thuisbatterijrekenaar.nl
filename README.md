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

## Contentpijplijn — hoe een artikel op de site komt

Er is geen live adminpaneel. Goedkeuring loopt via GitHub; publiceren gebeurt
altijd met de hand.

1. **Onderwerp in de wachtrij.** Voeg een item toe aan `content-queue.json` met
   `slug`, `titel`, `cluster`, `zoekintentie`, `informatiewinst` en
   `status: "wachtrij"`. **`informatiewinst` is verplicht** — dat veld beschrijft
   wat wij brengen dat concurrenten niet hebben. Is het leeg, dan slaat de
   generator het onderwerp over en logt een waarschuwing.
2. **Maandagochtend.** De workflow `.github/workflows/generate-draft.yml` draait
   (06:00 UTC, of handmatig via *Run workflow*), genereert één concept en opent
   een pull request `concept/{slug}` met de titel `Concept: {titel}`. Er wordt
   nooit rechtstreeks naar `main` geschreven.
3. **Lezen en controleren.** Open `/concepten` (lokaal via `npm run dev`, of de
   Vercel-preview van de PR). Daar staat per concept de volledige tekst, het
   aantal `[TEYIT GEREKLI]`-markeringen en de kwaliteitscontrole:
   rode punten blokkeren publicatie, gele punten vragen om een menselijke blik.
4. **Corrigeren.** Bewerk de tekst in de PR zelf.
5. **Publiceren.** In het conceptbestand: `published: true` zetten en de
   `_`-prefix uit de bestandsnaam halen
   (`_concept-x.mdx` → `x.mdx`). Maak daarna de routepagina
   `src/pages/x.astro` aan (kopieer een bestaande wrapper) en zet het
   wachtrij-item op `status: "gepubliceerd"`. Dan pas de PR mergen.
6. **Vercel deployt automatisch** na de merge.

Concepten (`_`-prefix of `published: false`) komen niet in `dist`, niet in de
sitemap en niet in de kennisbank. `/concepten` zelf staat op `noindex` en in
`robots.txt` op `Disallow`.

Handmatig een concept genereren: `npm run generate-draft` (vereist
`ANTHROPIC_API_KEY` in `.env`; in CI de gelijknamige GitHub-secret).

**AI-transparantie.** Artikelen worden met AI opgesteld en vóór publicatie
menselijk gecontroleerd en geredigeerd; de redactionele verantwoordelijkheid
staat vermeld op `/over-ons`.

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
