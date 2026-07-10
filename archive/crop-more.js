#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const assetsDir = path.join(__dirname, 'rhythm-assets');

// Get all PNG files
const pngFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.png'));

console.log(`Found ${pngFiles.length} PNG files to crop further...`);

pngFiles.forEach(filename => {
    const inputPath = path.join(assetsDir, filename);
    const outputPath = path.join(assetsDir, `cropped2_${filename}`);

    try {
        console.log(`Cropping ${filename}...`);

        // Get current image dimensions
        const identifyCmd = `magick identify -format "%wx%h" "${inputPath}"`;
        const dimensions = execSync(identifyCmd, { encoding: 'utf8' }).trim();
        const [width, height] = dimensions.split('x').map(Number);

        // Calculate crop dimensions
        const cropTop = Math.floor(height * 0.10); // Remove top 10%
        const cropBottom = Math.floor(height * 0.10); // Remove bottom 10%
        const cropLeft = Math.floor(width * 0.05); // Remove left 5%
        const cropRight = Math.floor(width * 0.05); // Remove right 5%

        const newWidth = width - cropLeft - cropRight;
        const newHeight = height - cropTop - cropBottom;

        // Crop command: start at (cropLeft, cropTop) and take newWidth x newHeight
        const cropCmd = `magick "${inputPath}" -crop ${newWidth}x${newHeight}+${cropLeft}+${cropTop} "${outputPath}"`;
        execSync(cropCmd);

        console.log(`✓ Cropped ${filename} (${width}x${height} → ${newWidth}x${newHeight})`);

    } catch (error) {
        console.error(`Error cropping ${filename}:`, error.message);
    }
});

console.log('\nAdditional cropping complete! Check the cropped2_*.png files.');
console.log('If they look good, you can replace the originals with:');
console.log('cd rhythm-assets && for f in cropped2_*.png; do mv "$f" "${f#cropped2_}"; done');