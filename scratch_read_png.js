const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
    const buffer = Buffer.alloc(24);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);
    
    // Check PNG signature
    if (buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
        throw new Error('Not a valid PNG file: ' + filePath);
    }
    
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
}

try {
    const assetsDir = path.join(__dirname, 'assets', 'eamon');
    console.log('Scanning directory:', assetsDir);
    
    const files = fs.readdirSync(assetsDir);
    console.log('Files found:', files);
    
    files.forEach(file => {
        if (file.toLowerCase().endsWith('.png')) {
            const filePath = path.join(assetsDir, file);
            const dim = getPngDimensions(filePath);
            console.log(`- ${file}: Width = ${dim.width}px, Height = ${dim.height}px`);
        }
    });
} catch (err) {
    console.error('Error scanning PNGs:', err.message);
}
