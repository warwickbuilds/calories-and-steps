import { desc, eq } from 'drizzle-orm';

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

export async function saveCheckIn(input: {
  measuredAt: Date;
  neckCm: number;
  waistCm: number;
  hipCm: number | null;
  bodyFatPct: number;
  weightKg: number | null;
  /** Captured photo URIs (temporary files) by pose. */
  photos: Partial<Record<Pose, string>>;
}): Promise<number> {
  const stamp = input.measuredAt.toISOString().replace(/[:.]/g, '-');
  // Store photos first so a failed copy doesn't leave a check-in without its photos.
  const stored: { pose: Pose; path: string; thumbPath: string }[] = [];
  try {
    for (const [pose, uri] of Object.entries(input.photos) as [Pose, string][]) {
      if (!uri) continue;
      stored.push({ pose, ...(await storePhoto(uri, `check_${stamp}_${pose}`)) });
    }
  } catch (e) {
    deletePhotoFiles(...stored.flatMap((s) => [s.path, s.thumbPath]));
    throw e;
  }
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(bodyCheck)
      .values({
        measuredAt: input.measuredAt.toISOString(),
        neckCm: input.neckCm,
        waistCm: input.waistCm,
        hipCm: input.hipCm,
        bodyFatPct: input.bodyFatPct,
        weightKg: input.weightKg,
      })
      .returning({ id: bodyCheck.id });
    if (stored.length > 0) {
      await tx.insert(bodyPhoto).values(stored.map((s) => ({ ...s, bodyCheckId: row.id })));
    }
    return row.id;
  });
}

export async function deleteCheckIn(id: number) {
  const photos = await db.select().from(bodyPhoto).where(eq(bodyPhoto.bodyCheckId, id));
  await db.delete(bodyCheck).where(eq(bodyCheck.id, id));
  deletePhotoFiles(...photos.flatMap((p) => [p.path, p.thumbPath]));
}
