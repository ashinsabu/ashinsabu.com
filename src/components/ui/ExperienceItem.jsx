import '../../styles/components/ExperienceItem.css';

function ExperienceItem({ company, role, period, bullets }) {
  return (
    <div className="experience-item">
      <div className="experience-header">
        <div>
          <span className="experience-company">{company}</span>
          <span className="experience-role">{role}</span>
        </div>
        <span className="experience-period">{period}</span>
      </div>
      <ul className="experience-bullets">
        {bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
}

export default ExperienceItem;
