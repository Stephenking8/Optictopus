let csrf = "";
export async function session() {
  const r = await fetch("/api/session");
  if (!r.ok) throw Error("Cannot connect to the server.");
  const x = await r.json();
  csrf = x.csrf;
  return x;
}
export async function api(url, { method = "GET", body, ...options } = {}) {
  if (method !== "GET" && !csrf) await session();
  const form = body instanceof FormData;
  const r = await fetch("/api" + url, {
    ...options,
    method,
    headers: {
      ...(form ? {} : { "Content-Type": "application/json" }),
      "X-CSRF-Token": csrf,
    },
    body: body === undefined ? undefined : form ? body : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok)
    throw Object.assign(Error(data.message || "Request failed."), {
      status: r.status,
    });
  if (data.csrf) csrf = data.csrf;
  return data;
}
export const asset = (p) =>
  p && /^(assets\/img\/|uploads\/projects\/)[\w.-]+$/.test(p)
    ? "/" + p
    : "/assets/img/placeholder.svg";
export const link = (p) => (p && /^https?:\/\//i.test(p) ? p : null);
