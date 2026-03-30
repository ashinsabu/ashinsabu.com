import { creative } from '../../data/content';
import SectionLabel from '../ui/SectionLabel';
import { useSectionView } from '../../hooks/useSectionView';
import { trackLinkClick } from '../../utils/analytics';
import { Music, Instagram } from 'lucide-react';
import '../../styles/components/Creative.css';

function Creative({ creativeBio }) {
  const ref = useSectionView('creative');

  return (
    <section className="creative" id="creative" ref={ref}>
      <div className="creative-inner">
        <SectionLabel number="03" title="CREATIVE" />

        <div className="creative-icon-row">
          <Music size={28} className="creative-music-icon" strokeWidth={1.25} />
        </div>

        <p className="creative-bio">{creativeBio || creative.bio}</p>

        <a
          href={creative.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="creative-link"
          onClick={() => trackLinkClick('instagram', creative.instagramUrl)}
        >
          <Instagram size={14} />
          {creative.instagramHandle} ↗
        </a>
      </div>
    </section>
  );
}

export default Creative;
