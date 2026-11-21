import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    REPLY_TAGS,
    TIMING_BOUND_TAGS,
    OOB_PRIMARY_KINDS,
    HOLD_BACK_TAGS,
    buildMachineTagHoldBackPatterns,
    findOpenMachineTagIndex,
    OOB_CONTRACT_DEFAULTS,
    resolveContractMode,
    PHOTO_CONTRACT_OOB,
    buildOobPhotoDirective,
    buildOobGroupPhotoDirective,
    PHOTO_CONTRACT_OOB_GROUP,
    buildLegacyPhotoDirective,
    PHOTO_IDENTITY_LOCK_LEGACY,
    LIFE_AUDIT_RULE_OOB,
    DREAM_TRACKING_RULE_OOB,
} from '../src/utils/replyContract.js';

test('REPLY_TAGS: canonical names are unique snake_case', () => {
    const values = Object.values(REPLY_TAGS);
    assert.equal(new Set(values).size, values.length, 'no duplicate tag names');
    for (const v of values) assert.match(v, /^[a-z][a-z0-9_]*$/);
});

test('HOLD_BACK_TAGS: the skill LAW holds — <heat> and <send_image> are guarded', () => {
    for (const t of ['heat', 'send_image', 'image_prompt', 'memory']) {
        assert.ok(HOLD_BACK_TAGS.includes(t), `${t} must be in the hold-back list`);
    }
});

test('TIMING_BOUND_TAGS vs OOB_PRIMARY_KINDS: the doctrine partition is disjoint', () => {
    for (const t of TIMING_BOUND_TAGS) {
        assert.equal(OOB_PRIMARY_KINDS[t], undefined, `${t} cannot be both timing-bound and OOB-primary`);
    }
    for (const t of Object.keys(OOB_PRIMARY_KINDS)) {
        assert.equal(TIMING_BOUND_TAGS.includes(t), false, `${t} cannot be both OOB-primary and timing-bound`);
    }
});

test('hold-back: closed envelopes are fully visible (index -1)', () => {
    const closed = 'hey <send_image>true</send_image><heat>Calm</heat> cute <3';
    assert.equal(findOpenMachineTagIndex(closed), -1);
    assert.equal(findOpenMachineTagIndex('plain chatter only'), -1);
    assert.equal(findOpenMachineTagIndex(''), -1);
    assert.equal(findOpenMachineTagIndex(null), -1);
});

test('hold-back: unclosed tags are caught from their opener (incl. attributes)', () => {
    assert.equal(findOpenMachineTagIndex('msg <send_image>tru'), 4);
    assert.equal(findOpenMachineTagIndex('hey <heat>Calm'), 'hey <heat>Calm'.indexOf('<heat'));
    const attrForm = 'pic <image_prompt type="selfie"><outfit>dress';
    assert.equal(findOpenMachineTagIndex(attrForm), attrForm.indexOf('<image_prompt'));
    const midStream = 'hi <send_image>true</send_image> and <heat>Calm';
    assert.equal(findOpenMachineTagIndex(midStream), midStream.indexOf('<heat'), 'closed tags never hold');
    const earliest = '<memory>( Tavern </memory> x <routine_update>';
    assert.equal(findOpenMachineTagIndex(earliest), earliest.indexOf('<routine_update'), 'closed memory ignored, open routine caught');
});

test('hold-back: patterns compile and each targets exactly its tag', () => {
    const patterns = buildMachineTagHoldBackPatterns();
    assert.equal(patterns.length, HOLD_BACK_TAGS.length);
    assert.ok(patterns.some((p) => p.test('x <heat>Calm')), 'a pattern matches the unclosed heat opener');
});

test('resolveContractMode: capability gates first, explicit false forces legacy', () => {
    assert.equal(resolveContractMode(false, true), 'legacy');
    assert.equal(resolveContractMode(false, false), 'legacy');
    assert.equal(resolveContractMode(false, undefined), 'legacy');
    assert.equal(resolveContractMode(true, true), 'oob');
    assert.equal(resolveContractMode(true, undefined), 'oob');
    assert.equal(resolveContractMode(true, false), 'legacy');
});

test('OOB_CONTRACT_DEFAULTS: armed-by-default on capable hosts', () => {
    assert.deepEqual(OOB_CONTRACT_DEFAULTS, { photoTags: true, lifeAudit: true, dreamJudge: true });
});

test('PHOTO_CONTRACT_OOB: trigger-only — verdicts taught, camera NOT taught', () => {
    assert.ok(PHOTO_CONTRACT_OOB.includes('<send_image>false</send_image>'));
    assert.ok(PHOTO_CONTRACT_OOB.includes('<send_image>true</send_image>'));
    assert.ok(PHOTO_CONTRACT_OOB.includes('NARRATION AGREEMENT'), 'narration↔verdict law survives');
    assert.ok(!PHOTO_CONTRACT_OOB.includes('danbooru'), 'no tag-format teaching in OOB mode');
    assert.ok(!PHOTO_CONTRACT_OOB.includes('<image_prompt>'), 'no image_prompt authoring in OOB mode');
    assert.ok(!PHOTO_CONTRACT_OOB.includes('hair color'), 'identity lock moved to the validator');
});

