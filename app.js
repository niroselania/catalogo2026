const search = document.querySelector("#searchInput");
const results = document.querySelector("#results");
const count = document.querySelector("#resultCount");
const label = document.querySelector("#resultLabel");
const activeFilterLabel = document.querySelector("#activeFilter");
const categories = document.querySelector("#categories");
const campaigns = document.querySelector("#campaigns");
const onlyStock = document.querySelector("#onlyStock");
const template = document.querySelector("#productCard");
const clear = document.querySelector("#clearSearch");
const toolbar = document.querySelector("#toolbar");
const toTop = document.querySelector("#toTop");
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("es-AR");
const campaignTags = ["Alto Verano", "Tech Tees", "Holidays"];
const tagColors = {
  "Alto Verano": "var(--tag-verano)",
  "Tech Tees": "var(--tag-tech)",
  "Holidays": "var(--tag-holidays)",
  "PreSeason": "var(--tag-pre)"
};
const LOW_STOCK = 3;
let products = [];
let activeCategory = "Todos";
const preseasonCodes = new Set([
  "20345CLOR", "20850BSNG", "21582DRBN", "21582WSTO", "22136BSNG", "22136SBDY",
  "22765CLOR", "22801BLSG", "22801OLGG", "23315BSNG", "23315WSTO", "25490PLCN",
  "25551OLNA", "26240RVGN", "27025BLSG", "27025SBDY", "27611BLSG", "27611WSTO",
  "28835CLOR", "33317RVGN", "37770BCW", "37770BLSG", "37841BLSG", "37841ORPL",
  "39724BBSN", "42410HMNL", "47914BLSG", "48262WSTO", "48835GMTG", "49448CLOR",
  "50151MTBA", "57450BSNG"
]);

const normalize = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const compareSizes = (a, b) => String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
const totalStock = (p) => Number(p.stock?.total) || 0;
const productTags = (p) => [...(p.tags || []), ...(preseasonCodes.has(p.code) ? ["PreSeason"] : [])];

function matchesFilter(p, name) {
  return name === "Todos"
    || (name === "PreSeason" && preseasonCodes.has(p.code))
    || p.tags?.includes(name)
    || p.category === name;
}

function setStoreCell(node, selector, value) {
  const dd = node.querySelector(selector);
  const amount = Number(value) || 0;
  dd.textContent = amount;
  dd.parentElement.classList.toggle("has-stock", amount > 0);
}

function render(items) {
  results.replaceChildren();
  count.textContent = items.length;
  label.textContent = items.length === 1 ? "producto encontrado" : "productos encontrados";
  if (!items.length) {
    results.innerHTML = '<p class="empty">No encontramos artículos para esa búsqueda. Probá con el código, color o una palabra más amplia.</p>';
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const product of items) {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".card");
    const img = node.querySelector("img");
    img.src = product.image;
    img.alt = `${product.name} - ${product.code}`;
    node.querySelector(".category").textContent = product.category;
    node.querySelector("h2").textContent = product.name;
    node.querySelector(".code").textContent = product.code;
    node.querySelector(".color").textContent = product.color;

    // Tags (campañas + PreSeason)
    const tagBox = node.querySelector(".tags");
    for (const tag of productTags(product)) {
      const el = document.createElement("span");
      el.className = "tag";
      el.textContent = tag;
      el.style.setProperty("--tag-color", tagColors[tag] || "var(--forest)");
      tagBox.append(el);
    }

    // Precios
    const prices = product.prices || {};
    const withoutVat = Number(prices.withoutVat) || 0;
    const withVat = Number(prices.withVat) || 0;
    const vatPercent = Number(prices.vatPercent) || 0;
    node.querySelector(".price-without-vat").textContent = money.format(withoutVat);
    node.querySelector(".price-vat-label").textContent = vatPercent ? `IVA ${vatPercent}%` : "IVA";
    node.querySelector(".price-vat").textContent = money.format(Math.max(0, withVat - withoutVat));
    node.querySelector(".price-total-value").textContent = money.format(withVat);
    node.querySelector(".prices").classList.toggle("is-empty", !withVat);

    // Stock
    const total = totalStock(product);
    node.querySelector(".stock-total-value").textContent = product.stock?.total ?? 0;
    setStoreCell(node, ".stock-carrito", product.stock?.carrito);
    setStoreCell(node, ".stock-local", product.stock?.local);
    setStoreCell(node, ".stock-bariloche", product.stock?.bariloche);
    setStoreCell(node, ".stock-rio", product.stock?.rio);
    const badge = node.querySelector(".stock-badge");
    if (total <= 0) {
      card.classList.add("is-out");
      badge.classList.add("is-out");
      badge.textContent = "Sin stock";
    } else if (total <= LOW_STOCK) {
      card.classList.add("is-low");
      badge.classList.add("is-low");
      badge.textContent = total === 1 ? "Última unidad" : "Últimas unidades";
    } else {
      badge.textContent = "Disponible";
    }

    const sizeDetails = product.stock?.sizes || [];
    if (sizeDetails.length) {
      const sizeSection = node.querySelector(".stock-sizes");
      const sizeRows = node.querySelector(".stock-size-rows");
      sizeSection.hidden = false;
      node.querySelector(".size-count").textContent = `${sizeDetails.length} ${sizeDetails.length === 1 ? "talle" : "talles"}`;
      for (const size of [...sizeDetails].sort((a, b) => compareSizes(a.size, b.size))) {
        const row = document.createElement("div");
        row.className = "stock-size-row";
        row.setAttribute("role", "row");
        [size.size, size.carrito, size.local, size.bariloche, size.rio].forEach((value, index) => {
          const cell = document.createElement("span");
          cell.setAttribute("role", "cell");
          cell.textContent = value;
          if (index > 0) cell.className = Number(value) > 0 ? "is-positive" : "is-zero";
          row.append(cell);
        });
        sizeRows.append(row);
      }
    }
    fragment.append(node);
  }
  results.append(fragment);
}

