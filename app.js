import { BUSINESS, categories, products } from "./products.js?v=6";

const state = {
  query: "",
  category: "Todos",
  availableOnly: false,
  sort: "featured",
  selected: new Set(JSON.parse(localStorage.getItem("demi-selection") || "[]")),
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let revealObserver;
let scrollFrame = 0;
const els = {
  intro: $("#intro"), introBar: $("#introBar"), introCount: $("#introCount"),
  categoryGrid: $("#categoryGrid"), categoryFilters: $("#categoryFilters"),
  search: $("#searchInput"), sort: $("#sortSelect"), available: $("#availableOnly"),
  productGrid: $("#productGrid"), resultCount: $("#resultCount"), activeFilters: $("#activeFilters"), empty: $("#emptyState"),
  filters: $("#filterPanel"), filterToggle: $("#filterToggle"), filterClose: $("#filterClose"), clearFilters: $("#clearFilters"),
  dialog: $("#productDialog"), dialogContent: $("#dialogContent"),
  selectionDrawer: $("#selectionDrawer"), selectionTrigger: $("#selectionTrigger"), selectionClose: $("#selectionClose"), selectionItems: $("#selectionItems"), selectionCount: $("#selectionCount"),
  sendSelection: $("#sendSelection"), clearSelection: $("#clearSelection"), scrim: $("#scrim"), toast: $("#toast"),
};

function startIntro() {
  if (prefersReducedMotion.matches) { els.intro.classList.add("is-done"); return; }
  let value = 0;
  const tick = () => {
    value += value < 72 ? 4 : 7;
    value = Math.min(value, 100);
    els.introCount.value = String(value).padStart(3, "0");
    els.introBar.style.inlineSize = `${value}%`;
    if (value < 100) requestAnimationFrame(tick);
    else setTimeout(() => els.intro.classList.add("is-done"), 180);
  };
  requestAnimationFrame(tick);
}

function categoryCount(category) {
  return category === "Todos" ? products.length : products.filter((item) => item.categoria === category).length;
}

function renderCategories() {
  els.categoryGrid.innerHTML = categories.filter((cat) => cat !== "Todos").map((cat, index) => `
    <button class="category-card ${state.category === cat ? "is-active" : ""}" type="button" data-category="${cat}">
      <span>0${index + 1}</span><strong>${cat}</strong><small>${categoryCount(cat)} ${categoryCount(cat) === 1 ? "item" : "itens"}</small>
    </button>`).join("");

  els.categoryFilters.innerHTML = categories.map((cat) => `
    <label><input type="radio" name="category" value="${cat}" ${state.category === cat ? "checked" : ""} /> ${cat} <small>(${categoryCount(cat)})</small></label>`).join("");
}

function filteredProducts() {
  const query = state.query.trim().toLocaleLowerCase("pt-BR");
  const list = products.filter((item) => {
    const haystack = `${item.nome} ${item.codigo} ${item.descricao} ${item.categoria}`.toLocaleLowerCase("pt-BR");
    return (!query || haystack.includes(query)) &&
      (state.category === "Todos" || item.categoria === state.category) &&
      (!state.availableOnly || item.disponibilidade.toLocaleLowerCase("pt-BR").includes("consulte"));
  });
  return list.sort((a, b) => {
    if (state.sort === "name") return a.nome.localeCompare(b.nome, "pt-BR");
    if (state.sort === "price-asc") return (a.preco ?? Infinity) - (b.preco ?? Infinity);
    if (state.sort === "price-desc") return (b.preco ?? -Infinity) - (a.preco ?? -Infinity);
    return Number(b.destaque) - Number(a.destaque);
  });
}

function productCard(item) {
  return `<article class="product-card" data-id="${item.id}">
    <div class="product-card__media">
      <img src="${item.imagens[0]}" alt="${item.imagemIlustrativa ? "Imagem ilustrativa de " : "Registro publicado pela DEMI mostrando "}${item.nome}" loading="lazy" width="900" height="1125" />
      ${item.destaque ? '<span class="product-card__badge">Novidade publicada</span>' : ""}
      ${item.imagemIlustrativa ? '<span class="product-card__caption">Imagem ilustrativa</span>' : ""}
    </div>
    <div class="product-card__body">
      <div class="product-card__meta"><span>${item.categoria}</span><span>${item.codigo}</span></div>
      <h3>${item.nome}</h3>
      <p class="product-card__description">${item.descricao}</p>
      <div class="product-card__facts"><span>Valor</span><strong>${item.preco ? formatPrice(item.preco) : "Consulte"}</strong><span>Status</span><strong>Sob consulta</strong></div>
      <div class="product-card__actions">
        <button type="button" data-details="${item.id}">Ver detalhes</button>
        <button class="select-product ${state.selected.has(item.id) ? "is-selected" : ""}" type="button" data-select="${item.id}" aria-label="${state.selected.has(item.id) ? "Remover" : "Adicionar"} ${item.nome} da seleção" aria-pressed="${state.selected.has(item.id)}">${state.selected.has(item.id) ? "✓" : "+"}</button>
      </div>
    </div>
  </article>`;
}

function renderProducts() {
  const list = filteredProducts();
  els.productGrid.innerHTML = list.map(productCard).join("");
  els.productGrid.hidden = list.length === 0;
  els.empty.hidden = list.length !== 0;
  els.resultCount.textContent = `${list.length} ${list.length === 1 ? "item encontrado" : "itens encontrados"}`;
  renderActiveFilters();
  renderCategories();
  prepareMotion(els.productGrid);
  prepareMotion(els.categoryGrid);
}

function prepareMotion(scope = document) {
  if (!revealObserver) return;
  const targets = scope.matches?.(".product-card, .category-card") ? [scope] : [...scope.querySelectorAll(".product-card, .category-card")];
  targets.forEach((element, index) => {
    element.dataset.reveal = "scale";
    element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 70}ms`);
    revealObserver.observe(element);
  });
}

function initScrollMotion() {
  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) return;

  document.documentElement.classList.add("motion-ready");
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: "0px 0px -9%" });

  const groups = [
    [".about > div:not(.about__line)", "default"],
    [".catalog-rail > div", "scale"],
    [".section-heading > *", "default"],
    [".catalog__heading > *", "default"],
    [".catalog__toolbar", "line"],
    [".ordering > div, .ordering li", "default"],
    [".final-cta > *", "default"],
    ["footer > *", "default"],
  ];

  groups.forEach(([selector, variant]) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.dataset.reveal = variant;
      element.style.setProperty("--reveal-delay", `${Math.min(index, 3) * 85}ms`);
      revealObserver.observe(element);
    });
  });
  prepareMotion(document);

  const updateScrollEffects = () => {
    scrollFrame = 0;
    const maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
    document.documentElement.style.setProperty("--scroll-progress", `${Math.min(scrollY / maxScroll * 100, 100)}%`);
    const hero = $(".hero");
    if (hero && hero.getBoundingClientRect().bottom > 0) {
      const shift = Math.min(Math.max(scrollY * .075 - 32, -32), 36);
      $(".hero__media img")?.style.setProperty("--hero-shift", `${shift}px`);
    }
  };
  const requestScrollUpdate = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollEffects);
  };
  addEventListener("scroll", requestScrollUpdate, { passive: true });
  addEventListener("resize", requestScrollUpdate, { passive: true });
  updateScrollEffects();
}

function renderActiveFilters() {
  const chips = [];
  if (state.query) chips.push(`<button class="filter-chip" data-remove="query">Busca: ${escapeHtml(state.query)} <span>×</span></button>`);
  if (state.category !== "Todos") chips.push(`<button class="filter-chip" data-remove="category">${state.category} <span>×</span></button>`);
  if (state.availableOnly) chips.push('<button class="filter-chip" data-remove="available">Sob consulta <span>×</span></button>');
  els.activeFilters.innerHTML = chips.join("");
}

function openDetails(id) {
  const item = products.find((product) => product.id === id);
  if (!item) return;
  const related = products.filter((product) => product.id !== id && product.categoria === item.categoria).slice(0, 2);
  els.dialogContent.innerHTML = `<article class="dialog-product">
    <div class="dialog-product__gallery"><div class="dialog-product__media"><img id="dialogMainImage" src="${item.imagens[0]}" alt="${item.imagemIlustrativa ? "Imagem ilustrativa de " : "Registro publicado pela DEMI mostrando "}${item.nome}" /></div>${item.imagens.length > 1 ? `<div class="dialog-thumbs">${item.imagens.map((src, index) => `<button type="button" data-gallery="${src}" aria-label="Ver imagem ${index + 1}"><img src="${src}" alt="" /></button>`).join("")}</div>` : ""}</div>
    <div class="dialog-product__body">
      <span class="dialog-product__code">${item.codigo} · ${item.categoria}</span>
      <h2 id="dialogTitle">${item.nome}</h2>
      <p>${item.descricao}</p>
      ${item.imagemIlustrativa ? '<p class="source-note">A foto é ilustrativa. Confirme a apresentação real no atendimento.</p>' : ""}
      <dl class="spec-list">${Object.entries(item.especificacoes).map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("")}</dl>
      <div class="dialog-actions">
        <button class="button button--gold" type="button" data-message="${item.id}">${BUSINESS.whatsapp ? "Pedir pelo WhatsApp" : "Copiar pedido e abrir Instagram"}</button>
        <button class="button button--line" type="button" data-select="${item.id}">${state.selected.has(item.id) ? "Remover da seleção" : "Adicionar à seleção"}</button>
      </div>
      ${related.length ? `<div class="related"><h3>Itens relacionados</h3>${related.map((product) => `<button type="button" data-related="${product.id}">${product.nome}</button>`).join("")}</div>` : ""}
    </div>
  </article>`;
  if (!els.dialog.open) els.dialog.showModal();
}

function messageFor(item) {
  return `Olá! Gostaria de saber mais sobre o produto ${item.nome}, código ${item.codigo}.`;
}

async function contact(message) {
  if (BUSINESS.whatsapp) {
    window.open(`https://wa.me/55${BUSINESS.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    return;
  }
  await copyText(message);
  showToast("Mensagem copiada. O WhatsApp não está publicado; abrimos o Instagram oficial.");
  window.open(BUSINESS.instagram, "_blank", "noopener,noreferrer");
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const area = document.createElement("textarea"); area.value = text; document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
  }
}

