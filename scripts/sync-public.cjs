#!/usr/bin/env node
// ✨ MIKA'S PUBLIC MIRROR SYNC ✨
// WHY: GachaSwipe has a public AGPLv3 home for community PRs, while the
// private repo keeps the internal engineering doctrine (the .agents/skills
// library, .clinerules, and the session HANDOFF). This script maintains a
// LINEAR `public-sync` branch whose tree is exactly `main` MINUS the
// internal-only paths below, then pushes it to the public GitHub remote.
// Fail-closed everywhere: it aborts on remote mismatch and on ANY internal
// path surviving the filter. It never touches the working tree — it syncs the
// committed state of main through a throwaway index. Flow B (community PRs):
// PRs merge on the PUBLIC repo, so the sync chain always parents on the
// ACTUAL public main head (fetched here), and skips entirely when the
// filtered private tree already equals it.
//
// Usage:
//   node scripts/sync-public.cjs [--dry-run] [--message "commit subject"]
// Default (no flags): build the public-sync commit and push to public/main.
// The public remote must exist and point at PUBLIC_URL or the script exits.

const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

// ── The public-mirror contract ────────────────────────────────────────────
const PUBLIC_REMOTE = 'public';
const PUBLIC_URL = 'https://github.com/ProjectMIKA/GachaSwipe.git';
const PUBLIC_BRANCH = 'main';
const SYNC_BRANCH = 'public-sync';
// Internal-only paths + the private-side release archive: these must NEVER
// appear in the public tree (the public changelog is the Releases page).
// Keep this list in sync with .clinerules/02-build-and-release.md.
const EXCLUDED_PATHS = ['.agents', '.clinerules', 'HANDOFF.md', 'SDK', 'RELEASE_NOTES.md'];
// ───────────────────────────────────────────────────────────────────────────

const dryRun = process.argv.includes('--dry-run');
const msgIdx = process.argv.indexOf('--message');
const msgOverride = msgIdx >= 0 ? process.argv[msgIdx + 1] : null;

const git = (args, env = {}) => {
    try {
        return execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, ...env } }).trim();
    } catch (err) {
        console.error(`[SYNC] ✗ git ${args.join(' ')} failed:\n${err.stderr || err.message}`);
        process.exit(1);
    }
};
const gitOk = (args, env = {}) => {
    try {
        return execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, ...env } }).trim();
    } catch {
        return null;
    }
};

// 1) Fail-closed: the ONLY remote we ever touch is the public mirror.
const remoteUrl = git(['remote', 'get-url', PUBLIC_REMOTE]).replace(/\.git$/, '');
if (remoteUrl !== PUBLIC_URL.replace(/\.git$/, '')) {
    console.error(`[SYNC] ✗ Remote "${PUBLIC_REMOTE}" points at "${remoteUrl}" — expected "${PUBLIC_URL}". Refusing.`);
    process.exit(1);
}

// 2) Source of truth: the committed state of main (never the dirty worktree).
const mainSha = git(['rev-parse', 'main']);
const mainShort = git(['rev-parse', '--short', 'main']);
const mainSubject = git(['log', '-1', '--format=%s', 'main']);

// 3) The public head rules the sync chain: PRs may have merged on GitHub
//    (Flow B), so each sync commit parents on the ACTUAL public main head —
//    fetched here so its objects exist locally.
const lsRemote = gitOk(['ls-remote', PUBLIC_REMOTE, `refs/heads/${PUBLIC_BRANCH}`]);
const remoteSha = lsRemote ? lsRemote.split(/\s+/)[0] : null;
if (remoteSha) {
    git(['fetch', '--quiet', PUBLIC_REMOTE, PUBLIC_BRANCH]);
    if (!gitOk(['rev-parse', '--verify', `${remoteSha}^{commit}`])) {
        console.error('[SYNC] ✗ Public head commit unreachable locally after fetch — aborting.');
        process.exit(1);
    }
}
const prev = gitOk(['rev-parse', '-q', '--verify', `refs/heads/${SYNC_BRANCH}`]);
if (remoteSha === null && prev !== null) {
    console.error('[SYNC] ✗ Public repo has no main but local public-sync exists (repo recreated?). Reset public-sync by hand first.');
    process.exit(1);
}

