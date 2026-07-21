const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const splashDir = path.join(__dirname, 'public', 'splash');

async function overwriteSplashes() {
  const files = fs.readdirSync(splashDir);
  for (const file of files) {
    if (file.endsWith('.jpg') || file.endsWith('.png')) {
      if (file.includes('apple-splash')) {
        // Parse dimensions from filename, e.g. apple-splash-1242-2208.jpg
        const match = file.match(/apple-splash-(\d+)-(\d+)/);
        if (match) {
          const width = parseInt(match[1]);
          const height = parseInt(match[2]);
          await sharp({
            create: {
              width: width,
              height: height,
              channels: 4,
              background: { r: 253, g: 242, b: 248, alpha: 1 } // #fdf2f8
            }
          })
          .jpeg()
          .toFile(path.join(splashDir, 'temp_' + file));
          
          fs.renameSync(path.join(splashDir, 'temp_' + file), path.join(splashDir, file));
          console.log('Overwrote', file);
        }
      }
    }
  }
}

overwriteSplashes().catch(console.error);
