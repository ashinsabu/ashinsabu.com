import { useState, useEffect, useRef } from 'react';
import SectionLabel from '../ui/SectionLabel';
import { about } from '../../data/content';
import '../../styles/components/About.css';


function About({ aboutP1, aboutP2 }) {
  const [visible, setVisible] = useState(false);
  const [typed, setTyped] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const sectionRef = useRef(null);

  const p1 = aboutP1 || about.paragraphs[0];
  const p2 = aboutP2 || about.paragraphs[1];
  const ledeEnd = p1.indexOf('. ') + 1;
  const lede = p1.slice(0, ledeEnd);
  const rest = p1.slice(ledeEnd).trim();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let interval;
    const startDelay = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i++;
        setTyped(lede.slice(0, i));
        if (i >= lede.length) {
          clearInterval(interval);
          setTypingDone(true);
        }
      }, 28);
    }, 300);
    return () => { clearTimeout(startDelay); clearInterval(interval); };
  }, [visible, lede]);

  return (
    <section className="about" id="about" ref={sectionRef}>
      <div className="about-inner">
        <SectionLabel number="00" title="who" />
        <div className="about-body">
          <p className="about-lede">
            {typed}
            {visible && (
              <span
                className={`about-cursor${typingDone ? ' about-cursor--done' : ''}`}
                aria-hidden="true"
              />
            )}
          </p>
          <p
            className={`about-para${typingDone ? ' about-para--visible' : ''}`}
            style={{ transitionDelay: typingDone ? '0.1s' : '0s' }}
          >
            {rest}
          </p>
          <p
            className={`about-para${typingDone ? ' about-para--visible' : ''}`}
            style={{ transitionDelay: typingDone ? '0.3s' : '0s' }}
          >
            {p2}
          </p>

          {/* Paint stroke — draws after body text fades in */}
          <svg
            className={`about-stroke${typingDone ? ' about-stroke--drawn' : ''}`}
            viewBox="0 0 290 13"
            width="290"
            height="13"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M 1,6.5 C 35,4.5 85,1.5 168,1.5 C 228,1.5 264,4 288,6.5 C 264,9.5 228,11.5 168,11.5 C 85,11.5 35,9 1,6.5 Z"
              fill="var(--accent)"
              fillOpacity="0.68"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

export default About;
