// ============================================================
// PRISTAGE ONLINE SHOP — products data access layer
// Wraps every Supabase call related to products so app.js and
// admin.js don't have to repeat query logic.
// ============================================================

const ProductsAPI = {
  /**
   * Fetch all products, newest first.
   * Throws on failure so callers can show a friendly error state.
   */
  async fetchAll() {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async fetchFeatured(limit = 8) {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async fetchBySlug(slug) {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async fetchRelated(category, excludeId, limit = 4) {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("category", category)
      .neq("id", excludeId)
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async create(product) {
    const { data, error } = await supabaseClient
      .from("products")
      .insert(product)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, changes) {
    const { data, error } = await supabaseClient
      .from("products")
      .update(changes)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabaseClient.from("products").delete().eq("id", id);
    if (error) throw error;
  },

  async uploadImage(file, folder = "products") {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabaseClient.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabaseClient.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  },

  /** Build a URL-safe slug from a product name. */
  slugify(name) {
    return name
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  },
};

/** Client-side helpers: search, filter, sort a list already in memory. */
const ProductUtils = {
  categories(products) {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  },

  search(products, term) {
    if (!term || !term.trim()) return products;
    const q = term.trim().toLowerCase();
    return products.filter((p) => {
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    });
  },

  filter(products, { category, availability, featuredOnly, maxPrice, minPrice }) {
    return products.filter((p) => {
      if (category && category !== "all" && p.category !== category) return false;
      if (availability === "available" && p.stock_status !== "available") return false;
      if (availability === "out_of_stock" && p.stock_status !== "out_of_stock") return false;
      if (featuredOnly && !p.featured) return false;
      if (minPrice != null && Number(p.price) < minPrice) return false;
      if (maxPrice != null && Number(p.price) > maxPrice) return false;
      return true;
    });
  },

  sort(products, mode) {
    const list = [...products];
    switch (mode) {
      case "price_asc":
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case "price_desc":
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      case "featured":
        return list.sort((a, b) => (b.featured === true) - (a.featured === true));
      case "newest":
      default:
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  },

  discountPercent(price, oldPrice) {
    if (!oldPrice || Number(oldPrice) <= Number(price)) return 0;
    return Math.round((1 - Number(price) / Number(oldPrice)) * 100);
  },
};
