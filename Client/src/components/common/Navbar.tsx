import React, { useState } from "react";
import {
  GraduationCap,
  Layers,
  BookOpen,
  Search,
  LogIn,
  UserPlus,
  LayoutDashboard,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  FileText,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { WhatsAppButton } from "./WhatsAppButton";

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string, params?: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate }) => {
  const { user, isAuthenticated, isStaff, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Overview", icon: BookOpen },
    { id: "services", label: "Research Services", icon: Layers },
    { id: "wizard", label: "Submit Request", icon: Sparkles, highlight: true },
  ];

  const handleNav = (route: string) => {
    navigate(route);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#020c1a]/90 backdrop-blur-xl">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo (Responsive, single source of truth) */}
          <div
            onClick={() => handleNav("home")}
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer group select-none shrink-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30 group-hover:scale-105 transition-transform shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[16px] sm:text-[19px] font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors whitespace-nowrap">
                  Research<span className="text-indigo-400 font-extrabold">Hub</span>
                </span>
                <span className="inline-block px-1.5 py-0.5 text-[8px] sm:text-[9px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded shrink-0 tracking-[0.12em]">
                  ACADEMIC
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden md:block leading-none mt-0.5">
                Advisory & Publication Platform
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const active = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-[15px] font-medium transition-all duration-150 flex items-center gap-2 border ${
                    item.highlight
                      ? "text-indigo-200 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/25"
                      : active
                      ? "text-white bg-slate-800/80 border-slate-700/70"
                      : "text-slate-300 hover:text-white hover:bg-slate-900 border-slate-800/80"
                  }`}
                >
                  <item.icon className="w-4 h-4 text-indigo-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-2.5">
            <WhatsAppButton size="sm" label="WhatsApp" className="!rounded-xl !shadow-lg !shadow-emerald-900/20 !h-[42px] !px-3.5" />

            {isAuthenticated ? (
              <div className="flex items-center gap-2 pl-1.5 border-l border-slate-800">
                <button
                  onClick={() => handleNav("customer-dashboard")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[15px] font-medium transition-colors ${
                    currentRoute === "customer-dashboard"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                  }`}
                >
                  <FileText className="w-4 h-4 text-indigo-300" />
                  <span>My Requests</span>
                </button>

                {isStaff && (
                  <button
                    onClick={() => handleNav("admin-dashboard")}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[15px] font-medium border transition-colors ${
                      currentRoute === "admin-dashboard"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Admin</span>
                  </button>
                )}

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-1.5 border-l border-slate-800">
                <button
                  onClick={() => handleNav("login")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[15px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <LogIn className="w-4 h-4 text-slate-400" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => handleNav("register")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[15px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Right Actions (WhatsApp + Hamburger) */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <WhatsAppButton
              size="sm"
              label="WhatsApp"
              className="!h-[36px] !rounded-xl !px-3 !text-[11px] !font-semibold !shadow-md shadow-emerald-900/20"
            />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900/80 border border-slate-800 hover:bg-slate-800 focus:outline-none shrink-0 transition-colors"
              aria-label="Toggle mobile navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                  currentRoute === item.id
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <item.icon className="w-4 h-4 text-indigo-400" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => handleNav("customer-dashboard")}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium bg-slate-900 text-white"
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>My Research Requests</span>
                </button>

                {isStaff && (
                  <button
                    onClick={() => handleNav("admin-dashboard")}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Admin Panel</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out ({user?.firstName})</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleNav("login")}
                  className="w-full py-2.5 px-3 rounded-xl text-center text-sm font-medium bg-slate-900 text-slate-200 border border-slate-800"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNav("register")}
                  className="w-full py-2.5 px-3 rounded-xl text-center text-sm font-medium bg-indigo-600 text-white shadow-lg"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
