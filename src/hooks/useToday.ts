import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { msUntilMidnight, toLocalDateString } from '@/lib/dates';

/**
 * Local YYYY-MM-DD date string for today that stays fresh across midnight
 * and whenever the app comes back to the foreground.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => toLocalDateString());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      const next = toLocalDateString();
      setToday((prev) => (prev === next ? prev : next));
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, msUntilMidnight());
    };

    refresh();
    schedule();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
        schedule();
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return today;
}
