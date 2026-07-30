import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');
const inputFile = path.join(publicDir, 'logo_192.png');

const sizes = [
  { name: 'favicon.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
];

async function main() {
  console.log('Generating icons from logo.png...');
  for (const { name, size } of sizes) {
    const output = path.join(publicDir, name);
    await sharp(inputFile)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(output);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
