import Link from "next/link";
import { notFound } from "next/navigation";
import { getDestination, destinations } from "../../../lib/destination-info";

export const revalidate = 86400;

type WorldBankRow = { date: string; value: number | null };
type WorldBankResponse = [unknown, WorldBankRow[]];

async function getIndicator(country: string, indicator: string): Promise<WorldBankRow[]> {
  try {
    const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&date=2015:2025&per_page=100`;
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) return [];
    const result = (await response.json()) as WorldBankResponse;
    return Array.isArray(result?.[1]) ? result[1] : [];
  } catch {
    return [];
  }
}

function formatPopulation(value: number | null) {
  if (value === null) return "Not available";
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);
}
function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", notation:"compact", maximumFractionDigits:2 }).format(value);
}

export function generateStaticParams() {
  return destinations.map((destination) => ({ country: destination.slug }));
}

export default async function DestinationPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const destination = getDestination(country.toLowerCase());
  if (!destination) notFound();

  const [remittanceRows, populationRows] = await Promise.all([
    getIndicator(destination.countryCode, "BX.TRF.PWKR.CD.DT"),
    getIndicator(destination.countryCode, "SP.POP.TOTL"),
  ]);
  const remittances = remittanceRows
    .filter((row) => Number(row.date) >= 2015 && Number(row.date) <= 2025 && row.value !== null)
    .sort((a,b) => Number(a.date)-Number(b.date));
  const latestPopulation = populationRows.find((row) => row.value !== null);
  const latestYear = latestPopulation?.date ?? "latest available";
  const latestRemittance = [...remittances].reverse().find((row) => row.value !== null);
  const maxRemittance = Math.max(...remittances.map((row) => row.value ?? 0), 1);

  return (
    <main className="destination-page">
      <div className="destination-shell">
        <Link href="/#destinations" className="destination-back">← Back to destinations</Link>
        <section className="destination-hero">
          <div className="destination-flag">{destination.flag}</div>
          <div className="destination-eyebrow">DirhamLink destination guide</div>
          <h1>{destination.name}</h1>
          <p>{destination.overview}</p>
          <div className="destination-meta"><span>Capital: {destination.capital}</span><span>Currency: {destination.currency}</span></div>
        </section>

        <section className="destination-stats">
          <article><span>Population</span><strong>{formatPopulation(latestPopulation?.value ?? null)}</strong><small>World Bank · {latestYear}</small></article>
          <article><span>Personal remittances received</span><strong>{latestRemittance ? formatUSD(latestRemittance.value ?? 0) : "Not available"}</strong><small>World Bank · {latestRemittance?.date ?? "latest available"} · USD</small></article>
        </section>

        <section className="destination-section">
          <div className="destination-section-heading"><div><span className="destination-eyebrow">Economy & diaspora</span><h2>Annual remittance inflows</h2></div><span className="destination-unit">Current US dollars</span></div>
          <p className="destination-description">Personal remittances received, reported annually by the World Bank. Values are nominal USD and may be revised as source data is updated.</p>
          {remittances.length ? <div className="remittance-chart" role="img" aria-label={`Annual personal remittances received by ${destination.name}, in US dollars`}>
            {remittances.map((row) => <div className="remittance-bar-wrap" key={row.date}>
              <div className="remittance-value">{formatUSD(row.value ?? 0)}</div>
              <div className="remittance-bar-track"><div className="remittance-bar" style={{height:`${Math.max(3,((row.value ?? 0)/maxRemittance)*100)}%`}} /></div>
              <span>{row.date}</span>
            </div>)}
          </div> : <p className="destination-description">Annual remittance data is temporarily unavailable. Please try again later.</p>}
          <small className="destination-source">Source: World Bank World Development Indicators, “Personal remittances, received (current US$)” (BX.TRF.PWKR.CD.DT).</small>
        </section>

        <section className="destination-section">
          <span className="destination-eyebrow">Discover the country</span><h2>Popular places to visit</h2>
          <div className="destination-place-grid">{destination.places.map((place) => <article className="destination-place" key={place.name}><span>📍</span><h3>{place.name}</h3><p>{place.description}</p></article>)}</div>
        </section>

        <section className="destination-two-col">
          <article className="destination-section"><span className="destination-eyebrow">Culture</span><h2>Languages</h2><p>{destination.languages}</p></article>
          <article className="destination-section"><span className="destination-eyebrow">Cuisine</span><h2>Popular foods</h2><div className="food-tags">{destination.foods.map((food) => <span key={food}>{food}</span>)}</div></article>
        </section>

        <section className="destination-cta"><div><h2>Sending money to {destination.name}?</h2><p>Check the indicative exchange rate or submit a remittance inquiry with DirhamLink.</p></div><Link href="/#rates" className="btn btn-primary">View exchange rates</Link></section>
        <p className="destination-disclaimer">Country information is for general travel and cultural awareness only. Population and remittance figures reflect the latest available World Bank observations, not real-time estimates. Tourist access, safety advice and entry requirements can change; check official sources before travelling.</p>
      </div>
    </main>
  );
}
