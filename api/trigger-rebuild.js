/**
 * Vercel Cron-doelwit: triggert dagelijks een nieuwe deploy via de Deploy Hook,
 * zodat de statische site verse marktprijzen bakt (zie scripts/fetch-prices.mjs).
 *
 * Beveiliging: Vercel stuurt bij cron-aanroepen "Authorization: Bearer <CRON_SECRET>"
 * mee wanneer de omgevingsvariabele CRON_SECRET is gezet. Zonder geldige header
 * wordt de aanroep geweigerd. Geen geheimen in de code — alles via env.
 */

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ ok: false, fout: 'niet geautoriseerd' });
    return;
  }

  const hookUrl = process.env.DEPLOY_HOOK_URL;
  if (!hookUrl) {
    res.status(500).json({ ok: false, fout: 'DEPLOY_HOOK_URL ontbreekt' });
    return;
  }

  const antwoord = await fetch(hookUrl, { method: 'POST' });
  if (!antwoord.ok) {
    res.status(502).json({ ok: false, fout: `deploy hook gaf ${antwoord.status}` });
    return;
  }
  res.status(200).json({ ok: true });
}
