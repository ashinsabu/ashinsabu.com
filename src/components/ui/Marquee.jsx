import '../../styles/components/Marquee.css';

const ITEMS = [
  'ArgoCD Contributor',
  'ICPC Regionalist',
  'LeetCode Knight',
  'Go / gRPC / Redis',
  'Also makes music',
  'Probably overengineering something right now',
  'Bengaluru',
  'Once scaled a service 12.5x',
  'Open to interesting problems',
  'Reads papers recreationally',
];

function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {ITEMS.map((item, i) => (
          <span key={i} className="marquee-item">{item}</span>
        ))}
        {/* Duplicate for seamless infinite loop */}
        {ITEMS.map((item, i) => (
          <span key={`d-${i}`} className="marquee-item">{item}</span>
        ))}
      </div>
    </div>
  );
}

export default Marquee;
