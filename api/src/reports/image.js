const { REPORT_RULES } = require("./rules");

// An upload's file name and the type the browser claims are both just text
// the sender chose, so neither is trusted. The type is decided by the file's
// first bytes (its "magic number"), and the pixel size is read from its header.

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// JPEG "start of frame" markers, the segments that hold the image size.
const JPEG_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function readPngSize(buffer) {
  if (
    buffer.length < 24 ||
    !buffer.subarray(0, 8).equals(PNG_SIGNATURE) ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// A JPEG is a chain of segments: 0xFF, a marker byte, then a two-byte length.
// This walks the chain until it finds the frame header with the dimensions.
function readJpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    return null;
  }
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      return null;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) {
      return null;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (JPEG_FRAME_MARKERS.has(marker)) {
      if (offset + 9 > buffer.length) {
        return null;
      }
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    if (length < 2) {
      return null;
    }
    offset += 2 + length;
  }
  return null;
}

const IMAGE_FORMATS = [
  { type: "image/jpeg", extension: "jpg", readSize: readJpegSize },
  { type: "image/png", extension: "png", readSize: readPngSize },
];

function inspectImage(buffer) {
  for (const format of IMAGE_FORMATS) {
    const size = format.readSize(buffer);
    if (size) {
      return { type: format.type, extension: format.extension, ...size };
    }
  }
  return null;
}

/**
 * Checks an uploaded photo (as received by multer) and returns either
 * { photo } ready to store, or { error } for the form. No file is fine:
 * the photo is optional. The 5 MB size limit is enforced earlier, while the
 * upload streams in, so an oversized file is never held in memory.
 */
function checkPhoto(file, rules = REPORT_RULES) {
  if (!file) {
    return { photo: null, error: null };
  }
  const image = inspectImage(file.buffer);
  if (!image || image.width === 0 || image.height === 0) {
    return {
      photo: null,
      error: { field: "photo", message: "The photo must be a JPEG or PNG image." },
    };
  }
  if (image.width > rules.maxPhotoDimension || image.height > rules.maxPhotoDimension) {
    return {
      photo: null,
      error: {
        field: "photo",
        message: `The photo must be no more than ${rules.maxPhotoDimension} pixels wide or tall.`,
      },
    };
  }
  return { photo: { buffer: file.buffer, bytes: file.buffer.length, ...image }, error: null };
}

module.exports = { checkPhoto, inspectImage };
