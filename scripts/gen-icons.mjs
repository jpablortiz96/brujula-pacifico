// Genera public/icon-192.png y icon-512.png: fondo gov-azul + "B" amarilla.
// Encoder PNG puro (zlib de Node), sin dependencias de imagen.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const AZUL = [10, 37, 64];
const AMARILLO = [255, 205, 0];

// Bitmap 5×7 de la letra B.
const B = [
  "11110",
  "10001",
  "10001",
  "11110",
  "10001",
  "10001",
  "11110",
];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePNG(size) {
  const px = Buffer.alloc(size * size * 4);
  // fondo
  for (let i = 0; i < size * size; i++) {
    px[i * 4] = AZUL[0];
    px[i * 4 + 1] = AZUL[1];
    px[i * 4 + 2] = AZUL[2];
    px[i * 4 + 3] = 255;
  }
  // "B" centrada, ~55% del alto
  const glyphH = Math.round(size * 0.55);
  const cell = Math.round(glyphH / 7);
  const glyphW = cell * 5;
  const offX = Math.round((size - glyphW) / 2);
  const offY = Math.round((size - cell * 7) / 2);
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) {
      if (B[r][c] !== "1") continue;
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const x = offX + c * cell + dx;
          const y = offY + r * cell + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const i = (y * size + x) * 4;
          px[i] = AMARILLO[0];
          px[i + 1] = AMARILLO[1];
          px[i + 2] = AMARILLO[2];
          px[i + 3] = 255;
        }
      }
    }
  }
  // scanlines con byte de filtro 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/icon-192.png", makePNG(192));
writeFileSync("public/icon-512.png", makePNG(512));
console.log("✓ icon-192.png + icon-512.png generados");
