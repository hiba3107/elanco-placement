const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { checkPhoto, inspectImage } = require("../src/reports/image");
const { createJpegHeader, createPng } = require("./support/images");

function upload(buffer, mimetype = "image/png") {
  return { buffer, size: buffer.length, mimetype, originalname: "tick.png" };
}

describe("inspectImage", () => {
  it("recognises a PNG and reads its size", () => {
    assert.deepEqual(inspectImage(createPng(3, 2)), {
      type: "image/png",
      extension: "png",
      width: 3,
      height: 2,
    });
  });

  it("recognises a JPEG and reads its size", () => {
    assert.deepEqual(inspectImage(createJpegHeader({ width: 1200, height: 900 })), {
      type: "image/jpeg",
      extension: "jpg",
      width: 1200,
      height: 900,
    });
  });

  it("finds the size after the metadata phone cameras add", () => {
    const image = inspectImage(createJpegHeader({ width: 4032, height: 3024, withExif: true }));
    assert.equal(image.width, 4032);
    assert.equal(image.height, 3024);
  });

  it("skips padding bytes between JPEG segments", () => {
    const jpeg = createJpegHeader({ width: 10, height: 20 });
    const padded = Buffer.concat([
      jpeg.subarray(0, 2),
      Buffer.from([0xff, 0xff]),
      jpeg.subarray(2),
    ]);
    assert.equal(inspectImage(padded).height, 20);
  });

  it("rejects files that only pretend to be images", () => {
    const fakes = {
      "plain text": Buffer.from("definitely a photo"),
      "a GIF": Buffer.from("GIF89a\u0001\u0000\u0001\u0000", "binary"),
      "an SVG, which could carry a script": Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'),
      "an empty file": Buffer.alloc(0),
      "a PNG cut off before its size": createPng(2, 2).subarray(0, 18),
      "a JPEG that ends before its size": createJpegHeader().subarray(0, 20),
    };
    for (const [description, buffer] of Object.entries(fakes)) {
      assert.equal(inspectImage(buffer), null, description);
    }
  });
});

describe("checkPhoto", () => {
  it("accepts no photo, because the photo is optional", () => {
    assert.deepEqual(checkPhoto(undefined), { photo: null, error: null });
  });

  it("returns a valid photo ready to store", () => {
    const png = createPng(4, 4);
    const { photo, error } = checkPhoto(upload(png));

    assert.equal(error, null);
    assert.equal(photo.type, "image/png");
    assert.equal(photo.extension, "png");
    assert.equal(photo.bytes, png.length);
    assert.equal(photo.buffer, png);
  });

  it("goes by the file's contents, not the type the browser claims", () => {
    const { photo } = checkPhoto(upload(createJpegHeader(), "image/png"));
    assert.equal(photo.type, "image/jpeg");
  });

  it("rejects a file that is not a JPEG or PNG", () => {
    const { photo, error } = checkPhoto(upload(Buffer.from("MZ executable"), "image/jpeg"));
    assert.equal(photo, null);
    assert.deepEqual(error, { field: "photo", message: "The photo must be a JPEG or PNG image." });
  });

  it("rejects an image with no pixels", () => {
    assert.equal(checkPhoto(upload(createPng(0, 5))).error.field, "photo");
  });

  it("rejects absurdly large dimensions", () => {
    const { error } = checkPhoto(upload(createPng(8001, 1)));
    assert.deepEqual(error, {
      field: "photo",
      message: "The photo must be no more than 8000 pixels wide or tall.",
    });
  });
});
