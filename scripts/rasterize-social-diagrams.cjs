// Keep SVG text exactly as rendered by the source diagram. Social-image
// renderers do not inherit the browser's fonts inside embedded SVG images.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const root = path.resolve(__dirname, '..');
  const mapPath = path.join(root, 'content/social-covers.json');
  const mapping = JSON.parse(await fs.readFile(mapPath, 'utf8'));
  const directory = path.join(root, 'public/social/evidence');
  await fs.mkdir(directory, { recursive: true });
  let count = 0;
  for (const [slug, media] of Object.entries(mapping)) {
    if (!media.src?.endsWith('.svg')) continue;
    if (!/^[a-z0-9-]+$/.test(slug) || !media.src.startsWith('/work/') || media.src.includes('..')) throw new Error('Invalid diagram source');
    media.rasterSrc = `/social/evidence/${slug}.png`;
    await sharp(path.join(root, 'public', media.src), { density: 144, limitInputPixels: 40_000_000 }).png().toFile(path.join(root, 'public', media.rasterSrc));
    count++;
  }
  await fs.writeFile(mapPath, JSON.stringify(mapping, null, 2) + '\n');
  console.log(`Preserved ${count} original diagrams as PNG assets.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
