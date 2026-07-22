/**
 * __tests__/unit/legalDocs.test.ts
 *
 * legal/ markdown is the source of truth for in-app legal copy (2A-f).
 * constants/legalDocs.ts is generated from it — this suite fails if they
 * drift (someone edited one side without the other).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { LEGAL_DOCS } from '../../constants/legalDocs';

const SOURCES: Record<string, string> = {
  terms: 'terms-of-service.md',
  privacy: 'privacy-policy.md',
  'safety-pledge': 'community-safety-pledge.md',
};

describe('in-app legal docs stay byte-identical to legal/', () => {
  it.each(Object.entries(SOURCES))('%s matches legal/%s', (slug, file) => {
    const md = readFileSync(join(__dirname, '..', '..', 'legal', file), 'utf8');
    expect(LEGAL_DOCS[slug]).toBeDefined();
    expect(LEGAL_DOCS[slug].markdown).toBe(md);
  });

  it('terms and privacy keep their pending-adviser-review markers', () => {
    expect(LEGAL_DOCS.terms.markdown).toMatch(/PENDING ADVISER REVIEW|PLACEHOLDER/i);
    expect(LEGAL_DOCS.privacy.markdown).toMatch(/PENDING ADVISER REVIEW|PLACEHOLDER/i);
  });
});
