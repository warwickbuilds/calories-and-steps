/**
 * Progress photos live in the app's document folder under photos/.
 * The database stores paths relative to the document folder, because the
 * absolute path can change when iOS updates the app.
 */

import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const PHOTO_DIR = 'photos';
const FULL_WIDTH = 1080;
const THUMB_WIDTH = 240;

function photoDir(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** A file:// URI for a stored relative path. */
export function photoUri(relativePath: string): string {
  return new File(Paths.document, relativePath).uri;
}

async function resizeInto(sourceUri: string, width: number, dest: File) {
  const ctx = ImageManipulator.manipulate(sourceUri).resize({ width });
  const image = await ctx.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
  await new File(result.uri).move(dest);
}

/**
 * Copies a captured photo into app storage as a 1080 px JPEG plus a
 * 240 px thumbnail. Returns the two relative paths.
 */
export async function storePhoto(sourceUri: string, baseName: string): Promise<{ path: string; thumbPath: string }> {
  const dir = photoDir();
  const full = new File(dir, `${baseName}.jpg`);
  const thumb = new File(dir, `${baseName}_thumb.jpg`);
  await resizeInto(sourceUri, FULL_WIDTH, full);
  await resizeInto(sourceUri, THUMB_WIDTH, thumb);
  return { path: `${PHOTO_DIR}/${full.name}`, thumbPath: `${PHOTO_DIR}/${thumb.name}` };
}

export function deletePhotoFiles(...relativePaths: (string | null | undefined)[]) {
  for (const p of relativePaths) {
    if (!p) continue;
    try {
      const f = new File(Paths.document, p);
      if (f.exists) f.delete();
    } catch {
      // A missing file is fine; the database row is what matters.
    }
  }
}
