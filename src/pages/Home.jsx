import Header from '../components/Header';
import Hero from '../components/sections/Hero';
import Marquee from '../components/ui/Marquee';
import Work from '../components/sections/Work';
import Built from '../components/sections/Built';
import Creative from '../components/sections/Creative';
import Contact from '../components/sections/Contact';
import Footer from '../components/layout/Footer';
import { useOverrides } from '../hooks/useOverrides';
import vinylSvg from '../assets/icons/vinyl.svg';

function Home() {
  const { overrides, ready } = useOverrides();

  if (!ready) {
    return (
      <div className="page-loader">
        <img src={vinylSvg} className="loader-vinyl" alt="" />
        <p className="loader-text">side a.</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main>
        <Hero heroBio={overrides.hero_bio} heroRole={overrides.hero_role} />
        <Marquee />
        <Work />
        <Built />
        <Creative creativeBio={overrides.creative_bio} />
        <Contact resumeLabel={overrides.resume_label} resumeUrl={overrides.resume_url} />
      </main>
      <Footer />
    </>
  );
}

export default Home;
