const fs = require('fs');
const PNG = require('pngjs').PNG;

function resize(src, dstWidth, dstHeight) {
  const dst = new PNG({ width: dstWidth, height: dstHeight });
  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      const srcX = (x * src.width) / dstWidth;
      const srcY = (y * src.height) / dstHeight;
      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);
      const x2 = Math.min(x1 + 1, src.width - 1);
      const y2 = Math.min(y1 + 1, src.height - 1);
      const dx = srcX - x1;
      const dy = srcY - y1;

      const getP = (px, py) => {
        const idx = (src.width * py + px) << 2;
        return [src.data[idx], src.data[idx+1], src.data[idx+2], src.data[idx+3]];
      };

      const p1 = getP(x1, y1);
      const p2 = getP(x2, y1);
      const p3 = getP(x1, y2);
      const p4 = getP(x2, y2);

      const dstIdx = (dstWidth * y + x) << 2;
      for (let c = 0; c < 4; c++) {
        const top = p1[c] * (1 - dx) + p2[c] * dx;
        const bottom = p3[c] * (1 - dx) + p4[c] * dx;
        dst.data[dstIdx + c] = Math.round(top * (1 - dy) + bottom * dy);
      }
      
      // Ensure no alpha channel transparency for iOS compatibility
      dst.data[dstIdx + 3] = 255; 
    }
  }
  return dst;
}

const sourceFile = 'C:\\Users\\Ruan\\.gemini\\antigravity\\brain\\06b3d337-c823-45fe-b80e-65070ac31cac\\media__1773875568626.png';

fs.createReadStream(sourceFile)
  .pipe(new PNG())
  .on('parsed', function() {
    
    // Generate iOS Touch Icon 180x180
    const iosIcon = resize(this, 180, 180);
    iosIcon.pack().pipe(fs.createWriteStream('public/apple-touch-icon.png'));

    // Generate PWA 512x512
    const pwa512 = resize(this, 512, 512);
    pwa512.pack().pipe(fs.createWriteStream('public/pwa-512x512.png'));
    
    // Generate PWA 192x192
    const pwa192 = resize(this, 192, 192);
    pwa192.pack().pipe(fs.createWriteStream('public/pwa-192x192.png'));

    // Replace Dashboard Logo
    const newLogo = resize(this, 128, 128);
    newLogo.pack().pipe(fs.createWriteStream('public/logo.png'));
    
    console.log('Successfully generated all standard icons!');
  })
  .on('error', (err) => console.error(err));
