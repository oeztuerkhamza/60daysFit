/** Longest edge, in pixels, that an uploaded photo is scaled down to. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Scales a photo down before upload.
 *
 * Phone cameras produce 4–12 MB files; a progress or meal photo only needs to be
 * legible. Decoding honours the EXIF orientation flag, so portrait shots are not
 * rotated on their side.
 *
 * Returns the original file untouched if the browser cannot decode it, so a
 * failed resize never blocks the upload.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    // Keep whichever is smaller — re-encoding a small photo can grow it.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
