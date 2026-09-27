import fs from 'fs';
import path from 'path';

const source = path.resolve('./src/assets/images/certifyx_pwa_icon_1790530266582.jpg');
const publicDir = path.resolve('./public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const targets = [
  path.resolve('./public/pwa-192x192.png'),
  path.resolve('./public/pwa-512x512.png'),
  path.resolve('./public/pwa-maskable-512x512.png'),
  path.resolve('./public/apple-touch-icon.png'),
];

targets.forEach((target) => {
  try {
    fs.copyFileSync(source, target);
    console.log(`Successfully generated PWA asset at: ${target}`);
  } catch (err) {
    console.error(`Failed to copy asset to ${target}:`, err);
  }
});
