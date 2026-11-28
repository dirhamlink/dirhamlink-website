import CurrencyCalculator from "./components/currency-calculator";
import LiveRateBoard from "./components/live-rate-board";

const destinations = [
  { name: "India", flag: "🇮🇳", currency: "INR" },
  { name: "Pakistan", flag: "🇵🇰", currency: "PKR" },
  { name: "Nepal", flag: "🇳🇵", currency: "NPR" },
  { name: "Bangladesh", flag: "🇧🇩", currency: "BDT" },
  { name: "Egypt", flag: "🇪🇬", currency: "EGP" },
  { name: "Philippines", flag: "🇵🇭", currency: "PHP" },
];

const moreCountries = [
  ["🇱🇰", "Sri Lanka"], ["🇮🇩", "Indonesia"], ["🇹🇭", "Thailand"],
  ["🇻🇳", "Vietnam"], ["🇨🇳", "China"], ["🇺🇬", "Uganda"],
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" width="27" height="27" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 15.5A13 13 0 0 1 30.5 9L34 12.5M34 12.5V5.5M34 12.5H27" stroke="#F5C85B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M32 24.5A13 13 0 0 1 9.5 31L6 27.5M6 27.5V34.5M6 27.5H13" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M23.5 13.5H18.8C16.7 13.5 15 15.2 15 17.3C15 19.4 16.7 21.1 18.8 21.1H21.2C23.3 21.1 25 22.8 25 24.9C25 27 23.3 28.7 21.2 28.7H15.5M20 10.5V31.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </span>
  );
}

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="container nav">
          <a className="brand" href="#" aria-label="DirhamLink home">
            <BrandMark /> DirhamLink
          </a>
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#rates">Exchange Rates</a>
            <a href="#destinations">Destinations</a>
            <a href="#how-it-works">How It Works</a>
          </nav>
          <div className="nav-actions">
            <a className="btn btn-outline" href="#calculator">Calculate</a>
            <a className="btn btn-login" href="/login">Log in</a>
            <a className="btn btn-primary" href="/register">Register</a>
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
                <h2>Live market reference rates</h2>
                <p>Automatically refreshed indicative rates from an external FX data provider.</p>
              </div>
              <span className="eyebrow" style={{ color: "#1769e0" }}>AED · UAE Dirham</span>
            </div>
            <LiveRateBoard />
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
                <a className="country-chip" key={country.name} href={`/destinations/${country.name.toLowerCase()}`}><span className="flag">{country.flag}</span>{country.name}<small className="country-explore">Explore country ↗</small></a>
              ))}
              {moreCountries.map(([flag, name]) => (
                <a className="country-chip" key={name} href={`/destinations/${name.toLowerCase().replaceAll(" ", "-")}`}>
                  <span className="flag">{flag}</span>{name}<small className="country-explore">Explore country ↗</small>
                </a>
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
            <a className="btn btn-primary" href="/register">Create a customer account ↗</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-row">
          <a className="brand" href="#"><span className="brand-mark">D</span><span style={{ color: "#fff" }}>DirhamLink</span></a>
          <p className="footer-note">DirhamLink provides information and remittance inquiry assistance. Displayed rates are indicative only and are not executable offers. Transfers are subject to confirmation, funding verification, eligibility, compliance checks and processing by the authorised service provider. The stated 5-hour period is an estimated service target, not a guarantee of credit. If the transfer has not been credited to the recipient’s bank account within the stated timeframe, please contact our support team.</p>
          <div className="footer-note">
            <strong>Customer support</strong><br />
            Arshdeep Singh · DirhamLink team<br />
            Email: <a href="/support">Contact Support</a><br />
            <a className="btn btn-primary" href="https://wa.me/971541797541?text=Hello%20DirhamLink%20Support%2C%20I%20need%20assistance." target="_blank" rel="noreferrer">Chat With Us</a>
          </div>
          <a href="/terms-and-conditions" className="footer-note">Terms and Conditions</a>
        </div>
      </footer>
    </>
  );
}
