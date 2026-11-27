import CurrencyCalculator from "./components/currency-calculator";

const destinations = [
  { name: "India", flag: "🇮🇳", currency: "INR", rate: "22.70" },
  { name: "Pakistan", flag: "🇵🇰", currency: "PKR", rate: "75.90" },
  { name: "Nepal", flag: "🇳🇵", currency: "NPR", rate: "36.20" },
  { name: "Bangladesh", flag: "🇧🇩", currency: "BDT", rate: "33.10" },
  { name: "Egypt", flag: "🇪🇬", currency: "EGP", rate: "13.25" },
  { name: "Philippines", flag: "🇵🇭", currency: "PHP", rate: "15.85" },
];

const moreCountries = [
  ["🇱🇰", "Sri Lanka"], ["🇮🇩", "Indonesia"], ["🇹🇭", "Thailand"],
  ["🇻🇳", "Vietnam"], ["🇨🇳", "China"], ["🇺🇬", "Uganda"],
];

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <a className="brand" href="#" aria-label="DirhamLink home">
            <span className="brand-mark">D</span> DirhamLink
          </a>
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#rates">Exchange Rates</a>
            <a href="#destinations">Destinations</a>
            <a href="#how-it-works">How It Works</a>
          </nav>
          <div className="nav-actions">
            <a className="btn btn-outline" href="#calculator">Calculate</a>
            <a className="btn btn-primary" href="#inquiry">Get Started</a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-inner">
            <div>
              <div className="eyebrow">UAE to the world · Remittance assistance</div>
              <h1>Your Money.<br /><span>Your Destination.</span></h1>
              <p className="hero-copy">
                A simpler way to explore exchange rates and make a remittance inquiry.
                Get clear guidance from our team, every step of the way.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="#rates">Explore Exchange Rates ↗</a>
                <a className="btn btn-outline" href="#how-it-works">How it works</a>
              </div>
            </div>
            <div className="hero-art" aria-label="UAE and international destinations">
              <div className="flag-ribbon" aria-label="United Arab Emirates flag">🇦🇪</div>
              <div className="globe">
                <div className="globe-inner">
                  <div className="globe-emoji">🌍</div>
                  <div className="globe-label">Connecting UAE</div>
                  <div className="globe-sub">to destinations worldwide</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container rate-wrap" id="rates">
          <div className="rate-panel">
            <div className="section-heading">
              <div>
                <h2>Explore exchange rates</h2>
                <p>Indicative reference rates · Sample display only, not live rates</p>
              </div>
              <span className="eyebrow" style={{ color: "#1769e0" }}>AED · UAE Dirham</span>
            </div>
            <div className="rate-grid">
              {destinations.map((country) => (
                <article className="rate-card" key={country.currency}>
                  <div className="country-top"><span className="flag">{country.flag}</span>{country.name}</div>
                  <div className="currency">1 AED to {country.currency}</div>
                  <div className="rate-value">{country.rate}</div>
                  <div className="rate-note">Demo value · Not a quote</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="content-section" id="how-it-works">
          <div className="container">
            <div className="center-heading">
              <h2>Remittance guidance, made clearer</h2>
              <p>Explore your options, send an inquiry and let our team guide you through the next steps.</p>
            </div>
            <div className="feature-grid">
              <article className="feature"><div className="feature-icon">↗</div><h3>Explore rates</h3><p>Review indicative currency rates with clear timestamps and confirmation before proceeding.</p></article>
              <article className="feature"><div className="feature-icon">◎</div><h3>Send an inquiry</h3><p>Tell us your destination and transfer needs. Our team will contact you with guidance.</p></article>
              <article className="feature"><div className="feature-icon">♧</div><h3>Personal assistance</h3><p>Get support with the process and required checks through the appropriate authorized provider.</p></article>
            </div>
          </div>
        </section>

        <section className="content-section" id="destinations" style={{ background: "#fff" }}>
          <div className="container">
            <div className="center-heading">
              <h2>Where would you like to send?</h2>
              <p>Explore popular destinations from the UAE.</p>
            </div>
            <div className="country-grid">
              {destinations.map((country) => (
                <div className="country-chip" key={country.name}><span className="flag">{country.flag}</span>{country.name}</div>
              ))}
              {moreCountries.map(([flag, name]) => (
                <div className="country-chip" key={name}><span className="flag">{flag}</span>{name}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="content-section" id="calculator">
          <div className="container">
            <div className="calculator">
              <div>
                <div className="eyebrow" style={{ color: "#1769e0" }}>Quick estimate</div>
                <h2>Plan with a clearer picture.</h2>
                <p>Use our sample calculator to estimate a recipient amount. The final rate and any applicable charges must be confirmed by our team.</p>
              </div>
              <CurrencyCalculator />
            </div>
          </div>
        </section>

        <section className="container" id="inquiry">
          <div className="cta">
            <div><h2>Ready to take the next step?</h2><p>Send an inquiry and our team will help you understand the process.</p></div>
            <a className="btn btn-primary" href="mailto:hello@dirhamlink.com?subject=Remittance%20inquiry">Make an inquiry ↗</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-row">
          <a className="brand" href="#"><span className="brand-mark">D</span><span style={{ color: "#fff" }}>DirhamLink</span></a>
          <p className="footer-note">DirhamLink provides information and inquiry assistance. Displayed rates are illustrative only and are not executable offers. Transfers are subject to confirmation, eligibility and applicable checks by the authorized service provider.</p>
        </div>
      </footer>
    </>
  );
}
