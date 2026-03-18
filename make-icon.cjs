const fs = require('fs');
const jpeg = require('jpeg-js');
const PNG = require('pngjs').PNG;

const jpegData = fs.readFileSync('C:\\Users\\Ruan\\.gemini\\antigravity\\brain\\06b3d337-c823-45fe-b80e-65070ac31cac\\media__1773876923379.jpg');
const rawImageData = jpeg.decode(jpegData, {useTArray: true});

function resizeAndRound(srcWidth, srcHeight, srcData, dstSize, applyCorners) {
  const dst = new PNG({ width: dstSize, height: dstSize });
  const radius = dstSize * 0.225; // 22.5% corner radius for Apple style squircle
  const maxCenter = dstSize - radius;

  for (let y = 0; y < dstSize; y++) {
    for (let x = 0; x < dstSize; x++) {
      // Bilinear interpolation
      const srcX = (x * srcWidth) / dstSize;
      const srcY = (y * srcHeight) / dstSize;
      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);
      const x2 = Math.min(x1 + 1, srcWidth - 1);
      const y2 = Math.min(y1 + 1, srcHeight - 1);
      const dx = srcX - x1;
      const dy = srcY - y1;

      const getP = (px, py) => {
        const idx = (srcWidth * py + px) << 2;
        return [srcData[idx], srcData[idx+1], srcData[idx+2], 255]; // jpeg has no alpha usually, but jpeg-js gives RGBA format with A=255
      };

      const p1 = getP(x1, y1);
      const p2 = getP(x2, y1);
      const p3 = getP(x1, y2);
      const p4 = getP(x2, y2);

      const dstIdx = (dstSize * y + x) << 2;
      for (let c = 0; c < 3; c++) {
        const top = p1[c] * (1 - dx) + p2[c] * dx;
        const bottom = p3[c] * (1 - dx) + p4[c] * dx;
        dst.data[dstIdx + c] = Math.round(top * (1 - dy) + bottom * dy);
      }
      
      let alpha = 255;
      
      if (applyCorners) {
        let cx = -1, cy = -1;
        if (x < radius) cx = radius;
        else if (x > maxCenter) cx = maxCenter;
        
        if (y < radius) cy = radius;
        else if (y > maxCenter) cy = maxCenter;
        
        if (cx !== -1 && cy !== -1) {
          const distSq = (x - cx) ** 2 + (y - cy) ** 2;
          if (distSq > radius ** 2) {
             const dist = Math.sqrt(distSq);
             if (dist > radius + 1) alpha = 0;
             else if (dist > radius) alpha = Math.floor(255 * (radius + 1 - dist)); // cheap antialiasing
          }
        }
      }

      dst.data[dstIdx + 3] = alpha; 
    }
  }
  return dst;
}

// 1. Apple Touch Icon: MUST be perfectly square with NO transparency (iOS adds its own mask)
const iosIcon = resizeAndRound(rawImageData.width, rawImageData.height, rawImageData.data, 180, false);
iosIcon.pack().pipe(fs.createWriteStream('public/apple-touch-icon.png'));

// 2. Android PWA Icons: Android handles transparency well, rounded corners look beautiful in the drawer
const pwa512 = resizeAndRound(rawImageData.width, rawImageData.height, rawImageData.data, 512, true);
pwa512.pack().pipe(fs.createWriteStream('public/pwa-512x512.png'));

const pwa192 = resizeAndRound(rawImageData.width, rawImageData.height, rawImageData.data, 192, true);
pwa192.pack().pipe(fs.createWriteStream('public/pwa-192x192.png'));

// 3. Main header logo
const newLogo = resizeAndRound(rawImageData.width, rawImageData.height, rawImageData.data, 128, true);
newLogo.pack().pipe(fs.createWriteStream('public/logo.png'));

console.log('Successfully generated all rounded standard icons!');
