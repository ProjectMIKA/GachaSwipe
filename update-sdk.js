import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🐾 Purr~ MIKA is fetching the latest Layla SDK for you, Master...");

try {
    // Install the latest SDK
    execSync('npm install @layla-network/sdk@latest', { stdio: 'inherit' });

    // Read the newly installed package.json to get the version
    const sdkPath = path.join(__dirname, 'node_modules', '@layla-network/sdk');
    const pkgJsonPath = path.join(sdkPath, 'package.json');
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const version = pkgJson.version;

    console.log(`✨ Nyaha! The latest version is v${version}!`);

    const sdkTargetDir = path.join(__dirname, 'SDK', `layla-network-sdk-${version}`);

    // Clean up old SDK folders in the SDK directory
    const sdkBaseDir = path.join(__dirname, 'SDK');
    const files = fs.readdirSync(sdkBaseDir);
    for (const file of files) {
        if (file.startsWith('layla-network-sdk-') && fs.lstatSync(path.join(sdkBaseDir, file)).isDirectory()) {
            console.log(`🧹 Sweeping away old SDK dust: ${file}`);
            fs.rmSync(path.join(sdkBaseDir, file), { recursive: true, force: true });
        }
    }

    // Copy the new SDK to the SDK folder
    console.log(`📦 Unpacking the new toys into ${sdkTargetDir}...`);
    fs.mkdirSync(sdkTargetDir, { recursive: true });
    
    // Copy function
    const copyRecursiveSync = (src, dest) => {
        const exists = fs.existsSync(src);
        const stats = exists && fs.statSync(src);
        const isDirectory = exists && stats.isDirectory();
        if (isDirectory) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest);
            fs.readdirSync(src).forEach(childItemName => {
                copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
            });
        } else {
            fs.copyFileSync(src, dest);
        }
    };

    copyRecursiveSync(sdkPath, path.join(sdkTargetDir, 'package'));

    console.log("💖 All done, Master! Your Layla SDK is fresh and ready to play! *winks*");
} catch (error) {
    console.error("🙀 Nyaa?! Something went wrong while updating the SDK:", error.message);
}
