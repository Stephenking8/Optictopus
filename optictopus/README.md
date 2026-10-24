# OPTICTOPUS — Interactive Portfolio & Project Showcase

A self-hosted PHP 8 + MySQL/MariaDB portfolio with public project pages, heart reactions, 1–5-star ratings, opt-in first-party analytics, a private dashboard and full project/appearance management. The site requires **no Node.js, paid service or production build step**.

## Contents

```text
portfolio-showcase/
├── index.php                  Public homepage and searchable project grid
├── project.php                Public detail page
├── privacy.php                Privacy policy (review before publishing)
├── sitemap.php                Dynamic XML sitemap
├── robots.txt
├── config.php                 XAMPP-ready database & site settings
├── config.infinityfree.example.php Live-host configuration reference
├── database.sql               Tables, OPTICTOPUS defaults & 3 demo projects
├── upgrade-optictopus.sql     Safe branding update for existing NOVA databases
├── .htaccess                  Apache rewrites and file protection
├── admin/
│   ├── setup.php              One-time admin signup
│   ├── login.php / logout.php
│   ├── index.php              Stats overview and traffic chart
│   ├── projects.php           Publish, hide, reorder, soft-delete/restore
│   ├── project-edit.php       Project editor, uploads, overrides
│   ├── project-preview.php    Private draft preview
│   ├── categories.php         Manage project categories
│   ├── analytics.php          Date filters, visualizations, CSV export
│   ├── project-analytics.php  Detail views, unique viewers and per-project ratings
│   ├── engagement.php         Likes, rating distribution & moderation
│   └── settings.php / security.php
├── api/
│   ├── interaction.php        AJAX like/unlike and 1–5-star rating
│   └── track.php              Consent-based visit and detail-view tracking
├── includes/                  Shared PHP, templates & secure image upload
├── assets/css/                Responsive dark/light design
├── assets/js/                 Vanilla JS interactions and admin charts
├── assets/img/                Purple octopus SVG logo + favicon + demo art
└── uploads/projects/          Generated uploaded images (Apache script-blocked)
```

## OPTICTOPUS interactive mascot

- **Brand:** OPTICTOPUS with a purple, mouthless, single-camera-lens octopus. The navbar logo and browser icon are local SVG files at `assets/img/optictopus-mark.svg` and `assets/img/favicon.svg`; no remote assets or paid services are required.
- **Mascot on the homepage:** The large octopus floats gently, blinks occasionally, and looks toward the pointer. Hover over or click/tap it to make its tentacles wiggle as if tickled. It is a semantic keyboard-activatable button; touch users can tap it. The little octopus is decorative and does not collect or send pointer positions to the server.
- **Motion controls:** The animation automatically stops for `prefers-reduced-motion: reduce` and when **Enable visual animations** is unchecked in Admin → Website Settings. **Show interactive OPTICTOPUS mascot on homepage** controls whether it appears at all. The rest of the public/admin site works without JavaScript.
- **Using your logo:** Keep the SVG for crisp scaling and favicon. A transparent 900-pixel PNG, `assets/img/optictopus-mark.png`, is also included for sharing and other branding. Uploading a replacement logo or favicon under Admin → Settings overrides the navbar image/favicon, without changing the homepage interactive mascot.

### Updating an *existing* NOVA installation

1. Make a backup of your current database and files.
2. Replace the PHP, CSS, JS and asset files with the new package (keep your existing `config.php` secrets and your entire `uploads/` directory). Do not overwrite your real host credentials with the ZIP's sample `config.php`.
3. In your existing site's phpMyAdmin, import **`upgrade-optictopus.sql`**, **not `database.sql`**. It updates only the old default NOVA branding, so customized content/settings remain unchanged. The upgrade inserts the new `mascot_enabled` flag.
4. Reload your website with a forced refresh to clear the old cached CSS/JS. Verify your content, dashboard, reactions and images.

For a **fresh installation**, use `database.sql` as normal; no upgrade import is needed.

## Installation on XAMPP

