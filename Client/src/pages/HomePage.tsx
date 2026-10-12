import React, { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Layers,
  Search,
  HelpCircle,
  ChevronDown,
  Building2,
  Award,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublicDomains, getPublicServices, getPublicFaqs } from "../api";
import { formatServicePrice } from "../api/types";
import { WhatsAppButton } from "../components/common/WhatsAppButton";

interface HomePageProps {
  navigate: (route: string, params?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Queries
  const { data: domains = [] } = useQuery({
    queryKey: ["public-domains"],
    queryFn: getPublicDomains,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["public-services-featured"],
    queryFn: () => getPublicServices({ featured: true }),
  });

  const { data: faqs = [] } = useQuery({
    queryKey: ["public-faqs"],
    queryFn: getPublicFaqs,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("services", { search: searchQuery });
  };

  return (
    <div className="space-y-14 sm:space-y-20 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative pt-4 sm:pt-6 lg:pt-8 overflow-hidden">
        {/* Glow backdrop circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/15 blur-[100px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/4 w-[250px] h-[250px] bg-purple-600/10 blur-[90px] rounded-full pointer-events-none -z-10" />

        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5 sm:space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ethical Academic Advisory & Manuscript Preparation</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Accelerate Your Research.{" "}
            <span className="gradient-text-brand block sm:inline">
              Defend With Confidence.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Expert academic consulting for doctoral scholars, master's candidates, and university faculty. We support high-impact journal drafting, systematic reviews, simulation coding, and thesis structuring.
          </p>

          {/* Search Bar + Quick Actions */}
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="glass-panel p-1.5 sm:p-2 rounded-2xl flex items-center gap-2 shadow-xl shadow-indigo-950/40 border border-slate-700/70 focus-within:border-indigo-500 transition-all"
            >
              <div className="pl-3 text-slate-400">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                placeholder="Search research topic, service, or discipline (e.g. Deep Learning, Thesis)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none px-2 py-0.5"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm transition-all shadow-md shrink-0 flex items-center gap-1.5"
              >
                <span>Find Services</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2.5 text-xs text-slate-400">
              <span>Popular searches:</span>
              <button
                onClick={() => navigate("services", { search: "Deep Learning" })}
                className="hover:text-indigo-300 underline underline-offset-4 decoration-slate-700"
              >
                AI & Deep Learning
              </button>
              <span>•</span>
              <button
                onClick={() => navigate("services", { search: "Thesis" })}
                className="hover:text-indigo-300 underline underline-offset-4 decoration-slate-700"
              >
                Ph.D. Thesis
              </button>
              <span>•</span>
              <button
                onClick={() => navigate("services", { search: "Systematic Review" })}
                className="hover:text-indigo-300 underline underline-offset-4 decoration-slate-700"
              >
                PRISMA Review
              </button>
              <span>•</span>
              <button
                onClick={() => navigate("services", { search: "Editing" })}
                className="hover:text-indigo-300 underline underline-offset-4 decoration-slate-700"
              >
                Turnitin & Editing
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="pt-4 sm:pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            <div className="glass-panel p-3.5 sm:p-4 rounded-xl text-center border-slate-800">
              <div className="text-xl sm:text-2xl font-extrabold text-white">100%</div>
              <div className="text-xs text-slate-400 mt-0.5">COPE Ethics Compliant</div>
            </div>
            <div className="glass-panel p-3.5 sm:p-4 rounded-xl text-center border-slate-800">
              <div className="text-xl sm:text-2xl font-extrabold text-white">Q1–Q4</div>
              <div className="text-xs text-slate-400 mt-0.5">Journal Indexing Formats</div>
            </div>
            <div className="glass-panel p-3.5 sm:p-4 rounded-xl text-center border-slate-800">
              <div className="text-xl sm:text-2xl font-extrabold text-white">&lt; 10%</div>
              <div className="text-xs text-slate-400 mt-0.5">Similarity Threshold</div>
            </div>
            <div className="glass-panel p-3.5 sm:p-4 rounded-xl text-center border-slate-800">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">Direct</div>
              <div className="text-xs text-slate-400 mt-0.5">WhatsApp Consultation</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. RESEARCH DISCIPLINES */}
      <section className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Multi-Disciplinary Expertise
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Supported Academic Disciplines
            </h3>
          </div>
          <button
            onClick={() => navigate("services")}
            className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group self-start md:self-auto"
          >
            <span>Browse all categories</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {domains.map((domain) => (
            <div
              key={domain._id}
              onClick={() => navigate("services", { domainId: domain._id })}
              className="glass-panel p-6 rounded-2xl card-hover cursor-pointer border-slate-800/80 group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all mb-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white group-hover:text-indigo-200 transition-colors">
                  {domain.name}
                </h4>
                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {domain.description}
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                <span>View services in discipline</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. INDEXING BADGES BANNER */}
      <section className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border-slate-800 bg-gradient-to-r from-slate-900/60 via-indigo-950/20 to-slate-900/60">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">
              Global Standards
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Configured For Leading Indexing & Citation Manuals
            </h3>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              "Scopus (Elsevier)",
              "Web of Science (SCI / SCIE)",
              "IEEE Xplore",
              "ACM Digital Library",
              "PubMed / MEDLINE",
              "Springer Nature",
              "Elsevier ScienceDirect",
              "UGC-CARE (India)",
              "APA 7th & IEEE Formats",
            ].map((badge, idx) => (
              <span
                key={idx}
                className="px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs font-medium shadow-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURED SERVICES GRID */}
      <section className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Popular Academic Offerings
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Featured Research Services
            </h3>
          </div>
          <button
            onClick={() => navigate("services")}
            className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group"
          >
            <span>View all services</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service._id}
              className="glass-panel p-6 rounded-2xl border-slate-800/80 card-hover flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {service.turnaroundTime || "Custom Timeline"}
                  </span>
                  <span className="text-xs font-medium text-slate-300">
                    {formatServicePrice(service)}
                  </span>
                </div>

                <h4
                  onClick={() => navigate("service-detail", { slug: service.slug })}
                  className="text-lg font-bold text-white hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  {service.name}
                </h4>

                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {service.shortDescription}
                </p>

                {/* Deliverables snippet */}
                {service.deliverables && service.deliverables.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-300">Deliverables:</p>
                    {service.deliverables.slice(0, 3).map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{d}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate("service-detail", { slug: service.slug })}
                  className="text-xs font-semibold text-slate-300 hover:text-white"
                >
                  View Details
                </button>

                <button
                  onClick={() => navigate("wizard", { serviceId: service._id })}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1 transition-all"
                >
                  <span>Submit Request</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 4-STEP WORKFLOW */}
      <section className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Transparent Execution
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            How Research Hub Works
          </h3>
          <p className="text-sm text-slate-400 mt-2">
            No unexpected fees or automated charges. Every milestone is discussed and confirmed directly with you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Select Service & Scope",
              desc: "Choose your research category, discipline, target publication, and citation format.",
            },
            {
              step: "02",
              title: "Dynamic Requirement Wizard",
              desc: "Fill only the form fields relevant to your research problem and attach references.",
            },
            {
              step: "03",
              title: "Specialist Review & WhatsApp Chat",
              desc: "Our academic coordinator reviews requirements and messages you with a personalized quotation.",
            },
            {
              step: "04",
              title: "Milestone Delivery & Defense Support",
              desc: "Receive drafts, simulation code, similarity audits, and revisions until satisfied.",
            },
          ].map((item, idx) => (
            <div key={idx} className="glass-panel p-6 rounded-2xl border-slate-800 relative">
              <div className="text-3xl font-black text-indigo-500/30 mb-3">{item.step}</div>
              <h4 className="text-base font-bold text-white mb-2">{item.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. CMS FAQS ACCORDION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Frequently Asked Questions</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Common Questions & Answers
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => {
            const isOpen = openFaq === faq._id;
            return (
              <div
                key={faq._id}
                className="glass-panel rounded-2xl border-slate-800/80 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : faq._id)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-white text-sm hover:text-indigo-200 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-indigo-400 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. CTA BANNER */}
      <section className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/40 text-center space-y-6">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Ready to Begin Your Research Project?
          </h3>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Submit your research parameters through our interactive wizard. Receive an itemized scope and direct WhatsApp consultation within hours.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => navigate("wizard")}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Dynamic Request Wizard</span>
            </button>
            <WhatsAppButton size="lg" label="Chat With Academic Advisor" />
          </div>
        </div>
      </section>
    </div>
  );
};
