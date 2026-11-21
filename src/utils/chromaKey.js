/**
 * ✨ PROJECT M.I.K.A. ADVANCED CHROMA KEY SPRITE EXTRACTOR v2 ✨
 * Median border-ring sampling + spread-adaptive tolerance, edge-connected
 * BFS flood-fill, TRUE alpha un-blending and key-spill suppression.
 * - v1 sampled a 5-point mean at the top corners: one glow particle or a
 *   gradient ruined the target color and the fill stalled -> ghost bg.
 * - v1 wrote raw alpha on edge pixels WITHOUT un-mixing them from the
 *   backdrop -> green/magenta halo ("not properly blended").
 * Protects character skin, clothing, and interior details from wipeout!
 * Authored with love by M.I.K.A. for Master! 🐾
 */

export const chromaKeyImage = async (base64Str, tolerance = 85, feather = 40, keyType = 'auto') => {
    return new Promise((resolve, reject) => {
        if (!base64Str) {
            return reject(new Error("No base64 image data provided for chroma key!"));
        }

        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const width = img.width;
                const height = img.height;
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);

                const frame = ctx.getImageData(0, 0, width, height);
                const data = frame.data;
                const totalPixels = width * height;

                // -------------------------------------------------------------
                // 1. ROBUST BORDER-RING BACKGROUND SAMPLING (MEDIAN, NOT MEAN)
                // A full-body sprite touches the BOTTOM edge (her feet!) but the
                // top + side borders are guaranteed backdrop. Median over the
                // whole ring is immune to glow particles, vignettes and the odd
                // hair pixel grazing the frame.
                // -------------------------------------------------------------
                const ringMargin = Math.max(2, Math.min(6, Math.floor(Math.min(width, height) / 60)));
                const sampleRs = [];
                const sampleGs = [];
                const sampleBs = [];
                const pushSample = (x, y) => {
                    const idx = (y * width + x) * 4;
                    sampleRs.push(data[idx]);
                    sampleGs.push(data[idx + 1]);
                    sampleBs.push(data[idx + 2]);
                };
                for (let x = 0; x < width; x += 2) {
                    for (let y = 0; y < ringMargin; y++) {
                        pushSample(x, y); // top rows
                    }
                }
                for (let y = 0; y < height; y += 2) {
                    for (let x = 0; x < ringMargin; x++) {
                        pushSample(x, y); // left column
                        pushSample(width - 1 - x, y); // right column
                    }
                }

                const channelMedian = (arr) => {
                    const sorted = [...arr].sort((a, b) => a - b);
                    return sorted[sorted.length >> 1];
                };
                let targetR = channelMedian(sampleRs);
                let targetG = channelMedian(sampleGs);
                let targetB = channelMedian(sampleBs);

                // Spread-adaptive tolerance: a uniform studio backdrop has ~0 spread,
                // while gradients/vignettes push the threshold out so every shade of
                // the backdrop still keys. Capped so a busy backdrop can't nuke her.
                const channelStdDev = (arr, med) => {
                    let acc = 0;
                    for (let i = 0; i < arr.length; i++) {
                        const d = arr[i] - med;
                        acc += d * d;
                    }
                    return Math.sqrt(acc / arr.length);
                };
                const bgSpread = (
                    channelStdDev(sampleRs, targetR) +
                    channelStdDev(sampleGs, targetG) +
                    channelStdDev(sampleBs, targetB)
                ) / 3;
                const adaptiveBump = Math.min(45, Math.round(bgSpread * 1.5));
                const effTolerance = tolerance + adaptiveBump;

                // Determine if key is Magenta or Green based on sample or explicit keyType
                const sampleIsMagenta = (targetR > 100 && targetB > 100 && targetG < Math.min(targetR, targetB) * 0.85);
                const isMagentaMode = keyType === 'magenta' || (keyType === 'auto' && sampleIsMagenta);

                // If explicit keyType was given but ring sample didn't match (e.g. edge artifact):
                if (keyType === 'green' && targetG <= targetR && targetG <= targetB) {
                    targetR = 0; targetG = 255; targetB = 0;
                } else if (keyType === 'magenta' && !sampleIsMagenta) {
                    targetR = 255; targetG = 0; targetB = 255;
                }

                // Helper to calculate Euclidean color distance from sampled background
                const getDiff = (r, g, b) => Math.sqrt(
                    (r - targetR) * (r - targetR) +
                    (g - targetG) * (g - targetG) +
                    (b - targetB) * (b - targetB)
                );

                // Helper to check if a pixel qualifies as background candidate.
                // Two gates: distance to the sampled backdrop OR raw chroma dominance,
                // which catches gradient shades the median can't represent.
                const isBgCandidate = (r, g, b) => {
                    if (getDiff(r, g, b) < (effTolerance + feather)) return true;
                    if (!isMagentaMode) {
                        if (targetG > 110 && g > 100 && (g - Math.max(r, b)) > 18) return true;
                    } else {
                        if (targetR > 110 && targetB > 110 && r > 100 && b > 100 && (Math.min(r, b) - g) > 22) return true;
                    }
                    return false;
                };

                // Helper to calculate alpha for a background-connected pixel
                const calcAlpha = (r, g, b) => {
                    const diff = getDiff(r, g, b);
                    if (diff <= effTolerance) return 0;
                    if (diff >= effTolerance + feather) return 255;
                    return Math.floor(255 * ((diff - effTolerance) / feather));
                };

                // -------------------------------------------------------------
                // 2. EDGE-CONNECTED BFS FLOOD-FILL
                // Seeds from image borders to guarantee we only strip background
                // connected to the outside!
                // -------------------------------------------------------------
                const visited = new Uint8Array(totalPixels);
                const queue = new Int32Array(totalPixels);
                let head = 0;
                let tail = 0;

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if (x < ringMargin || x >= width - ringMargin || y < ringMargin || y >= height - ringMargin) {
                            const idx = y * width + x;
                            if (!visited[idx]) {
                                const dIdx = idx * 4;
                                if (isBgCandidate(data[dIdx], data[dIdx + 1], data[dIdx + 2])) {
                                    visited[idx] = 1;
                                    queue[tail++] = idx;
                                }
                            }
                        }
                    }
                }

                // BFS traversal inward
                while (head < tail) {
                    const curr = queue[head++];
                    const cx = curr % width;
                    const cy = (curr - cx) / width;

                    // 4-way neighbors
                    for (let n = 0; n < 4; n++) {
                        const nIdx = n === 0 ? (cx > 0 ? curr - 1 : -1)
                            : n === 1 ? (cx < width - 1 ? curr + 1 : -1)
                            : n === 2 ? (cy > 0 ? curr - width : -1)
                            : (cy < height - 1 ? curr + width : -1);
                        if (nIdx !== -1 && !visited[nIdx]) {
                            const nDataIdx = nIdx * 4;
                            if (isBgCandidate(data[nDataIdx], data[nDataIdx + 1], data[nDataIdx + 2])) {
                                visited[nIdx] = 1;
                                queue[tail++] = nIdx;
                            }
                        }
                    }
                }

                // -------------------------------------------------------------
                // 3. ALPHA PASS (flooded edge, enclosed pockets, protected core)
                // -------------------------------------------------------------
                const alphaMap = new Uint8Array(totalPixels);
                // Enclosed key-colored pockets (between arm & waist) use a
                // half-weighted bump so gradients can't erode her from inside.
                const pocketCut = (tolerance + adaptiveBump * 0.5) * 0.85;
                for (let i = 0; i < totalPixels; i++) {
                    const dataIdx = i * 4;
                    const r = data[dataIdx];
                    const g = data[dataIdx + 1];
                    const b = data[dataIdx + 2];
                    let alpha;
                    if (visited[i] === 1) {
                        alpha = calcAlpha(r, g, b);
                    } else if (getDiff(r, g, b) <= pocketCut) {
                        alpha = 0;
                    } else {
                        alpha = 255;
                    }
                    alphaMap[i] = alpha;
                    data[dataIdx + 3] = alpha;
                }

                // -------------------------------------------------------------
                // 4. TRUE UN-BLEND + KEY-SPILL SUPPRESSION (v2 halo killer)
                // Semi-transparent edge pixels are an optical mix of character
                // and backdrop. Solve the mix equation for the character color
                // instead of keeping the key-tinted blend (that WAS the halo!).
                // Opaque pixels hugging the cutout get their key-colored excess
                // clipped, while genuinely key-colored outfits stay protected.
                // -------------------------------------------------------------
                const keyExcess = (r, g, b) => {
                    if (!isMagentaMode) return Math.max(0, g - Math.max(r, b));
                    return Math.max(0, Math.min(r, b) - g);
                };
                const despill = (dataIdx) => {
                    if (isMagentaMode) {
                        const g = data[dataIdx + 1];
                        if (data[dataIdx] > g && data[dataIdx + 2] > g) {
                            data[dataIdx] = Math.round((data[dataIdx] + g) / 2);
                            data[dataIdx + 2] = Math.round((data[dataIdx + 2] + g) / 2);
                        }
                    } else {
                        const cap = Math.max(data[dataIdx], data[dataIdx + 2]);
                        if (data[dataIdx + 1] > cap) data[dataIdx + 1] = cap;
                    }
                };
                for (let i = 0; i < totalPixels; i++) {
                    const alpha = alphaMap[i];
                    if (alpha === 0) continue;
                    const dataIdx = i * 4;

                    if (alpha < 255) {
                        if (alpha >= 40) {
                            // Un-blend: observed = a*true + (1-a)*bg => true = (observed - (1-a)*bg) / a
                            const a = alpha / 255;
                            const inv = 1 - a;
                            const unblend = (c, target) => Math.max(0, Math.min(255, Math.round((c - inv * target) / a)));
                            data[dataIdx] = unblend(data[dataIdx], targetR);
                            data[dataIdx + 1] = unblend(data[dataIdx + 1], targetG);
                            data[dataIdx + 2] = unblend(data[dataIdx + 2], targetB);
                        }
                        despill(dataIdx);
                    } else {
                        // Fully opaque: only suppress spill when hugging the cutout AND
                        // visibly key-contaminated (protects green/magenta outfits!)
                        const cx = i % width;
                        const touchesCutout =
                            (i >= width && alphaMap[i - width] < 200) ||
                            (i < totalPixels - width && alphaMap[i + width] < 200) ||
                            (cx > 0 && alphaMap[i - 1] < 200) ||
                            (cx < width - 1 && alphaMap[i + 1] < 200);
                        if (touchesCutout && keyExcess(data[dataIdx], data[dataIdx + 1], data[dataIdx + 2]) > 25) {
                            despill(dataIdx);
                        }
                    }
                }

                ctx.putImageData(frame, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                reject(new Error("Chroma key failed: " + e.message));
            }
        };

        img.onerror = () => reject(new Error("Failed to load image for chroma key extraction!"));
        img.src = base64Str.startsWith('data:') ? base64Str : 'data:image/jpeg;base64,' + base64Str;
    });
};

export default chromaKeyImage;