function toggleSelection(id) {
  if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
  localStorage.setItem("demi-selection", JSON.stringify([...state.selected]));
  renderSelection();
  renderProducts();
  if (els.dialog.open) openDetails(id);
  showToast(state.selected.has(id) ? "Item adicionado à seleção." : "Item removido da seleção.");
}

function renderSelection() {
  const items = products.filter((item) => state.selected.has(item.id));
  els.selectionCount.textContent = items.length;
  els.selectionCount.setAttribute("aria-label", `${items.length} ${items.length === 1 ? "item" : "itens"}`);
  els.selectionItems.innerHTML = items.length ? items.map((item) => `<article class="selection-item">
    <img src="${item.imagens[0]}" alt="" /><div><strong>${item.nome}</strong><small>${item.codigo}</small></div><button type="button" data-remove-selection="${item.id}" aria-label="Remover ${item.nome}">×</button>
  </article>`).join("") : '<p class="selection-empty">Sua lista está vazia. Adicione itens do catálogo para revisar tudo aqui.</p>';
  els.sendSelection.disabled = items.length === 0;
  els.clearSelection.disabled = items.length === 0;
}

function openDrawer(drawer) {
  drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false");
  els.scrim.hidden = false; document.body.classList.add("drawer-open");
  drawer.querySelector("button")?.focus();
}

