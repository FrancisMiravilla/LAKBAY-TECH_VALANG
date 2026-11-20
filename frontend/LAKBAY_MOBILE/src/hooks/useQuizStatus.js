import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getQuizStatus } from '../api/qrService';

// Whether the player already took this spot's quiz (one quiz per spot).
// Re-checked whenever the screen comes back into focus, e.g. after the quiz.
// Returns { taken, attempt } or null while unknown.
export default function useQuizStatus(spotId) {
  const [status, setStatus] = useState(null);
  useFocusEffect(
    useCallback(() => {
      if (spotId == null) return undefined;
      let alive = true;
      getQuizStatus(spotId)
        .then((s) => { if (alive) setStatus(s); })
        .catch(() => {});
      return () => { alive = false; };
    }, [spotId])
  );
  return status;
}
