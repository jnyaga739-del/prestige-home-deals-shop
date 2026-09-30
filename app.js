// ============================================================
// PRISTAGE ONLINE SHOP — shared front-end logic
// Loaded on every customer-facing page (index.html, product.html).
// Functions check for the DOM elements they need before acting,
// so this file is safe to include everywhere.
// ============================================================

const WA_ICON = `<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16.02 3C9.4 3 4 8.4 4 15.02c0 2.35.65 4.55 1.78 6.44L4 29l7.73-1.74a12.9 12.9 0 0 0 4.29.75h.01c6.62 0 12.02-5.4 12.02-12.02C28.05 8.4 22.65 3 16.02 3zm7.03 17.2c-.3.83-1.7 1.6-2.35 1.7-.6.09-1.36.13-2.2-.14-.5-.16-1.15-.37-1.98-.73-3.5-1.5-5.78-5.01-5.96-5.24-.17-.24-1.42-1.9-1.42-3.62 0-1.73.9-2.57 1.23-2.92.32-.34.7-.43.94-.43.23 0 .47 0 .67.01.21.01.5-.08.79.6.3.72 1.01 2.47 1.1 2.65.09.18.15.4.03.64-.12.24-.18.4-.36.6-.18.22-.38.48-.55.65-.18.18-.37.37-.16.73.21.36.94 1.55 2.02 2.51 1.39 1.24 2.56 1.62 2.92 1.8.36.18.57.15.78-.09.21-.24.9-1.05 1.14-1.41.24-.36.48-.3.8-.18.33.12 2.07.98 2.43 1.16.36.18.6.27.68.42.09.16.09.9-.21 1.72z"/></svg>`;

/* ---------------------------------------------------------
   Toasts
   --------------------------------------------------------- */
function ensureToastRegion() {
  let region = document.getElementById("toast-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "toast-region";
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
  }
  return region;
}

