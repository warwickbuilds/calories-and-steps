/**
 * Holds photos captured on the camera screen until the check-in that asked
 * for them is saved. Expo Router can't pass results back on router.back(),
 * so the camera writes here and the check-in screen subscribes.
 */

import { useSyncExternalStore } from 'react';

import type { Pose } from '@/db/body';

type Captures = Partial<Record<Pose, string>>;

let captures: Captures = {};
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const captureStore = {
  set(pose: Pose, uri: string) {
    captures = { ...captures, [pose]: uri };
    emit();
  },
  remove(pose: Pose) {
    const { [pose]: _gone, ...rest } = captures;
    captures = rest;
    emit();
  },
  /** Forget captures without deleting the temporary files (they're in the cache folder). */
  clear() {
    captures = {};
    emit();
  },
  get: () => captures,
};

export function useCaptures(): Captures {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    captureStore.get,
    captureStore.get,
  );
}

