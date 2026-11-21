// ✨ MIKA'S WARDROBE SCHEDULE ENGINE ✨ (v2.7.54)
// WHY: `getDynamicOutfit` gated sleepwear on the WALL CLOCK (10 PM–7 AM hardcoded) and
// checked work AFTER it — a night-shift girl at 23:00 got pajamas at the arcade, and a
// day-sleeper at 14:00 got her work uniform in bed. The cure (Master's law: SCHEDULE
// IS KING) — classify the CURRENT ROUTINE BLOCK, not the clock, and fall back to the
// legacy clock only when no healthy routine exists. PURE module: no React, no window
// at top level — node:test-able (tests/wardrobeSchedule.test.mjs).

/**
 * Bucket a Date into the M.E.O.W. six-block day. Kept here as the single source of
 * truth so pure tests can verify the exact block selection App.jsx's schedule readers
 * (`getScheduledStatus`, `getScheduledPlace`) and the wardrobe router share.
 * @param {Date} [date]
 * @returns {'early_morning'|'morning'|'afternoon'|'evening'|'night'|'late_night'}
 */
export const getMeowPeriodFromDate = (date = new Date()) => {
    const hour = (date instanceof Date ? date : new Date(date)).getHours();
    if (hour >= 5 && hour < 9) return 'early_morning';
    if (hour >= 9 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    if (hour >= 21 || hour < 1) return 'night';
    return 'late_night';
};

// Sleep cues first — word boundaries so "restaurant" can never match "rest". 'NONE'
// (the routine's explicit "nothing here" sentinel) is treated as a MISSING block.
// Work cues mirror the legacy `getDynamicOutfit` status regex family.
const SCHEDULE_SLEEP_RE = /\b(?:sleep\w*|asleep|napping?|in bed|tucked in|rest(?:ing)?|dreaming|dozing|hibernat\w*|recharg\w*|zzz)\b/i;
const SCHEDULE_WORK_RE = /\b(?:work\w*|shifts?|jobs?|classes?|school|courier|duty|on the clock)\b/i;

/**
 * The wardrobe router's brain: read the ACTIVE routine block and classify what she is
 * doing right now. SCHEDULE IS KING — when the routine and the clock disagree (night
 * shift, day-sleeper), the routine wins. Legacy fail-safe: null routine / junk block /
 * unrecognized prose → wall-clock classification (`'sleep'` in the night hours, null
 * otherwise) so routine-less characters keep byte-identical behavior.
 * @param {{weekday?: Object, weekend?: Object}|null|undefined} routine — `waifu.daily_routine`
 * @param {Date} [date]
 * @returns {'sleep'|'work'|'casual'|null}
 */
export const resolveScheduleActivity = (routine, date = new Date()) => {
    const d = (date instanceof Date) ? date : new Date(date);
    const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
    const dayMap = isWeekend ? routine?.weekend : routine?.weekday;
    const raw = dayMap?.[getMeowPeriodFromDate(d)];
    const block = (typeof raw === 'string' && raw.trim() && raw.trim().toUpperCase() !== 'NONE') ? raw : '';
    if (block) {
        if (SCHEDULE_SLEEP_RE.test(block)) return 'sleep';
        if (SCHEDULE_WORK_RE.test(block)) return 'work';
        return 'casual';
    }
    // Legacy fallback — no routine (or this day-map missing the block): trust the clock.
    const hour = d.getHours();
    if (hour < 7 || hour >= 22) return 'sleep';
    return null;
};
