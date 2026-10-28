import React, {
  useEffect,
  useState,
  useRef,
  createContext,
  useContext,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useLocation,
  useNavigate,
  Outlet,
  Navigate,
} from "react-router-dom";
import { api, session, asset, link } from "./api";
import { initMascot } from "./mascot";
import { initGalaxy } from "./galaxy";
import OptiAssistant from "./OptiAssistant";

import socialSvg from "./socials.svg?raw";
import {
  AdminLayout,
  Login,
  Dashboard,
  Projects,
  Editor,
  Categories,
  Settings,
  Security,
  Engagement,
  Analytics,
  Preview,
} from "./admin";
import "./style.css";
export const SiteContext = createContext(null);
export const useSite = () => useContext(SiteContext);
function App() {
  const [site, setSite] = useState(null),
    [error, setError] = useState("");
  const refresh = () =>
    api("/site")
      .then(setSite)
      .catch((e) => setError(e.message));
  useEffect(() => {
    session().catch((e) => setError(e.message));
    refresh();
  }, []);
  useEffect(() => {
    if (!site) return;
    const s = site.settings;
    document.documentElement.dataset.theme =
      localStorage.getItem("portfolio_theme") || s.default_theme || "dark";
    document.documentElement.style.setProperty(
      "--accent",
      s.accent_color || "#a879f5",
    );
    document.body.dataset.animations =
      s.animations_enabled === "1" ? "on" : "off";
    document.body.dataset.background = s.background_style;
    document.body.dataset.layout = s.layout_style;
    document.querySelector('link[rel="icon"]').href = asset(
      s.favicon_image || "assets/img/favicon.svg",
    );
    document.querySelector('meta[name="description"]').content =
      s.site_description || "";
    document.title = s.site_name || "OPTICTOPUS";
  }, [site]);
  if (error)
    return (
      <div className="container section-space">
        <h1>Connection unavailable</h1>
        <p role="alert">{error}</p>
        <button onClick={() => location.reload()}>Retry</button>
      </div>
    );
  if (!site)
    return <p className="container section-space">Loading OPTICTOPUS…</p>;
  return (
    <SiteContext.Provider value={{ ...site, refresh }}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="project/:slug" element={<ProjectPage />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="*" element={<Missing />} />
        </Route>
        <Route path="admin/login" element={<Login />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<Editor />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<Settings />} />
          <Route path="security" element={<Security />} />
          <Route path="engagement" element={<Engagement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="preview/:id" element={<Preview />} />
          <Route path="*" element={<Navigate to="/admin" />} />
        </Route>
      </Routes>
    </SiteContext.Provider>
  );
}
function PublicLayout() {
  const { settings: s, socials, visits } = useSite(),
    [menu, setMenu] = useState(false),
    [theme, setTheme] = useState(document.documentElement.dataset.theme),
    [consent, setConsent] = useState(localStorage.getItem("portfolio_consent"));
  const loc = useLocation();
  useEffect(() => initGalaxy(), []);
  useEffect(() => {
    setMenu(false);
    if (loc.hash)
      setTimeout(
        () =>
          document
            .getElementById(loc.hash.slice(1))
            ?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    else window.scrollTo(0, 0);
  }, [loc.pathname, loc.hash]);
  const toggle = () => {
    const t =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.dataset.theme = t;
    localStorage.setItem("portfolio_theme", t);
  };
  const choose = async (value) => {
    await api("/consent", { method: "POST", body: { consent: value } });
    localStorage.setItem("portfolio_consent", value);
    setConsent(value);
    window.dispatchEvent(new Event("consent-changed"));
  };
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: socialSvg }} />
      <div className="site-shell">
        <canvas className="galaxy-sky" data-galaxy-sky aria-hidden="true" />
        <header className="site-header" id="top">
          <nav className="nav-wrap container">
            <div className="brand-with-visits">
            <Link className="wordmark" to="/">
              <img
                className="brand-logo"
                src={asset(s.logo_image || "assets/img/optictopus-mark.svg")}
                alt=""
              />
              <span>{s.site_name}</span>
            </Link>
            {Number.isFinite(visits) && <span className="site-visits" title="Recorded page visits, including imported history. New visits are counted only with analytics consent.">
              <span aria-hidden="true">◉</span> <strong>{visits.toLocaleString()}</strong> site visits
            </span>}
            </div>
            <div className={"nav-links " + (menu ? "open" : "")} id="main-menu">
              <Link to="/">Home</Link>
              {s.section_about === "1" && <Link to="/#about">About</Link>}
              {s.section_projects === "1" && (
                <Link to="/#projects">Projects</Link>
              )}
              {s.section_contact === "1" && <Link to="/#contact">Contact</Link>}
            </div>
            <div className="nav-actions">
              <button
                className="icon-btn"
                onClick={toggle}
                aria-label="Toggle color theme"
              >
                {theme === "dark" ? "☾" : "☀"}
              </button>
              <Link className="nav-hire" to="/#contact">
                Let’s talk ↗
              </Link>
              <button
                className="icon-btn menu-toggle"
                onClick={() => setMenu(!menu)}
                aria-expanded={menu}
                aria-controls="main-menu"
                aria-label="Toggle navigation"
              >
                ☰
              </button>
            </div>
          </nav>
        </header>
        <main>
          <Outlet />
        </main>
        <footer className="site-footer" id="contact">
          {s.section_contact === "1" && (
            <div className="container footer-main">
              <div>
                <p className="eyebrow">HAVE SOMETHING IN MIND?</p>
                <h2>
                  Let’s make something <em>great.</em>
                </h2>
                <p>Open to projects, conversations, and collaborations.</p>
                <a
                  className="button button-primary"
                  href={"mailto:" + s.contact_email}
                >
                  Get in touch ↗
                </a>
              </div>
              <div className="footer-right">
                <p className="eyebrow">FIND ME ONLINE</p>
                <div className="socials">
                  {socials
                    .filter((x) => x.enabled && x.link)
                    .map((x) => (
                      <a
                        key={x.platform}
                        href={
                          x.platform === "gmail"
                            ? "mailto:" + x.link
                            : link(x.link)
                        }
                        target={x.platform === "gmail" ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        title={x.platform}
                        aria-label={x.platform}
                      >
                        <svg width="20" height="20">
                          <use href={"#social-" + x.platform} />
                        </svg>
                      </a>
                    ))}
                </div>
              </div>
            </div>
          )}
          <div className="container footer-bottom">

            <span>
              © {new Date().getFullYear()} {s.site_name} · {s.footer_text}
            </span>
            <span>
              <Link to="/privacy">Privacy</Link> ·{" "}
              <a href="/sitemap.xml">Sitemap</a> ·{" "}
              <Link to="/admin">Admin</Link>
            </span>
          </div>
        </footer>
      </div>
      <OptiAssistant />
      {!consent && s.analytics_enabled === "1" && (
        <div
          className="cookie-banner"
          role="dialog"
          aria-label="Analytics consent"
        >
          <p>
            <strong>Privacy matters.</strong> Allow anonymous browser visit
            measurements? <Link to="/privacy">Learn more</Link>
          </p>
          <div>
            <button
              className="button"
              onClick={() => choose("denied").catch(() => {})}
            >
              Decline
            </button>
            <button
              className="button button-primary"
              onClick={() => choose("granted").catch(() => {})}
            >
              Allow analytics
            </button>
          </div>
        </div>
      )}
    </>
  );
}
function Track({ id }) {
  const { settings: s } = useSite();
  useEffect(() => {
    const track = async () => {
      if (
        localStorage.getItem("portfolio_consent") !== "granted" ||
        s.analytics_enabled !== "1"
      )
        return;
      try {
        await api("/consent", { method: "POST", body: { consent: "granted" } });
        await api("/track", {
          method: "POST",
          body: { page: id ? "project" : "home", project_id: id },
        });
      } catch {}
    };
    track();
    window.addEventListener("consent-changed", track);
    return () => window.removeEventListener("consent-changed", track);
  }, [id, s.analytics_enabled]);
  return null;
}
function Mascot() {
  useEffect(() => initMascot(), []);
  return <>
    <button className="mascot-interactive particle-octopus" type="button" data-mascot
      aria-label="Interactive purple octopus: click or tap for a reaction">
      <canvas aria-hidden="true" />
    </button>
  </>;
}
function ExtraSections() {
  const { settings: s } = useSite();
  const parse = value => { try { return JSON.parse(value || "[]"); } catch { return []; } };
  const gallery = parse(s.gallery_items), testimonials = parse(s.testimonial_items);
  return <>
    {s.section_gallery === "1" && <section className="section-space portfolio-gallery" id="gallery"><div className="container">
      <p className="eyebrow">A closer look</p><h2>Gallery<span className="accent">.</span></h2>
      <div className="gallery-grid">{gallery.map((item, i) => <figure key={i}>
        <a href={asset(item.image)} target="_blank" rel="noreferrer" aria-label={item.caption || `View gallery image ${i + 1}`}><img src={asset(item.image)} alt={item.caption || `Gallery image ${i + 1}`} loading="lazy" /></a>
        {item.caption && <figcaption>{item.caption}</figcaption>}
      </figure>)}</div>{!gallery.length && <p className="section-empty">New moments coming soon.</p>}
    </div></section>}
    {s.section_testimonials === "1" && <section className="section-space portfolio-testimonials" id="testimonials"><div className="container">
      <p className="eyebrow">Words from others</p><h2>Testimonials<span className="accent">.</span></h2>
      <div className="testimonials-grid">{testimonials.map((item,i) => <figure key={i}><blockquote>{item.quote}</blockquote><figcaption><strong>{item.name}</strong>{item.role && <span>{item.role}</span>}</figcaption></figure>)}</div>
      {!testimonials.length && <p className="section-empty">Testimonials will appear here when available.</p>}
    </div></section>}
  </>;
}
export function Feedback({ project: p, onChange }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const f = p.flags || {};
  async function react(body) {
    setBusy(true);
    try {
      const next = await api("/projects/" + p.id + "/reaction", {
        method: "POST",
        body,
      });
      onChange({ ...p, ...next });
      setMessage(
        body.action === "rate"
          ? "Rating saved."
          : next.liked
            ? "Thanks for the love!"
            : "Like removed.",
      );
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="detail-engagement project-stats">
      <div className="reaction-line">
        {f.allow_likes ? (
          <button
            className={"heart-btn " + (p.liked ? "liked" : "")}
            aria-label="Toggle heart reaction"
            aria-pressed={p.liked}
            disabled={busy}
            onClick={() => react({ action: "like", liked: !p.liked })}
          >
            {p.liked ? "♥" : "♡"} {f.show_likes && p.likes_count}
          </button>
        ) : (
          f.show_likes && <span>♥ {p.likes_count}</span>
        )}
        {f.show_views && <span>◉ {p.views_count} views</span>}
      </div>
      {f.allow_ratings && (
        <div className="rating-control">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={"star-btn " + (p.rating >= n ? "selected" : "")}
              aria-label={"Rate " + n + " stars"}
              aria-pressed={p.rating === n}
              disabled={busy}
              onClick={() => react({ action: "rate", stars: n })}
            >
              ★
            </button>
          ))}
        </div>
      )}
      <div className="rating-summary">
        {f.show_rating && (
          <span>★ {Number(p.average_rating).toFixed(1)} / 5 </span>
        )}
        {f.show_rating_count && <span>({p.ratings_count} ratings)</span>}
      </div>
      <small role="status">{message}</small>
    </div>
  );
}
function Home() {
  const { settings: s, categories } = useSite(),
    [projects, setProjects] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [category, setCategory] = useState("all");
  useEffect(() => {
    api("/projects")
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const filtered = projects.filter(
    (p) =>
      (status === "all" || p.development_status === status) &&
      (category === "all" || String(p.category_id) === category) &&
      (p.title + " " + p.technologies)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <Track />
      <section className="hero container">
        <div className="hero-content">
          <div className="availability">
            <span className="pulse" />
            ALWAYS BUILDING SOMETHING NEW ✳
          </div>
          <p className="hero-kicker">{s.hero_kicker}</p>
          <h1>{s.hero_title}</h1>
          <p className="hero-description">{s.hero_text}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#projects">
              Explore my projects ↗
            </a>
            <a className="button button-outline" href="#contact">
              Contact me ↗
            </a>
          </div>
          <div className="hero-caption">A PORTFOLIO OF IDEAS MADE REAL</div>
        </div>
        <div className="hero-art">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="art-grid" />
          <div className="floating-card floating-code">
            ⌘ crafting interfaces_
          </div>
          <div className="floating-card floating-status">
            <span className="status-pulse" />
            BUILDING THE FUTURE
          </div>
          {s.mascot_enabled === "1" && <Mascot />}
        </div>
        <span className="hero-index">01 / INTRODUCTION</span>
      </section>
      {s.section_about === "1" && (
        <section className="about-section section-space" id="about">
          <div className="container about-grid">
            <div className="about-visual">
              <div className="profile-frame">
                <img src={asset(s.profile_image)} alt={s.owner_name} />
              </div>
              <div className="photo-caption">
                THE PERSON BEHIND THE PIXELS ↗
              </div>
            </div>
            <div className="about-copy">
              <p className="eyebrow">01 / GET TO KNOW ME</p>
              <h2>
                Code with intention.
                <br />
                <em>Design with purpose.</em>
              </h2>
              <p className="intro-line">
                Hi, I’m {s.owner_name}, an {s.professional_title}.
              </p>
              <p className="pre-line">{s.about_text}</p>
              <p>{s.experience}</p>
              <p className="eyebrow">TECHNOLOGIES I WORK WITH</p>
              <Tags value={s.skills} />
              <p className="eyebrow">INTERESTS</p>
              <p>{s.interests}</p>
            </div>
          </div>
        </section>
      )}
      {s.section_projects === "1" && (
        <section className="projects-section section-space" id="projects">
          <div className="container">
            <div className="section-header">
              <div>
                <p className="eyebrow">02 / SELECTED WORK</p>
                <h2>
                  Things I’ve <em>built.</em>
                </h2>
                <p>Experiments, experiences, and everything in between.</p>
              </div>
              <span className="project-total">
                {projects.length} <small>public projects</small>
              </span>
            </div>
            <div className="project-toolbar">
              <div className="filter-chips">
                {["all", "completed", "ongoing", "upcoming"].map((x) => (
                  <button
                    key={x}
                    className={"filter-chip " + (status === x ? "active" : "")}
                    onClick={() => setStatus(x)}
                    aria-pressed={status === x}
                  >
                    {x[0].toUpperCase() + x.slice(1)}
                  </button>
                ))}
              </div>
              <div className="search-filters">
                <input
                  aria-label="Search projects"
                  type="search"
                  placeholder="Search projects…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="all">All categories</option>
                  {categories.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p role="alert">{error}</p>}
            {loading ? (
              <p>Loading projects…</p>
            ) : (
              <div className="projects-grid">
                {filtered.map((p) => (
                  <article className="project-card" key={p.id}>
                    <Link className="project-image" to={"/project/" + p.slug}>
                      <img
                        src={asset(p.cover_image)}
                        alt={p.title}
                        loading="lazy"
                      />

                    </Link>
                    <div className="project-body">
                      <p className="eyebrow">
                        {p.category_name}
                        {p.is_featured ? " · FEATURED" : ""}
                      </p>
                      <span
                        className={
                          "status-badge status-" + p.development_status
                        }
                      >
                        {p.development_status}
                      </span>
                      <h3>
                        <Link to={"/project/" + p.slug}>{p.title} ↗</Link>
                      </h3>
                      <p className="project-summary">{p.summary}</p>
                      <Tags value={p.technologies} />
                      <Feedback
                        project={p}
                        onChange={(next) =>
                          setProjects((prev) =>
                            prev.map((x) => (x.id === p.id ? next : x)),
                          )
                        }
                      />
                      <Link
                        className="button button-small"
                        to={"/project/" + p.slug}
                      >
                        View project ↗
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {!loading && !filtered.length && (
              <div className="empty-state">
                <h3>No projects found</h3>
                <p>Try a different search or category.</p>
              </div>
            )}
          </div>
        </section>
      )}
      <ExtraSections />
    </>
  );
}
function Tags({ value }) {
  return (
    <div className="tags">
      {(value || "")
        .split(",")
        .filter(Boolean)
        .map((x, i) => (
          <span key={i}>{x.trim()}</span>
        ))}
    </div>
  );
}
function ProjectPage() {
  const { slug } = useParams(),
    [p, setP] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    setP(null);
    setError("");
    api("/projects/" + encodeURIComponent(slug))
      .then(setP)
      .catch((e) => setError(e.message));
  }, [slug]);
  if (error) return <Missing message={error} />;
  return p ? (
    <>
      <Track id={p.id} />
      <ProjectDetail project={p} onChange={setP} />
    </>
  ) : (
    <p className="container section-space">Loading project…</p>
  );
}
export function ProjectDetail({ project: p, onChange, preview = false }) {
  const { settings: s } = useSite();
  useEffect(() => {
    document.title = p.title + " — " + s.site_name;
  }, [p.title, s.site_name]);
  return (
    <section className="project-detail container section-space">
      <Link
        className="back-link"
        to={preview ? "/admin/projects" : "/#projects"}
      >
        ← All projects
      </Link>
      {preview && (
        <p className="alert">
          Administrator preview — hidden and draft content is visible only to
          you.
        </p>
      )}
      <div className="detail-heading">
        <div>
          <p className="eyebrow">
            {p.category_name} / {p.development_status}
          </p>
          <h1>{p.title}</h1>
          <p>{p.summary}</p>
        </div>
        <div className="detail-links">
          {link(p.live_url) && (
            <a
              className="button button-primary"
              href={p.live_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit website ↗
            </a>
          )}
          {link(p.github_url) && (
            <a
              className="button"
              href={p.github_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </a>
          )}
        </div>
      </div>
      <div className="detail-cover">
        <img src={asset(p.cover_image)} alt={p.title} />
      </div>
      <div className="detail-content">
        <div className="detail-story">
          <p className="eyebrow">THE STORY</p>
          <h2>
            Inside the <em>project.</em>
          </h2>
          <div className="story-text pre-line">
            {p.description || p.summary}
          </div>
          {p.features && (
            <>
              <h3>Features & functionality</h3>
              <ul className="feature-list">
                {p.features
                  .split("\n")
                  .filter(Boolean)
                  .map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
              </ul>
            </>
          )}
        </div>
        <aside className="detail-aside">
          <p className="eyebrow">PROJECT OVERVIEW</p>
          <div className="meta-row">
            Status <strong>{p.development_status}</strong>
          </div>
          <div className="meta-row">
            Category <strong>{p.category_name}</strong>
          </div>
          <div className="meta-row">
            Published{" "}
            <strong>
              {p.published_at
                ? new Date(p.published_at).toLocaleDateString()
                : "—"}
            </strong>
          </div>
          <Tags value={p.technologies} />
          {!preview && <Feedback project={p} onChange={onChange} />}
        </aside>
      </div>
      {p.images?.length > 0 && (
        <section className="gallery">
          <h2>
            Take a <em>closer look.</em>
          </h2>
          <div className="gallery-grid">
            {p.images.map((x) => (
              <a
                className="gallery-image"
                key={x.id}
                href={asset(x.image_path)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={asset(x.image_path)}
                  alt={x.caption || p.title + " screenshot"}
                  loading="lazy"
                />
                <span>{x.caption} ↗</span>
              </a>
            ))}
          </div>
        </section>
      )}
      <div className="next-project">
        <h2>
          More to <em>explore.</em>
        </h2>
        <Link className="button" to="/#projects">
          Browse all projects ↗
        </Link>
      </div>
    </section>
  );
}
function Privacy() {
  const [message, setMessage] = useState("");
  const change = async (value) => {
    try {
      await api("/consent", { method: "POST", body: { consent: value } });
      localStorage.setItem("portfolio_consent", value);
      setMessage(
        value === "granted" ? "Analytics enabled." : "Analytics disabled.",
      );
      window.dispatchEvent(new Event("consent-changed"));
    } catch (e) {
      setMessage(e.message);
    }
  };
  return (
    <section className="container section-space privacy-content">
      <h1>Privacy & your choices</h1>
      <p>
        Analytics are optional. When you allow them, this site records page
        visits, approximate device and browser information and a random browser
        identifier. Location is limited to country when a trusted hosting
        provider supplies it; GPS is never collected. Device models may be
        unknown.
      </p>
      <p>
        Heart reactions and ratings use a browser identifier to remember your
        choices. Clearing cookies or switching browsers creates a new identity.
        Historical reactions are retained after the migration, but old PHP
        browser identities cannot be recovered.
      </p>
      <p>
        Necessary session cookies protect forms and administrator access.
        Analytics records expire according to the configured retention period
        during subsequent visits. No tracking is sent before consent.
      </p>
      <button className="button" onClick={() => change("denied")}>
        Disable analytics
      </button>{" "}
      <button className="button" onClick={() => change("granted")}>
        Allow analytics
      </button>
      <p role="status">{message}</p>
    </section>
  );
}
function Missing({ message = "This page could not be found." }) {
  return (
    <section className="container section-space">
      <h1>Page unavailable</h1>
      <p>{message}</p>
      <Link className="button" to="/">
        Back home
      </Link>
    </section>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
