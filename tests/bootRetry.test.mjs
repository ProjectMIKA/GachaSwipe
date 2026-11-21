/**
 * ✨ MIKA'S BOOT RETRY TEST SUITE ✨
 *
 * Plain `node --test` — ZERO new dependencies.
 * Covers `withRetry` from src/utils/bootRetry.js: the backoff gate that keeps a
 * not-yet-ready host database from being misread as "no data" (the phantom
 * fresh-boot bug class). The delay executor is injected so every case is instant.
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRetry, BOOT_RETRY_DELAYS_MS } from '../src/utils/bootRetry.js';

const instantDelay = () => Promise.resolve();

test('bootRetry: resolves on first success without retrying', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
        calls++;
        return 'ok';
    }, { attempts: 4, delays: BOOT_RETRY_DELAYS_MS, delayFn: instantDelay });
    assert.equal(result, 'ok');
    assert.equal(calls, 1);
});

test('bootRetry: retries with backoff then succeeds', async () => {
    let calls = 0;
    const waits = [];
    const result = await withRetry(async () => {
        calls++;
        if (calls < 3) throw new Error('not ready yet');
        return calls;
    }, {
        attempts: 4,
        delays: BOOT_RETRY_DELAYS_MS,
        delayFn: (ms) => { waits.push(ms); return Promise.resolve(); }
    });
    assert.equal(result, 3);
    assert.equal(calls, 3);
    assert.deepEqual(waits, [1000, 2000]);
});

test('bootRetry: exhausts attempts and throws the LAST error', async () => {
    let calls = 0;
    await assert.rejects(
        withRetry(async () => {
            calls++;
            throw new Error(`fail ${calls}`);
        }, { attempts: 3, delays: BOOT_RETRY_DELAYS_MS, delayFn: instantDelay }),
        (err) => err.message === 'fail 3'
    );
    assert.equal(calls, 3);
});

test('bootRetry: onRetry reports attempt number, total and delay', async () => {
    const events = [];
    await assert.rejects(
        withRetry(async () => { throw new Error('x'); }, {
            attempts: 2,
            delays: [750],
            delayFn: instantDelay,
            onRetry: (n, total, wait, err) => events.push([n, total, wait, err.message])
        }),
        /x/
    );
    assert.deepEqual(events, [[1, 2, 750, 'x']]);
});

test('bootRetry: delay list shorter than attempts reuses the last delay', async () => {
    const waits = [];
    await assert.rejects(
        withRetry(async () => { throw new Error('x'); }, {
            attempts: 4,
            delays: [100, 200],
            delayFn: (ms) => { waits.push(ms); return Promise.resolve(); }
        }),
        /x/
    );
    assert.deepEqual(waits, [100, 200, 200]);
});

test('bootRetry: passes the zero-based attempt index to the task', async () => {
    const seen = [];
    await assert.rejects(
        withRetry(async (attempt) => {
            seen.push(attempt);
            throw new Error('x');
        }, { attempts: 3, delays: [], delayFn: instantDelay }),
        /x/
    );
    assert.deepEqual(seen, [0, 1, 2]);
});

test('bootRetry: non-finite or < 1 attempts throws immediately', async () => {
    await assert.rejects(
        withRetry(async () => 'ok', { attempts: 0, delayFn: instantDelay }),
        /attempts/
    );
    await assert.rejects(
        withRetry(async () => 'ok', { attempts: NaN, delayFn: instantDelay }),
        /attempts/
    );
});

test('bootRetry: non-function task rejects immediately', async () => {
    await assert.rejects(withRetry(null, { attempts: 2 }), /function/);
});
