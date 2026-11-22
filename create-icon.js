const fs = require('fs');
const path = require('path');

// Create a proper 256x256 ICO file for electron-builder
function createIco256() {
  const size = 256;
  const pixelDataSize = size * size * 4;
  const pixelData = Buffer.alloc(pixelDataSize);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Orange background: RGB(249, 115, 22)
      let r = 249, g = 115, b = 22, a = 255;

      // Rounded corners (make corners transparent)
      const margin = 32;
      const cx = x - size/2;
      const cy = y - size/2;
      const radius = size/2 - 4;
      if (cx*cx + cy*cy > radius*radius) {
        a = 0; r = 0; g = 0; b = 0;
      }

      // White "T" letter
      const lx = x / size; // 0..1
      const ly = y / size; // 0..1

      // Top bar of T: y from 20% to 35%, x from 15% to 85%
      const inTopBar = (ly >= 0.20 && ly <= 0.37 && lx >= 0.15 && lx <= 0.85);
      // Stem of T: y from 35% to 82%, x from 38% to 62%
      const inStem   = (ly >= 0.37 && ly <= 0.82 && lx >= 0.38 && lx <= 0.62);

      if ((inTopBar || inStem) && a > 0) {
        r = 255; g = 255; b = 255;
      }

      pixelData[idx]     = b; // BGR in BMP
      pixelData[idx + 1] = g;
      pixelData[idx + 2] = r;
      pixelData[idx + 3] = a;
    }
  }

  // BMP BITMAPINFOHEADER (40 bytes)
  const bmpInfo = Buffer.alloc(40);
  bmpInfo.writeUInt32LE(40, 0);
  bmpInfo.writeInt32LE(size, 4);
  bmpInfo.writeInt32LE(size * 2, 8); // height x2 for ICO
  bmpInfo.writeUInt16LE(1, 12);
  bmpInfo.writeUInt16LE(32, 14);
  bmpInfo.writeUInt32LE(0, 16);
  bmpInfo.writeUInt32LE(pixelDataSize, 20);
  bmpInfo.writeInt32LE(2835, 24);
  bmpInfo.writeInt32LE(2835, 28);
  bmpInfo.writeUInt32LE(0, 32);
  bmpInfo.writeUInt32LE(0, 36);

  // AND mask: 1 bit per pixel, rows padded to 4-byte boundary
  const rowBytes = Math.ceil(size / 32) * 4;
  const andMask = Buffer.alloc(rowBytes * size, 0);

  const imageData = Buffer.concat([bmpInfo, pixelData, andMask]);
  const imageSize = imageData.length;

  // ICO ICONDIR header (6 bytes)
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);

  // ICO ICONDIRENTRY (16 bytes) — 0 means 256 for width/height fields
  const icoDir = Buffer.alloc(16);
  icoDir.writeUInt8(0, 0);    // width: 0 = 256
  icoDir.writeUInt8(0, 1);    // height: 0 = 256
  icoDir.writeUInt8(0, 2);    // color count
  icoDir.writeUInt8(0, 3);    // reserved
  icoDir.writeUInt16LE(1, 4); // planes
  icoDir.writeUInt16LE(32, 6);// bit count
  icoDir.writeUInt32LE(imageSize, 8);
  icoDir.writeUInt32LE(6 + 16, 12); // offset

  const ico = Buffer.concat([icoHeader, icoDir, imageData]);

  const buildDir = path.join(__dirname, 'build');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);
  console.log(`Icon created: build/icon.ico (${ico.length} bytes, 256x256)`);
}

createIco256();
