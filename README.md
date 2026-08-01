# Smart Goods Transport Company

Commercial transport & commodity logistics platform (cotton, wheat, rapeseed) for Pakistan.
Built with **Next.js 14 (App Router)**, **Supabase** (Postgres + Auth + Storage), styled with
**Tailwind CSS**, deployed on **Vercel** with source on **GitHub**.

## 1. Tech Stack

| Layer            | Choice                                            |
|------------------|----------------------------------------------------|
| Frontend         | Next.js 14 (App Router), React 18, Tailwind CSS    |
| Backend/DB       | Supabase (Postgres, Row Level Security, Auth)      |
| File storage     | Supabase Storage (bucket: `biltys`, `documents`)   |
| Hosting          | Vercel                                             |
| Source control   | GitHub                                             |

## 2. Project Structure

```
sgtc/
├── app/
│   ├── layout.js                 # Root layout (Navbar + Footer)
│   ├── page.js                   # Home (Hero, Our Services, How It Works)
│   ├── globals.css               # Tailwind + brand tokens
│   ├── services/page.js          # Our Services (nav target)
│   ├── about/page.js             # About Us
│   ├── vehicle-verification/page.js
│   ├── login/page.js             # Login / Signup (role-based)
│   ├── register/page.js          # Driver & Vehicle registration + expiry dates
│   ├── admin/dashboard/page.js   # Admin CMS: Home content, Services, Steps, Expiry Alerts
│   ├── merchant/dashboard/page.js# Post load, Active Shipments, Verify Vehicle
│   └── driver/dashboard/page.js  # Available Loads (bid/accept), My Trips
├── components/
│   ├── Navbar.jsx                # Header w/ Pakistan map icon + exact nav links
│   ├── Footer.jsx
│   └── VehicleSearch.jsx         # Shared search widget (public + merchant)
├── lib/
│   ├── supabaseClient.js
│   └── useUser.js                # Session + profile/role hook
├── middleware.js                 # Redirects unauthenticated users off dashboards
├── supabase/schema.sql           # Full DB schema, RLS policies, seed data
├── tailwind.config.js
└── .env.local.example
```

## 3. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → **Run**.
   This creates all tables (`profiles`, `site_content`, `services`,
   `how_it_works_steps`, `vehicles`, `loads`, `bids`, `biltys`), the
   `vehicle_verification_view`, RLS policies, and seeds the initial
   Services and How It Works content.
3. In **Storage**, create a bucket named `biltys` (for generated bilty PDFs)
   and `documents` (for CNIC/licence/permit scans, optional upload feature).
4. In **Authentication → Providers**, email/password is enabled by default —
   no extra config needed for this build.
5. Copy your project's **URL** and **anon public key** from
   **Project Settings → API**.

## 4. Local Development

```bash
git clone <your-repo-url>
cd sgtc
npm install
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Visit `http://localhost:3000`.

## 5. GitHub Workflow

```bash
git init
git add .
git commit -m "Initial commit: Smart Goods Transport Company"
git branch -M main
git remote add origin https://github.com/<your-username>/smart-goods-transport.git
git push -u origin main
```

## 6. Deploying to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Add Environment Variables (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. Every push to `main` redeploys automatically.
5. (Optional) Attach a custom domain under **Project Settings → Domains**.

## 7. Roles & Access Model

- **Signup** on `/login` lets a user register as `merchant` or `driver`
  (stored in `profiles.role` via a Postgres trigger on `auth.users`).
- `admin` accounts are created manually in Supabase (set `role = 'admin'`
  directly on the `profiles` row) — there is intentionally no public
  self-service path to becoming an admin.
- `middleware.js` blocks unauthenticated visits to `/admin`, `/merchant`,
  `/driver`; each dashboard page also checks `profile.role` client-side and
  redirects if it doesn't match, while **Row Level Security in Postgres is
  the real enforcement layer** — no policy relies on the frontend behaving.

## 8. Document Expiry Alerts

The `vehicle_verification_view` computes `Valid` / `Expiring Soon` (within 30
days) / `Expired` for CNIC, licence, and route permit directly in SQL. The
Admin Dashboard's **Expiry Alerts** tab simply filters that view for anything
not `Valid`. Because the logic lives in the database view, it's consistent
everywhere it's read (verification portal, admin alerts, future SMS/email
notification jobs run via Supabase Edge Functions or a cron job).

## 9. Extending Further

- **Digital bilty PDFs**: wire up a Supabase Edge Function to render a PDF
  when `biltys` rows are inserted (trigger already creates the row + bilty
  number on load assignment) and upload it to the `biltys` storage bucket,
  saving the path to `biltys.file_url`.
- **SMS/email expiry reminders**: schedule a Supabase Cron job (`pg_cron`)
  that queries `vehicle_verification_view` daily and calls an Edge Function
  to notify drivers whose documents are `Expiring Soon`.
