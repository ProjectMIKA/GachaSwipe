/**
 * ✨ MIKA'S DB BRIDGE VITAL SIGNS TEST SUITE ✨
 *
 * Plain `node --test` — ZERO new dependencies.
 * Covers the fail-closed bridge-death classifier from src/utils/dbBridge.js:
 * the error class behind the r/layla_ai bug report (v2.7.93 on Layla
 * v7.8.0-direct, NativeDatabase.execAsync NullPointerException) must be
 * recognized EXACTLY — and ordinary SQL failures must NOT be misclassified.
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBridgeDeadError, describeSaveError, BRIDGE_RECOVERY_HINT } from '../src/utils/dbBridge.js';

// The exact user-visible error from the bug report.
const REPORTED_NPE = "Error processing Layla API message: Call to function 'NativeDatabase.execAsync' has been rejected. -> caused by: java.lang.NullPointerException: java.lang.NullPointerException";

test('dbBridge: classifies the reported NativeDatabase NPE as bridge death', () => {
    assert.equal(isBridgeDeadError(new Error(REPORTED_NPE)), true);
    assert.equal(isBridgeDeadError(REPORTED_NPE), true);
});

test('dbBridge: classifies bare bridge-death fragments', () => {
    assert.equal(isBridgeDeadError(new Error('java.lang.NullPointerException')), true);
    assert.equal(isBridgeDeadError(new Error("Call to function 'NativeDatabase.execAsync' has been rejected.")), true);
    assert.equal(isBridgeDeadError(new Error('Error processing Layla API message: timeout')), true);
    assert.equal(isBridgeDeadError(new Error('Layla Database bridge unavailable')), true);
});

test('dbBridge: does NOT misclassify ordinary SQL / app errors', () => {
    assert.equal(isBridgeDeadError(new Error('SQL syntax error near FROM')), false);
    assert.equal(isBridgeDeadError(new Error('no such table: chats')), false);
    assert.equal(isBridgeDeadError(new Error('UNIQUE constraint failed: app_state.key')), false);
    assert.equal(isBridgeDeadError(new Error('JSON parse error in index_data')), false);
});

test('dbBridge: fail-closed on junk inputs (null, undefined, empty, hostile objects)', () => {
    assert.equal(isBridgeDeadError(null), false);
    assert.equal(isBridgeDeadError(undefined), false);
    assert.equal(isBridgeDeadError(''), false);
    assert.equal(isBridgeDeadError({}), false);
    assert.equal(isBridgeDeadError(42), false);
});

test('dbBridge: describeSaveError appends the recovery hint ONLY for bridge death', () => {
    const dead = describeSaveError(new Error(REPORTED_NPE));
    assert.ok(dead.includes(REPORTED_NPE));
    assert.ok(dead.includes(BRIDGE_RECOVERY_HINT));

    const alive = describeSaveError(new Error('no such table: chats'));
    assert.equal(alive, 'no such table: chats');
    assert.ok(!alive.includes(BRIDGE_RECOVERY_HINT));
});

test('dbBridge: describeSaveError survives message-less and hostile errors', () => {
    assert.ok(describeSaveError(new Error()).length > 0);
    assert.ok(describeSaveError(null).length > 0);
    assert.ok(describeSaveError({ toString: null }).length > 0);
});

test('dbBridge: recovery hint copy carries the actionable steps', () => {
    assert.ok(BRIDGE_RECOVERY_HINT.includes('Fully close Layla'));
    assert.ok(BRIDGE_RECOVERY_HINT.includes('Database Doctor'));
});
