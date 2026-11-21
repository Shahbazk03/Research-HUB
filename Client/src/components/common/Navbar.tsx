import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Menu, ShieldCheck, User as UserIcon, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AppLink } from "../ui";
import { Navigate, RouteType } from "../../router";

export const Logo: React.FC<{ navigate: Navigate; inverted?: boolean }> = ({ navigate, inverted }) => (
  <AppLink to="home" navigate={navigate} className="flex items-center gap-2.5" aria-label="Research Hub home">
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-md font-serif text-lg font-bold ${
        inverted ? "bg-white text-navy-900" : "bg-navy-900 text-white"
      }`}
    >
      R
    </span>
    <span className="leading-tight">
      <span className={`block text-[15px] font-semibold tracking-tight ${inverted ? "text-white" : "text-navy-900"}`}>
        Research Hub
      </span>
      <span className={`block text-[11px] font-medium uppercase tracking-[0.05em] ${inverted ? "text-navy-200" : "text-slate-500"}`}>
        Research · Publication · IP
      </span>
    </span>
  </AppLink>
);

const NAV: { label: string; route: RouteType }[] = [
  { label: "Services", route: "services" },
  { label: "Patents & IP", route: "patents" },
  { label: "Experts", route: "experts" },
  { label: "About", route: "about" },
  { label: "Contact", route: "contact" },
];

export const Navbar: React.FC<{ currentRoute: RouteType; navigate: Navigate }> = ({ currentRoute, navigate }) => {
  const { user, isAuthenticated, isStaff, isWriter, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [currentRoute]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);

  const isActive = (route: RouteType) =>
    currentRoute === route || (route === "services" && currentRoute === "service-detail");

  const handleLogout = () => {
    logout();
    navigate("home");
  };

  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo navigate={navigate} />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <AppLink
              key={item.route}
              to={item.route}
              navigate={navigate}
              aria-current={isActive(item.route) ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.route) ? "text-navy-900" : "text-slate-600 hover:text-navy-900"
              }`}
            >
              {item.label}
              <span
                className={`mx-auto mt-0.5 block h-0.5 rounded-full bg-accent-500 transition-all ${
                  isActive(item.route) ? "w-5" : "w-0"
                }`}
              />
            </AppLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-md border border-slate-200 py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-navy-900 hover:bg-slate-50"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded bg-navy-900 text-xs font-semibold text-white">
                  {initials}
                </span>
                <span className="max-w-[9rem] truncate">{user?.firstName}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lift animate-fade-in">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                  {isWriter ? (
                    <>
                      <MenuItem icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => navigate("writer", { tab: "work" })}>
                        Writer portal
                      </MenuItem>
                      <MenuItem icon={<UserIcon className="h-4 w-4" />} onClick={() => navigate("writer", { tab: "profile" })}>
                        My profile
                      </MenuItem>
                    </>
                  ) : (
                    <>
                      <MenuItem icon={<LayoutDashboard className="h-4 w-4" />} onClick={() => navigate("customer-dashboard", { tab: "requests" })}>
                        My requests
                      </MenuItem>
                      <MenuItem icon={<UserIcon className="h-4 w-4" />} onClick={() => navigate("customer-dashboard", { tab: "profile" })}>
                        Profile
                      </MenuItem>
                    </>
                  )}
                  {isStaff && (
                    <MenuItem icon={<ShieldCheck className="h-4 w-4" />} onClick={() => navigate("admin-dashboard")}>
                      Administration
                    </MenuItem>
                  )}
                  <div className="my-1 border-t border-slate-100" />
                  <MenuItem icon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
                    Sign out
                  </MenuItem>
                </div>
              )}
            </div>
          ) : (
            <AppLink to="login" navigate={navigate} className="btn-ghost">
              Sign in
            </AppLink>
          )}
          {isWriter ? (
            <AppLink to="writer" params={{ tab: "projects" }} navigate={navigate} className="btn-primary">
              Open projects
            </AppLink>
          ) : (
            <AppLink to="wizard" navigate={navigate} className="btn-primary">
              Start a request
            </AppLink>
          )}
        </div>

        <button
          type="button"
          className="icon-btn lg:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden animate-fade-in">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {NAV.map((item) => (
              <AppLink
                key={item.route}
                to={item.route}
                navigate={navigate}
                className={`rounded-md px-3 py-3 text-base font-medium ${
                  isActive(item.route) ? "bg-navy-50 text-navy-900" : "text-slate-700"
                }`}
              >
                {item.label}
              </AppLink>
            ))}
            <div className="my-3 border-t border-slate-200" />
            {isAuthenticated ? (
              <>
                <AppLink
                  to={isWriter ? "writer" : "customer-dashboard"}
                  navigate={navigate}
                  className="rounded-md px-3 py-3 text-base font-medium text-slate-700"
                >
                  {isWriter ? "Writer portal" : "My requests"}
                </AppLink>
                {isStaff && (
                  <AppLink to="admin-dashboard" navigate={navigate} className="rounded-md px-3 py-3 text-base font-medium text-slate-700">
                    Administration
                  </AppLink>
                )}
                <button type="button" onClick={handleLogout} className="rounded-md px-3 py-3 text-left text-base font-medium text-slate-700">
                  Sign out
                </button>
              </>
            ) : (
              <AppLink to="login" navigate={navigate} className="rounded-md px-3 py-3 text-base font-medium text-slate-700">
                Sign in
              </AppLink>
            )}
            <AppLink to="wizard" navigate={navigate} className="btn-primary btn-lg mt-3 w-full">
              Start a request
            </AppLink>
          </nav>
        </div>
      )}
    </header>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode; onClick: () => void; children: React.ReactNode }> = ({ icon, onClick, children }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-900"
  >
    <span className="text-slate-400">{icon}</span>
    {children}
  </button>
);
