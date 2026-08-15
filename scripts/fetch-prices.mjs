/**
 * Build-tijd prijsophaler. Draait automatisch vóór elke build (prebuild).
 *
 * FALLBACK-GARANTIE: als de API faalt, blijft de laatst bekende
 * src/data/prices.json staan en faalt de build NIET. De site toont dan de
 * "laatst bijgewerkt"-datum van die oudere data (en boven de 48 uur een
 * waarschuwing in de UI).
 *
 * Node >= 23.6 draait de TypeScript-module direct via type stripping.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { haalPrijsDataOp } from '../src/lib/data/prices.ts';

const hier = path.dirname(fileURLToPath(import.meta.url));
const doelPad = path.join(hier, '..', 'src', 'data', 'prices.json');

async function main() {
  try {
    const data = await haalPrijsDataOp(new Date());
    await mkdir(path.dirname(doelPad), { recursive: true });
    await writeFile(doelPad, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(
      `[fetch-prices] OK — ${data.uurprijzenVandaag.length} uurprijzen vandaag, ` +
        `spread 90d: €${data.piekDalSpread90d}/kWh, opgehaald op ${data.opgehaaldOp}`,
    );
  } catch (fout) {
    console.warn(`[fetch-prices] API-fout: ${fout.message}`);
    try {
      const bestaand = JSON.parse(await readFile(doelPad, 'utf8'));
      console.warn(
        `[fetch-prices] FALLBACK — bouw gaat door met bestaande data van ${bestaand.opgehaaldOp}`,
      );
      // Bewust exit 0: de build mag niet breken op een API-storing.
    } catch {
      console.error(
        '[fetch-prices] Geen bestaande prices.json als fallback — build kan niet doorgaan.',
      );
      process.exit(1);
    }
  }
}

await main();
