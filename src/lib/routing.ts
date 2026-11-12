import { ROLE_PRIORITY } from "./constants.ts";

/** Turn a display name into a URL-safe slug, e.g. "Sarah Williams" -> "sarah-williams". */
export function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "user";
}

/** Rewrite a logical role-prefixed path (/customer/x) to the user's slug (/john-doe/x). */
export function withSlug(to: string, slug: string | null) {
  if (!slug || !to.startsWith("/")) return to;
  const segs = to.split("/");
  if (ROLE_PRIORITY.some((role) => role === segs[1])) {
    segs[1] = slug;
    return segs.join("/");
  }
  return to;
}

/** Convert a slug-prefixed browser path back to a logical role-prefixed path for matching. */
export function toLogical(pathname: string, role: string) {
  const rest = pathname.split("/").filter(Boolean).slice(1);
  return "/" + [role, ...rest].join("/");
}

/** Match a route pattern like /customer/work-order/:id against the current path. */
export function matchPath(
  pattern: string,
  path: string,
): { params: Record<string, string> } | null {
  const pp = pattern.split("/").filter(Boolean);
  const cp = path.split("/").filter(Boolean);
  if (pp.length !== cp.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) {
      try { params[pp[i].slice(1)] = decodeURIComponent(cp[i]); } catch { return null; }
    }
    else if (pp[i] !== cp[i]) return null;
  }
  return { params };
}

