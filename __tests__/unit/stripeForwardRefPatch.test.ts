/**
 * __tests__/unit/stripeForwardRefPatch.test.ts
 *
 * Regression guard for the @stripe/stripe-react-native + React 19 forwardRef bug.
 *
 * stripe-react-native@0.65.1 ships `PaymentMethodMessagingElement` as
 * `forwardRef(function(_ref){…})` — a SINGLE-parameter render function. React 19
 * validates forwardRef arity at `forwardRef()` CALL time (i.e. when the module is
 * imported), so importing the Stripe barrel (StripeProvider in app/_layout.tsx,
 * useStripe in the payment screens) logged:
 *   "forwardRef render functions accept exactly two parameters: props and ref.
 *    Did you forget to use the ref parameter?"
 * In React Native dev this surfaced as a LogBox red overlay that covered the
 * signup screen, making the Continue button look like it had vanished.
 *
 * Fix: a patch-package patch rewrites the render fn to `(_ref, ref)`. These tests
 * fail loudly if the patch ever stops applying (e.g. a version bump without a
 * re-generated patch), since that would bring the dev-time error back.
 */
import fs from 'fs';
import path from 'path';

const stripeRoot = path.dirname(require.resolve('@stripe/stripe-react-native/package.json'));

const BUILT_FILES = [
  'lib/module/components/PaymentMethodMessagingElement.js',
  'lib/commonjs/components/PaymentMethodMessagingElement.js',
];

describe('@stripe/stripe-react-native forwardRef patch (React 19 compat)', () => {
  it.each(BUILT_FILES)('%s uses a 2-arg forwardRef render fn (no single-arg)', (rel) => {
    const src = fs.readFileSync(path.join(stripeRoot, rel), 'utf8');
    // The buggy single-arg form must be gone…
    expect(src).not.toMatch(/forwardRef\)\(function\(_ref\)\{/);
    // …and the patched two-arg form must be present.
    expect(src).toMatch(/forwardRef\)\(function\(_ref,ref\)\{/);
  });

  it('the patch file is committed so the fix re-applies on every install', () => {
    const patch = path.join(__dirname, '../../patches/@stripe+stripe-react-native+0.65.1.patch');
    expect(fs.existsSync(patch)).toBe(true);
  });
});
