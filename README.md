# Swift QR

QR code generator platform focused on dynamic QR codes, redirects, and analytics.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Supabase (Auth, PostgreSQL, Storage)
- Zod, React Hook Form

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from your [Supabase](https://supabase.com) project (Settings → API).
   - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`) and `NEXT_PUBLIC_REDIRECT_DOMAIN` (e.g. `http://localhost:3000/r` for redirects).

3. **Supabase**

   - Create a project and run the SQL from `.cursor/SCHEMA.md` for tables: `users`, `qr_codes`, `scans`, and the `increment_scan_count` function.
   - **If you use Supabase Auth** (this app does), make `public.users` compatible: run in SQL Editor:
     ```sql
     ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
     ```
     (Auth stores passwords in `auth.users`; we only mirror `id`, `email`, `full_name` into `public.users`.)
   - In Storage, create **public** buckets named `qr-images` (for generated QR images) and `user-files` (for uploaded logos/files). The app uploads as the logged-in user, so add policies that allow users to upload into their own folder. In **SQL Editor** run:
     ```sql
     CREATE POLICY "Users can upload own QR images"
     ON storage.objects FOR ALL
     TO authenticated
     USING (bucket_id = 'qr-images' AND (storage.foldername(name))[1] = auth.uid()::text)
     WITH CHECK (bucket_id = 'qr-images' AND (storage.foldername(name))[1] = auth.uid()::text);

     CREATE POLICY "Users can upload own files"
     ON storage.objects FOR ALL
     TO authenticated
     USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text)
     WITH CHECK (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);
     ```
     (FOR ALL covers INSERT, SELECT, UPDATE, DELETE so uploads and upserts work.)

4. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deployment (Netlify)

1. Push the repo to GitHub (or another Git provider).
2. In [Netlify](https://netlify.com), create a new site and import the repo.
3. Add the same environment variables as in `.env.local` (use production URLs for `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_REDIRECT_DOMAIN`).
4. **Required for cron jobs**: Add `CRON_SECRET` (a random secret string) and `SITE_URL` (your Netlify site URL) to environment variables.
5. Deploy. Redirects will work at `https://your-domain.netlify.app/r/{shortCode}`.

### Scheduled Functions (Cron Jobs)

The app includes two scheduled functions configured in `netlify.toml`:
- **Analytics Aggregation**: Runs daily at 1 AM UTC to aggregate scan data
- **Cleanup Orphan Files**: Runs daily at 2 AM UTC to remove unattached uploaded files

These are automatically deployed as Netlify Scheduled Functions. Ensure `CRON_SECRET` is set in your Netlify environment variables for security.

## MVP Features

- **Landing**: Simple landing with login/signup.
- **Auth**: Register, login, logout.
- **Dashboard**: Overview (total QR codes, total scans), recent QR list.
- **Dynamic QR**: Create, list, view, edit, delete; each redirects via `/r/{shortCode}`. Core model is one stable QR image with destination updates handled behind the short link.
- **Redirect**: `GET /r/:shortCode` → 302 to destination, with async scan tracking (device, location).
- **Analytics**: Scan count and last scanned per QR; optional `GET /api/analytics/:qrCodeId`.
