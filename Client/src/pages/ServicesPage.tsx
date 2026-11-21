import React, { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { EmptyState, ErrorState, PageHeader, useDocumentTitle } from "../components/ui";
import { ServiceCard, ServiceCardSkeleton, SERVICE_GRID } from "../components/ServiceCard";
import { CtaBand } from "./HomePage";
import {
  serviceInCategory,
  serviceInDomain,
  useAllServices,
  useCategories,
  useDomains,
} from "../hooks/usePublicData";
import { Domain } from "../api/types";
import { Navigate, RouteParams } from "../router";

const PRICING = [
  { value: "", label: "Any pricing" },
  { value: "FIXED", label: "Fixed price" },
  { value: "RANGE", label: "Price range" },
  { value: "CUSTOM_QUOTE", label: "Custom quotation" },
];

const idOf = (v: unknown) => (typeof v === "string" ? v : (v as { _id?: string })?._id || "");

export const ServicesPage: React.FC<{ navigate: Navigate; params: RouteParams }> = ({ navigate, params }) => {
  useDocumentTitle("Services");
  const services = useAllServices();
  const domains = useDomains();
  const categories = useCategories();

  // The URL is the source of truth for filters, so links and back/forward work
  const domainSlug = params.domain || "";
  const categorySlug = params.category || "";
  const pricing = params.pricing || "";
  const [search, setSearch] = useState(params.search || "");

  useEffect(() => setSearch(params.search || ""), [params.search]);

  const domain = domains.data?.find((d) => d.slug === domainSlug || d._id === params.domainId);
  const category = categories.data?.find((c) => c.slug === categorySlug);

  const visibleCategories = useMemo(
    () =>
      (categories.data || []).filter(
        (c) => !domain || (c.domainIds as (string | Domain)[]).some((d) => idOf(d) === domain._id)
      ),
    [categories.data, domain]
  );

  const setFilter = (next: RouteParams) =>
    navigate("services", {
      domain: domainSlug || undefined,
      category: categorySlug || undefined,
      pricing: pricing || undefined,
      search: search.trim() || undefined,
      ...next,
    });

  // Debounce typing into the URL
  useEffect(() => {
    if ((params.search || "") === search.trim()) return;
    const t = window.setTimeout(() => setFilter({ search: search.trim() || undefined }), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filtered = useMemo(() => {
    const term = (params.search || "").toLowerCase();
    return (services.data || []).filter((s) => {
      if (!serviceInDomain(s, domain?._id)) return false;
      if (!serviceInCategory(s, category?._id)) return false;
      if (pricing && s.pricingModel !== pricing) return false;
      if (term) {
        const hay = `${s.name} ${s.shortDescription || ""} ${s.description || ""}`.toLowerCase();
        if (!term.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [services.data, domain, category, pricing, params.search]);

  const activeCount = [domainSlug, categorySlug, pricing, params.search].filter(Boolean).length;

  return (
    <>
      <PageHeader
        eyebrow="Services"
        title={domain ? domain.name : "Research, publication and IP services"}
        description={
          <span className="block max-w-2xl">
            {domain?.description || "Browse our full catalogue. Every engagement starts with a short brief and a written quotation."}
          </span>
        }
      />

      <section className="container-page py-8 lg:py-12">
        {/* Filter bar: search + three dropdowns. Wraps naturally on smaller screens. */}
        <div className="card grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <label htmlFor="service-search" className="sr-only">
              Search services
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="service-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by service name or keyword"
              className="input pl-10"
            />
          </div>
          <FilterSelect
            label="Discipline"
            value={domainSlug}
            options={[{ value: "", label: "All disciplines" }, ...(domains.data || []).map((d) => ({ value: d.slug, label: d.name }))]}
            onChange={(v) => setFilter({ domain: v || undefined, category: undefined })}
          />
          <FilterSelect
            label="Service type"
            value={categorySlug}
            options={[{ value: "", label: "All service types" }, ...visibleCategories.map((c) => ({ value: c.slug, label: c.name }))]}
            onChange={(v) => setFilter({ category: v || undefined })}
          />
          <FilterSelect label="Pricing" value={pricing} options={PRICING} onChange={(v) => setFilter({ pricing: v || undefined })} />
        </div>

        <div className="mb-6 mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500" aria-live="polite">
            {services.isLoading ? "Loading services…" : `${filtered.length} service${filtered.length === 1 ? "" : "s"}`}
          </p>
          {activeCount > 0 && (
            <button type="button" onClick={() => navigate("services")} className="btn-ghost btn-sm">
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>

        {services.isError ? (
          <ErrorState onRetry={() => services.refetch()} />
        ) : services.isLoading ? (
          <div className={SERVICE_GRID}>
            {Array.from({ length: 6 }).map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No services match these filters"
            message="Try a different keyword or clear the filters. If you can't find what you need, send us a brief and we'll advise."
            action={
              <button type="button" onClick={() => navigate("wizard")} className="btn-primary btn-sm">
                Send a custom brief
              </button>
            }
          />
        ) : (
          <div className={SERVICE_GRID}>
            {filtered.map((s) => {
              const cat = (categories.data || []).find((c) => (s.categoryIds || []).some((id) => idOf(id) === c._id));
              return <ServiceCard key={s._id} service={s} navigate={navigate} tag={cat?.name} />;
            })}
          </div>
        )}
      </section>

      <CtaBand navigate={navigate} title="Need something not listed?" text="Describe your project and we'll recommend the right approach." />
    </>
  );
};

const FilterSelect: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input truncate pr-9 ${value ? "border-navy-400 bg-navy-50 font-medium text-navy-900" : ""}`}
      >
        {options.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};
