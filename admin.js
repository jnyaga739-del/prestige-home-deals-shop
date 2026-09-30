// ============================================================
// PRISTAGE ONLINE SHOP — admin dashboard logic
// ============================================================

let currentProducts = [];
let pendingMainImageFile = null;
let pendingExtraImageFiles = [];

/* ---------------------------------------------------------
   Auth guard — runs before anything else renders
   --------------------------------------------------------- */
async function guardAdminAccess() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "admin.html";
    return null;
  }
  const { data: adminRow, error } = await supabaseClient
    .from("admins")
    .select("user_id, email")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !adminRow) {
    await supabaseClient.auth.signOut();
    window.location.href = "admin.html";
    return null;
  }

  document.getElementById("auth-gate").style.display = "none";
  document.getElementById("admin-shell").style.display = "flex";
  const emailEl = document.getElementById("admin-email");
  if (emailEl) emailEl.textContent = adminRow.email || session.user.email;
  return session;
}

/* ---------------------------------------------------------
   Sidebar navigation
   --------------------------------------------------------- */
function initSidebarNav() {
  document.querySelectorAll(".admin-nav [data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-nav [data-panel]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
      document.getElementById(btn.dataset.panel).classList.add("active");
    });
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "admin.html";
  });

  const goToAdd = () => openProductModal(null);
  document.getElementById("nav-add-product").addEventListener("click", goToAdd);
  document.getElementById("products-add-btn").addEventListener("click", goToAdd);
}

/* ---------------------------------------------------------
   Load + render dashboard stats and product table
   --------------------------------------------------------- */
async function loadProducts() {
  const tbody = document.getElementById("products-tbody");
  try {
    currentProducts = await ProductsAPI.fetchAll();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--danger)">Couldn't load products. Check your connection and refresh the page.</td></tr>`;
    return;
  }
  renderStats();
  renderProductsTable(currentProducts);
  populateCategoryOptions();
}

function renderStats() {
  document.getElementById("stat-total").textContent = currentProducts.length;
  document.getElementById("stat-available").textContent = currentProducts.filter((p) => p.stock_status === "available").length;
  document.getElementById("stat-out").textContent = currentProducts.filter((p) => p.stock_status === "out_of_stock").length;
  document.getElementById("stat-featured").textContent = currentProducts.filter((p) => p.featured).length;
}

