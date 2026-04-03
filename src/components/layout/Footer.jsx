import { links } from '../../data/content';
import { trackLinkClick } from '../../utils/analytics';
import { Github } from 'lucide-react';
import '../../styles/components/Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-copy">© {new Date().getFullYear()} Ashin Sabu</p>
        <a
          href={links.sourceCode}
          target="_blank"
          rel="noopener noreferrer"
          className="footer-source"
          onClick={() => trackLinkClick('source_code', links.sourceCode, 'footer')}
        >
          <Github size={12} />
          Source
        </a>
      </div>
    </footer>
  );
}

export default Footer;
