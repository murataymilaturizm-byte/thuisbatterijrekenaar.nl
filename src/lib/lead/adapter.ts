/**
 * Lead-verzendadapter — STUB.
 * De lead-ontvanger (koper) is nog niet bekend; zodra die bekend is,
 * wordt hier de echte verzending geïmplementeerd (bijv. POST naar
 * LEAD_WEBHOOK_URL uit de omgevingsvariabelen — nooit hardcoded).
 *
 * De formuliervelden zijn VAST — niet wijzigen zonder afstemming.
 */

export interface LeadPayload {
  postcode: string;
  capaciteitKwh: number;
  jaarVerbruikKwh: number;
  naam: string;
  email: string;
  telefoon: string;
  akkoordPrivacy: boolean;
}

export interface LeadResult {
  ok: boolean;
}

export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  // STUB: alleen loggen totdat de ontvanger is aangesloten.
  console.log('[lead-stub] payload:', payload);
  return { ok: true };
}
