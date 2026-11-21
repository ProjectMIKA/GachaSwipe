import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    PERCHANCE_MODEL_ID,
    normalizePerchanceConfig,
    resolveRelayAuthorization,
    configurePerchanceBridge,
    startRelayListener,
    pingPerchanceBridge,
    generateImageViaPerchance,
    isPerchanceRelayAuthorized
} from '../src/utils/perchanceBridge.js';

test('normalizePerchanceConfig defaults relayConsent to ask and relayNeverAskAgain to false', () => {
    const def = normalizePerchanceConfig({});
    assert.equal(def.relayConsent, 'ask');
    assert.equal(def.relayNeverAskAgain, false);

    const invalid = normalizePerchanceConfig({ relayConsent: 'bogus', relayNeverAskAgain: 1 });
    assert.equal(invalid.relayConsent, 'ask');
    assert.equal(invalid.relayNeverAskAgain, true);

    const allowed = normalizePerchanceConfig({ relayConsent: 'allowed', relayNeverAskAgain: true });
    assert.equal(allowed.relayConsent, 'allowed');
    assert.equal(allowed.relayNeverAskAgain, true);
});

test('resolveRelayAuthorization handles prompt, session decisions, and never-ask-again modes', () => {
    assert.deepEqual(
        resolveRelayAuthorization({ relayConsent: 'ask', relayNeverAskAgain: false }, null),
        { authorized: false, shouldPrompt: true, mode: 'prompt' }
    );
    assert.deepEqual(
        resolveRelayAuthorization({ relayConsent: 'ask', relayNeverAskAgain: false }, 'allowed'),
        { authorized: true, shouldPrompt: false, mode: 'allowed_session' }
    );
    assert.deepEqual(
        resolveRelayAuthorization({ relayConsent: 'ask', relayNeverAskAgain: false }, 'declined'),
        { authorized: false, shouldPrompt: false, mode: 'declined_session' }
    );
    assert.deepEqual(
        resolveRelayAuthorization({ relayConsent: 'allowed', relayNeverAskAgain: true }, null),
        { authorized: true, shouldPrompt: false, mode: 'allowed_auto' }
    );
    assert.deepEqual(
        resolveRelayAuthorization({ relayConsent: 'declined', relayNeverAskAgain: true }, 'allowed'),
        { authorized: false, shouldPrompt: false, mode: 'declined_auto' }
    );
});

test('relay never connects on boot unless Perchance is selected AND authorized', async () => {
    configurePerchanceBridge({
        config: { relayChannel: 'gs-mika-boot-test' },
        selectedImageModel: 'Default (Auto)',
        relayAuthorized: true
    });
    assert.equal(startRelayListener('gs-mika-boot-test'), false);
    assert.equal(await pingPerchanceBridge(200), false);

    configurePerchanceBridge({
        config: { relayChannel: 'gs-mika-boot-test' },
        selectedImageModel: PERCHANCE_MODEL_ID,
        relayAuthorized: false
    });
    assert.equal(isPerchanceRelayAuthorized(), false);
    assert.equal(startRelayListener('gs-mika-boot-test'), false);
    assert.equal(await pingPerchanceBridge(200), false);

    await assert.rejects(
        () => generateImageViaPerchance('1girl, test'),
        (err) => err && err.code === 'PERCHANCE_RELAY_DECLINED'
    );
});
