# Pristage Online Shop — setup guide

This project is a mobile-first e-commerce site for **Pristage Online Shop**. Customers browse
products and order through WhatsApp; you manage the catalog from a password-protected admin
dashboard backed by Supabase.

## 1. Files in this project

```
/
├── index.html            Homepage: hero, categories, featured & full catalog, search/filter
├── product.html           Product details page (reads ?slug=... from the URL)
├── admin.html              Admin login page
├── admin-dashboard.html    Admin dashboard (stats, product table, add/edit/delete)
├── styles.css              All styling for every page
├── supabase-config.js      Supabase connection settings + WhatsApp number (EDIT THIS FIRST)
├── products.js             All product database queries + search/filter/sort helpers
├── app.js                  Shared customer-facing logic (search, cart/order-list, menus)
├── admin.js                Admin dashboard logic (auth, CRUD, image upload)
└── supabase-setup.sql      Run this once in Supabase to create your database
```

## 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → sign up → **New project**.
2. Choose a name (e.g. `pristage-shop`), set a database password (save it somewhere safe), pick a
   region close to Kenya (e.g. Europe or a nearby region), and create the project. Wait a minute or
   two for it to finish setting up.
3. In the left sidebar, open **SQL Editor** → **New query**.
4. Open `supabase-setup.sql` from this project, copy its entire contents, paste into the SQL editor,
   and click **Run**. This creates the `products` and `admins` tables, security rules, the image
   storage bucket, and loads your 13 starter products.

## 3. Connect the site to your Supabase project

1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key (never the `service_role` key).
3. Open `supabase-config.js` in this project and replace:
   ```js
   const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
   ```
   with your real values.

## 4. Create your admin account

1. In Supabase, go to **Authentication → Users → Add user** (create a user manually).
2. Enter the email and password you want to use to log in to the admin dashboard, then create it.
3. Go back to **SQL Editor → New query** and run (replacing the email with the one you just used):
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'you@example.com'
   on conflict (user_id) do nothing;
   ```
4. This line is also included at the bottom of `supabase-setup.sql` for reference.

You can repeat steps 1–3 later to add more admins.

## 5. Upload to GitHub

1. Create a new repository on GitHub (e.g. `pristage-shop`), public or private.
2. On your computer, download/copy all the files listed in section 1 into a folder.
3. On the repository page, click **Add file → Upload files**, drag in every file (keeping the same
   names), and commit.

## 6. Turn on GitHub Pages

1. In your repository, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Choose the `main` branch and the `/ (root)` folder, then **Save**.
4. GitHub will give you a URL like `https://yourusername.github.io/pristage-shop/` within a minute or
   two. That's your live site.

## 7. Add or edit products

You don't need to touch the code to manage products:

1. Visit `https://yourusername.github.io/pristage-shop/admin.html`.
2. Log in with the admin email and password you created in section 4.
3. Use **Add product**, or **Edit**/**Delete** on any row in the Products table. Changes appear on
   the live site immediately (refresh the homepage to see them).

The 13 starter products loaded by the SQL script are fully editable — change prices, images,
descriptions, or delete them, anytime.

## 8. Testing checklist

- [ ] Homepage loads and shows categories + products (not stuck on "Loading products…")
- [ ] Search box on the homepage filters products as you type
- [ ] Category and availability filters, and sorting, work together
- [ ] Clicking a product opens its detail page with the correct info
- [ ] "Order on WhatsApp" opens WhatsApp with a pre-filled message naming the product and price
- [ ] Adding items to the order list (cart icon) and sending updates the WhatsApp message correctly
- [ ] Admin login rejects a wrong password with a clear message
- [ ] Admin login rejects an account that isn't in the `admins` table
- [ ] Adding a product with an image shows up on the homepage and in search
- [ ] Editing a product's price/availability/featured status reflects on the site
- [ ] Deleting a product asks for confirmation first, then removes it
- [ ] Site looks and works well on an Android phone screen (no horizontal scrolling, big buttons)
- [ ] Turning off wifi / a broken connection shows a friendly error, not a blank page

## Notes

- Only the Supabase **anon public** key ever goes in the browser code — it's safe to expose because
  the database's Row Level Security rules (in `supabase-setup.sql`) only let logged-in admins
  change data; everyone else can only read products.
- The "order list" (cart icon) does not process payments — it only helps a customer prepare one
  WhatsApp message listing several products. All actual ordering happens over WhatsApp, as intended.
