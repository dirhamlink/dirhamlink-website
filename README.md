# DirhamLink

Responsive UAE remittance enquiry website MVP, built with plain HTML, CSS and JavaScript for GitHub Pages.

## Included
- Customer landing page and UAE branding
- Destination selector for India, Pakistan, Nepal, Bangladesh, Egypt and the Philippines
- AED currency conversion interface
- Enquiry form layout and browser-side validation
- Mobile-responsive layout
- Exchange-rate configuration in rates.json

## Important: front-end preview only
There is no secure backend yet. The enquiry form deliberately does **not** transmit or save personal details. Exchange rates are intentionally blank until verified values are provided. Do not enter real customer data or publish unverified rates.

This website does not accept funds, execute transfers or verify customers. Actual transfers, customer verification and compliance must be handled through an appropriately authorised provider and in accordance with applicable UAE requirements.

## Preview locally
Open the repository with a local web server (for example, VS Code Live Server). The rate configuration is loaded using fetch, so opening index.html directly with a file URL may prevent it from loading.

## Configure indicative rates
Edit rates.json only after receiving verified, approved rates from the authorised provider. Set each rate to the approved number of destination-currency units per 1 AED. Set status to active only when values are approved and current, and set updatedAt to an ISO 8601 timestamp. Establish an update and expiry process before launch.

## Before accepting real enquiries
1. Connect a private backend/API for form submission. Never store names, phone numbers, recipient data or identity documents in this public repository or browser local storage.
2. Add server-side validation, rate limiting, spam protection, access controls, audit logs and a retention/deletion policy.
3. Confirm privacy notice, consent wording, terms, complaints process and applicable UAE regulatory obligations with qualified advisers and the authorised provider.
4. Implement staff authentication and role-based access for any administration dashboard. Never put API keys, passwords or provider secrets in frontend files.
5. Connect an approved rate source and server-side margin/approval workflow. Display timestamps, fees and expiry clearly.
6. Test accessibility, mobile layouts, security and the complete enquiry lifecycle before launch.

## Deploy with GitHub Pages
1. Open repository Settings → Pages.
2. Under Build and deployment, choose Deploy from a branch.
3. Select branch main and folder /(root), then save.
4. Wait for GitHub Pages to publish. The URL is normally https://dirhamlink.github.io/dirhamlink-website/.

The public website is a preview until secure enquiry delivery and all required operational approvals are completed.