// ✨ MIKA'S CREDITS REGISTRY (v2.7.88) ✨
// WHY: the Open Palace runs on community hands — every merged contribution gets a
// permanent row in the credits registry (Settings > CREDITS badge). Credit follows
// MERGED work: a row is added in the same change that merges the contribution, so
// this list and the public repo's history always agree. Names/handles are data (not
// translated); UI labels live in LanguageContext (credits_* keys).

export const CREDITS_OWNER = {
    name: 'ProjectMIKA',
    handle: '@ProjectMIKA',
    url: 'https://github.com/ProjectMIKA',
    role: 'OWNER / MAINTAINER',
    note: '// Architect & steward of the GachaSwipe ecosystem and the Layla Network host.'
};

export const CREDITS_CONTRIBUTORS = [
    {
        name: 'Yun9409',
        handle: '@Yun9409',
        url: 'https://github.com/Yun9409',
        contributions: [
            {
                label: 'ROM-09: PRESET ENGINE',
                detail: 'Clean-room RisuAI (.risup/.risum), CharX & SillyTavern preset interop (PR #5)'
            }
        ]
    }
];

export const CREDITS_CONTRIBUTING_URL = 'https://github.com/ProjectMIKA/GachaSwipe/blob/main/CONTRIBUTING.md';
