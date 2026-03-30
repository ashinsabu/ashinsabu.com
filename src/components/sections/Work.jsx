import { experience } from '../../data/content';
import SectionLabel from '../ui/SectionLabel';
import ExperienceItem from '../ui/ExperienceItem';
import { useSectionView } from '../../hooks/useSectionView';
import '../../styles/components/Work.css';

function Work() {
  const ref = useSectionView('work');

  return (
    <section className="work" id="work" ref={ref}>
      <div className="work-inner">
        <SectionLabel number="01" title="WORK" />
        <div className="work-experience">
          {experience.map((e, i) => (
            <ExperienceItem key={i} {...e} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Work;
