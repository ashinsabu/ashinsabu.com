import '../../styles/components/SectionLabel.css';

function SectionLabel({ number, title }) {
  return (
    <div className="section-label">
      <span className="section-number">{number}</span>
      <span className="section-sep">—</span>
      <span className="section-title">{title}</span>
    </div>
  );
}

export default SectionLabel;
