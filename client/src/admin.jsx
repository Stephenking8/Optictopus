import React, { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api, session, asset } from "./api";
import { useSite, ProjectDetail } from "./main";
const human = (s) =>
  s.replaceAll("_", " ").replace(/^./, (x) => x.toUpperCase());
const overrides = [
  "show_views",
  "show_likes",
  "show_rating",
  "show_rating_count",
  "allow_likes",
  "allow_ratings",
];
const toggles = [
  "section_about",
  "section_projects",
  "section_contact",
  "show_views",
  "show_likes",
  "show_rating",
  "show_rating_count",
  "enable_likes",
  "enable_ratings",
  "analytics_enabled",
  "animations_enabled",
  "mascot_enabled",
];
function Notice({ message }) {
  return message ? (
    <p className="admin-notice" role="status">
      {message}
    </p>
  ) : null;
}
function useLoad(url) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const refresh = () => {
    setError("");
    return api(url)
      .then(setData)
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    setData(null);
    refresh();
  }, [url]);
  return { data, setData, error, refresh };
}
function Busy({ error }) {
  return <p role={error ? "alert" : undefined}>{error || "Loading…"}</p>;
}
export function AdminLayout() {
  const [ready, setReady] = useState(false),
    [menu, setMenu] = useState(false),
    [username, setUsername] = useState(""),
    [error, setError] = useState("");
  const nav = useNavigate();
  useEffect(() => {
    session()
      .then((x) => {
        if (!x.authenticated) nav("/admin/login");
        else {
          setUsername(x.username);
          setReady(true);
        }
      })
      .catch((e) => setError(e.message));
  }, []);
  const logout = async () => {
    try {
      await api("/logout", { method: "POST" });
      nav("/admin/login");
    } catch (e) {
      setError(e.message);
    }
  };
  if (!ready)
    return (
      <div className="container section-space">
        <Busy error={error} />
      </div>
    );
  return (
    <div className="admin-app">
      <aside className={"admin-side " + (menu ? "visible" : "")}>
        <Link className="admin-brand" to="/admin">
          OPTICTOPUS<span>CONTROL ROOM</span>
        </Link>
        <nav>
          {[
            ["", "Overview"],
            ["projects", "Projects"],
            ["categories", "Categories"],
            ["analytics", "Analytics"],
            ["engagement", "Engagement"],
            ["settings", "Settings"],
            ["security", "Security"],
          ].map(([p, t]) => (
            <NavLink
              key={p}
              to={"/admin/" + p}
              end
              onClick={() => setMenu(false)}
            >
              {t}
            </NavLink>
          ))}
        </nav>
        <Link to="/">View portfolio ↗</Link>
        <button className="button" onClick={logout}>
          Log out
        </button>
      </aside>
      <div className="admin-work">
        <header className="admin-top">
          <button
            className="button admin-menu"
            onClick={() => setMenu(!menu)}
            aria-label="Toggle admin navigation"
          >
            ☰
          </button>
          <span>Welcome, {username}</span>
          <span>Portfolio management</span>
        </header>
        <main className="admin-main">
          <Notice message={error} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export function Login() {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await session();
      await api("/login", { method: "POST", body: { username, password } });
      nav("/admin");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="admin-app auth-wrap">
      <form className="admin-panel auth-card" onSubmit={submit}>
        <Link to="/" className="admin-brand">
          OPTICTOPUS
        </Link>
        <p className="eyebrow">ADMINISTRATOR ACCESS</p>
        <h1>Welcome back.</h1>
        <Notice message={message} />
        <label>
          Username
          <input
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="button button-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in →"}
        </button>
        <Link to="/">← Back to portfolio</Link>
      </form>
    </div>
  );
}
export function Dashboard() {
  const p = useLoad("/admin/projects"),
    a = useLoad("/admin/analytics");
  if (!p.data || !a.data) return <Busy error={p.error || a.error} />;
  const list = p.data.filter((x) => !x.deleted_at);
  return (
    <>
      <Heading title="Your portfolio, at a glance." subtitle="OVERVIEW" />
      <div className="metric-grid">
        {[
          ["Projects", list.length],
          [
            "Published",
            list.filter((x) => x.publication === "published" && !x.is_hidden)
              .length,
          ],
          ["Unique browsers", a.data.unique],
          ["Page visits", a.data.total],
          ["Hearts", list.reduce((n, x) => n + x.likes_count, 0)],
          ["Ratings", list.reduce((n, x) => n + x.ratings_count, 0)],
        ].map(([t, n]) => (
          <div className="admin-panel metric" key={t}>
            <span>{t}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <div className="admin-panel">
        <h2>Manage your work</h2>
        <p>
          Add projects, review feedback, and customize the public portfolio.
        </p>
        <div className="actions">
          <Link className="button button-primary" to="/admin/projects/new">
            Add project +
          </Link>
          <Link className="button" to="/admin/settings">
            Website settings
          </Link>
          <Link className="button" to="/admin/analytics">
            Visitor insights
          </Link>
        </div>
      </div>
      <div className="admin-panel">
        <h2>Recent projects</h2>
        <ProjectTable projects={list.slice(0, 6)} />
      </div>
    </>
  );
}
function Heading({ title, subtitle = "CONTROL ROOM", children }) {
  return (
    <div className="admin-heading">
      <div>
        <p className="eyebrow">{subtitle}</p>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
function ProjectTable({ projects, onAction }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th>Visibility</th>
            <th>Views</th>
            <th>Hearts</th>
            <th>Rating</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td>
                <Link to={"/admin/projects/" + p.id}>{p.title}</Link>
              </td>
              <td>{p.development_status}</td>
              <td>
                {p.deleted_at
                  ? "Trash"
                  : p.is_hidden
                    ? "Hidden"
                    : p.publication}
              </td>
              <td>{p.views_count}</td>
              <td>{p.likes_count}</td>
              <td>
                {Number(p.average_rating).toFixed(1)} ({p.ratings_count})
              </td>
              <td>
                <div className="actions">
                  <Link to={"/admin/projects/" + p.id}>Edit</Link>
                  <Link to={"/admin/preview/" + p.id}>Preview</Link>
                  <Link to={"/admin/analytics?project_id=" + p.id}>
                    Insights
                  </Link>
                  {onAction &&
                    (p.deleted_at ? (
                      <button onClick={() => onAction(p, "restore")}>
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            onAction(p, p.is_hidden ? "show" : "hide")
                          }
                        >
                          {p.is_hidden ? "Show" : "Hide"}
                        </button>
                        <button onClick={() => onAction(p, "publish")}>
                          {p.publication === "published"
                            ? "Unpublish"
                            : "Publish"}
                        </button>
                        <button
                          aria-label="Move up"
                          onClick={() => onAction(p, "up")}
                        >
                          ↑
                        </button>
                        <button
                          aria-label="Move down"
                          onClick={() => onAction(p, "down")}
                        >
                          ↓
                        </button>
                        <button
                          className="danger"
                          onClick={() => onAction(p, "delete")}
                        >
                          Trash
                        </button>
                      </>
                    ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!projects.length && <p>No matching projects.</p>}
    </div>
  );
}
export function Projects() {
  const { data, error, refresh } = useLoad("/admin/projects");
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("active"),
    [message, setMessage] = useState("");
  const action = async (p, action) => {
    if (
      action === "delete" &&
      !confirm("Move “" + p.title + "” to trash? You can restore it later.")
    )
      return;
    try {
      await api("/admin/projects/" + p.id + "/state", {
        method: "PATCH",
        body: { action },
      });
      setMessage("Project updated.");
      refresh();
    } catch (e) {
      setMessage(e.message);
    }
  };
  return (
    <>
      <Heading title="Your projects.">
        <Link className="button button-primary" to="/admin/projects/new">
          Add project +
        </Link>
      </Heading>
      <Notice message={message} />
      <div className="admin-panel">
        <div className="toolbar">
          <input
            placeholder="Search projects…"
            aria-label="Search projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Publication filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["active", "published", "draft", "hidden", "trash", "all"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </div>
        {!data ? (
          <Busy error={error} />
        ) : (
          <ProjectTable
            projects={data.filter(
              (p) =>
                p.title.toLowerCase().includes(search.toLowerCase()) &&
                (filter === "all" || filter === "trash"
                  ? filter === "all" || p.deleted_at
                  : !p.deleted_at &&
                    (filter === "active" || filter === "hidden"
                      ? filter === "active" || p.is_hidden
                      : p.publication === filter)),
            )}
            onAction={action}
          />
        )}
      </div>
    </>
  );
}
const blank = {
  title: "",
  slug: "",
  summary: "",
  description: "",
  technologies: "",
  features: "",
  live_url: "",
  github_url: "",
  cover_image: "",
  category_id: "",
  development_status: "ongoing",
  publication: "draft",
  is_hidden: 0,
  is_featured: 0,
  sort_order: 0,
  ...Object.fromEntries(overrides.map((k) => [k, null])),
};
async function upload(file) {
  const body = new FormData();
  body.append("image", file);
  return (await api("/admin/upload", { method: "POST", body })).path;
}
export function Editor() {
  const { id } = useParams(),
    nav = useNavigate(),
    { categories } = useSite();
  const [form, setForm] = useState(null),
    [images, setImages] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [pendingImages, setPendingImages] = useState([]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  useEffect(() => {
    setForm(null);
    setMessage("");
    setPendingImages([]);
    if (id === "new") {
      setForm({ ...blank });
      setImages([]);
    } else
      api("/admin/projects/" + id)
        .then((p) => {
          setForm({ ...p, category_id: p.category_id || "" });
          setImages(p.images);
        })
        .catch((e) => setMessage(e.message));
  }, [id]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await api("/admin/projects" + (id === "new" ? "" : "/" + id), {
        method: id === "new" ? "POST" : "PUT",
        body: form,
      });
      for (const img of pendingImages)
        await api("/admin/projects/" + p.id + "/images", {
          method: "POST",
          body: img,
        });
      setPendingImages([]);
      setMessage("Project saved.");
      if (id === "new") nav("/admin/projects/" + p.id);
      else setImages((await api("/admin/projects/" + id)).images);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const cover = async (e) => {
    if (!e.target.files[0]) return;
    setBusy(true);
    try {
      set("cover_image", await upload(e.target.files[0]));
      setMessage("Cover uploaded. Save the project to apply it.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const gallery = async (e) => {
    setBusy(true);
    try {
      const added = [];
      for (const file of e.target.files)
        added.push({
          image_path: await upload(file),
          caption: "",
          sort_order: images.length + pendingImages.length + added.length,
        });
      setPendingImages((x) => [...x, ...added]);
      setMessage("Gallery images uploaded. Save the project to attach them.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };
  if (!form) return <Busy error={message} />;
  return (
    <>
      <Heading title={id === "new" ? "Add a project." : "Edit project."}>
        {id !== "new" && (
          <Link className="button" to={"/admin/preview/" + id}>
            Preview ↗
          </Link>
        )}
      </Heading>
      <Notice message={message} />
      <form onSubmit={save} className="admin-editor">
        <div>
          <section className="admin-panel">
            <h2>Project details</h2>
            {[
              "title",
              "slug",
              "summary",
              "description",
              "technologies",
              "features",
              "live_url",
              "github_url",
            ].map((k) => (
              <label key={k}>
                {human(k)}
                {["description", "features", "summary"].includes(k) ? (
                  <textarea
                    rows={k === "description" ? 8 : 3}
                    value={form[k] || ""}
                    maxLength={k === "summary" ? 500 : 20000}
                    onChange={(e) => set(k, e.target.value)}
                  />
                ) : (
                  <input
                    required={k === "title"}
                    maxLength={k === "title" ? 160 : 1000}
                    value={form[k] || ""}
                    onChange={(e) => set(k, e.target.value)}
                  />
                )}
              </label>
            ))}
            <p className="hint">
              Technologies: comma-separated. Features: one per line. Slug is
              generated from the title if left blank.
            </p>
          </section>
          <section className="admin-panel">
            <h2>Cover image</h2>
            {form.cover_image && (
              <img
                className="admin-cover"
                src={asset(form.cover_image)}
                alt="Project cover"
              />
            )}
            <input
              aria-label="Upload cover"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={cover}
            />
            <button
              type="button"
              className="button"
              onClick={() => set("cover_image", "")}
            >
              Remove cover
            </button>
          </section>
          <section className="admin-panel">
            <h2>Gallery</h2>
            <input
              aria-label="Upload gallery"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={gallery}
            />
            <div className="admin-gallery">
              {images.map((img, i) => (
                <div key={img.id}>
                  <img
                    src={asset(img.image_path)}
                    alt={img.caption || "Gallery"}
                  />
                  <input
                    aria-label="Caption"
                    value={img.caption}
                    onChange={(e) =>
                      setImages((xs) =>
                        xs.map((x, j) =>
                          i === j ? { ...x, caption: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label="Image order"
                    type="number"
                    value={img.sort_order}
                    onChange={(e) =>
                      setImages((xs) =>
                        xs.map((x, j) =>
                          i === j ? { ...x, sort_order: +e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <div className="actions">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api("/admin/images/" + img.id, {
                            method: "PUT",
                            body: img,
                          });
                          setMessage("Caption and order saved.");
                        } catch (e) {
                          setMessage(e.message);
                        }
                      }}
                    >
                      Save caption/order
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={async () => {
                        if (!confirm("Remove this image from the gallery?"))
                          return;
                        try {
                          await api("/admin/images/" + img.id, {
                            method: "DELETE",
                          });
                          setImages((xs) => xs.filter((x) => x.id !== img.id));
                        } catch (e) {
                          setMessage(e.message);
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {pendingImages.map((img, i) => (
                <div key={img.image_path}>
                  <img src={asset(img.image_path)} alt="New gallery image" />
                  <input
                    aria-label="New image caption"
                    value={img.caption}
                    placeholder="Caption"
                    onChange={(e) =>
                      setPendingImages((xs) =>
                        xs.map((x, j) =>
                          i === j ? { ...x, caption: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPendingImages((xs) => xs.filter((_, j) => j !== i))
                    }
                  >
                    Remove pending image
                  </button>
                  <p>Pending save</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside>
          <section className="admin-panel sticky">
            <h2>Publish & organize</h2>
            <label>
              Category
              <select
                value={form.category_id}
                onChange={(e) => set("category_id", e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            {[
              ["development_status", ["completed", "ongoing", "upcoming"]],
              ["publication", ["draft", "published"]],
            ].map(([k, opts]) => (
              <label key={k}>
                {human(k)}
                <select
                  value={form[k]}
                  onChange={(e) => set(k, e.target.value)}
                >
                  {opts.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Sort order
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => set("sort_order", +e.target.value)}
              />
            </label>
            {["is_hidden", "is_featured"].map((k) => (
              <label className="check" key={k}>
                <input
                  type="checkbox"
                  checked={!!form[k]}
                  onChange={(e) => set(k, e.target.checked ? 1 : 0)}
                />
                {human(k)}
              </label>
            ))}
            <h3>Visibility overrides</h3>
            {overrides.map((k) => (
              <label key={k}>
                {human(k)}
                <select
                  value={form[k] ?? ""}
                  onChange={(e) =>
                    set(k, e.target.value === "" ? null : +e.target.value)
                  }
                >
                  <option value="">Use website setting</option>
                  <option value="1">Enabled</option>
                  <option value="0">Disabled</option>
                </select>
              </label>
            ))}
            <button className="button button-primary" disabled={busy}>
              {busy ? "Working…" : "Save project →"}
            </button>
            <p className="hint">
              Draft, hidden and trashed projects are excluded from public pages
              and reactions.
            </p>
          </section>
        </aside>
      </form>
    </>
  );
}
export function Categories() {
  const { categories, refresh } = useSite(),
    [name, setName] = useState(""),
    [order, setOrder] = useState(0),
    [message, setMessage] = useState("");
  const add = async (e) => {
    e.preventDefault();
    try {
      await api("/admin/categories", {
        method: "POST",
        body: { name, sort_order: order },
      });
      setName("");
      refresh();
      setMessage("Category added.");
    } catch (e) {
      setMessage(e.message);
    }
  };
  return (
    <>
      <Heading title="Categories." />
      <Notice message={message} />
      <form className="admin-panel toolbar" onSubmit={add}>
        <input
          aria-label="Category name"
          required
          placeholder="New category"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          aria-label="Sort order"
          type="number"
          value={order}
          onChange={(e) => setOrder(+e.target.value)}
        />
        <button className="button button-primary">Add category</button>
      </form>
      <div className="admin-panel">
        {categories.map((c) => (
          <CategoryRow
            key={c.id}
            category={c}
            refresh={refresh}
            notice={setMessage}
          />
        ))}
      </div>
    </>
  );
}
function CategoryRow({ category: c, refresh, notice }) {
  const [name, setName] = useState(c.name),
    [order, setOrder] = useState(c.sort_order);
  return (
    <div className="toolbar category-row">
      <input
        aria-label="Category name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        aria-label="Category order"
        type="number"
        value={order}
        onChange={(e) => setOrder(+e.target.value)}
      />
      <button
        onClick={async () => {
          try {
            await api("/admin/categories/" + c.id, {
              method: "PUT",
              body: { name, sort_order: order },
            });
            refresh();
            notice("Category saved.");
          } catch (e) {
            notice(e.message);
          }
        }}
      >
        Save
      </button>
      <button
        className="danger"
        onClick={async () => {
          if (
            !confirm(
              "Remove this category? Its projects will become uncategorized.",
            )
          )
            return;
          try {
            await api("/admin/categories/" + c.id, { method: "DELETE" });
            refresh();
          } catch (e) {
            notice(e.message);
          }
        }}
      >
        Delete
      </button>
    </div>
  );
}
export function Settings() {
  const { settings, socials, refresh } = useSite(),
    [form, setForm] = useState({ ...settings }),
    [links, setLinks] = useState(socials.map((x) => ({ ...x }))),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/admin/settings", {
        method: "PUT",
        body: { settings: form, socials: links },
      });
      await refresh();
      setMessage("Website settings saved.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const brand = async (k, file) => {
    if (!file) return;
    setBusy(true);
    try {
      set(k, await upload(file));
      setMessage("Image uploaded. Save settings to apply.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading title="Website settings." />
      <Notice message={message} />
      <form onSubmit={save}>
        <div className="settings-columns">
          <div>
            <section className="admin-panel">
              <h2>Content & profile</h2>
              {Object.keys(form)
                .filter(
                  (k) =>
                    !toggles.includes(k) &&
                    !k.endsWith("_image") &&
                    ![
                      "default_theme",
                      "accent_color",
                      "layout_style",
                      "background_style",
                      "retention_days",
                    ].includes(k),
                )
                .map((k) => (
                  <label key={k}>
                    {human(k)}
                    {[
                      "about_text",
                      "hero_text",
                      "site_description",
                      "experience",
                      "interests",
                    ].includes(k) ? (
                      <textarea
                        rows="4"
                        value={form[k]}
                        onChange={(e) => set(k, e.target.value)}
                      />
                    ) : (
                      <input
                        value={form[k]}
                        onChange={(e) => set(k, e.target.value)}
                      />
                    )}
                  </label>
                ))}
            </section>
            <section className="admin-panel">
              <h2>Social profiles</h2>
              {links.map((x, i) => (
                <div key={x.platform}>
                  <label>
                    {human(x.platform)}
                    <input
                      value={x.link}
                      placeholder={
                        x.platform === "gmail" ? "you@example.com" : "https://…"
                      }
                      onChange={(e) =>
                        setLinks((xs) =>
                          xs.map((v, j) =>
                            j === i ? { ...v, link: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={!!x.enabled}
                      onChange={(e) =>
                        setLinks((xs) =>
                          xs.map((v, j) =>
                            j === i
                              ? { ...v, enabled: e.target.checked ? 1 : 0 }
                              : v,
                          ),
                        )
                      }
                    />
                    Enabled
                  </label>
                </div>
              ))}
            </section>
          </div>
          <div>
            <section className="admin-panel">
              <h2>Brand assets</h2>
              {["profile_image", "logo_image", "favicon_image"].map((k) => (
                <label key={k}>
                  {human(k)}
                  <img
                    className="asset-preview"
                    src={asset(form[k])}
                    alt={human(k)}
                  />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => brand(k, e.target.files[0])}
                  />
                </label>
              ))}
            </section>
            <section className="admin-panel">
              <h2>Appearance</h2>
              {[
                ["default_theme", ["dark", "light"]],
                ["background_style", ["glow", "clean"]],
                ["layout_style", ["grid", "compact"]],
              ].map(([k, opts]) => (
                <label key={k}>
                  {human(k)}
                  <select
                    value={form[k]}
                    onChange={(e) => set(k, e.target.value)}
                  >
                    {opts.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              ))}
              <label>
                Accent color
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={(e) => set("accent_color", e.target.value)}
                />
              </label>
            </section>
            <section className="admin-panel">
              <h2>Visibility & features</h2>
              {toggles.map((k) => (
                <label className="check" key={k}>
                  <input
                    type="checkbox"
                    checked={form[k] === "1"}
                    onChange={(e) => set(k, e.target.checked ? "1" : "0")}
                  />
                  {human(k)}
                </label>
              ))}
              <label>
                Analytics retention (days)
                <input
                  type="number"
                  min="7"
                  max="730"
                  value={form.retention_days}
                  onChange={(e) => set("retention_days", e.target.value)}
                />
              </label>
            </section>
          </div>
        </div>
        <div className="admin-panel">
          <button className="button button-primary" disabled={busy}>
            {busy ? "Saving…" : "Save website settings →"}
          </button>
        </div>
      </form>
    </>
  );
}
export function Security() {
  const [form, setForm] = useState({ current: "", password: "", repeat: "" }),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/admin/password", { method: "PUT", body: form });
      setForm({ current: "", password: "", repeat: "" });
      setMessage("Password changed. Other sessions are now invalidated.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Heading title="Account security." />
      <Notice message={message} />
      <form className="admin-panel auth-card" onSubmit={save}>
        <h2>Change password</h2>
        {[
          ["current", "Current password"],
          ["password", "New password"],
          ["repeat", "Confirm new password"],
        ].map(([k, t]) => (
          <label key={k}>
            {t}
            <input
              required
              type="password"
              minLength={k === "current" ? 1 : 12}
              maxLength="72"
              autoComplete={
                k === "current" ? "current-password" : "new-password"
              }
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            />
          </label>
        ))}
        <button className="button button-primary" disabled={busy}>
          Update password
        </button>
        <p>Use 12–72 bytes. Sessions expire after 30 minutes of inactivity.</p>
      </form>
    </>
  );
}
export function Engagement() {
  const { data, error, refresh } = useLoad("/admin/engagement"),
    [message, setMessage] = useState("");
  const remove = async (kind, id) => {
    if (!confirm("Remove this engagement entry?")) return;
    try {
      await api("/admin/engagement/" + kind + "/" + id, { method: "DELETE" });
      refresh();
      setMessage("Entry removed.");
    } catch (e) {
      setMessage(e.message);
    }
  };
  return (
    <>
      <Heading title="Likes & ratings." />
      <Notice message={message} />
      {!data ? (
        <Busy error={error} />
      ) : (
        <>
          <div className="admin-panel">
            <h2>Rating distribution</h2>
            <Bars
              rows={data.distribution.map((x) => ({
                ...x,
                _id: x._id + " stars",
              }))}
            />
          </div>
          {["ratings", "likes"].map((kind) => (
            <div className="admin-panel" key={kind}>
              <h2>Latest {kind}</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Browser ID</th>
                      {kind === "ratings" && <th>Stars</th>}
                      <th>Date (UTC)</th>
                      <th>Moderation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data[kind].map((x) => (
                      <tr key={x.id}>
                        <td>{x.title}</td>
                        <td>{x.visitor_hash}…</td>
                        {kind === "ratings" && <td>{"★".repeat(x.stars)}</td>}
                        <td>
                          {new Date(x.updated_at || x.created_at)
                            .toISOString()
                            .slice(0, 19)
                            .replace("T", " ")}
                        </td>
                        <td>
                          <button
                            className="danger"
                            onClick={() => remove(kind, x.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data[kind].length && <p>No entries yet.</p>}
              </div>
              <p className="hint">
                Most recent 200 entries. Use project insights to review totals.
              </p>
            </div>
          ))}
        </>
      )}
    </>
  );
}
function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((x) => x.total));
  return rows.length ? (
    rows.map((x, i) => (
      <div className="data-bar" key={i}>
        <div>
          <span>{x._id || "Unknown"}</span>
          <strong>{x.total}</strong>
        </div>
        <div>
          <i style={{ width: (x.total / max) * 100 + "%" }} />
        </div>
      </div>
    ))
  ) : (
    <p>No data for this selection.</p>
  );
}
export function Analytics() {
  const [params, setParams] = useSearchParams(),
    [form, setForm] = useState({
      project_id: params.get("project_id") || "",
      from: params.get("from") || "",
      to: params.get("to") || "",
      device: params.get("device") || "",
      country: params.get("country") || "",
    });
  const { data, error } = useLoad("/admin/analytics?" + params.toString());
  useEffect(() => {
    setForm(
      Object.fromEntries(
        ["project_id", "from", "to", "device", "country"].map((k) => [
          k,
          params.get(k) || "",
        ]),
      ),
    );
  }, [params.toString()]);
  const apply = (e) => {
    e.preventDefault();
    setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v)));
  };
  return (
    <>
      <Heading title="Visitor insights." subtitle="CONSENT-BASED ANALYTICS">
        <a
          className="button"
          href={"/api/admin/analytics?" + params.toString() + "&download=csv"}
        >
          ↓ Export CSV
        </a>
      </Heading>
      <form className="admin-panel toolbar" onSubmit={apply}>
        <label>
          Project
          <select
            value={form.project_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, project_id: e.target.value }))
            }
          >
            <option value="">All projects & home</option>
            {data?.projects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Period
          <select
            defaultValue="custom"
            onChange={(e) => {
              const days = e.target.value;
              setForm((f) => ({
                ...f,
                from:
                  days === "all"
                    ? ""
                    : new Date(Date.now() - Number(days) * 86400000)
                        .toISOString()
                        .slice(0, 10),
                to: days === "all" ? "" : new Date().toISOString().slice(0, 10),
              }));
            }}
          >
            <option value="custom" disabled>
              Custom dates
            </option>
            <option value="0">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All history</option>
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={form.from}
            onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={form.to}
            onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
          />
        </label>
        <label>
          Device
          <select
            value={form.device}
            onChange={(e) => setForm((f) => ({ ...f, device: e.target.value }))}
          >
            <option value="">All devices</option>
            {data?.deviceOptions.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Country
          <select
            value={form.country}
            onChange={(e) =>
              setForm((f) => ({ ...f, country: e.target.value }))
            }
          >
            <option value="">All countries</option>
            {data?.countryOptions.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button className="button button-primary">Apply filters</button>
      </form>
      {!data ? (
        <Busy error={error} />
      ) : (
        <>
          <div className="metric-grid">
            <div className="admin-panel metric">
              <span>Page visits</span>
              <strong>{data.total}</strong>
            </div>
            <div className="admin-panel metric">
              <span>Unique browsers</span>
              <strong>{data.unique}</strong>
            </div>
            <div className="admin-panel metric">
              <span>Detail views / unique browsers</span>
              <strong>
                {data.detailViews} / {data.detailUnique}
              </strong>
            </div>
          </div>
          <p className="hint">
            Browser IDs estimate unique visitors. Exact people, phone models and
            precise locations cannot be guaranteed.
          </p>
          <div className="settings-columns">
            {[
              ["daily", "Daily visits (UTC)"],
              ["devices", "Device types"],
              ["browsers", "Browsers"],
              ["countries", "Countries"],
              ["models", "Reported device models"],
              ["oses", "Operating systems"],
              ["brands", "Device brands"],
            ].map(([key, title]) => (
              <section className="admin-panel" key={key}>
                <h2>{title}</h2>
                <Bars rows={data[key]} />
              </section>
            ))}
          </div>
          <div className="admin-panel">
            <h2>Project audience</h2>
            <p className="hint">
              Detail events use a 30-minute deduplication window and the
              date/project filters. Device and country filters apply only to
              page-visit events.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Detail views</th>
                    <th>Unique browsers</th>
                  </tr>
                </thead>
                <tbody>
                  {data.audience.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <Link to={"/admin/analytics?project_id=" + x.id}>
                          {x.title}
                        </Link>
                      </td>
                      <td>{x.total}</td>
                      <td>{x.unique}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="admin-panel">
            <h2>Project feedback (all retained history)</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Hearts</th>
                    <th>Ratings</th>
                    <th>Average</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projectStats
                    .filter(
                      (x) =>
                        !params.get("project_id") ||
                        String(x.id) === params.get("project_id"),
                    )
                    .sort((a, b) => b.likes - a.likes)
                    .map((x) => (
                      <tr key={x.id}>
                        <td>{x.title}</td>
                        <td>{x.likes}</td>
                        <td>{x.ratings}</td>
                        <td>{x.average.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <h3>Rating distribution</h3>
            <Bars
              rows={data.distribution.map((x) => ({
                ...x,
                _id: x._id + " stars",
              }))}
            />
          </div>
          <div className="admin-panel">
            <h2>Latest visits</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date (UTC)</th>
                    <th>Page</th>
                    <th>Device</th>
                    <th>Model</th>
                    <th>OS / Browser</th>
                    <th>Country / Region / City</th>
                  </tr>
                </thead>
                <tbody>
                  {data.visits.map((v) => (
                    <tr key={v.id}>
                      <td>
                        {new Date(v.visited_at)
                          .toISOString()
                          .slice(0, 19)
                          .replace("T", " ")}
                      </td>
                      <td>
                        {v.project_id
                          ? data.projects.find((x) => x.id === v.project_id)
                              ?.title || "Project"
                          : v.page_type}
                      </td>
                      <td>{v.device_type}</td>
                      <td>
                        {v.device_brand} / {v.device_model}
                      </td>
                      <td>
                        {v.os_name} / {v.browser_name}
                      </td>
                      <td>
                        {v.country} / {v.region} / {v.city}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">
              Most recent 200 matching visits. Counts and charts include all
              matching records.
            </p>
          </div>
        </>
      )}
    </>
  );
}
export function Preview() {
  const { id } = useParams(),
    { data, error } = useLoad("/admin/projects/" + id);
  return data ? (
    <ProjectDetail project={data} preview />
  ) : (
    <Busy error={error} />
  );
}
