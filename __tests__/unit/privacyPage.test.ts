/**
 * __tests__/unit/privacyPage.test.ts
 *
 * website/privacy/index.html is GENERATED from legal/privacy-policy.md
 * (scripts/build-privacy-page.js) and must stay in sync — the first-contact SMS
 * sent to nominated contacts links to htwa-app.com/privacy as the full Article 14
 * notice, so a stale or missing page would be a compliance gap.
 */
import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildPrivacyHtml, markdownToHtml } = require('../../scripts/build-privacy-page');

const root = path.resolve(__dirname, '../..');
const md = fs.readFileSync(path.join(root, 'legal/privacy-policy.md'), 'utf8');
const page = fs.readFileSync(path.join(root, 'website/privacy/index.html'), 'utf8');

describe('website/privacy/index.html', () => {
  it('is exactly what scripts/build-privacy-page.js generates from legal/privacy-policy.md (run `node scripts/build-privacy-page.js` after editing the policy)', () => {
    expect(page).toBe(buildPrivacyHtml(md));
  });

  it('contains the Article 14 nominated-contact notice (§4A) the SMS links to', () => {
    expect(page).toContain('<h2>4A. Notice to Nominated Contacts</h2>');
    expect(page).toContain('hello@htwa-app.com');
  });

  it('never leaks internal ADVISER NOTE comments to the public page', () => {
    expect(md).toContain('ADVISER NOTE'); // sanity: they exist in the source
    expect(page).not.toContain('ADVISER NOTE');
  });

  it('stays out of search indexes until the adviser signs the policy off', () => {
    expect(page).toContain('<meta name="robots" content="noindex">');
  });

  it('keeps the draft marker from the policy visible', () => {
    expect(page).toContain('PENDING ADVISER REVIEW');
  });

  it('renders the retention table as a real table', () => {
    expect(page).toContain('<table>');
    expect(page).toMatch(/<td>In-app messages<\/td>/);
  });
});

describe('markdownToHtml', () => {
  it('escapes raw HTML in the source', () => {
    expect(markdownToHtml('a <script>x</script> b')).toContain('&lt;script&gt;');
  });
  it('renders nested bullets', () => {
    expect(markdownToHtml('- a\n  - b\n- c')).toBe('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>');
  });
  it('only turns http(s)/mailto links into anchors', () => {
    expect(markdownToHtml('[x](javascript:alert(1))')).not.toContain('<a ');
    expect(markdownToHtml('[x](https://htwa-app.com)')).toContain('<a href="https://htwa-app.com">x</a>');
  });
});