test('buildOobPhotoDirective: decision deltas only, never the camera', () => {
    const retry = buildOobPhotoDirective({ variant: 'retry' });
    assert.ok(retry.includes('MUST'));
    assert.ok(retry.includes('<send_image>true</send_image>'));
    assert.ok(!retry.includes('<image_prompt'));
    const asked = buildOobPhotoDirective({ variant: 'asked', autonomy: true });
    assert.ok(asked.includes('<send_image>true</send_image>') && asked.includes('<send_image>false</send_image>'));
    const cooldown = buildOobPhotoDirective({ variant: 'cooldown' });
    assert.ok(!cooldown.includes('<send_image>true</send_image>'));
    for (const v of ['retry', 'asked', 'proactive', 'cooldown', 'off']) {
        assert.ok(!buildOobPhotoDirective({ variant: v }).includes('<image_prompt'), `${v}: camera desk owns tags`);
    }
});

test('buildLegacyPhotoDirective: ONE example per variant + identity lock line', () => {
    for (const v of ['retry', 'asked', 'proactive', 'cooldown', 'off']) {
        const d = buildLegacyPhotoDirective({ variant: v });
        const count = (d.match(/<image_prompt>/g) || []).length;
        assert.ok(count <= 1, `${v}: at most one concrete example (was the 3x duplication crime)`);
    }
    const retry = buildLegacyPhotoDirective({ variant: 'retry', attireHint: 'lingerie', attireInstruction: 'CRITICAL: tease mode!' });
    assert.ok(retry.includes('MUST') && retry.includes('lingerie') && retry.includes('CRITICAL: tease mode!'));
    assert.ok(retry.includes('<pose_and_expression>') && retry.includes('<environment>'));
    const askedNoAutonomy = buildLegacyPhotoDirective({ variant: 'asked', autonomy: false });
    assert.ok(askedNoAutonomy.includes('firmly refusing'));
    assert.ok(PHOTO_IDENTITY_LOCK_LEGACY.includes('IDENTITY LOCK') && PHOTO_IDENTITY_LOCK_LEGACY.includes('<image_prompt>'));
});

test('OOB prohibition lines: name their dead tags, teach zero formats', () => {
    assert.ok(LIFE_AUDIT_RULE_OOB.includes('<routine_update>') && LIFE_AUDIT_RULE_OOB.includes('<wardrobe_addition>'));
    assert.ok(LIFE_AUDIT_RULE_OOB.includes('never output'));
    assert.ok(DREAM_TRACKING_RULE_OOB.includes('<dream_state>') && DREAM_TRACKING_RULE_OOB.includes('never output'));
    assert.ok(!LIFE_AUDIT_RULE_OOB.includes('true|false') && !DREAM_TRACKING_RULE_OOB.includes('lucidity_delta'));
});

// ─── ✨ v2.7.62 GROUP OOB-PHOTO PRIMARY (Phase 1b) ✨ ───

test('PHOTO_CONTRACT_OOB_GROUP: per-reply verdicts + camera desk + GM ban, zero authoring teaching', () => {
    assert.ok(PHOTO_CONTRACT_OOB_GROUP.includes('<send_image>false</send_image>'));
    assert.ok(PHOTO_CONTRACT_OOB_GROUP.includes('<send_image>true</send_image>'));
    assert.ok(PHOTO_CONTRACT_OOB_GROUP.includes('NARRATION AGREEMENT'), 'group narration↔verdict law survives');
    assert.ok(PHOTO_CONTRACT_OOB_GROUP.includes('camera desk'), 'the system owns the camera');
    assert.ok(PHOTO_CONTRACT_OOB_GROUP.includes('M.I.K.A. Proxy / the Game Master CANNOT send images'), 'GM camera ban preserved');
    assert.ok(!PHOTO_CONTRACT_OOB_GROUP.includes('<outfit>'), 'no tag-format teaching in group OOB mode');
    assert.ok(!PHOTO_CONTRACT_OOB_GROUP.includes('danbooru'), 'no tag-style teaching in group OOB mode');
    // The single <image_prompt> mention is the PROHIBITION, not a format teaching.
    const mentions = PHOTO_CONTRACT_OOB_GROUP.split('<image_prompt>').length - 1;
    assert.equal(mentions, 1, 'exactly one mention');
    assert.ok(PHOTO_CONTRACT_OOB_GROUP.includes('NEVER output <image_prompt>'), 'and it is the prohibition');
});

test('buildOobGroupPhotoDirective: reply-scoped verdicts, camera desk, never tags', () => {
    const YES = '<send_image>true</send_image>';
    const NO = '<send_image>false</send_image>';
    const retry = buildOobGroupPhotoDirective({ variant: 'retry' });
    assert.ok(retry.includes(YES) && retry.includes('Do NOT output'));
    const asked = buildOobGroupPhotoDirective({ variant: 'asked', autonomy: true });
    assert.ok(asked.includes(YES) && asked.includes(NO) && asked.includes('persona'));
    const askedNo = buildOobGroupPhotoDirective({ variant: 'asked', autonomy: false });
    assert.ok(askedNo.includes('firmly refuses'));
    const cooldown = buildOobGroupPhotoDirective({ variant: 'cooldown' });
    assert.ok(cooldown.includes(NO) && !cooldown.includes(YES), 'cooldown forbids the YES verdict');
    const off = buildOobGroupPhotoDirective({ variant: 'off' });
    assert.ok(off.includes(NO) && !off.includes(YES));
    for (const v of ['retry', 'asked', 'cooldown', 'off']) {
        const d = buildOobGroupPhotoDirective({ variant: v });
        assert.ok(!d.includes('<image_prompt'), `${v}: camera desk owns tags`);
        assert.ok(d.includes('camera desk'), `${v}: desk line present`);
        assert.ok(d.includes('<reply>'), `${v}: reply-scoped`);
    }
});

