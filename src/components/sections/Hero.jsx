import ashin4 from '../../assets/ashin4.jpg';
import vinylSvg from '../../assets/icons/vinyl.svg';
import '../../styles/components/Hero.css';

function Hero({ heroBio, heroRole }) {
  return (
    <section className="hero">
      {/* LEFT: photo — portrait fills full height, subject faces right into content */}
      <div className="hero-photo">
        <img src={ashin4} alt="Ashin Sabu" />
      </div>

      {/* RIGHT: name + vinyl record spinning behind */}
      <div className="hero-text">
        <div className="vinyl-wrapper" aria-hidden="true">
          <img src={vinylSvg} alt="" className="vinyl-record" />
        </div>

        <div className="hero-text-content">
          <p className="hero-role">{heroRole || 'Software Engineer · Harness.io'}</p>
          <h1 className="hero-name">ASHIN<br />SABU</h1>
          <p className="hero-bio" style={heroBio ? { whiteSpace: 'pre-line' } : undefined}>
            {heroBio || <>Distributed systems<br />at production scale.</>}
          </p>
        </div>
      </div>
    </section>
  );
}

export default Hero;