function showToast(message) {
  const region = ensureToastRegion();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  region.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

/* ---------------------------------------------------------
   Mobile menu
   --------------------------------------------------------- */
function initMobileMenu() {
  const toggle = document.getElementById("menu-toggle");
  const panel = document.getElementById("mobile-menu");
  const backdrop = document.getElementById("menu-backdrop");
  if (!toggle || !panel) return;

  function setOpen(open) {
    panel.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (backdrop) backdrop.style.display = open ? "block" : "none";
  }

  toggle.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
  const closeBtn = document.getElementById("menu-close");
  if (closeBtn) closeBtn.addEventListener("click", () => setOpen(false));
  if (backdrop) backdrop.addEventListener("click", () => setOpen(false));
  panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
}

/* ---------------------------------------------------------
   Order list ("cart") — a simple multi-item list the customer
   builds, then sends as one WhatsApp message. No payment is
   collected here; it only prepares the message.
   --------------------------------------------------------- */
const OrderList = {
  KEY: "pristage_order_list",

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  save(items) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(items));
    } catch (e) {
      /* storage unavailable — ignore, list just won't persist */
    }
    this.updateBadge();
  },

  add(product) {
    const items = this.get();
    const existing = items.find((i) => i.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    this.save(items);
    showToast(`${product.name} added to your order list`);
  },

  remove(id) {
    this.save(this.get().filter((i) => i.id !== id));
  },

  setQty(id, qty) {
    const items = this.get();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    item.qty = Math.max(1, qty);
    this.save(items);
  },

  clear() {
    this.save([]);
  },

  total() {
    return this.get().reduce((sum, i) => sum + Number(i.price) * i.qty, 0);
  },

  updateBadge() {
    const badge = document.getElementById("cart-badge");
    if (!badge) return;
    const count = this.get().reduce((sum, i) => sum + i.qty, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? "flex" : "none";
  },

  whatsAppMessage() {
    const items = this.get();
    if (!items.length) return "";
    const lines = items.map(
      (i) => `- ${i.name} x${i.qty} (KSh ${formatPrice(i.price * i.qty)})`
    );
    return (
      "Hello Pristage Online Shop, I would like to order:\n" +
      lines.join("\n") +
      `\n\nTotal: KSh ${formatPrice(this.total())}\n\nPlease confirm availability and delivery details.`
    );
  },
};

function initCartModal() {
  const cartBtn = document.getElementById("cart-btn");
  const overlay = document.getElementById("cart-modal");
  if (!cartBtn || !overlay) return;

  function render() {
    const items = OrderList.get();
    const body = overlay.querySelector(".cart-items");
    const footer = overlay.querySelector(".cart-footer");
    if (!items.length) {
      body.innerHTML = `<div class="empty-state"><span class="big">🛒</span><p>Your order list is empty. Browse products and tap "Add to order list".</p></div>`;
      footer.style.display = "none";
      return;
    }
    footer.style.display = "block";
    body.innerHTML = items
      .map(
        (i) => `
      <div class="cart-row" data-id="${i.id}">
        <div class="cart-row-name">${escapeHtml(i.name)}</div>
        <div class="cart-row-controls">
          <button class="qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>
          <span>${i.qty}</span>
          <button class="qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
          <button class="qty-btn remove" data-action="remove" aria-label="Remove item">✕</button>
        </div>
        <div class="cart-row-price">KSh ${formatPrice(i.price * i.qty)}</div>
      </div>`
      )
      .join("");
    overlay.querySelector(".cart-total").textContent = "KSh " + formatPrice(OrderList.total());
  }

  cartBtn.addEventListener("click", () => {
    render();
    overlay.style.display = "flex";
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest("[data-close]")) overlay.style.display = "none";
  });
  overlay.querySelector(".cart-items").addEventListener("click", (e) => {
    const row = e.target.closest(".cart-row");
    if (!row) return;
    const id = row.dataset.id;
    const items = OrderList.get();
    const item = items.find((i) => i.id === id);
    const action = e.target.dataset.action;
    if (action === "inc") OrderList.setQty(id, item.qty + 1);
    if (action === "dec") OrderList.setQty(id, item.qty - 1);
    if (action === "remove") OrderList.remove(id);
    render();
  });
  const sendBtn = overlay.querySelector(".cart-send");
  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      const msg = OrderList.whatsAppMessage();
      if (msg) window.open(buildWhatsAppLink(msg), "_blank");
    });
  }

  OrderList.updateBadge();
}

/* ---------------------------------------------------------
   Rendering helpers
   --------------------------------------------------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function productCardHtml(p) {
  const discount = ProductUtils.discountPercent(p.price, p.old_price);
  return `
  <div class="product-card">
    <a class="thumb" href="product.html?slug=${encodeURIComponent(p.slug)}">
      <img src="${p.image || placeholderImage(p.name)}" alt="${escapeHtml(p.name)}" loading="lazy" />
      ${discount > 0 ? `<span class="badge">-${discount}%</span>` : ""}
      ${p.stock_status === "out_of_stock" ? `<span class="badge stock">Out of stock</span>` : ""}
    </a>
    <div class="body">
      <a class="name" href="product.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.name)}</a>
      <div class="price-row">
        <span class="price">KSh ${formatPrice(p.price)}</span>
        ${p.old_price ? `<span class="price-old">KSh ${formatPrice(p.old_price)}</span>` : ""}
      </div>
      <div class="actions">
        <a class="btn-view" href="product.html?slug=${encodeURIComponent(p.slug)}">View details</a>
        <a class="btn-order" target="_blank" rel="noopener" href="${buildWhatsAppLink(whatsAppProductMessage(p))}">Order</a>
      </div>
    </div>
  </div>`;
}

function placeholderImage(name) {
  return "https://placehold.co/600x600/e4eeec/0f3d3e?text=" + encodeURIComponent((name || "Product").slice(0, 18));
}

function categoryIcon(category) {
  const map = {
    Refrigerators: "🧊",
    Cookers: "🔥",
    TVs: "📺",
    "Washing Machines": "🌀",
    "Kitchen Appliances": "🍳",
    "Home Appliances": "🏠",
  };
  return map[category] || "📦";
}

/* ---------------------------------------------------------
   Homepage: hero categories, featured products, full catalog
   with search / filter / sort — all client-side over one fetch.
   --------------------------------------------------------- */
