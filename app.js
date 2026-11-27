const CONFIG_URL = "./rates.json";
let destinations = [];
const byId = id => document.getElementById(id);

async function loadRates() {
  const status = byId("rateStatus");
  try {
    const response = await fetch(CONFIG_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Rate configuration unavailable");
    const config = await response.json();
    destinations = (config.destinations || []).filter(item => item.enabled);
    status.textContent = config.status === "active" ? "Indicative rates" : "Rates not configured";
  } catch {
    destinations = [];
    status.textContent = "Rates unavailable";
  }
  renderDestinations();
  updateConverter();
}

function renderDestinations() {
  const select = byId("destinationSelect");
  const formSelect = byId("formCountry");
  const grid = byId("destinationGrid");
  select.innerHTML = "";
  formSelect.innerHTML = '<option value="">Choose a destination</option>';
  grid.innerHTML = "";
  destinations.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = item.code;
    option.textContent = item.country + " (" + item.code + ")";
    select.appendChild(option);
    formSelect.appendChild(option.cloneNode(true));
    const card = document.createElement("a");
    card.className = "destination-card";
    card.href = "#enquiry";
    card.innerHTML = '<span class="country-flag" aria-hidden="true"></span><span><strong></strong><small></small></span><span class="destination-arrow">↗</span>';
    card.querySelector(".country-flag").textContent = item.flag || "🌍";
    card.querySelector("strong").textContent = item.country;
    card.querySelector("small").textContent = "Receive " + item.code;
    card.addEventListener("click", () => { formSelect.value = item.code; select.value = item.code; updateConverter(); });
    grid.appendChild(card);
    if (index === 0) select.value = item.code;
  });
  if (!destinations.length) {
    const message = document.createElement("p");
    message.className = "rate-note";
    message.textContent = "Destination information is temporarily unavailable.";
    grid.appendChild(message);
  }
}

function updateConverter() {
  const item = destinations.find(d => d.code === byId("destinationSelect").value) || destinations[0];
  const amount = Number(byId("sendAmount").value);
  byId("receiveCode").textContent = item ? item.code : "—";
  byId("receiveCountry").textContent = item ? item.country : "Choose a destination";
  if (!item || !Number.isFinite(Number(item.rate)) || Number(item.rate) <= 0) {
    byId("receiveAmount").textContent = "Rate not set";
    byId("unitRate").textContent = "Not available";
    byId("rateNote").textContent = "Rates for this destination have not yet been configured. Please enquire for information.";
    return;
  }
  const rate = Number(item.rate);
  byId("receiveAmount").textContent = Number.isFinite(amount) && amount > 0 ? (amount * rate).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";
  byId("unitRate").textContent = rate.toLocaleString(undefined, { maximumFractionDigits: 4 }) + " " + item.code;
  byId("rateNote").textContent = "Configured indicative rate only. Final rate and fees are confirmed by the authorised provider.";
}

byId("destinationSelect").addEventListener("change", updateConverter);
byId("sendAmount").addEventListener("input", updateConverter);
byId("year").textContent = new Date().getFullYear();

const menuToggle = byId("menuToggle");
menuToggle.addEventListener("click", () => {
  const nav = byId("mainNav");
  const open = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
});
document.querySelectorAll("#mainNav a").forEach(link => link.addEventListener("click", () => {
  byId("mainNav").classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));

byId("enquiryForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const result = byId("formResult");
  result.hidden = false;
  result.textContent = "Your form is validated in this website preview, but your details have NOT been sent or saved. A secure, private enquiry service must be connected before customers can submit real enquiries. Please do not rely on this preview for a transfer request.";
});
loadRates();