function renderProductsTable(list) {
  const tbody = document.getElementById("products-tbody");
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px">No products yet. Click "Add product" to create your first one.</td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .map(
      (p) => `
    <tr data-id="${p.id}">
      <td style="display:flex;align-items:center;gap:10px">
        <img src="${p.image || placeholderImage(p.name)}" alt="" />
        <span>${escapeHtml(p.name)}</span>
      </td>
      <td>KSh ${formatPrice(p.price)}${p.old_price ? `<br><span class="price-old">KSh ${formatPrice(p.old_price)}</span>` : ""}</td>
      <td>${escapeHtml(p.category || "")}</td>
      <td>
        <span class="pill ${p.stock_status}">${p.stock_status === "available" ? "Available" : "Out of stock"}</span>
        ${p.featured ? `<span class="pill featured">Featured</span>` : ""}
      </td>
      <td>
        <div class="row-actions">
          <button data-action="edit">Edit</button>
          <button data-action="delete" class="danger">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest("tr").dataset.id;
      const product = currentProducts.find((p) => p.id === id);
      if (btn.dataset.action === "edit") openProductModal(product);
      if (btn.dataset.action === "delete") openDeleteModal(product);
    });
  });
}

function populateCategoryOptions() {
  const list = document.getElementById("category-options");
  const categories = ProductUtils.categories(currentProducts);
  list.innerHTML = categories.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");
}

function initAdminSearch() {
  const input = document.getElementById("admin-search");
  input.addEventListener(
    "input",
    debounce(() => {
      renderProductsTable(ProductUtils.search(currentProducts, input.value));
    }, 200)
  );
}

/* ---------------------------------------------------------
   Add / Edit product modal
   --------------------------------------------------------- */
function openProductModal(product) {
  pendingMainImageFile = null;
  pendingExtraImageFiles = [];
  document.getElementById("form-error").style.display = "none";
  document.getElementById("product-form").reset();
  document.getElementById("p-image-preview").innerHTML = "";
  document.getElementById("p-more-preview").innerHTML = "";

  document.getElementById("modal-title").textContent = product ? "Edit product" : "Add product";
  document.getElementById("p-id").value = product ? product.id : "";
  document.getElementById("p-name").value = product ? product.name : "";
  document.getElementById("p-category").value = product ? product.category : "";
  document.getElementById("p-price").value = product ? product.price : "";
  document.getElementById("p-old-price").value = product && product.old_price ? product.old_price : "";
  document.getElementById("p-description").value = product ? product.description || "" : "";
  document.getElementById("p-delivery").value = product ? product.delivery_note || "" : "";
  document.getElementById("p-image-url").value = product ? product.image || "" : "";
  document.getElementById("p-available").checked = product ? product.stock_status === "available" : true;
  document.getElementById("p-featured").checked = product ? !!product.featured : false;

  if (product && product.image) {
    document.getElementById("p-image-preview").innerHTML = `<img src="${product.image}" alt="" />`;
  }
  if (product && product.additional_images && product.additional_images.length) {
    document.getElementById("p-more-preview").innerHTML = product.additional_images
      .map((src) => `<img src="${src}" alt="" />`)
      .join("");
  }

  document.getElementById("product-modal").style.display = "flex";
}

function initProductForm() {
  document.getElementById("p-image-file").addEventListener("change", (e) => {
    pendingMainImageFile = e.target.files[0] || null;
    if (pendingMainImageFile) {
      document.getElementById("p-image-preview").innerHTML = `<img src="${URL.createObjectURL(pendingMainImageFile)}" alt="" />`;
    }
  });

  document.getElementById("p-more-images").addEventListener("change", (e) => {
    pendingExtraImageFiles = Array.from(e.target.files || []);
    document.getElementById("p-more-preview").innerHTML = pendingExtraImageFiles
      .map((f) => `<img src="${URL.createObjectURL(f)}" alt="" />`)
      .join("");
  });

  document.getElementById("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("form-error");
    errorBox.style.display = "none";

    const name = document.getElementById("p-name").value.trim();
    const category = document.getElementById("p-category").value.trim();
    const price = Number(document.getElementById("p-price").value);
    const oldPriceRaw = document.getElementById("p-old-price").value;
    const oldPrice = oldPriceRaw ? Number(oldPriceRaw) : null;

    if (!name || !category || !(price >= 0)) {
      errorBox.textContent = "Please fill in the product name, category and a valid price.";
      errorBox.style.display = "block";
      return;
    }
    if (oldPrice != null && oldPrice < price) {
      errorBox.textContent = "The old price should be higher than the current price (or leave it blank).";
      errorBox.style.display = "block";
      return;
    }

    const saveBtn = document.getElementById("save-product-btn");
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

    try {
      let imageUrl = document.getElementById("p-image-url").value || null;
      if (pendingMainImageFile) {
        imageUrl = await ProductsAPI.uploadImage(pendingMainImageFile);
      }

      let additionalImages = [];
      const id = document.getElementById("p-id").value;
      const existing = id ? currentProducts.find((p) => p.id === id) : null;
      if (existing && existing.additional_images) additionalImages = [...existing.additional_images];
      if (pendingExtraImageFiles.length) {
        const uploaded = await Promise.all(pendingExtraImageFiles.map((f) => ProductsAPI.uploadImage(f)));
        additionalImages = uploaded; // replaces previous extra images with the new selection
      }

      const payload = {
        name,
        category,
        price,
        old_price: oldPrice,
        description: document.getElementById("p-description").value.trim(),
        delivery_note: document.getElementById("p-delivery").value.trim(),
        image: imageUrl,
        additional_images: additionalImages,
        stock_status: document.getElementById("p-available").checked ? "available" : "out_of_stock",
        featured: document.getElementById("p-featured").checked,
      };

      if (id) {
        await ProductsAPI.update(id, payload);
        showToast("Product updated");
      } else {
        payload.slug = await uniqueSlug(name);
        await ProductsAPI.create(payload);
        showToast("Product added");
      }

      document.getElementById("product-modal").style.display = "none";
      await loadProducts();
    } catch (err) {
      console.error(err);
      errorBox.textContent = err.message || "Something went wrong while saving. Please try again.";
      errorBox.style.display = "block";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save product";
    }
  });
}

async function uniqueSlug(name) {
  const base = ProductsAPI.slugify(name);
  let slug = base;
  let n = 1;
  while (currentProducts.some((p) => p.slug === slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

/* ---------------------------------------------------------
   Delete confirmation
   --------------------------------------------------------- */
let productPendingDelete = null;

function openDeleteModal(product) {
  productPendingDelete = product;
  document.getElementById("delete-product-name").textContent = product.name;
  document.getElementById("delete-modal").style.display = "flex";
}

function initDeleteModal() {
  document.getElementById("confirm-delete-btn").addEventListener("click", async () => {
    if (!productPendingDelete) return;
    const btn = document.getElementById("confirm-delete-btn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Deleting…';
    try {
      await ProductsAPI.remove(productPendingDelete.id);
      showToast("Product deleted");
      document.getElementById("delete-modal").style.display = "none";
      await loadProducts();
    } catch (err) {
      console.error(err);
      showToast("Couldn't delete product. Please try again.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Delete";
    }
  });
}

/* ---------------------------------------------------------
   Shared modal close handling
   --------------------------------------------------------- */
function initModalClosing() {
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest("[data-close]")) overlay.style.display = "none";
    });
  });
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const session = await guardAdminAccess();
  if (!session) return;
  initSidebarNav();
  initProductForm();
  initDeleteModal();
  initModalClosing();
  initAdminSearch();
  await loadProducts();
});
