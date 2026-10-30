// Before upload, the browser redraws the photo onto a canvas and saves it as
// a new JPEG. That removes hidden metadata such as the GPS position where it
// was taken, turns phone photos the right way up, and shrinks large photos
// so they upload quickly. The server still checks the file it receives.

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_SIDE_PIXELS = 1600;
const JPEG_QUALITY = 0.85;

export class PhotoError extends Error {}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
}

export async function preparePhoto(file, { maxPhotoBytes }) {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new PhotoError("This photo is over 25 MB. Please choose a smaller one.");
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError(
      "That file couldn't be read as a photo. Please choose a JPEG or PNG image.",
    );
  }

  const scale = Math.min(1, MAX_SIDE_PIXELS / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  // JPEG has no transparency, so transparent areas become white, not black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await canvasToBlob(canvas);
  if (!blob) {
    throw new PhotoError("That photo couldn't be prepared for upload. Please try another one.");
  }
  if (blob.size > maxPhotoBytes) {
    throw new PhotoError(
      "This photo is still too large after resizing. Please choose another one.",
    );
  }
  return blob;
}
