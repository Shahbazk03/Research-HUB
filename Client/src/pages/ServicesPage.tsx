import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublicServices, getPublicDomains, getPublicCategories } from "../api";
import { Service, formatServicePrice } from "../api/types";

interface ServicesPageProps {
  navigate: (route: string, params?: any) => void;
  initialParams?: { domainId?: string; search?: string };
}

export const ServicesPage: React.FC<ServicesPageProps> = ({
  navigate,
  initialParams = {},
}) => {
  const [search, setSearch] = useState(initialParams.search || "");
  const [selectedDomain, setSelectedDomain] = useState<string>(
    initialParams.domainId || "all"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPricing, setSelectedPricing] = useState<string>("all");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Queries
  const { data: domains = [] } = useQuery({
    queryKey: ["public-domains"],
    queryFn: getPublicDomains,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["public-categories"],
    queryFn: () => getPublicCategories(),
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["public-services-all"],
    queryFn: () => getPublicServices(),
  });

  // Client-side filtering for fast interactive feedback
  const filteredServices = useMemo(() => {
    return services.filter((s: Service) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesDesc = s.description?.toLowerCase().includes(q) || false;
        const matchesShort = s.shortDescription?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesDesc && !matchesShort) return false;
      }

      // Domain
      if (selectedDomain !== "all") {
        const domainMatches = s.domainIds.some((d: any) =>
          typeof d === "string" ? d === selectedDomain : d._id === selectedDomain
        );
        if (!domainMatches) return false;
      }

      // Category
      if (selectedCategory !== "all") {
        const catMatches = s.categoryIds.some((c: any) =>
          typeof c === "string" ? c === selectedCategory : c._id === selectedCategory
        );
        if (!catMatches) return false;
      }

      // Pricing
      if (selectedPricing !== "all") {
        if (s.pricingModel !== selectedPricing) return false;
      }

      return true;
    });
  }, [services, search, selectedDomain, selectedCategory, selectedPricing]);

  const clearFilters = () => {
    setSearch("");
    setSelectedDomain("all");
    setSelectedCategory("all");
    setSelectedPricing("all");
  };

  const hasActiveFilters =
    Boolean(search) ||
    selectedDomain !== "all" ||
    selectedCategory !== "all" ||
    selectedPricing !== "all";

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
          <Layers className="w-3.5 h-3.5" />
          <span>Academic Catalog</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Research Services & Advisory
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          Explore specialized research preparation services. Filter by academic discipline, category, and consultation model.
        </p>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-3 xl:col-span-3 glass-panel p-6 rounded-2xl border-slate-800 space-y-6 sticky top-24">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-400" />
              <span>Filter Catalog</span>
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Reset
              </button>
            )}
          </div>

          {/* Search Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Discipline / Domain Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Discipline / Department
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-slate-900"
            >
              <option value="all">All Disciplines</option>
              {domains.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Service Type
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-slate-900"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Model */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Pricing Structure
            </label>
            <select
              value={selectedPricing}
              onChange={(e) => setSelectedPricing(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-slate-900"
            >
              <option value="all">All Pricing Types</option>
              <option value="CUSTOM_QUOTE">Custom Quotation</option>
              <option value="RANGE">Price Range</option>
              <option value="FIXED">Fixed Price</option>
              <option value="CONTACT_FOR_PRICE">Contact for Price</option>
            </select>
          </div>

          {/* Total Results */}
          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 text-center">
            Showing <strong className="text-white">{filteredServices.length}</strong> services
          </div>
        </aside>

        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden flex items-center justify-between gap-3 p-3 glass-panel rounded-xl">
          <div className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredServices.length}</strong> services
          </div>
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Mobile Filter Sheet Modal */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end lg:hidden">
            <div className="w-4/5 max-w-sm h-full bg-slate-900 p-6 overflow-y-auto space-y-5 border-l border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-sm font-bold text-white">Filter Services</h3>
                <button onClick={() => setMobileFilterOpen(false)} className="text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Keywords..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full p-2 rounded-lg glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Discipline</label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-800 text-xs text-white"
                >
                  <option value="all">All Disciplines</option>
                  {domains.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Service Type</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-800 text-xs text-white"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  onClick={clearFilters}
                  className="w-1/2 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 font-semibold"
                >
                  Reset
                </button>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-1/2 py-2 rounded-lg bg-indigo-600 text-xs text-white font-semibold"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Services List Grid */}
        <div className="lg:col-span-9 xl:col-span-9 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="glass-panel p-6 rounded-2xl animate-pulse space-y-4">
                  <div className="h-4 bg-slate-800 rounded w-1/3" />
                  <div className="h-6 bg-slate-800 rounded w-3/4" />
                  <div className="h-12 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center space-y-4 border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Matching Research Services</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No services matched your current filter parameters. Try clearing your search term or discipline filter.
              </p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredServices.map((service) => (
                <div
                  key={service._id}
                  className="glass-panel p-6 rounded-2xl border-slate-800/80 card-hover flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {service.turnaroundTime || "7–14 Days"}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {formatServicePrice(service)}
                      </span>
                    </div>

                    <h3
                      onClick={() => navigate("service-detail", { slug: service.slug })}
                      className="text-base font-bold text-white hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      {service.name}
                    </h3>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {service.shortDescription || service.description}
                    </p>

                    {/* Key deliverables */}
                    {service.deliverables && service.deliverables.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-1">
                        {service.deliverables.slice(0, 3).map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{d}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate("service-detail", { slug: service.slug })}
                      className="text-xs font-semibold text-slate-300 hover:text-white"
                    >
                      View Details
                    </button>

                    <button
                      onClick={() => navigate("wizard", { serviceId: service._id })}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start Request</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