1. Install XAMPP with **PHP 8+**, **MariaDB/MySQL**, and enable Apache and MySQL in its control panel. Recommended extensions: `pdo_mysql`, `fileinfo`, `mbstring`, `gd` (GD is optional but recommended for stripping image metadata and resizing uploads).
2. Unzip the folder to `C:\xampp\htdocs\portfolio-showcase` (Windows) or your XAMPP `htdocs/portfolio-showcase` folder.
3. Open `http://localhost/phpmyadmin`, create a database named `developer_portfolio` with collation `utf8mb4_unicode_ci`, click **Import**, and select `database.sql`.
4. Edit `config.php`. For an unmodified local XAMPP installation, default values are `db_host=localhost`, `db_name=developer_portfolio`, `db_user=root`, `db_pass=''`, and `base_path='/portfolio-showcase'`. If your XAMPP credentials differ, use those instead. Change `app_key` to a new cryptographically random 64-character hex string.
5. Visit `http://localhost/portfolio-showcase/admin/setup.php` and create your **own administrator account** with a 12+ character password. There are no default admin credentials. This one-time setup route is inaccessible after the first account is created.
6. Log in at `/admin/login.php`. Edit profile, contact details, demo projects, social links and site settings. The public homepage is at `http://localhost/portfolio-showcase/`.
7. Make sure Apache `mod_rewrite` is enabled. If the `/project/my-slug` URLs do not work, set `pretty_urls=false` in `config.php`, which uses the fully functioning `project.php?slug=...` URL format instead.

## InfinityFree deployment

InfinityFree free plans and domain control panels can change; check your current host panel for the exact values and constraints.

1. Set up a free hosting account and a free subdomain or your own domain. Wait for the host to provision the site.
2. Open InfinityFree control panel **MySQL Databases**, create your database, and copy the **exact host**, database name, username and password. **Do not assume `localhost` for live InfinityFree MySQL**.
3. Open your hosting **phpMyAdmin** from the database panel. Import `database.sql` to that newly created database. The SQL file intentionally does not run `CREATE DATABASE` or `USE`, since your host supplies the database name.
4. Before uploading, use `config.infinityfree.example.php` as a guide and edit the actual `config.php`:
   - `db_host`, `db_name`, `db_user`, `db_pass`: exact InfinityFree values.
   - `base_path`: `''` when the site lives at the domain root.
   - `site_url`: your public domain origin, e.g. `https://example.infinityfreeapp.com` (**do not include a trailing slash**).
   - `pretty_urls`: `true` to use Apache rewrite rules; set `false` if necessary.
   - `app_key`: a new random hex secret for this deployment. Avoid changing later, because it changes the pseudonym associated with prior reaction cookies.
   - `trusted_cloudflare`: leave `false` unless your site is **actually protected** behind Cloudflare and direct origin access is blocked.
5. Upload all files and directories **inside** `portfolio-showcase` to the domain's `htdocs` directory via the InfinityFree File Manager or FTP. Include hidden `.htaccess` files and the `uploads/projects` folder. Do not upload the outer parent folder unless you want a subdirectory deployment.
6. Ensure `uploads/projects` is writable by PHP. Use reasonable permissions, normally folders `755` and files `644`; do not use world-writable permissions. Host restrictions may affect how PHP and uploaded files run.
7. Open `https://your-domain/admin/setup.php`, create your unique administrator, and immediately test login, image uploads, adding a project, liking, rating and analytics after consent. **Use HTTPS** on the live site.
8. In `robots.txt`, adjust `Disallow` paths if deployed to a subdirectory and insert a fully qualified `Sitemap: https://your-domain/sitemap.xml` line.
9. Replace the demonstration projects, placeholder portrait, contact email, social links and sample Privacy Policy wording from the dashboard before promoting the site.
10. If InfinityFree's current limits prohibit an image operation or a specific Apache directive, inspect the hosting error log/control panel. Hosted PHP execution, `mod_rewrite`, outbound API traffic, upload size and database features depend on the free hosting platform.

### Security essentials

