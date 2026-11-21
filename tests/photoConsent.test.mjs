/**
 * ✨ MIKA'S PHOTO CONSENT ENGINE — the group verdict-first fix (v2.7.61) ✨
 *
 * Plain `node --test` — ZERO new dependencies. Locks the fail-closed photo gate shared
 * by the 1-on-1 commit and BOTH group parse paths (src/utils/photoConsent.js):
 * THE VERDICT LAW — an explicit <send_image>false</send_image> outranks loose camera
 * narration; only authored tags or a hard delivery confirmation override, and a genuine
 * verbal refusal still wins. Regression cases sourced from the live bug (group RP
 * asterisk narration spawning a photo with every message).
 *
 * Run: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    PHOTO_SEND_CONFIRMATION_RE,
    PHOTO_CAMERA_ASTERISK_RE,
    PHOTO_CAMERA_PLAIN_RE,
    decideGenuineRefusal,
    decideSendsPhoto,
    extractGroupImagePrompt,
} from '../src/utils/photoConsent.js';

// ─── THE BUG (image with every group message) ───

test('VERDICT LAW: refused + innocuous phone narration = NO photo (the live bug)', () => {
    const out = decideSendsPhoto({
        sendImageVerdict: 'false',
        messageText: '*takes her phone out of her pocket* lol give me a sec',
    });
    assert.equal(out.send, false);
    assert.equal(out.reason, 'verdict_refused');
    assert.equal(out.narrationTriggered, true, 'narration matched — the gate suppressed it');
});

test('VERDICT LAW: refused + asterisk camera action alone = NO photo', () => {
    const out = decideSendsPhoto({
        sendImageVerdict: 'false',
        messageText: '*holds her phone up to show the group chat*',
    });
    assert.equal(out.send, false);
});

test('VERDICT LAW: refused + hard delivery confirmation = photo (comply/typo rescue parity)', () => {
    const out = decideSendsPhoto({
        sendImageVerdict: 'false',
        messageText: "fine~ here's the pic you wanted",
    });
    assert.equal(out.send, true);
    assert.equal(out.reason, 'refused_overridden');
});

test('VERDICT LAW: refused + explicit tags = photo', () => {
    const out = decideSendsPhoto({
        sendImageVerdict: 'false',
        messageText: 'mmkay',
        imagePromptText: 'sundress, selfie, looking at viewer, bedroom',
    });
    assert.equal(out.send, true);
});

// ─── Explicit verdicts ───

test('agreed verdict sends on plain chatter', () => {
    const out = decideSendsPhoto({ sendImageVerdict: 'true', messageText: 'hehe hi~' });
    assert.equal(out.send, true);
    assert.equal(out.reason, 'verdict_true');
});

test('agreed verdict blocked by a genuine verbal refusal', () => {
    const out = decideSendsPhoto({ sendImageVerdict: 'true', messageText: 'no way, not gonna send that' });
    assert.equal(out.send, false);
    assert.equal(out.reason, 'verdict_true_refused_in_prose');
});

// ─── Missing verdict (legacy heuristic branch) ───

test('no verdict + plain chatter = NO photo', () => {
    assert.equal(decideSendsPhoto({ messageText: 'omg did you see the show last night??' }).send, false);
});

test('no verdict + asterisk camera action = photo (legacy heuristics survive, autonomy ON)', () => {
    const out = decideSendsPhoto({ messageText: '*snaps a quick selfie before the mirror*' });
    assert.equal(out.send, true);
    assert.equal(out.reason, 'heuristic');
});

test('no verdict + user asked (no refusal) = photo', () => {
    assert.equal(decideSendsPhoto({ messageText: 'hehe okay~', userAskedForPhoto: true }).send, true);
});

// ─── Selfie autonomy OFF (solo legacy contract) ───

test('autonomy OFF: narration alone never offers', () => {
    assert.equal(decideSendsPhoto({ messageText: '*poses with her phone out*', selfieAutonomy: false }).send, false);
});

test('autonomy OFF: user asked = photo (unless VIP plug)', () => {
    assert.equal(decideSendsPhoto({ messageText: 'hmph fine', userAskedForPhoto: true, selfieAutonomy: false }).send, true);
    assert.equal(decideSendsPhoto({ messageText: 'hmph fine', userAskedForPhoto: true, userAskedForVip: true, selfieAutonomy: false }).send, false);
});

// ─── GM / SYSTEM / Proxy — never a camera ───

test('cameraDenied short-circuits everything (GM speaker)', () => {
    const out = decideSendsPhoto({ sendImageVerdict: 'true', messageText: "here's the pic", cameraDenied: true });
    assert.equal(out.send, false);
    assert.equal(out.reason, 'camera_denied');
});

// ─── Regex tightening (the false-positive factories are dead) ───

test('confirmation regex: "sending hugs" / "let me take a look" no longer match', () => {
    assert.equal(PHOTO_SEND_CONFIRMATION_RE.test('sending hugs to everyone tonight'), false);
    assert.equal(PHOTO_SEND_CONFIRMATION_RE.test('sending you luck for the exam!'), false);
    assert.equal(PHOTO_SEND_CONFIRMATION_RE.test('let me take a look at that real quick'), false);
    assert.equal(PHOTO_SEND_CONFIRMATION_RE.test('let me take another nap'), false);
});

test('confirmation regex: genuine confirmations still match', () => {
    assert.equal(PHOTO_SEND_CONFIRMATION_RE.test("here's the pic babe"), true);
    assert.equal(PHOTO_SEND_CONFIRMATION_RE.test('sending it now!'), true);
    assert.equal(PHOTO_SEND_CONFIRMATION_RE.test('let me take another one'), true);
    assert.equal(PHOTO_SEND_CONFIRMATION_RE.test('here you go'), true);
    assert.equal(PHOTO_SEND_CONFIRMATION_RE.test('attaching the photo rn'), true);
});

test('asterisk camera regex: "picnic" no longer matches as a device word', () => {
    assert.equal(PHOTO_CAMERA_ASTERISK_RE.test('*sets up the picnic blanket and takes out the snacks*'), false);
    assert.equal(PHOTO_CAMERA_ASTERISK_RE.test('*takes a photo of the group*'), true);
});

test('plain camera phrases still match', () => {
    assert.equal(PHOTO_CAMERA_PLAIN_RE.test('the shutter clicks as she grins'), true);
    assert.equal(PHOTO_CAMERA_PLAIN_RE.test('holding up phone to the light'), true);
});

test('decideGenuineRefusal: concession rescues a refusal', () => {
    assert.equal(decideGenuineRefusal('no way').genuine, true);
    assert.equal(decideGenuineRefusal('no way... you win, fine').genuine, false);
});

// ─── Explicit-tags contract (>2 chars, sentinel-compatible) ───

test('explicitTags: >2 chars counts; short/empty never does', () => {
    assert.equal(decideSendsPhoto({ sendImageVerdict: 'false', imagePromptText: 'ab' }).send, false);
    assert.equal(decideSendsPhoto({ sendImageVerdict: 'false', imagePromptText: '__xml_prompt_tag_present__' }).send, true);
    assert.equal(decideSendsPhoto({ sendImageVerdict: 'false', imagePromptText: '' }).send, false);
});

test('VERDICT LAW: genuine refusal blocks the confirmation override too', () => {
    // "never" = refusal, "here's the pic" = confirmation, NO concession word → genuine wins.
    const out = decideSendsPhoto({
        sendImageVerdict: 'false',
        messageText: "never... but here's the pic anyway",
    });
    assert.equal(decideGenuineRefusal("never... but here's the pic anyway").genuine, true);
    assert.equal(out.send, false);
    assert.equal(out.reason, 'verdict_refused');
});

// ─── ✨ v2.7.62 THE EMPTY TAG LAW (extractGroupImagePrompt) ✨ ───
// The group schema mandated <image_prompt></image_prompt> on every reply; the old inline
// extractor treated matched-empty as "no match" and salvaged the unterminated tail —
// capturing `</image_prompt>\n<heat>Warm</heat>` as tags and forging hasExplicitImagePrompt
// on nearly every reply (the images-on-every-message bug's second screw).

test('EMPTY TAG LAW: schema-mandated empty tag + heat tail = NO tags (the live forgery)', () => {
    const block = `<speaker>Mochi</speaker>
  <message>nah, I'm good</message>
  <send_image>false</send_image>
  <image_prompt></image_prompt>
  <heat>Warm</heat>`;
    const extracted = extractGroupImagePrompt(block);
    assert.equal(extracted, '');
    // Gate integration: the forged shape must NOT flip an explicit refusal.
    const out = decideSendsPhoto({
        sendImageVerdict: 'false',
        messageText: 'nah, I\'m good',
        imagePromptText: extracted,
    });
    assert.equal(out.send, false);
    assert.equal(out.explicitTags, false);
    assert.equal(out.reason, 'verdict_refused');
});

test('EMPTY TAG LAW: whitespace-only closed tag = final "no tags"', () => {
    assert.equal(extractGroupImagePrompt('<message>hi</message><image_prompt>   </image_prompt>'), '');
});

test('EMPTY TAG LAW: closed empty tag outranks a later unterminated fragment', () => {
    const block = '<message>ok</message><image_prompt></image_prompt><image_prompt>selfie, beach';
    assert.equal(extractGroupImagePrompt(block), '');
});

test('closed tag with real structured XML still extracts', () => {
    const block = `<message>fine, one pic</message>
<send_image>true</send_image>
<image_prompt><outfit>white sundress, sandals</outfit><pose_and_expression>selfie, peace sign</pose_and_expression><environment>golden hour beach</environment></image_prompt>
<heat>Flustered</heat>`;
    const out = extractGroupImagePrompt(block);
    assert.ok(out.includes('white sundress'));
    assert.ok(out.includes('golden hour beach'));
    assert.ok(!out.includes('Flustered'), 'heat tail after a CLOSED tag never leaks');
});

test('closed tag with flat tags still extracts + cleans', () => {
    const out = extractGroupImagePrompt('<message>x</message><image_prompt>tags: sundress, selfie,\nbedroom</image_prompt>');
    assert.equal(out, 'sundress, selfie, bedroom');
});

test('no image_prompt tag at all = empty (no opener, no salvage)', () => {
    assert.equal(extractGroupImagePrompt('<message>just talking</message><heat>Calm</heat>'), '');
});

test('unterminated tail (streaming cut, no closed tag) still salvages', () => {
    const out = extractGroupImagePrompt('<message>look!</message><image_prompt>selfie, mirror, phone');
    assert.ok(out.includes('selfie'));
    assert.ok(out.includes('phone'));
});

test('boolean-only alias <image>true</image> carries no tags', () => {
    assert.equal(extractGroupImagePrompt('<message>ok</message><image>true</image>'), '');
});

test('bracket directive salvage only fires when no XML tag exists', () => {
    const bracketBlock = '<message>here!</message>\n[Image: sundress, cafe window seat]';
    const out = extractGroupImagePrompt(bracketBlock);
    assert.ok(out.includes('sundress'), 'bracket drift with no XML wrapper still deciphers');
    // But a closed (even empty) XML tag outranks bracket drift.
    assert.equal(extractGroupImagePrompt('<message>x</message><image_prompt></image_prompt>\n[Image: sundress]'), '');
});


