/**
 * __tests__/unit/stripeForwardRefPatch.test.ts
 *
 * Regression guard for the @stripe/stripe-react-native + React 19 forwardRef bug
 * (see PROGRESS.md, 13 June 2026). stripe-react-native@0.65.1 shipped
 * `PaymentMethodMessagingElement` as `forwardRef(function(_ref){…})` — a
 * SINGLE-parameter render function. React 19 validates forwardRef arity at
 * `forwardRef()` CALL time (i.e. when the module is imported), so importing the
 * Stripe barrel (StripeProvider in app/_layout.tsx, useStripe in the payment
 * screens) logged a console.error and threw up a LogBox red overlay that
 * covered the signup screen.
 *
 * Fixed upstream in @stripe/stripe-react-native@0.68.0 — the component no
 * longer uses forwardRef at all. The patch-package workaround was removed; this
 * scans every built file in the package (not just one), so it still catches a
 * regression if a future Stripe upgrade reintroduces a single-arg forwardRef
 * anywhere in the package.
 */
import fs from 'fs';
import path from 'path';

const stripeRoot = path.dirname(require.resolve('@stripe/stripe-react-native/package.json'));

function listJsFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

describe('@stripe/stripe-react-native — no single-arg forwardRef (React 19 compat)', () => {
  it('no built file uses a single-parameter forwardRef render function', () => {
    const libDir = path.join(stripeRoot, 'lib');
    const offenders = listJsFiles(libDir).filter((file) => {
      const src = fs.readFileSync(file, 'utf8');
      // A single-arg forwardRef render fn: forwardRef(function(x){ or forwardRef((x)=>{
      // with no second parameter before the closing paren.
      return /forwardRef\)?\(function\s*\(\s*[a-zA-Z_$][\w$]*\s*\)\s*\{/.test(src)
        || /forwardRef\)?\(\s*\(\s*[a-zA-Z_$][\w$]*\s*\)\s*=>/.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it('no patch-package patch is needed for this fix (removed — fixed upstream in 0.68.0)', () => {
    // Check only for a stripe-react-native patch specifically, not that the
    // whole patches/ directory is absent — a future unrelated patch for a
    // different package shouldn't fail this regression guard.
    const patchesDir = path.join(__dirname, '../../patches');
    if (!fs.existsSync(patchesDir)) return;
    const stripePatches = fs.readdirSync(patchesDir).filter((f) => f.startsWith('@stripe+stripe-react-native+'));
    expect(stripePatches).toEqual([]);
  });
});
