import Link from "next/link";

export default function TermsAndConditionsPage() {
  return (
    <main className="auth-page">
      <section className="auth-card dashboard-card">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">D</span>DirhamLink</Link>
        <p className="eyebrow auth-eyebrow">Important information</p>
        <h1>Terms and Conditions</h1>
        <p className="auth-intro">Please read these terms before submitting a transfer inquiry or using the DirhamLink website.</p>

        <h2>1. Service and transfer requests</h2>
        <p>DirhamLink provides information, indicative exchange-rate displays and remittance inquiry assistance. Submitting a transfer request creates a transaction record; it does not by itself mean that a remittance has been accepted, funded, approved, processed or paid out.</p>

        <h2>2. Exchange rates and charges</h2>
        <p>Rates shown on the website are indicative reference estimates and may change. They are not a binding or executable offer. The applicable rate, fees, amount payable and recipient amount must be confirmed through the authorised service provider before a transfer proceeds.</p>

        <h2>3. Funding and verification</h2>
        <p>Customers must follow the verified funding instructions provided for their transaction. Do not deposit or send money to an account or person unless the instructions have been confirmed through an authorised DirhamLink channel. A payment receipt or screenshot alone does not establish that funds have been received.</p>

        <h2>4. Identity, eligibility and compliance checks</h2>
        <p>Transfers may be subject to identity verification, source-of-funds checks, beneficiary checks, sanctions screening, regulatory requirements and other compliance reviews. A transaction may be delayed, placed on hold, declined or cancelled where required by law, policy or the authorised service provider.</p>

        <h2>5. Estimated five-hour service target</h2>
        <p>Where displayed, the five-hour countdown is an estimated service target measured from the time the customer submits the transaction request. It is not a guaranteed completion time and does not mean that funds have been received or that a payout has been made. Actual processing time may depend on successful funding, complete and accurate information, verification and compliance checks, banking hours, intermediary institutions, destination-country systems and the authorised payout provider.</p>
        <p>If the transfer has not been successfully credited to the recipient’s bank account within the stated timeframe, please contact our support team and provide your DirhamLink transaction reference. Our team will help check the transaction status. Do not submit a duplicate transfer unless support advises you to do so.</p>

        <h2>6. Transaction status</h2>
        <p>Online status information and countdowns are provided for tracking and may not reflect real-time bank processing. A transaction should only be described as paid or completed after payout has been confirmed through a reliable, authorised source. A countdown reaching zero is not proof of payment.</p>

        <h2>7. Customer responsibilities</h2>
        <p>Customers are responsible for providing accurate sender and beneficiary details, checking recipient information carefully, responding to reasonable verification requests and keeping their transaction reference. Incorrect or incomplete details may cause delays or failed transfers.</p>

        <h2>8. Website information and availability</h2>
        <p>We aim to keep website information available and current, but do not guarantee uninterrupted access, error-free information or the availability of any exchange rate or transfer route. Website content may be updated when needed.</p>

        <h2>9. Support and complaints</h2>
        <p>If a transfer is delayed or you have a question or complaint, contact the DirhamLink support team through the support contact details provided to you or the official channel through which your transaction was arranged. Include your transaction reference and never share your password or one-time security codes.</p>

        <h2>10. Changes and applicable requirements</h2>
        <p>These terms may be updated from time to time. Use of the website and any transfer service remains subject to applicable laws, regulatory requirements and the terms of the authorised service provider handling the transaction.</p>

        <p className="auth-disclaimer">This page provides general website terms and operational information. It is not a substitute for transaction-specific instructions or legal advice.</p>
        <Link className="auth-home" href="/">← Back to DirhamLink</Link>
      </section>
    </main>
  );
}
