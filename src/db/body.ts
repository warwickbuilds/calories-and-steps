import { and, desc, eq, inArray } from 'drizzle-orm';

import { deletePhotoFiles, storePhoto } from '@/lib/photos';

import { db } from './client';
import { bodyCheck, bodyPhoto } from './schema';

export type Pose = 'front' | 'side' | 'back';
export const POSES: { value: Pose; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
];

export const bodyChecksQuery = () => db.select().from(bodyCheck).orderBy(desc(bodyCheck.measuredAt));

export const bodyPhotosQuery = () => db.select().from(bodyPhoto);

export interface CheckInInput {
  measuredAt: Date;
  /** Neck, waist and body fat are all set, or all null for a photos-only check-in. */
  neckCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  bodyFatPct: number | null;
  weightKg: number | null;
  /** Newly captured or picked photo URIs (temporary files) by pose. They replace any stored photo of that pose. */
  photos: Partial<Record<Pose, string>>;
  /** Stored photos to delete when editing. */
  removePoses?: Pose[];
}

/** Copies new photos into app storage. Names are unique so a replaced photo never overwrites the old file. */
async function storeAll(photos: CheckInInput['photos']) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const stored: { pose: Pose; path: string; thumbPath: string }[] = [];
  try {
    for (const [pose, uri] of Object.entries(photos) as [Pose, string][]) {
      if (!uri) continue;
      stored.push({ pose, ...(await storePhoto(uri, `check_${stamp}_${pose}`)) });
    }
  } catch (e) {
    deletePhotoFiles(...stored.flatMap((s) => [s.path, s.thumbPath]));
    throw e;
  }
  return stored;
}

const rowValues = (input: CheckInInput) => ({
  measuredAt: input.measuredAt.toISOString(),
  neckCm: input.neckCm,
  waistCm: input.waistCm,
  hipCm: input.hipCm,
  bodyFatPct: input.bodyFatPct,
  weightKg: input.weightKg,
});

export async function saveCheckIn(input: CheckInInput): Promise<number> {
  // Store photos first so a failed copy doesn't leave a check-in without its photos.
  const stored = await storeAll(input.photos);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.insert(bodyCheck).values(rowValues(input)).returning({ id: bodyCheck.id });
      if (stored.length > 0) {
        await tx.insert(bodyPhoto).values(stored.map((s) => ({ ...s, bodyCheckId: row.id })));
      }
      return row.id;
    });
  } catch (e) {
    deletePhotoFiles(...stored.flatMap((s) => [s.path, s.thumbPath]));
    throw e;
  }
}

/**
 * Saves changes to a check-in: date, measurements, weight and photos.
 * Replaced and removed photo files are deleted only after the database commits.
 */
export async function updateCheckIn(id: number, input: CheckInInput): Promise<void> {
  const stored = await storeAll(input.photos);
  const drop = new Set<Pose>([...(input.removePoses ?? []), ...stored.map((s) => s.pose)]);
  let oldFiles: (string | null)[] = [];
  try {
    await db.transaction(async (tx) => {
      await tx.update(bodyCheck).set(rowValues(input)).where(eq(bodyCheck.id, id));
      if (drop.size > 0) {
        const poses = [...drop];
        const old = await tx
          .select()
          .from(bodyPhoto)
          .where(and(eq(bodyPhoto.bodyCheckId, id), inArray(bodyPhoto.pose, poses)));
        oldFiles = old.flatMap((p) => [p.path, p.thumbPath]);
        await tx.delete(bodyPhoto).where(and(eq(bodyPhoto.bodyCheckId, id), inArray(bodyPhoto.pose, poses)));
      }
      if (stored.length > 0) {
        await tx.insert(bodyPhoto).values(stored.map((s) => ({ ...s, bodyCheckId: id })));
      }
    });
  } catch (e) {
    deletePhotoFiles(...stored.flatMap((s) => [s.path, s.thumbPath]));
    throw e;
  }
  deletePhotoFiles(...oldFiles);
}

export async function deleteCheckIn(id: number) {
  const photos = await db.select().from(bodyPhoto).where(eq(bodyPhoto.bodyCheckId, id));
  await db.delete(bodyCheck).where(eq(bodyCheck.id, id));
  deletePhotoFiles(...photos.flatMap((p) => [p.path, p.thumbPath]));
}
