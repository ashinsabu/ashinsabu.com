import { useEffect, useRef } from 'react';
import { trackSectionView } from '../utils/analytics';

/**
 * Attaches an IntersectionObserver to the returned ref.
 * Fires a 'section_view' analytics event once when the element
 * is at least 30% visible, then stops observing.
 */
export function useSectionView(sectionName) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackSectionView(sectionName);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [sectionName]);

  return ref;
}
