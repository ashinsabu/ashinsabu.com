import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { trackResumeView } from '../utils/analytics';
import { downloadResume } from '../utils/resumeDownload';
import '../styles/components/Header.css';

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 60);
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header className={`header${scrolled ? ' header-scrolled' : ''}`}>
      <div className="header-logo">ashinsabu.com</div>
      <div className="header-right">
        <nav className="header-nav">
          <a href="#work" className="header-nav-link">Work</a>
          <a href="#built" className="header-nav-link">Built</a>
          <a href="#music" className="header-nav-link">Music</a>
          <a href="#contact" className="header-nav-link">Contact</a>
        </nav>
        <a
          href="/resume.pdf"
          className="header-resume-btn"
          onClick={e => { e.preventDefault(); trackResumeView('header'); downloadResume(); }}
        >
          <Download size={13} />
          Resume
        </a>
      </div>
      <div
        className="header-progress-bar"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
    </header>
  );
}

export default Header;