- There is no hardcoded admin login. Admin passwords are hashed via `password_hash` and verified with `password_verify`; use strong unique passwords. The installer checks whether an administrator exists before allowing registration.
- All admin routes and AJAX mutations use server-side authorization / CSRF validation and PDO prepared statements. Login, reaction and tracking endpoints are rate-limited. Administrator sessions expire after 30 minutes of inactivity. Admin sessions are HttpOnly and SameSite; `Secure` is enabled under HTTPS.
- Images are server-validated to JPEG, PNG, or WebP; maximum **4 MB each** and 80–8000 px dimensions, up to 12 megapixels. Uploaded images have random file names, and the `uploads/` `.htaccess` blocks common executable extensions. Do **not** allow PHP to execute from the uploads directory in server settings.
- The app uses a first-party random identifier for likes and ratings, with a keyed hash stored server-side. This makes ordinary duplicate clicks update a single browser's reaction; it is *not* a fraud-proof identifier. Clearing cookies or switching browsers can create multiple identities.
- Analytics use separate opt-in consent. No tracking API call runs on a public page before the visitor consents. Raw IP addresses are not stored; IP hashes are used only for short-lived rate limits. The `privacy.php` wording is a starter policy, not legal advice.
- Location is **approximate only**. Country is read from a trusted Cloudflare `CF-IPCountry` header *only if deliberately configured*. On a normal InfinityFree deployment, country/region/city are reported as **Unknown**, not made up. Device model is best-effort from User-Agent; often `Unknown Device`.
- 30-second repeat page loads and repeat detail views within 30 minutes from the same consenting browser are excluded. Basic bot User-Agents are excluded, but sophisticated bot activity cannot be eliminated. Metrics represent consenting browsers, not every visitor or distinct person.
- Analytics and project view records are retained for the configured 7–730 days. Cleanup is probabilistic on visits; for precise expiration, run external maintenance on a host with scheduled jobs (not required for normal use). Likes/ratings persist until removed or a project is permanently deleted. Project deletion within the dashboard is *soft* and restorable.
- A new deployment includes three unmistakably labeled **sample project content entries**, but **zero synthetic likes, ratings, visits or views**. Edit or remove the examples before public launch.
- Google Fonts are loaded via optional CDN; local fallback fonts ensure the site remains usable offline. The site does not depend on any third-party JS runtime.

## Feature quick reference

- Public: dark/light theme (with localStorage), animated purple OPTICTOPUS mascot, sticky glass navigation, featured projects, search/filter by status and category, project detail pages, technology tags, optional live/GitHub buttons, gallery, hearts and ratings, social icons, responsive mobile design, animations with reduced-motion support.
- Admin: project draft/publish/hide/feature/reorder/preview/trash/restore; categories; gallery upload/removal; profile, general, colors, visibility & social settings; password change; stats dashboard; analytics charts, country/device/OS/browser breakdowns, date filters and CSV export; review and remove abusive hearts/ratings.
- Visibility: separate global and per-project flags for like counts, view counts, ratings, rating counts, reactions and new ratings. Hidden public data remains available to the administrator.

## Notes & limitations

1. This is a functional source-code project, **not a running hosted installation**. You must create a database and configure your environment. Automated test infrastructure is not included; test in XAMPP before publishing, especially your host's PHP extensions and server rewrite rules.
2. InfinityFree restrictions vary. No paid geo-API, GPS or invasive fingerprinting is used. Without a trusted regional data source, fields such as country, region, city and specific phone model may correctly show *Unknown*.
3. A single administrator account is created by setup. Additional admin management, backups, password recovery by email and all-session revocation are not implemented. Keep the installation and database backups in your control.
4. The settings editor updates the profile and homepage copy; images are stored within `uploads/projects`. For higher-traffic installations, consider scheduled cleanup, image CDNs and a stronger anti-abuse service compatible with your privacy policy and hosting plan.
5. Admin charts are drawn with vanilla canvas; if JavaScript is disabled, numeric counters and tables still provide the main figures.

## Customize privacy & footer content

The default email is `hello@example.com`. Replace it and the Privacy Policy template with your actual contact and legal information. The site can run without social profile URLs, and empty ones are not shown.
