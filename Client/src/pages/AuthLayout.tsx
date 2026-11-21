import React from "react";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { RouteParams, RouteType } from "../router";

/** Routes a sign-in may return to. Anything else falls back to the dashboard (no open redirects). */
const SAFE_REDIRECTS: RouteType[] = ["wizard", "customer-dashboard", "admin-dashboard", "writer", "services", "patents", "home"];

/** Where to go after signing in, based on the requested page and the account's role. */
export const resolveRedirect = (
  redirect: string | undefined,
  role: string | undefined
): { route: RouteType; params?: RouteParams } => {
  const home: RouteType = role === "ADMIN" || role === "TEAM_MEMBER" ? "admin-dashboard" : role === "WRITER" ? "writer" : "customer-dashboard";
  if (redirect && SAFE_REDIRECTS.includes(redirect as RouteType)) {
    // Writers have no customer dashboard; customers can't open the writer portal
    if (role === "WRITER" && (redirect === "customer-dashboard" || redirect === "wizard")) return { route: "writer" };
    if (role !== "WRITER" && redirect === "writer") return { route: home };
    return { route: redirect as RouteType };
  }
  return { route: home };
};

const BENEFITS = [
  "Track every request from brief to delivery",
  "Message the specialists working on your project",
  "Review quotations and confirm payments securely",
  "Download deliverables whenever you need them",
];

/**
 * Split-screen authentication layout: brand panel (desktop only) + form panel.
 * Fills the viewport below the navbar so there is no awkward empty space.
 */
export const AuthLayout: React.FC<{
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, subtitle, children, footer }) => (
  <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
    {/* Brand panel */}
    <aside className="relative hidden overflow-hidden bg-navy-950 text-white lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex w-full flex-col justify-between p-10 xl:p-14">
        <p className="eyebrow text-accent-300">
          <span className="h-px w-6 bg-accent-400" /> Your research, protected and on track
        </p>

        <div className="max-w-md">
          <h2 className="font-serif text-3xl font-semibold leading-tight text-white xl:text-4xl">
            Every request, quotation and deliverable in one secure place.
          </h2>
          <ul className="mt-8 space-y-4">
            {BENEFITS.map((t) => (
              <li key={t} className="flex items-start gap-3 text-navy-100">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-300" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-navy-200">
          <ShieldCheck className="h-5 w-5 shrink-0 text-accent-300" />
          Your manuscripts, inventions and files are confidential and visible only to the specialists assigned to you.
        </div>
      </div>
    </aside>

    {/* Form panel */}
    <div className="flex items-center justify-center bg-white px-4 py-10 sm:px-8 lg:py-12">
      <div className="w-full max-w-[26rem]">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-navy-900">{title}</h1>
        <div className="mt-2 text-sm text-slate-600">{subtitle}</div>
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 border-t border-slate-200 pt-6">{footer}</div>}
        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Lock className="h-3.5 w-3.5" /> Secured connection · Your data stays private
        </p>
      </div>
    </div>
  </div>
);