// 5) Build the filtered tree of main in a throwaway index.
const tmpDir = mkdtempSync(join(tmpdir(), 'gachaswipe-public-sync-'));
try {
    const idxEnv = { GIT_INDEX_FILE: join(tmpDir, 'index') };
    git(['read-tree', 'main'], idxEnv);
    git(['rm', '--cached', '-r', '-q', '--ignore-unmatch', ...EXCLUDED_PATHS], idxEnv);
    const tree = git(['write-tree'], idxEnv);

    // 6) Sanity: NO internal path may survive the filter.
    const files = git(['ls-tree', '-r', '--name-only', tree]).split('\n').filter(Boolean);
    const leaked = files.filter((f) => EXCLUDED_PATHS.some((p) => f === p || f.startsWith(`${p}/`)));
    if (leaked.length > 0) {
        console.error(`[SYNC] ✗ FAIL-CLOSED: internal paths survived the filter: ${leaked.join(', ')}`);
        process.exit(1);
    }
    if (files.length === 0) {
        console.error('[SYNC] ✗ FAIL-CLOSED: the filtered public tree is empty.');
        process.exit(1);
    }

    // 6.5) Already in sync? If the filtered private tree equals the public
    //      head's tree (a PR merged on GitHub brought identical content, or
    //      private main hasn't moved), there is nothing to commit or push.
    if (remoteSha) {
        const publicTree = gitOk(['rev-parse', `${remoteSha}^{tree}`]);
        if (publicTree === tree) {
            if (prev !== remoteSha) git(['update-ref', `refs/heads/${SYNC_BRANCH}`, remoteSha]);
            console.log(`[SYNC] ✓ Already in sync — public tree matches the filtered private tree (${remoteSha.slice(0, 12)}).`);
            process.exit(0);
        }
    }

    // 7) Commit the tree (orphan root on genesis, linear parent afterwards).
    //    Public commits publish author emails, so the author is ALWAYS
    //    Master's GitHub noreply address — a local git identity (personal
    //    inbox) must never leak onto the public mirror. Override via env.
    const authorName = process.env.GS_SYNC_AUTHOR_NAME || 'ProjectMIKA';
    const authorEmail = process.env.GS_SYNC_AUTHOR_EMAIL || '268793390+ProjectMIKA@users.noreply.github.com';
    const authorEnv = {
        GIT_AUTHOR_NAME: authorName,
        GIT_AUTHOR_EMAIL: authorEmail,
        GIT_COMMITTER_NAME: authorName,
        GIT_COMMITTER_EMAIL: authorEmail,
    };
    const subject = msgOverride || `sync: ${mainShort} ${mainSubject}`;
    const body = `Auto-synced from the private repository at ${mainSha}.\n\nInternal-only paths excluded: ${EXCLUDED_PATHS.join(', ')}.\n`;
    const commitArgs = ['commit-tree', tree, '-m', subject, '-m', body];
    if (remoteSha) commitArgs.push('-p', remoteSha);
    const commit = git(commitArgs, authorEnv);

    const kind = remoteSha ? 'sync' : 'genesis';
    console.log(`[SYNC] ${kind}: ${commit} (tree ${tree.slice(0, 12)}, ${files.length} files, from ${mainShort} "${mainSubject}")`);

    if (dryRun) {
        console.log('[SYNC] --dry-run: no ref updated, nothing pushed. Public tree sample:');
        for (const f of files.slice(0, 20)) console.log(`    ${f}`);
        if (files.length > 20) console.log(`    … +${files.length - 20} more files`);
        process.exit(0);
    }

    git(['update-ref', `refs/heads/${SYNC_BRANCH}`, commit]);
    git(['push', PUBLIC_REMOTE, `${SYNC_BRANCH}:${PUBLIC_BRANCH}`]);
    console.log(`[SYNC] ✓ Pushed ${SYNC_BRANCH} → ${PUBLIC_URL} (${PUBLIC_BRANCH})`);
} finally {
    rmSync(tmpDir, { recursive: true, force: true });
}