async function initHomePage() {
  const catalogGrid = document.getElementById("catalog-grid");
  if (!catalogGrid) return; // not the homepage

  const featuredGrid = document.getElementById("featured-grid");
  const catGrid = document.getElementById("cat-grid");
  const searchInput = document.getElementById("search-input");
  const categorySelect = document.getElementById("filter-category");
  const availabilitySelect = document.getElementById("filter-availability");
  const sortSelect = document.getElementById("sort-select");
  const resultCount = document.getElementById("result-count");

  let allProducts = [];

  function renderCatalog() {
    const term = searchInput ? searchInput.value : "";
    let list = ProductUtils.search(allProducts, term);
    list = ProductUtils.filter(list, {
      category: categorySelect ? categorySelect.value : "all",
      availability: availabilitySelect ? availabilitySelect.value : "all",
    });
    list = ProductUtils.sort(list, sortSelect ? sortSelect.value : "newest");

    if (resultCount) {
      resultCount.textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;
    }

    if (!list.length) {
      catalogGrid.innerHTML = `<div class="empty-state"><span class="big">🔍</span><p>No products match your search. Try a different keyword or clear filters.</p></div>`;
      return;
    }
    catalogGrid.innerHTML = list.map(productCardHtml).join("");
  }

  catalogGrid.innerHTML = `<div class="loading-state"><span class="spinner" style="border-top-color:var(--primary);border-color:var(--line)"></span><p>Loading products…</p></div>`;

  try {
    allProducts = await ProductsAPI.fetchAll();
  } catch (err) {
    console.error(err);
    catalogGrid.innerHTML = `<div class="empty-state"><span class="big">⚠️</span><p>We couldn't load products right now. Please check your connection and try again, or contact us on WhatsApp.</p></div>`;
    return;
  }

  // Categories (filter dropdown + featured category tiles)
  const categories = ProductUtils.categories(allProducts);
  if (categorySelect) {
    categorySelect.innerHTML =
      `<option value="all">All categories</option>` +
      categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  }
  if (catGrid) {
    catGrid.innerHTML = categories
      .slice(0, 8)
      .map(
        (c) => `
      <button class="cat-card" data-cat="${escapeHtml(c)}">
        <span class="cat-icon">${categoryIcon(c)}</span>
        <span class="cat-name">${escapeHtml(c)}</span>
      </button>`
      )
      .join("");
    catGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      if (categorySelect) categorySelect.value = btn.dataset.cat;
      renderCatalog();
      document.getElementById("catalog-section").scrollIntoView({ behavior: "smooth" });
    });
  }

  // Featured products
  if (featuredGrid) {
    const featured = allProducts.filter((p) => p.featured).slice(0, 8);
    featuredGrid.innerHTML = featured.length
      ? featured.map(productCardHtml).join("")
      : `<div class="empty-state"><p>Featured products will appear here once added.</p></div>`;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get("q");
  if (initialQuery && searchInput) searchInput.value = initialQuery;

  renderCatalog();

  if (searchInput) searchInput.addEventListener("input", debounce(renderCatalog, 200));
  if (categorySelect) categorySelect.addEventListener("change", renderCatalog);
  if (availabilitySelect) availabilitySelect.addEventListener("change", renderCatalog);
  if (sortSelect) sortSelect.addEventListener("change", renderCatalog);

  // Header search bar (if separate from catalog search) jumps to catalog
  const headerSearchForm = document.getElementById("header-search-form");
  if (headerSearchForm) {
    headerSearchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = document.getElementById("header-search-input").value;
      if (searchInput) searchInput.value = val;
      renderCatalog();
      document.getElementById("catalog-section").scrollIntoView({ behavior: "smooth" });
    });
  }
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initCartModal();
  initHomePage();
  OrderList.updateBadge();
});
