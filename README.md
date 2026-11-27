# DirhamLink

**Your Money. Your Destination.**

DirhamLink is a UAE-based remittance information and inquiry platform. Customers can explore indicative exchange-rate information, estimate a recipient amount, and submit an inquiry for follow-up by the team.

## Current foundation

- Responsive homepage and DirhamLink branding
- Destination overview for India, Pakistan, Nepal, Bangladesh, Egypt and the Philippines
- Indicative-rate display clearly marked as demonstration data
- Interactive AED-to-destination-currency calculator using demonstration values
- Compliance-aware wording: the site does not execute money transfers or treat an inquiry as a completed transfer

## Important before launch

The rates currently shown are **sample values only**. They are not live, approved selling rates and must not be used to quote or execute a transfer. Replace them with a properly sourced market reference feed and an administrator-controlled, approved selling-rate workflow before publishing real rates.

This starter homepage does not yet include customer authentication, customer records, deposit-slip uploads, bank reconciliation, staff/admin dashboards, or production inquiry storage. Those require a secure database, identity provider, private file storage, authorization controls, audit logging and operational review.

Never commit API keys, OAuth secrets, customer information, bank details, deposit receipts or production environment files to this repository.

## Local development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production safeguards

- Transfers must be handled by the appropriately authorized service provider.
- Uploaded deposit receipts are not proof that funds have reached the company bank account.
- Bank verification must be completed by authorized staff after independent reconciliation.
- Displayed rates must be timestamped, have an expiry/staleness policy and require approval before publication.
- Disclose that waived transfer fees do not necessarily waive exchange-rate margins, partner charges or other applicable fees.
