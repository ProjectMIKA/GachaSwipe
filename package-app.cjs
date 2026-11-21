const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const version = pkg.version || '2.6.2';

// ✨ TWO-ARTIFACT RELEASE SCHEME ✨
//   GachaSwipe_V{version}.zip  -> the main public release (GitHub Releases)
//   GachaMIKA_V{version}.zip   -> Master's personal test build (app.json title override)
// Both are written straight into builds/ and are NEVER committed to git (*.zip ignored).
// Publishing to GitHub Releases is handled by the `release` skill (.agents/skills/release).
const artifacts = [
    { zip: `GachaSwipe_V${version}.zip`, titleOverride: null },
    { zip: `GachaMIKA_V${version}.zip`, titleOverride: 'GachaMIKA' }
];

const buildsDir = path.join(__dirname, 'builds');

// Prepare index.html once: the Layla WebView host does not execute
// `<script type="module" crossorigin>`, so rewrite it to a deferred script.
const htmlPath = path.join(__dirname, 'dist', 'index.html');
if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/<script type="module" crossorigin>/g, '<script defer>');
    fs.writeFileSync(htmlPath, html);
}

function createZip(filename, titleOverride) {
    return new Promise((resolve, reject) => {
        const targetPath = path.join(buildsDir, filename);
        const outputStream = fs.createWriteStream(targetPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        outputStream.on('close', function () {
            console.log(`[${filename}] ` + archive.pointer() + ' total bytes');
            resolve();
        });

        archive.on('error', function (err) {
            reject(err);
        });

        archive.pipe(outputStream);

        archive.directory('dist/', false);

        const appJsonPath = path.join(__dirname, 'app.json');
        if (titleOverride && fs.existsSync(appJsonPath)) {
            let appJsonStr = fs.readFileSync(appJsonPath, 'utf8');
            try {
                let appJson = JSON.parse(appJsonStr);
                appJson.title = titleOverride;
                archive.append(JSON.stringify(appJson, null, 2), { name: 'app.json' });
            } catch (e) {
                archive.file('app.json', { name: 'app.json' });
            }
        } else {
            archive.file('app.json', { name: 'app.json' });
        }

        archive.file('icon.jpg', { name: 'icon.jpg' });
        archive.file('bg.jpg', { name: 'bg.jpg' });
        if (fs.existsSync('legacy.html')) {
            archive.file('legacy.html', { name: 'legacy.html' });
        }

        archive.finalize();
    });
}

async function main() {
    if (!fs.existsSync(buildsDir)) {
        fs.mkdirSync(buildsDir, { recursive: true });
    }

    console.log(`Building v${version} artifacts (GachaSwipe + GachaMIKA)...`);
    for (const { zip, titleOverride } of artifacts) {
        await createZip(zip, titleOverride);
    }

    console.log(`\n✅ Both artifacts ready in builds/:`);
    artifacts.forEach(({ zip }) => console.log(`   - builds/${zip}`));
    console.log(`\nNext step: publish with the \`release\` skill (.agents/skills/release), e.g.:`);
    console.log(`  gh release create v${version} builds/GachaSwipe_V${version}.zip builds/GachaMIKA_V${version}.zip --title "..." --notes "..."`);
}

main().catch((err) => {
    console.error('🙀 Packaging failed:', err);
    process.exit(1);
});

