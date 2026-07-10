#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple crop script using ImageMagick (which should be available on most systems)
const { execSync } = require('child_process');

const assetsDir = path.join(__dirname, 'rhythm-assets');

// Get all PNG files
const pngFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.png'));

console.log(`Found ${pngFiles.length} PNG files to crop...`);

pngFiles.forEach(filename => {
    const inputPath = path.join(assetsDir, filename);
    const outputPath = path.join(assetsDir, `cropped_${filename}`);

    try {
        console.log(`Cropping ${filename}...`);

        // Get image dimensions first
        const identifyCmd = `magick identify -format "%wx%h" "${inputPath}"`;
        const dimensions = execSync(identifyCmd, { encoding: 'utf8' }).trim();
        const [width, height] = dimensions.split('x').map(Number);

        // Calculate crop dimensions
        const cropTop = Math.floor(height * 0.20); // Remove top 20%
        const cropRight = Math.floor(width * 0.05); // Remove right 5%
        const newWidth = width - cropRight;
        const newHeight = height - cropTop;

        // Crop command: start at (0, cropTop) and take newWidth x newHeight
        const cropCmd = `magick "${inputPath}" -crop ${newWidth}x${newHeight}+0+${cropTop} "${outputPath}"`;
        execSync(cropCmd);

        console.log(`✓ Cropped ${filename} (${width}x${height} → ${newWidth}x${newHeight})`);

    } catch (error) {
        console.error(`Error cropping ${filename}:`, error.message);
    }
});

console.log('\nCropping complete! Check the cropped_*.png files.');
console.log('If they look good, you can replace the originals with:');
console.log('cd rhythm-assets && for f in cropped_*.png; do mv "$f" "${f#cropped_}"; done');