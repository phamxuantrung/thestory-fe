const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const directoriesToConvert = [
  'public/pets',
  'public/pets/skins',
  'public/foods',
  'public/items',
  'public'
];

async function convertDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      // Specifically target png and jpg/jpeg
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        // Only convert specific background images in the root public dir
        if (dirPath === 'public' && !['garden-bg.png', 'arena-bg-dark.png'].includes(entry.name)) {
          continue;
        }

        const inputPath = path.join(dirPath, entry.name);
        const outputName = path.basename(entry.name, ext) + '.webp';
        const outputPath = path.join(dirPath, outputName);

        try {
          await sharp(inputPath)
            .webp({ quality: 80 })
            .toFile(outputPath);
          
          fs.unlinkSync(inputPath); // Delete old file
          console.log(`Converted: ${inputPath} -> ${outputPath}`);
        } catch (error) {
          console.error(`Failed to convert ${inputPath}:`, error);
        }
      }
    }
  }
}

async function main() {
  for (const dir of directoriesToConvert) {
    const fullPath = path.join(__dirname, dir);
    console.log(`Checking directory: ${fullPath}`);
    await convertDirectory(fullPath);
  }
  console.log('Conversion complete!');
}

main();
