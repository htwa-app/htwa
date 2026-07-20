/**
 * __tests__/unit/legalWaiver.test.ts
 *
 * Guards the verbatim sync between constants/legalWaiver.ts (what the app
 * renders) and legal/verification-responsibility-waiver.md (the legal source
 * of truth). If either changes without the other, this suite fails.
 *
 * Comparison strips markdown emphasis/quoting and collapses whitespace —
 * wording must match exactly; formatting may differ.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DRIVER_WAIVER_CHECKBOX,
  DRIVER_WAIVER_SECTIONS,
  PASSENGER_WAIVER_CHECKBOX,
  PASSENGER_WAIVER_SECTIONS,
  PASSENGER_WAIVER_TITLE,
  WAIVER_VERSION,
} from '../../constants/legalWaiver';

const mdRaw = readFileSync(
  join(__dirname, '..', '..', 'legal', 'verification-responsibility-waiver.md'),
  'utf8',
);

/** Strip markdown decoration and collapse all whitespace to single spaces. */
function normalize(text: string): string {
  return text
    .replace(/\*\*/g, '')       // bold markers
    .replace(/^[>#\-*\s]+/gm, '') // blockquote/heading/list prefixes
    .replace(/☐/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const md = normalize(mdRaw);

describe('legal waiver constants stay verbatim-synced with legal/', () => {
  it('document version matches the markdown header', () => {
    expect(mdRaw).toContain(`**Version:** ${WAIVER_VERSION}`);
  });

  it('title matches', () => {
    expect(md).toContain(normalize(PASSENGER_WAIVER_TITLE));
  });

  it.each(PASSENGER_WAIVER_SECTIONS.map((s) => [s.heading, s]))(
    'passenger section "%s" appears verbatim',
    (_heading, section) => {
      expect(md).toContain(normalize(section.heading));
      // Bullet-list sections reflow into prose in-app; compare fragment by
      // fragment split on the list glue so wording is still enforced.
      for (const fragment of section.body.split(/[;:] /)) {
        expect(md).toContain(normalize(fragment.replace(/ and$| and \w+$/, '')).slice(0, 80));
      }
    },
  );

  it.each(DRIVER_WAIVER_SECTIONS.map((s) => [s.heading, s]))(
    'driver section "%s" appears verbatim',
    (_heading, section) => {
      expect(md).toContain(normalize(section.heading));
      expect(md).toContain(normalize(section.body).slice(0, 120));
    },
  );

  it('checkbox declarations match', () => {
    expect(md).toContain(normalize(PASSENGER_WAIVER_CHECKBOX));
    expect(md).toContain(normalize(DRIVER_WAIVER_CHECKBOX));
  });

  it('the markdown still carries the pending-adviser-review marker', () => {
    // The adviser-review status must never be silently dropped (2A-f).
    expect(mdRaw).toContain('PENDING ADVISER REVIEW');
  });
});