function closeDrawers() {
  els.selectionDrawer.classList.remove("is-open"); els.selectionDrawer.setAttribute("aria-hidden", "true");
  els.filters.classList.remove("is-open"); els.filterToggle.setAttribute("aria-expanded", "false"); els.selectionTrigger.setAttribute("aria-expanded", "false");
  els.filters.setAttribute("aria-hidden", matchMedia("(max-width: 760px)").matches ? "true" : "false");
  els.scrim.hidden = true; document.body.classList.remove("drawer-open");
}

function clearFilters() {
  state.query = ""; state.category = "Todos"; state.availableOnly = false; state.sort = "featured";
  els.search.value = ""; els.available.checked = false; els.sort.value = "featured"; renderProducts();
}

let toastTimer;
function showToast(text) {
  clearTimeout(toastTimer); els.toast.textContent = text; els.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2800);
}

function formatPrice(value) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button, a");
  if (!target) return;
  if (target.dataset.category) { state.category = target.dataset.category; renderProducts(); $("#catalogo").scrollIntoView({ behavior: "smooth" }); }
  if (target.dataset.details) openDetails(target.dataset.details);
  if (target.dataset.related) openDetails(target.dataset.related);
  if (target.dataset.select) toggleSelection(target.dataset.select);
  if (target.dataset.message) { const item = products.find((product) => product.id === target.dataset.message); if (item) await contact(messageFor(item)); }
  if (target.dataset.gallery) { const image = $("#dialogMainImage"); if (image) image.src = target.dataset.gallery; }
  if (target.dataset.removeSelection) toggleSelection(target.dataset.removeSelection);
  if (target.dataset.clear !== undefined) clearFilters();
  if (target.dataset.remove) {
    if (target.dataset.remove === "query") { state.query = ""; els.search.value = ""; }
    if (target.dataset.remove === "category") state.category = "Todos";
    if (target.dataset.remove === "available") { state.availableOnly = false; els.available.checked = false; }
    renderProducts();
  }
});

