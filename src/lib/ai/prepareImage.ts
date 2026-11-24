import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { AiImage } from './providers';

/** Longest width sent to the AI. Phone screenshots are about 1080 px wide, so text stays sharp. */
const MAX_WIDTH = 1080;

/**
 * Shrinks a picked image (if wider than 1080 px) and returns it as JPEG
 * base64, ready to send. Nothing is written to app storage.
 */
export async function prepareImage(uri: string, width?: number): Promise<AiImage> {
  let ctx = ImageManipulator.manipulate(uri);
  if (width && width > MAX_WIDTH) ctx = ctx.resize({ width: MAX_WIDTH });
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  if (!saved.base64) throw new Error('Couldn’t read the image.');
  return { mimeType: 'image/jpeg', base64: saved.base64 };
}
