const MAX_PHOTO_LENGTH = 240_000;

/** Only small, embedded raster photos are persisted; never URLs or SVG documents. */
export function isAvatarPhoto(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_PHOTO_LENGTH && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

/** Decode locally, apply the browser's EXIF orientation, crop and discard metadata. */
export async function prepareAvatarPhoto(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error('照片太大啦，请选择小于 20 MB 的图片。');
  if (file.type && !file.type.startsWith('image/')) throw new Error('请选择一张照片或图片。');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('这张照片暂时打不开，请试试 JPG、PNG 或另一张照片。'));
      img.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 48_000_000) {
      throw new Error('图片尺寸太大，请换一张较小的照片。');
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('暂时无法处理照片，请重新打开后再试。');
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.fillStyle = '#fffbed';
    ctx.fillRect(0, 0, 256, 256);
    ctx.drawImage(img, (img.naturalWidth-side)/2, (img.naturalHeight-side)/2, side, side, 0, 0, 256, 256);
    const photo = canvas.toDataURL('image/jpeg', .86);
    if (!isAvatarPhoto(photo)) throw new Error('照片处理失败，请换一张照片。');
    return photo;
  } finally { URL.revokeObjectURL(url); }
}
