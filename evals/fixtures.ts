import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { WebhookEventSchema } from '@payments-case-agent/contracts';

const FIXTURES_DIR = resolve(import.meta.dirname, '../data/webhook-fixtures');

/** One eval case as its webhook fixture in `data/webhook-fixtures` sends it. */
export interface CaseFixture {
  customerId: string;
  text: string;
  receivedAt: Date;
}

/** The webhook fixture of a scenario id (data/webhook-fixtures/<id>.json); throws when there is none. */
export function fixtureOf(caseId: string): CaseFixture {
  let raw: string;
  try {
    raw = readFileSync(resolve(FIXTURES_DIR, `${caseId}.json`), 'utf8');
  } catch (error) {
    throw new Error(`no webhook fixture for ${caseId}`, { cause: error });
  }
  const event = WebhookEventSchema.parse(JSON.parse(raw));
  return {
    customerId: event.customer_id,
    text: event.text,
    receivedAt: new Date(event.created_at),
  };
}
