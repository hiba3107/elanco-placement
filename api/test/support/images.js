const zlib = require("node:zlib");

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

// A real, viewable PNG of one grey colour.
function createPng(width = 2, height = 2) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(pixels)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// The structure of a JPEG file up to its image data: enough for the size to
// be read, though not a picture a browser could draw. withExif adds the kind
// of metadata segment phone cameras write before the frame header.
function createJpegHeader({ width = 640, height = 480, withExif = false } = {}) {
  const start = Buffer.from([0xff, 0xd8]);
  const jfif = Buffer.from([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
    0x00, 0x00,
  ]);
  const exif = Buffer.concat([
    Buffer.from([0xff, 0xe1, 0x00, 0x0a]),
    Buffer.from("Exif\0\0", "binary"),
    Buffer.from([0x00, 0x00]),
  ]);
  const frame = Buffer.from([
    0xff, 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11,
    0x01,
  ]);
  frame.writeUInt16BE(height, 5);
  frame.writeUInt16BE(width, 7);
  const scan = Buffer.from([
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x12, 0x34,
  ]);
  const end = Buffer.from([0xff, 0xd9]);
  return Buffer.concat(
    withExif ? [start, exif, jfif, frame, scan, end] : [start, jfif, frame, scan, end],
  );
}

module.exports = { createJpegHeader, createPng };
