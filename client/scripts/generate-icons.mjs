import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PALETTE = {
  '.': [16, 14, 34, 255],
  h: [72, 24, 24, 255],
  H: [255, 208, 72, 255],
  O: [240, 112, 32, 255],
  o: [184, 60, 20, 255],
  m: [44, 50, 72, 255],
  W: [238, 246, 255, 255],
  S: [168, 184, 208, 255],
  s: [104, 120, 152, 255],
  P: [0, 0, 0, 255],
  G: [168, 255, 184, 255],
  g: [56, 216, 104, 255],
  e: [20, 56, 32, 255],
  U: [22, 32, 76, 255],
  b: [48, 136, 240, 255],
  Y: [255, 248, 160, 255],
};

const PIP_ICON_16 = [
  '.......eG.......',
  '.......ge.......',
  '....hhhhhhhh....',
  '...hHHOOOOOOh...',
  '..hHOOOOOOOOoh..',
  '..hOOooooooOoh..',
  '...msWWWWWWsm...',
  '...msWWPssWWPm..',
  '...msWWPssWWPm..',
  '...mssssssssm...',
  '...UUBBBBBBUU...',
  '..mSBYYYYYYBSm..',
  '..mmUbbbbbbUmm..',
  '...UuuU..UuuU...',
  '...mSSm..mSSm...',
  '................',
];

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(filePath, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const scale = size / 16;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter none
    const srcY = Math.min(15, Math.floor(y / scale));
    const row = PIP_ICON_16[srcY];
    for (let x = 0; x < size; x++) {
      const srcX = Math.min(15, Math.floor(x / scale));
      const ch = row[srcX];
      const rgba = PALETTE[ch] ?? PALETTE['.'];
      const px = rowStart + 1 + x * 4;
      raw[px] = rgba[0];
      raw[px + 1] = rgba[1];
      raw[px + 2] = rgba[2];
      raw[px + 3] = rgba[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, png);
}

const outDir = path.resolve(import.meta.dirname, '../public/icons');
writePng(path.join(outDir, 'icon-192.png'), 192);
writePng(path.join(outDir, 'icon-512.png'), 512);
console.log('Generated PWA icons in', outDir);
