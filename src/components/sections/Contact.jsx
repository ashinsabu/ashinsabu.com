import { contact } from '../../data/content';
import { downloadResume } from '../../utils/resumeDownload';
import SectionLabel from '../ui/SectionLabel';
import { useSectionView } from '../../hooks/useSectionView';
import { trackLinkClick, trackResumeView } from '../../utils/analytics';
import { Github, Linkedin, Download } from 'lucide-react';
import '../../styles/components/Contact.css';

function Contact({ resumeLabel }) {
  const ref = useSectionView('contact');

  return (
    <section className="contact" id="contact" ref={ref}>
      <div className="contact-inner">
        <SectionLabel number="04" title="CONTACT" />

        <div className="contact-email">
          <a
            href={`mailto:${contact.email}`}
            onClick={() => trackLinkClick('email', contact.email, 'contact')}
          >
            {contact.email}
          </a>
        </div>

        <div className="contact-links">
          <a
            href={contact.github}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-link"
            onClick={() => trackLinkClick('github', contact.github, 'contact')}
          >
            <Github size={14} /> GitHub
          </a>
          <a
            href={contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-link"
            onClick={() => trackLinkClick('linkedin', contact.linkedin, 'contact')}
          >
            <Linkedin size={14} /> LinkedIn
          </a>
          <a
            href={contact.medium}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-link"
            onClick={() => trackLinkClick('medium', contact.medium, 'contact')}
          >
            Medium
          </a>
          <a
            href={contact.codeforces}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-link"
            onClick={() => trackLinkClick('codeforces', contact.codeforces, 'contact')}
          >
            Codeforces
          </a>
        </div>

        {/* Resume CTA — prominent, serves all audiences */}
        <div className="contact-resume">
          <a
            href="/resume.pdf"
            className="contact-resume-btn"
            onClick={e => { e.preventDefault(); trackResumeView('contact'); downloadResume(); }}
          >
            <Download size={16} />
            Download Resume
          </a>
          <p className="contact-resume-sub">{resumeLabel || 'PDF · Updated 2025'}</p>
        </div>
      </div>
    </section>
  );
}

export default Contact;
