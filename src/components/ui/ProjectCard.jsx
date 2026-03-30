import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Tag from './Tag';
import { trackProjectExpand, trackLinkClick } from '../../utils/analytics';
import '../../styles/components/ProjectCard.css';

function ProjectCard({ project }) {
  const [open, setOpen] = useState(false);

  function handleAccordion() {
    if (!open) trackProjectExpand(project.id);
    setOpen(!open);
  }

  return (
    <article className="project-card">
      <div className="project-card-meta">
        <span className="project-index">{project.index}</span>
        <span>{project.status}</span>
      </div>

      <h3 className="project-title">{project.title}</h3>
      <p className="project-deck">{project.deck}</p>
      <p className="project-body">{project.body}</p>

      <button className="project-accordion" onClick={handleAccordion}>
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {open ? ' Hide details' : ' Impact & numbers'}
      </button>

      {open && (
        <ul className="project-impact-list">
          {project.impact.map((item, i) => (
            <li key={i}>
              <span className="impact-arrow">↗</span>
              {item}
            </li>
          ))}
        </ul>
      )}

      <div className="project-tags">
        {project.tags.map(tag => <Tag key={tag} label={tag} />)}
      </div>

      {project.link && (
        <a
          href={project.link}
          target="_blank"
          rel="noopener noreferrer"
          className="project-link"
          onClick={() => trackLinkClick('project', project.link)}
        >
          View live ↗
        </a>
      )}
    </article>
  );
}

export default ProjectCard;
