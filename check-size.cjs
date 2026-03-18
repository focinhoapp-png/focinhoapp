const fs = require('fs');

const buffer = Buffer.alloc(24);
const fd = fs.openSync('C:\\Users\\Ruan\\.gemini\\antigravity\\brain\\06b3d337-c823-45fe-b80e-65070ac31cac\\media__1773875568626.png', 'r');
fs.readSync(fd, buffer, 0, 24, 0);
fs.closeSync(fd);

const width = buffer.readUInt32BE(16);
const height = buffer.readUInt32BE(20);

console.log(`Dimensions: ${width}x${height}`);
