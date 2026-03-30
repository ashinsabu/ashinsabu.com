import { contact, links } from '../../data/content';
import SectionLabel from '../ui/SectionLabel';
import { useSectionView } from '../../hooks/useSectionView';
import { trackLinkClick, trackResumeView } from '../../utils/analytics';
import { Github, Linkedin, Download } from 'lucide-react';
import '../../styles/components/Contact.css';

function Contact({ resumeLabel, resumeUrl }) {
  const ref = useSectionView('contact');

  return (
    <section className="contact" id="contact" ref={ref}>
      <div className="contact-inner">
        <SectionLabel number="04" title="CONTACT" />

        <div className="contact-email">
          <a
            href={`mailto:${contact.email}`}
            onClick={() => trackLinkClick('email', contact.email)}
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
            onClick={() => trackLinkClick('github', contact.github)}
          >
            <Github size={14} /> GitHub
          </a>
          <a
            href={contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-link"
            onClick={() => trackLinkClick('linkedin', contact.linkedin)}
          >
            <Linkedin size={14} /> LinkedIn
          </a>
          <a
            href={contact.medium}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-link"
            onClick={() => trackLinkClick('medium', contact.medium)}
          >
            Medium
          </a>
          <a
            href={contact.codeforces}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-link"
            onClick={() => trackLinkClick('codeforces', contact.codeforces)}
          >
            Codeforces
          </a>
        </div>

        {/* Resume CTA — prominent, serves all audiences */}
        <div className="contact-resume">
          <a
            href={resumeUrl || links.resume}
            download="Ashin-Sabu-Resume.pdf"
            className="contact-resume-btn"
            onClick={trackResumeView}
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
