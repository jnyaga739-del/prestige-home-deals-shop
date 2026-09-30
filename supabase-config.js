// ============================================================
// PRISTAGE ONLINE SHOP — Supabase configuration
// ------------------------------------------------------------
// Replace the two values below with YOUR project's values.
// Find them in: Supabase Dashboard → Project Settings → API
//   - SUPABASE_URL      → "Project URL"
//   - SUPABASE_ANON_KEY → "Project API keys" → "anon" "public" key
//
// IMPORTANT: only ever put the "anon public" key here.
// NEVER put the "service_role" key in this file or anywhere
// in the browser — it must stay secret on a server.
// ============================================================

const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// Shared Supabase client used by every page.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// WhatsApp contact details, used across the whole site.
const WHATSAPP_NUMBER = "254769218680"; // international format, no + or leading 0
const WHATSAPP_LINK_BASE = "https://wa.me/" + WHATSAPP_NUMBER;

function buildWhatsAppLink(message) {
  return WHATSAPP_LINK_BASE + "?text=" + encodeURIComponent(message);
}

function whatsAppProductMessage(product) {
  return (
    "Hello Pristage Online Shop, I am interested in " +
    product.name +
    " priced at KSh " +
    formatPrice(product.price) +
    ". I would like to know more about ordering and delivery."
  );
}

function formatPrice(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-KE", { maximumFractionDigits: 0 });
}