els.categoryFilters.addEventListener("change", (event) => { if (event.target.name === "category") { state.category = event.target.value; renderProducts(); } });
els.search.addEventListener("input", () => { state.query = els.search.value; renderProducts(); });
els.sort.addEventListener("change", () => { state.sort = els.sort.value; renderProducts(); });
els.available.addEventListener("change", () => { state.availableOnly = els.available.checked; renderProducts(); });
els.clearFilters.addEventListener("click", clearFilters);
els.filterToggle.addEventListener("click", () => { openDrawer(els.filters); els.filterToggle.setAttribute("aria-expanded", "true"); });
els.filterClose.addEventListener("click", closeDrawers);
els.selectionTrigger.addEventListener("click", () => { openDrawer(els.selectionDrawer); els.selectionTrigger.setAttribute("aria-expanded", "true"); });
els.selectionClose.addEventListener("click", closeDrawers);
els.scrim.addEventListener("click", closeDrawers);
els.dialog.querySelector(".dialog-close").addEventListener("click", () => els.dialog.close());
els.clearSelection.addEventListener("click", () => { state.selected.clear(); localStorage.removeItem("demi-selection"); renderSelection(); renderProducts(); });
els.sendSelection.addEventListener("click", async () => {
  const items = products.filter((item) => state.selected.has(item.id));
  const lines = items.map((item) => `• ${item.nome} — ${item.codigo}`).join("\n");
  await contact(`Olá! Gostaria de saber mais sobre estes produtos da DEMI Cafeteria:\n${lines}`);
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawers(); });
addEventListener("pageshow", (event) => { if (event.persisted) closeDrawers(); });

document.querySelectorAll(".contact-link").forEach((link) => {
  if (BUSINESS.whatsapp) {
    link.href = `https://wa.me/55${BUSINESS.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre o catálogo da DEMI Cafeteria.")}`;
    link.textContent = "Falar pelo WhatsApp";
  }
});

$("#year").textContent = new Date().getFullYear();
renderCategories(); renderProducts(); renderSelection(); closeDrawers(); initScrollMotion(); startIntro();
