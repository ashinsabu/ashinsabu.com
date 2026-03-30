import { projects } from '../../data/content';
import SectionLabel from '../ui/SectionLabel';
import ProjectCard from '../ui/ProjectCard';
import { useSectionView } from '../../hooks/useSectionView';
import '../../styles/components/Built.css';

function Built() {
  const ref = useSectionView('built');

  return (
    <section className="built" id="built" ref={ref}>
      <div className="built-inner">
        <SectionLabel number="02" title="BUILT" />
        <div className="built-projects">
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      </div>
    </section>
  );
}

export default Built;
