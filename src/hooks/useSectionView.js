import { useEffect, useRef } from 'react';
import { trackSectionView, trackSectionDwell } from '../utils/analytics';

/**
 * Attaches an IntersectionObserver to the returned ref.
 *
 * GA4: fires 'section_view' once on first entry (30% threshold). Unchanged.
 *
 * RTDB dwell: tracks accumulated time the section is visible. Fires
 * 'sv' with { sec, dwell } on section exit and on page hide/unmount.
 * Accumulates across multiple entries (user scrolls away and returns).
 * Fires at most once per mount — subsequent calls after the first send are no-ops.
 */
export function useSectionView(sectionName) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let hasTrackedGA4 = false;
    let entryTime = null;      // timestamp of most recent entry, null when not intersecting
    let totalDwell = 0;        // accumulated ms
    let dwellSent = false;     // guard: send at most once per mount

    function flushDwell() {
      if (dwellSent) return;
      // If still intersecting when flush is called, close out the current entry
      if (entryTime !== null) {
        totalDwell += Date.now() - entryTime;
        entryTime = null;
      }
      if (totalDwell > 0) {
        dwellSent = true;
        trackSectionDwell(sectionName, totalDwell);
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!hasTrackedGA4) {
            trackSectionView(sectionName);
            hasTrackedGA4 = true;
          }
          entryTime = Date.now();
        } else {
          // Section left viewport — accumulate this stint
          if (entryTime !== null) {
            totalDwell += Date.now() - entryTime;
            entryTime = null;
          }
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);

    // Tab hide covers most real-world "close tab" / "navigate away" cases
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flushDwell();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flushDwell(); // catch SPA unmounts
    };
  }, [sectionName]);

  return ref;
}
