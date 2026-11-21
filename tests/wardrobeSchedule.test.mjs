/**
 * ✨ MIKA'S WARDROBE SCHEDULE ENGINE TEST SUITE (v2.7.54) ✨
 *
 * Plain `node --test` — ZERO new dependencies. Covers the pure schedule-is-king
 * wardrobe classifier (src/utils/wardrobeSchedule.js): the night-shift arcade girl
 * (the pajamas-at-work bug), day-sleepers, weekend selection, cue precedence,
 * word-boundary traps, and the legacy wall-clock fallback for routine-less characters.
 *
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMeowPeriodFromDate, resolveScheduleActivity } from '../src/utils/wardrobeSchedule.js';

// 2026-10-28 = Wednesday (weekday); 2026-10-31 = Saturday; 2026-11-01 = Sunday.
const wed = (h, m = 0) => new Date(2026, 9, 28, h, m, 0);
const sat = (h, m = 0) => new Date(2026, 9, 31, h, m, 0);
const sun = (h, m = 0) => new Date(2026, 10, 1, h, m, 0);

// THE character Master reported: works the night shift at an arcade, sleeps during the day.
const NIGHT_SHIFT = {
    occupational_status: 'Night attendant at the arcade',
    weekday: {
        early_morning: 'Crashing into bed to sleep after her shift',
        morning: 'Sleeping through the morning after her night shift',
        afternoon: 'Sleeping in her dim bedroom to recover from the late shift',
        evening: 'Waking up slowly, eating dinner, getting ready for work',
        night: 'Working the night shift at the arcade',
        late_night: 'Working the arcade counter and restocking prize tickets'
    },
    weekend: {
        early_morning: 'Asleep in her bedroom',
        morning: 'Still asleep after a long week',
        afternoon: 'Lazily browsing the mall with friends',
        evening: 'Playing the retro cabinets at the arcade for fun',
        night: 'Hanging out at the night market with friends',
        late_night: 'Karaoke bar with her coworkers'
    }
};

// ─── getMeowPeriodFromDate (the shared six-block bucketing) ───
test('getMeowPeriodFromDate: exact legacy six-block boundaries', () => {
    assert.equal(getMeowPeriodFromDate(wed(5)), 'early_morning');
    assert.equal(getMeowPeriodFromDate(wed(8, 59)), 'early_morning');
    assert.equal(getMeowPeriodFromDate(wed(9)), 'morning');
    assert.equal(getMeowPeriodFromDate(wed(12)), 'afternoon');
    assert.equal(getMeowPeriodFromDate(wed(17)), 'evening');
    assert.equal(getMeowPeriodFromDate(wed(21)), 'night');
    assert.equal(getMeowPeriodFromDate(wed(0)), 'night');
    assert.equal(getMeowPeriodFromDate(wed(1)), 'late_night');
    assert.equal(getMeowPeriodFromDate(wed(4)), 'late_night');
});

// ─── THE BUG: pajamas at the arcade ───
test('THE BUG: night-shift girl at 23:00 clocks into WORK, not sleepwear', () => {
    // hour 23 → 'night' block → "Working the night shift at the arcade" — schedule is king.
    assert.equal(resolveScheduleActivity(NIGHT_SHIFT, wed(23)), 'work');
    // Legacy wall clock said hour >= 22 → sleepwear. The routine block outranks it now.
});
test('THE BUG: midnight during her shift is still WORK (clock would say pajamas)', () => {
    assert.equal(resolveScheduleActivity(NIGHT_SHIFT, wed(0)), 'work');
});
test('day-sleeper: 14:00 nap after her shift gets SLEEPWEAR (clock said work hours)', () => {
    assert.equal(resolveScheduleActivity(NIGHT_SHIFT, wed(14)), 'sleep');
});
test('night-shift girl: full weekday orbit stays consistent with her life', () => {
    assert.equal(resolveScheduleActivity(NIGHT_SHIFT, wed(6)), 'sleep');   // crashing into bed
    assert.equal(resolveScheduleActivity(NIGHT_SHIFT, wed(10)), 'sleep');  // sleeping in
    assert.equal(resolveScheduleActivity(NIGHT_SHIFT, wed(18)), 'work');   // getting ready for work
    assert.equal(resolveScheduleActivity(NIGHT_SHIFT, wed(23, 30)), 'work');
});

// ─── weekend selection ───
test('weekend blocks win on Saturday (no phantom work uniform on her day off)', () => {
    assert.equal(resolveScheduleActivity(NIGHT_SHIFT, sat(14)), 'casual'); // mall with friends
    assert.equal(resolveScheduleActivity(NIGHT_SHIFT, sat(9)), 'sleep');   // still asleep
    assert.equal(resolveScheduleActivity(NIGHT_SHIFT, sun(21)), 'casual'); // night market
});

// ─── cue precedence & word-boundary traps ───
test('sleep cues outrank work cues inside one block ("sleeping in after her night shift")', () => {
    const routine = { weekday: { ...NIGHT_SHIFT.weekday, evening: 'Sleeping in after her night shift at the bar' } };
    assert.equal(resolveScheduleActivity(routine, wed(18)), 'sleep');
});
test('word boundaries: "restaurant" is dinner, not a nap', () => {
    const routine = { weekday: { ...NIGHT_SHIFT.weekday, evening: 'Dinner at a fancy restaurant' } };
    assert.equal(resolveScheduleActivity(routine, wed(18)), 'casual');
});
test('ordinary 9-to-5 character still classifies normally', () => {
    const OFFICE = {
        weekday: {
            early_morning: 'Commuting to the office',
            morning: 'Working at her office desk',
            afternoon: 'In meetings at the office',
            evening: 'Grocery shopping on the way home',
            night: 'Relaxing at home watching TV',
            late_night: 'Sleeping in her bedroom'
        },
        weekend: {}
    };
    assert.equal(resolveScheduleActivity(OFFICE, wed(10)), 'work');
    assert.equal(resolveScheduleActivity(OFFICE, wed(19)), 'casual');
    assert.equal(resolveScheduleActivity(OFFICE, wed(23, 30)), 'casual'); // 23:00 = night block: TV time
    assert.equal(resolveScheduleActivity(OFFICE, wed(1)), 'sleep');       // 01:00 = late_night: asleep
});

// ─── legacy fallback (routine-less characters keep byte-identical behavior) ───
test('legacy fallback: no routine → wall clock (sleepwear only at night)', () => {
    assert.equal(resolveScheduleActivity(null, wed(14)), null);
    assert.equal(resolveScheduleActivity(null, wed(23)), 'sleep');
    assert.equal(resolveScheduleActivity(null, wed(6)), 'sleep');
    assert.equal(resolveScheduleActivity(undefined, sat(15)), null);
    assert.equal(resolveScheduleActivity({}, sun(2)), 'sleep');
});
test('legacy fallback: a NONE block is a MISSING block (the routine sentinel)', () => {
    const routine = { weekday: { ...NIGHT_SHIFT.weekday, afternoon: 'NONE' }, weekend: {} };
    assert.equal(resolveScheduleActivity(routine, wed(14)), null); // NOT 'casual' — falls through
});

// ─── work-cue family (parity with the legacy status regex, plus duty/school) ───
test('work cues: shift/duty/school variants all classify as work', () => {
    const mk = (evening) => ({ weekday: { ...NIGHT_SHIFT.weekday, evening } });
    assert.equal(resolveScheduleActivity(mk('On duty at the clinic'), wed(18)), 'work');
    assert.equal(resolveScheduleActivity(mk('Attending evening classes at school'), wed(18)), 'work');
    assert.equal(resolveScheduleActivity(mk('Paper delivery round as the neighborhood courier'), wed(18)), 'work');
});
