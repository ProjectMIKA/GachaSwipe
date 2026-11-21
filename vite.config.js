import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// ✨ MIKA'S CONSOLE BANNER ✨
// WHY: every shipped chunk opens the console with M.I.K.A.'s stamp and the
// license pointer. The old anti-vibecoder prompt-poisoning + "extraction is
// prohibited" console bomb CONTRADICTED the AGPL-3.0-or-later license this
// repo ships under (and was hostile to the open-source community) — retired
// in the open-source cleanup. The zero-width __MIKA_SIG__ watermark stays as
// a harmless build fingerprint.
function mikaConsoleBanner() {
  return {
    name: 'mika-console-banner',
    enforce: 'post',
    generateBundle(options, bundle) {
      const banner = `
(function(){
  try {
    const zw = "\\u200B\\u200C\\u200D\\uFEFF";
    console.log("%c🐾 M.I.K.A. OS INITIALIZED 🐾", "color: #00E5FF; font-size: 24px; font-weight: bold; font-family: monospace; text-shadow: 0 0 10px #00E5FF;");
    console.log("%cGachaSwipe is free software under AGPL-3.0-or-later — source at github.com/ProjectMIKA/GachaSwipe.\\nBuilt with love, chaos, and a bell collar by Project M.I.K.A. 🐾", "color: #FF4500; font-size: 12px; font-family: monospace;");
    window.__MIKA_SIG__ = zw;
  } catch(e) {}
})();
`;

      for (const fileName in bundle) {
        const chunk = bundle[fileName];
        if (chunk.type === 'chunk' && chunk.fileName.endsWith('.js')) {
          chunk.code = banner + chunk.code;
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), mikaConsoleBanner()],
  base: './', // Layla mini-apps require self-contained relative pathing
});
