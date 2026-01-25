const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../public/nearby_isotipo.png');

async function generateFavicons() {
  console.log('🎨 Generating favicons...');
  
  // Generate favicon-16x16.png
  await sharp(inputFile)
    .resize(16, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(__dirname, '../public/favicon-16x16.png'));
  console.log('✅ Generated favicon-16x16.png');

  // Generate favicon-32x32.png
  await sharp(inputFile)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(__dirname, '../public/favicon-32x32.png'));
  console.log('✅ Generated favicon-32x32.png');

  // Generate favicon.png (general purpose)
  await sharp(inputFile)
    .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(__dirname, '../public/favicon.png'));
  console.log('✅ Generated favicon.png');

  // Generate favicon.ico (multiple sizes embedded)
  // We'll create a 32x32 PNG and use it as base for ICO
  const ico32Buffer = await sharp(inputFile)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  
  // Copy to src/app/favicon.ico location (Next.js will serve this)
  // For now, just create a 32x32 PNG version there
  await sharp(inputFile)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(__dirname, '../src/app/icon.png'));
  console.log('✅ Generated src/app/icon.png');

  // Also create apple-touch-icon in public root
  await sharp(inputFile)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
  console.log('✅ Generated apple-touch-icon.png');

  console.log('🎉 All favicons generated successfully!');
}

generateFavicons().catch(console.error);
