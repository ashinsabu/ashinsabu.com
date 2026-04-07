import { useState } from 'react';
import { music } from '../../data/content';
import SectionLabel from '../ui/SectionLabel';
import { useSectionView } from '../../hooks/useSectionView';
import { trackLinkClick } from '../../utils/analytics';
import { Music as MusicIcon, Instagram, Play } from 'lucide-react';
import '../../styles/components/Music.css';

function extractYouTubeId(url) {
  if (!url) return null;
  const shorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shorts) return shorts[1];
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) return short[1];
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watch) return watch[1];
  return null;
}

function CoverCard({ url }) {
  const [playing, setPlaying] = useState(false);
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  return (
    <div className="cover-card">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Cover"
        />
      ) : (
        <div className="cover-thumb" onClick={() => setPlaying(true)}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
          />
          <div className="cover-play-overlay">
            <div className="cover-play-btn">
              <Play size={20} fill="currentColor" strokeWidth={0} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Music({ musicBio, covers }) {
  const ref = useSectionView('music');
  const validCovers = (covers ?? music.covers).filter(Boolean);

  return (
    <section className="music" id="music" ref={ref}>
      <div className="music-inner">
        <SectionLabel number="03" title="MUSIC" />

        <div className="music-icon-row">
          <MusicIcon size={28} className="music-icon" strokeWidth={1.25} />
        </div>

        <p className="music-bio">{musicBio || music.bio}</p>

        {validCovers.length > 0 && (
          <>
            <div className="covers-header">
              <span className="covers-header-label">guitar covers</span>
              <span className="covers-header-rule" />
            </div>
            <div className="covers-scroll">
              {validCovers.map((url, i) => (
                <CoverCard key={i} url={url} />
              ))}
            </div>
          </>
        )}

        <a
          href={music.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="music-ig-cta"
          onClick={() => trackLinkClick('instagram', music.instagramUrl, 'music')}
        >
          <Instagram size={18} className="music-ig-icon" />
          <div className="music-ig-text">
            <span className="music-ig-handle">{music.instagramHandle}</span>
            <span className="music-ig-sub">guitar covers</span>
          </div>
          <span className="music-ig-arrow">↗</span>
        </a>
      </div>
    </section>
  );
}

export default Music;
