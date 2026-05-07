#!/usr/bin/env node
/**
 * bake-bloom.mjs — Pre-bake glare bloom into mascot frame PNGs.
 *
 * Reads each source PNG (RGBA), extracts a "bright layer" using the
 * same luminance-threshold formula as the SVG `bs-mascot-bloom`
 * filter (R+G+B - threshold), gaussian-blurs it, and composites it
 * back over the original via `screen` blend mode. Output PNG has
 * the bloom embedded — no runtime SVG filter needed.
 *
 * Usage:
 *   node bake-bloom.mjs <srcDir> <dstDir>
 *   node bake-bloom.mjs <srcDir> <dstDir> --threshold 1.40 --blur 2.5 --amp 8
 *
 * Default params match the production SVG filter:
 *   threshold = 1.40   (alpha = R+G+B - 1.40, gates pixels > avg ~0.47)
 *   blur      = 2.5    (gaussian sigma px)
 *   amp       = 8      (alpha amplifier, replicates feFuncA slope)
 *   srcOffset = 0      (skip first N source frames; default 0)
 *   count     = 101    (number of frames to process: 0..100)
 *
 * Source naming: "Comp 1_NNNNN.png" (After Effects export)
 * Output naming: "mNNN.png" (matches the existing mascot-frames/ scheme)
 */

import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const positional = [];
const flags = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith("--")) {
    const key = a.replace(/^--/, "");
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      i++; // consume value
    } else {
      flags[key] = "true";
    }
  } else {
    positional.push(a);
  }
}

const [srcDir, dstDir] = positional;
if (!srcDir || !dstDir) {
  console.error("Usage: node bake-bloom.mjs <srcDir> <dstDir> [flags]");
  process.exit(1);
}

const THRESHOLD = parseFloat(flags.threshold ?? "1.40");
const BLUR_SIGMA = parseFloat(flags.blur ?? "2.5");
const AMP = parseFloat(flags.amp ?? "8");
const SRC_OFFSET = parseInt(flags.srcOffset ?? "0", 10);
const COUNT = parseInt(flags.count ?? "101", 10);
// Optional rectangular mask in source-pixel coords (1920x1080).
// Pixels outside the rect get bloom alpha forced to 0.
// All four required to enable masking; otherwise full-frame bloom.
const MASK_X = flags.maskX !== undefined ? parseInt(flags.maskX, 10) : null;
const MASK_Y = flags.maskY !== undefined ? parseInt(flags.maskY, 10) : null;
const MASK_W = flags.maskW !== undefined ? parseInt(flags.maskW, 10) : null;
const MASK_H = flags.maskH !== undefined ? parseInt(flags.maskH, 10) : null;
const MASK_ENABLED =
  MASK_X !== null && MASK_Y !== null && MASK_W !== null && MASK_H !== null;

if (!existsSync(srcDir)) {
  console.error(`Source dir not found: ${srcDir}`);
  process.exit(1);
}
mkdirSync(dstDir, { recursive: true });

console.log(`bake-bloom: threshold=${THRESHOLD} blur=${BLUR_SIGMA} amp=${AMP}`);
console.log(`            srcOffset=${SRC_OFFSET} count=${COUNT}`);
if (MASK_ENABLED) {
  console.log(`            mask=rect(${MASK_X},${MASK_Y},${MASK_W}x${MASK_H})`);
}
console.log(`            ${srcDir} → ${dstDir}`);

const t0 = Date.now();

for (let i = 0; i < COUNT; i++) {
  const srcIdx = i + SRC_OFFSET;
  const srcName = `Comp 1_${String(srcIdx).padStart(5, "0")}.png`;
  const dstName = `m${String(i).padStart(3, "0")}.png`;
  const srcPath = join(srcDir, srcName);
  const dstPath = join(dstDir, dstName);

  // 1. Load source RGBA raw buffer.
  const orig = sharp(srcPath);
  const meta = await orig.metadata();
  const { width, height } = meta;
  if (!width || !height) throw new Error(`bad meta for ${srcName}`);
  const rawRGBA = await orig.clone().ensureAlpha().raw().toBuffer();

  // 2. Build the bright-only layer:
  //    - alpha_lum = R + G + B - threshold (clamped 0..1, then × amp)
  //    - RGB = pure white (255,255,255)
  //    - alpha_out = alpha_lum × source_alpha (preserve transparency)
  //    - if a mask rect is set, pixels outside the rect get alpha 0
  const brightBuf = Buffer.alloc(rawRGBA.length);
  for (let p = 0; p < rawRGBA.length; p += 4) {
    const px = (p / 4) % width;
    const py = Math.floor(p / 4 / width);
    const inMask =
      !MASK_ENABLED ||
      (px >= MASK_X && px < MASK_X + MASK_W && py >= MASK_Y && py < MASK_Y + MASK_H);
    if (!inMask) {
      brightBuf[p] = 0;
      brightBuf[p + 1] = 0;
      brightBuf[p + 2] = 0;
      brightBuf[p + 3] = 0;
      continue;
    }
    const r = rawRGBA[p] / 255;
    const g = rawRGBA[p + 1] / 255;
    const b = rawRGBA[p + 2] / 255;
    const a = rawRGBA[p + 3];
    let alphaLum = r + g + b - THRESHOLD;
    if (alphaLum < 0) alphaLum = 0;
    else if (alphaLum > 1) alphaLum = 1;
    alphaLum *= AMP;
    if (alphaLum > 1) alphaLum = 1;
    const finalAlpha = Math.round(alphaLum * a);
    brightBuf[p] = 255;
    brightBuf[p + 1] = 255;
    brightBuf[p + 2] = 255;
    brightBuf[p + 3] = finalAlpha;
  }

  // 3. Gaussian-blur the bright layer (the "glow spread").
  const blurredPng = await sharp(brightBuf, {
    raw: { width, height, channels: 4 },
  })
    .blur(BLUR_SIGMA)
    .png()
    .toBuffer();

  // 4. Composite the blur over the original with additive blend.
  //    `add` = clamp(orig.RGB + blur.RGB * blur.alpha) — predictable,
  //    forces visible lift on bloom pixels regardless of source alpha
  //    interpretation. (Sharp `screen` blend was producing no visible
  //    change with this kind of bright-mask layer.)
  await orig
    .clone()
    .composite([{ input: blurredPng, blend: "add" }])
    .png({ compressionLevel: 6 })
    .toFile(dstPath);

  if ((i + 1) % 10 === 0 || i + 1 === COUNT) {
    process.stdout.write(`\r  baked ${i + 1}/${COUNT}`);
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\nbake-bloom: done in ${elapsed}s`);