function filter() {
  const query = normalize(search.value);
  const items = products.filter((p) => {
    const searchable = `${p.code} ${p.baseCode} ${p.color} ${p.name} ${p.category}`;
    return (!query || normalize(searchable).includes(query))
      && matchesFilter(p, activeCategory)
      && (!onlyStock.checked || totalStock(p) > 0);
  });
  clear.hidden = !query && activeCategory === "Todos" && !onlyStock.checked;
  activeFilterLabel.textContent = activeCategory === "Todos" ? "" : activeCategory;
  render(items);
}

function makeChip(name, container, isCampaign) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = isCampaign ? "chip chip-campaign" : "chip";
  button.dataset.name = name;
  if (isCampaign && tagColors[name]) button.style.setProperty("--tag-color", tagColors[name]);
  const text = document.createElement("span");
  text.textContent = name;
  const badge = document.createElement("span");
  badge.className = "chip-count";
  badge.textContent = products.filter((p) => matchesFilter(p, name)).length;
  button.append(text, badge);
  button.setAttribute("aria-pressed", name === activeCategory);
  button.addEventListener("click", () => setActive(name));
  container.append(button);
}

function setActive(name) {
  activeCategory = name;
  document.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-pressed", chip.dataset.name === name));
  filter();
}

function buildCategories() {
  makeChip("Todos", campaigns, false);
  [...campaignTags, "PreSeason"].forEach((name) => makeChip(name, campaigns, true));
  [...new Set(products.map((p) => p.category))].sort((a, b) => a.localeCompare(b)).forEach((name) => makeChip(name, categories, false));
}

function buildStats() {
  document.querySelector("#statProducts").textContent = number.format(products.length);
  document.querySelector("#statInStock").textContent = number.format(products.filter((p) => totalStock(p) > 0).length);
  document.querySelector("#statUnits").textContent = number.format(products.reduce((sum, p) => sum + totalStock(p), 0));
}

fetch("products.json").then((r) => r.json()).then((data) => {
  products = data;
  buildStats();
  buildCategories();
  filter();
  search.addEventListener("input", filter);
  onlyStock.addEventListener("change", filter);
}).catch(() => results.innerHTML = '<p class="empty">No se pudo cargar el catálogo. Abrí esta carpeta desde un servidor local.</p>');

clear.addEventListener("click", () => {
  search.value = "";
  onlyStock.checked = false;
  setActive("Todos");
  search.focus();
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { search.value = ""; filter(); } });

const onScroll = () => {
  toolbar.classList.toggle("is-stuck", toolbar.getBoundingClientRect().top <= 0 && window.scrollY > 0);
  toTop.hidden = window.scrollY < 700;
};
window.addEventListener("scroll", onScroll, { passive: true });
toTop.addEventListener("click", () => window.scrollTo({ top: 0 }));
onScroll();
