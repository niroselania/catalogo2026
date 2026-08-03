const search = document.querySelector("#searchInput");
const results = document.querySelector("#results");
const count = document.querySelector("#resultCount");
const label = document.querySelector("#resultLabel");
const categories = document.querySelector("#categories");
const template = document.querySelector("#productCard");
const clear = document.querySelector("#clearSearch");
let products = [];
let activeCategory = "Todos";

const normalize = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function render(items) {
  results.replaceChildren();
  count.textContent = items.length;
  label.textContent = items.length === 1 ? "producto encontrado" : "productos encontrados";
  if (!items.length) {
    results.innerHTML = '<p class="empty">No encontramos artículos para esa búsqueda. Probá con el código, color o una palabra más amplia.</p>';
    return;
  }
  for (const product of items) {
    const node = template.content.cloneNode(true);
    const img = node.querySelector("img");
    img.src = product.image;
    img.alt = `${product.name} - ${product.code}`;
    node.querySelector(".category").textContent = product.category;
    node.querySelector("h2").textContent = product.name;
    node.querySelector(".code").textContent = product.code;
    node.querySelector(".color").textContent = product.color;
    results.append(node);
  }
}

function filter() {
  const query = normalize(search.value);
  const items = products.filter((p) => {
    const searchable = `${p.code} ${p.baseCode} ${p.color} ${p.name} ${p.category}`;
    return (!query || normalize(searchable).includes(query)) && (activeCategory === "Todos" || p.category === activeCategory);
  });
  clear.hidden = !query;
  render(items);
}

function buildCategories() {
  const names = ["Todos", ...new Set(products.map((p) => p.category).sort((a, b) => a.localeCompare(b)))];
  names.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = name;
    button.setAttribute("aria-pressed", name === activeCategory);
    button.addEventListener("click", () => {
      activeCategory = name;
      [...categories.children].forEach((chip) => chip.setAttribute("aria-pressed", chip.textContent === name));
      filter();
    });
    categories.append(button);
  });
}

fetch("products.json").then((r) => r.json()).then((data) => {
  products = data;
  buildCategories();
  filter();
  search.addEventListener("input", filter);
}).catch(() => results.innerHTML = '<p class="empty">No se pudo cargar el catálogo. Abrí esta carpeta desde un servidor local.</p>');

clear.addEventListener("click", () => { search.value = ""; search.focus(); filter(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { search.value = ""; filter(); } });
