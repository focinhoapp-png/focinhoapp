const Jimp = require('jimp');

async function fixIcon() {
  console.log('Reading public/logo.png...');
  const image = await Jimp.read('public/logo.png');
  
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];

    // If pixel is transparent or semi-transparent (a < 255), fill with solid orange #F97316
    if (a < 255) {
      const alpha = a / 255;
      this.bitmap.data[idx + 0] = Math.round(r * alpha + 249 * (1 - alpha));
      this.bitmap.data[idx + 1] = Math.round(g * alpha + 115 * (1 - alpha));
      this.bitmap.data[idx + 2] = Math.round(b * alpha + 22 * (1 - alpha));
      this.bitmap.data[idx + 3] = 255;
    }

    // If pixel is black or dark (the logo drawing), make it white
    // Using a simple threshold since the drawing is black.
    if (this.bitmap.data[idx + 0] < 80 && this.bitmap.data[idx + 1] < 80 && this.bitmap.data[idx + 2] < 80) {
      this.bitmap.data[idx + 0] = 255;
      this.bitmap.data[idx + 1] = 255;
      this.bitmap.data[idx + 2] = 255;
    }
  });

  console.log('Writing public/app-icon.png...');
  await image.writeAsync('public/app-icon.png');
}

fixIcon().then(() => console.log('Successfully generated app-icon.png')).catch(console.error);
