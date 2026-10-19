import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "./store/AppContext";

const ROLES = ["customer", "technician", "admin"];

/** Turn a display name into a URL-safe slug, e.g. "Sarah Williams" -> "sarah-williams". */
export function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Rewrite a logical role-prefixed path (/customer/x) to the user's slug (/john-doe/x). */
function withSlug(to: string, slug: string | null) {
  if (!slug || !to.startsWith("/")) return to;
  const segs = to.split("/");
  if (ROLES.includes(segs[1])) {
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

type RouterCtx = {
  path: string;
  search: string;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
};

const Ctx = createContext<RouterCtx>({ path: "/", search: "", navigate: () => {} });

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname || "/");
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPop = () => { setPath(window.location.pathname || "/"); setSearch(window.location.search); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) window.history.replaceState({}, "", to);
    else window.history.pushState({}, "", to);
    // Keep pathname (used for route matching) separate from the query (used for filters).
    const [p, q = ""] = to.split("?");
    setPath(p);
    setSearch(q ? `?${q}` : "");
    window.scrollTo(0, 0);
  }, []);

  return <Ctx.Provider value={{ path, search, navigate }}>{children}</Ctx.Provider>;
}

export function useRouter() {
  return useContext(Ctx);
}

export function useNavigate() {
  const raw = useContext(Ctx).navigate;
  const { userName } = useApp();
  const slug = userName ? slugify(userName) : null;
  return useCallback(
    (to: string, opts?: { replace?: boolean }) => raw(withSlug(to, slug), opts),
    [raw, slug],
  );
}

export function useLocation() {
  const c = useContext(Ctx);
  return { pathname: c.path, search: c.search };
}

/** Read drill-down filters from the URL, e.g. /sarah/requests?tab=Unassigned. */
export function useQuery() {
  const { search } = useContext(Ctx);
  return new URLSearchParams(search);
}

/**
 * The role whose route table owns the current page. With merged multi-role access,
 * App resolves this per URL (e.g. /sarah-williams/work-orders -> technician).
 */
const RouteRoleCtx = createContext<string | null>(null);
export const RouteRoleProvider = RouteRoleCtx.Provider;

/** Current path converted to its logical role-prefixed form, for matchPath in pages. */
export function useLogicalPath() {
  const { path } = useContext(Ctx);
  const routeRole = useContext(RouteRoleCtx);
  const { role } = useApp();
  return toLogical(path, routeRole ?? role);
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
    if (pp[i].startsWith(":")) params[pp[i].slice(1)] = decodeURIComponent(cp[i]);
    else if (pp[i] !== cp[i]) return null;
  }
  return { params };
}

export function Link({
  to,
  className,
  children,
  onClick,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  const { userName } = useApp();
  const href = withSlug(to, userName ? slugify(userName) : null);
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
