/*
| Minimal path-based router (History API). Vercel's SPA fallback rewrites every
| path to index.html, and Vite does the same in development.
*/

export type RouteType =
  | "home"
  | "services"
  | "service-detail"
  | "patents"
  | "wizard"
  | "login"
  | "register"
  | "customer-dashboard"
  | "admin-dashboard"
  | "about"
  | "contact"
  | "privacy"
  | "terms"
  | "writer"
  | "experts"
  | "join-experts"
  | "not-found";

export type RouteParams = Record<string, string | undefined>;
export type Navigate = (route: RouteType | string, params?: RouteParams) => void;

const STATIC_PATHS: Record<string, RouteType> = {
  "": "home",
  services: "services",
  patents: "patents",
  "patents-ip": "patents",
  request: "wizard",
  wizard: "wizard",
  login: "login",
  register: "register",
  dashboard: "customer-dashboard",
  "customer-dashboard": "customer-dashboard",
  admin: "admin-dashboard",
  "admin-dashboard": "admin-dashboard",
  about: "about",
  contact: "contact",
  privacy: "privacy",
  terms: "terms",
  writer: "writer",
  experts: "experts",
  "experts/join": "join-experts",
  "join-as-expert": "join-experts",
};

const ROUTE_PATHS: Partial<Record<RouteType, string>> = {
  home: "/",
  services: "/services",
  patents: "/patents",
  wizard: "/request",
  login: "/login",
  register: "/register",
  "customer-dashboard": "/dashboard",
  "admin-dashboard": "/admin",
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
  writer: "/writer",
  experts: "/experts",
  "join-experts": "/experts/join",
};

/** Parse a pathname + search string into a route and params. */
export const parseLocation = (pathname: string, search: string): { route: RouteType; params: RouteParams } => {
  const params: RouteParams = {};
  new URLSearchParams(search).forEach((value, key) => {
    params[key] = value;
  });

  const path = pathname.replace(/^\/+|\/+$/g, "");

  if (path.startsWith("services/")) {
    return { route: "service-detail", params: { ...params, slug: decodeURIComponent(path.slice("services/".length)) } };
  }

  const route = STATIC_PATHS[path];
  return { route: route ?? "not-found", params };
};

/** Build the URL for a route. Empty params are dropped. */
export const pathFor = (route: RouteType | string, params: RouteParams = {}): string => {
  const query = new URLSearchParams();
  let base: string;

  if (route === "service-detail") {
    base = `/services/${encodeURIComponent(params.slug || "")}`;
    Object.entries(params).forEach(([k, v]) => k !== "slug" && v && query.set(k, v));
  } else {
    base = ROUTE_PATHS[route as RouteType] ?? "/";
    Object.entries(params).forEach(([k, v]) => v && query.set(k, v));
  }

  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
};

/** Convert legacy "#/services/x?y=z" links into real paths once on load. */
export const migrateHashUrl = (): void => {
  const { hash } = window.location;
  if (!hash.startsWith("#/")) return;
  const [p, q] = hash.slice(1).split("?");
  const legacy = parseLocation(p, q ? `?${q}` : "");
  const params = { ...legacy.params };
  // Old wizard links used serviceId
  if (legacy.route === "wizard" && params.serviceId) {
    params.service = params.serviceId;
    delete params.serviceId;
  }
  window.history.replaceState(null, "", pathFor(legacy.route === "not-found" ? "home" : legacy.route, params));
};

export const NAVIGATION_EVENT = "rh:navigate";

export const navigateTo: Navigate = (route, params = {}) => {
  const url = pathFor(route, params);
  if (url !== window.location.pathname + window.location.search) {
    window.history.pushState(null, "", url);
  }
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
  window.scrollTo({ top: 0, behavior: "auto" });
};
