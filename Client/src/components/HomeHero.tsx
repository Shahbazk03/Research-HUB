import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  ChevronRight,
  FileSearch,
  FileSignature,
  GraduationCap,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AppLink } from "./ui";
import { Navigate, RouteParams, RouteType } from "../router";

/** Words cycled in the headline: "...from research question to ___." */
const OUTCOMES = ["published paper", "completed thesis", "filed patent", "registered trademark"];

const HELP_ROWS: {
  icon: React.ReactNode;
  title: string;
  text: string;
  to: RouteType;
  params?: RouteParams;
}[] = [
  { icon: <FileSearch className="h-5 w-5" />, title: "Prior-art & patentability search", text: "Know where your invention stands", to: "service-detail", params: { slug: "patentability-search" } },
  { icon: <FileSignature className="h-5 w-5" />, title: "Patent specification drafting", text: "Provisional and complete, with claims", to: "patents" },
  { icon: <BookOpenText className="h-5 w-5" />, title: "Research paper development", text: "Aligned to your target journal", to: "services", params: { search: "paper" } },
  { icon: <GraduationCap className="h-5 w-5" />, title: "Thesis & dissertation support", text: "From proposal to final submission", to: "services", params: { search: "thesis" } },
  { icon: <ShieldCheck className="h-5 w-5" />, title: "Design, trademark & copyright", text: "Protect products, brands and works", to: "patents" },
];

const POPULAR = ["Systematic review", "Thesis", "Patent drafting", "Editing", "Trademark"];

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const HomeHero: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  const [search, setSearch] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [activeRow, setActiveRow] = useState(0);
  const [paused, setPaused] = useState(false);

  // Cycle the headline outcome
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = window.setInterval(() => setWordIndex((i) => (i + 1) % OUTCOMES.length), 2600);
    return () => window.clearInterval(t);
  }, []);

  // Gently spotlight each service row until the visitor interacts with the card
  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const t = window.setInterval(() => setActiveRow((i) => (i + 1) % HELP_ROWS.length), 2200);
    return () => window.clearInterval(t);
  }, [paused]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("services", { search: search.trim() || undefined });
  };

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-navy-50/80 to-white">
      {/* Background grid + soft glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(18,34,61,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(18,34,61,0.06) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-accent-200/30 blur-3xl" aria-hidden="true" />

      <div className="container-page relative grid items-start gap-10 pb-14 pt-8 sm:pb-16 sm:pt-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:pb-20 lg:pt-12">
        <div>
          <p className="eyebrow animate-slide-up">
            <span className="h-px w-6 bg-accent-500" /> Research · Publication · Intellectual property
          </p>

          <h1 className="display mt-5 animate-slide-up [animation-delay:80ms]">
            Expert support from research question to{" "}
            {/* The changing outcome sits on its own line, so nothing else on the page shifts */}
            <span className="relative block h-[1.2em] text-[0.82em] sm:text-[1em]">
              <span className="sr-only">published paper, completed thesis, filed patent or registered trademark.</span>
              {OUTCOMES.map((word, i) => (
                <span
                  key={word}
                  aria-hidden="true"
                  className={`absolute left-0 top-0 whitespace-nowrap text-navy-600 transition-all ease-out ${
                    i === wordIndex
                      ? "translate-y-0 opacity-100 duration-500 delay-200"
                      : i === (wordIndex + OUTCOMES.length - 1) % OUTCOMES.length
                        ? "-translate-y-4 opacity-0 duration-200"
                        : "translate-y-4 opacity-0 duration-0"
                  }`}
                >
                  <span className="relative">
                    {word}
                    <span className="absolute -bottom-0.5 left-0 h-[3px] w-full rounded-full bg-accent-400/70" />
                  </span>
                  <span className="text-navy-900">.</span>
                </span>
              ))}
            </span>
          </h1>

          <p className="lead mt-6 max-w-xl animate-slide-up [animation-delay:160ms]">
            Research Hub partners with scholars, universities and innovators to plan, write, publish and protect their work
            — with specialist teams, clear quotations and a dashboard to track every step.
          </p>

          <div className="mt-8 flex flex-col gap-3 animate-slide-up [animation-delay:240ms] sm:flex-row">
            <AppLink to="wizard" navigate={navigate} className="btn-primary btn-lg group">
              Start a request <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </AppLink>
            <AppLink to="patents" navigate={navigate} className="btn-secondary btn-lg">
              Patent & IP services
            </AppLink>
          </div>

          <form onSubmit={submitSearch} className="mt-8 max-w-xl animate-slide-up [animation-delay:320ms]" role="search">
            <label htmlFor="hero-search" className="sr-only">
              Search services
            </label>
            <div className="flex rounded-md border border-slate-300 bg-white shadow-card transition-shadow focus-within:border-navy-500 focus-within:shadow-lift focus-within:ring-2 focus-within:ring-navy-500/20">
              <Search className="ml-3.5 h-4 w-4 self-center text-slate-400" />
              <input
                id="hero-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="What do you need help with?"
                className="w-full bg-transparent px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm"
              />
              <button type="submit" className="m-1 rounded bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800">
                Search
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Popular:</span>
              {POPULAR.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => navigate(term === "Patent drafting" || term === "Trademark" ? "patents" : "services", term === "Patent drafting" || term === "Trademark" ? undefined : { search: term.toLowerCase() })}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition-colors hover:border-navy-300 hover:bg-navy-50 hover:text-navy-900"
                >
                  {term}
                </button>
              ))}
            </div>
          </form>
        </div>

        {/* Interactive "How we can help" card */}
        <div
          className="animate-fade-in [animation-delay:200ms]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="card overflow-hidden shadow-lift">
            <div className="flex items-end justify-between gap-4 bg-navy-900 px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-accent-200">How we can help</p>
                <p className="mt-1 font-serif text-xl">One partner for your research and its protection</p>
              </div>
              <div className="hidden gap-1.5 sm:flex" aria-hidden="true">
                {HELP_ROWS.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeRow ? "w-5 bg-accent-300" : "w-1.5 bg-white/30"}`} />
                ))}
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {HELP_ROWS.map((row, i) => {
                const active = i === activeRow;
                return (
                  <li key={row.title}>
                    <AppLink
                      to={row.to}
                      params={row.params}
                      navigate={navigate}
                      onMouseEnter={() => setActiveRow(i)}
                      onFocus={() => setActiveRow(i)}
                      className={`group relative flex items-center gap-4 px-6 py-4 transition-colors duration-300 ${
                        active ? "bg-navy-50/80" : "bg-white"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-0 h-full w-[3px] transition-colors duration-300 ${active ? "bg-accent-500" : "bg-transparent"}`}
                        aria-hidden="true"
                      />
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors duration-300 ${
                          active ? "bg-navy-900 text-white" : "bg-navy-50 text-navy-700"
                        }`}
                      >
                        {row.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-navy-900">{row.title}</span>
                        <span className="block text-xs text-slate-500">{row.text}</span>
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition-all duration-300 ${
                          active ? "translate-x-0 text-navy-700 opacity-100" : "-translate-x-1 text-slate-300 opacity-0 group-hover:opacity-100"
                        }`}
                      />
                    </AppLink>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-3 text-sm">
              <span className="text-slate-500">Not sure where to start?</span>
              <AppLink to="wizard" navigate={navigate} className="link inline-flex items-center gap-1">
                Get a free recommendation <ArrowRight className="h-3.5 w-3.5" />
              </AppLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
