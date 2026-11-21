import { test } from 'node:test';
import assert from 'node:assert/strict';

import { OOB_ASKS } from '../src/utils/oobChannel.js';

test('photoTags ask: absent/empty attireDirective = byte-identical legacy ask', () => {
    const base = OOB_ASKS.photoTags({ charName: 'Aria', userName: 'Master', recentExcerpt: 'hey', selfieExpected: false });
    const withEmpty = OOB_ASKS.photoTags({ charName: 'Aria', userName: 'Master', recentExcerpt: 'hey', selfieExpected: false, attireDirective: '' });
    assert.equal(base.message, withEmpty.message, 'empty must equal absent');
    assert.ok(!base.message.includes('ATTIRE BASELINE'), 'legacy rescue asks stay byte-identical');
});

test('photoTags ask: attireDirective rides the message (OOB PHOTO PRIMARY)', () => {
    const ask = OOB_ASKS.photoTags({
        charName: 'Aria',
        userName: 'Master',
        recentExcerpt: 'hey',
        selfieExpected: false,
        attireDirective: 'CRITICAL: Strict baseline tease mode is ACTIVE (TEASE). In any photo you send, you MUST wear revealing attire.',
    });
    assert.ok(ask.message.includes('ATTIRE BASELINE'), 'baseline line present');
    assert.ok(ask.message.includes('MUST obey it'), 'the obedience clause is taught');
    assert.ok(ask.message.includes('tease mode is ACTIVE'), 'the actual baseline content rides');
});

test('photoTags ask: dynamic ceiling cascades through the same key', () => {
    const ask = OOB_ASKS.photoTags({
        charName: 'Aria',
        userName: 'Master',
        recentExcerpt: 'hey',
        selfieExpected: false,
        attireDirective: '- OUTFIT DIRECTIVE: Dynamic intensity scaling is active (Ceiling: TEASE). Autonomously choose your outfit tags without exceeding this ceiling.',
    });
    assert.ok(ask.message.includes('Ceiling: TEASE'));
});
