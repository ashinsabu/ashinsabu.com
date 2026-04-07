import Header from '../components/Header';
import Hero from '../components/sections/Hero';
import Marquee from '../components/ui/Marquee';
import About from '../components/sections/About';
import Work from '../components/sections/Work';
import Built from '../components/sections/Built';
import Music from '../components/sections/Music';
import Contact from '../components/sections/Contact';
import Footer from '../components/layout/Footer';
import { useState } from 'react';
import { useOverrides } from '../hooks/useOverrides';
import vinylSvg from '../assets/icons/vinyl.svg';

const LOADER_PHRASES = [
  // vinyl / music / guitar (~50%)
  'side a.',
  'side b.',
  'dropping the needle.',
  'tuning the e string.',
  'warming the tubes.',
  'cueing up.',
  'finding the groove.',
  'lifting the arm.',
  'track one.',
  // everything else
  'one moment.',
  'waking up.',
  'give it a beat.',
  'almost.',
  'bear with me.',
  'getting there.',
  'hold.',
  'just a sec.',
  'in a moment.',
];

function Home() {
  const { overrides, ready } = useOverrides();
  const [phrase] = useState(
    () => LOADER_PHRASES[Math.floor(Math.random() * LOADER_PHRASES.length)]
  );

  if (!ready) {
    return (
      <div className="page-loader">
        <img src={vinylSvg} className="loader-vinyl" alt="" />
        <p className="loader-text">{phrase}</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main>
        <Hero heroBio={overrides.hero_bio} heroRole={overrides.hero_role} />
        <Marquee />
        <About aboutP1={overrides.about_p1} aboutP2={overrides.about_p2} />
        <Work />
        <Built />
        <Music
          musicBio={overrides.music_bio ?? overrides.creative_bio}
          covers={[overrides.cover_1, overrides.cover_2, overrides.cover_3].some(Boolean)
            ? [overrides.cover_1, overrides.cover_2, overrides.cover_3]
            : null}
        />
        <Contact resumeLabel={overrides.resume_label} />
      </main>
      <Footer />
    </>
  );
}

export default Home;
