const fs = require('fs');
const PNG = require('pngjs').PNG;

console.log('Reading public/logo.png...');

fs.createReadStream('public/logo.png')
  .pipe(new PNG())
  .on('parsed', function() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let idx = (this.width * y + x) << 2;

        const r = this.data[idx];
        const g = this.data[idx+1];
        const b = this.data[idx+2];
        const a = this.data[idx+3];

        if (a < 255) {
          const alpha = a / 255;
          this.data[idx] = Math.round(r * alpha + 249 * (1 - alpha));
          this.data[idx+1] = Math.round(g * alpha + 115 * (1 - alpha));
          this.data[idx+2] = Math.round(b * alpha + 22 * (1 - alpha));
          this.data[idx+3] = 255;
        }

        if (this.data[idx] < 80 && this.data[idx+1] < 80 && this.data[idx+2] < 80) {
          this.data[idx] = 255;
          this.data[idx+1] = 255;
          this.data[idx+2] = 255;
        }
      }
    }

    this.pack().pipe(fs.createWriteStream('public/app-icon.png'))
      .on('finish', () => console.log('Successfully generated app-icon.png'));
  })
  .on('error', (err) => {
    console.error('Error parsing PNG:', err);
  });
