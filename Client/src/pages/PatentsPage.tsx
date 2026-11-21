import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  FileSearch,
  FileSignature,
  Globe2,
  Lock,
  PenTool,
  Stamp,
  Copyright,
  Gavel,
} from "lucide-react";
import { AppLink, ErrorState, useDocumentTitle } from "../components/ui";
import { ServiceCard, ServiceCardSkeleton } from "../components/ServiceCard";
import { CtaBand } from "./HomePage";
import { findIpDomain, serviceInCategory, serviceInDomain, useAllServices, useCategories, useDomains } from "../hooks/usePublicData";
import { Domain } from "../api/types";
import { Navigate } from "../router";

const CAPABILITIES = [
  { icon: <FileSearch className="h-5 w-5" />, title: "Prior-art & patentability search", text: "Find the closest existing patents and publications and understand your chances before you file." },
  { icon: <FileSignature className="h-5 w-5" />, title: "Specification & claims drafting", text: "Provisional and complete specifications with a claim set built for breadth and defensibility." },
  { icon: <PenTool className="h-5 w-5" />, title: "Patent drawings", text: "Formal drawings, flowcharts and diagrams prepared to patent office standards." },
  { icon: <Globe2 className="h-5 w-5" />, title: "Filing support — India & PCT", text: "Filing-ready documents, statutory forms and deadline tracking, coordinated with registered patent agents." },
  { icon: <Gavel className="h-5 w-5" />, title: "Examination responses", text: "Point-by-point responses to examination reports, with claim amendments where needed." },
  { icon: <Stamp className="h-5 w-5" />, title: "Design registration", text: "Protect the shape, pattern and visual appearance of your products." },
  { icon: <Copyright className="h-5 w-5" />, title: "Trademark & copyright", text: "Clearance searches and applications for brands, logos, software and creative works." },
  { icon: <Lock className="h-5 w-5" />, title: "Confidentiality first", text: "Inventions are handled under strict confidentiality; we can sign an NDA before you share details." },
];

const TIMELINE = [
  { t: "Invention disclosure", d: "You share what the invention does and how it works." },
  { t: "Patentability search", d: "We assess novelty and inventive step against prior art." },
  { t: "Drafting", d: "Provisional or complete specification, claims and drawings." },
  { t: "Filing", d: "Forms, fees and submission through a registered patent agent." },
  { t: "Examination", d: "We help you respond to objections until the application is decided." },
];

const IP_FAQS = [
  {
    q: "Should I file a provisional or a complete specification first?",
    a: "A provisional application secures an early priority date while the invention is still being refined. In India, the complete specification must then be filed within 12 months. If the invention is already fully developed, filing a complete specification directly can be more efficient. We will recommend the right route after reviewing your disclosure.",
  },
  {
    q: "I have already published a paper on my invention. Can I still file a patent?",
    a: "Public disclosure before filing can destroy novelty, and the exceptions are narrow. Tell us exactly what was disclosed and when, and we will assess the options before any further disclosure happens.",
  },
  {
    q: "Can you file patents outside India?",
    a: "Yes. Through the Patent Cooperation Treaty (PCT) a single international application can preserve your right to seek protection in many countries. We prepare the documents and coordinate with registered agents for international filings.",
  },
  {
    q: "Is my invention kept confidential?",
    a: "Yes. Disclosures are accessible only to the specialists working on your matter, and we are happy to sign a non-disclosure agreement before you share technical details.",
  },
  {
    q: "Who actually files the application?",
    a: "Statutory filings are made by the applicant or through a registered patent agent. We prepare the complete filing package and coordinate submission through registered professionals.",
  },
];

export const PatentsPage: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  useDocumentTitle("Patents & Intellectual Property");
  const domains = useDomains();
  const categories = useCategories();
  const services = useAllServices();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const ipDomain = findIpDomain(domains.data);

  const groups = useMemo(() => {
    if (!ipDomain) return [];
    const ipServices = (services.data || []).filter((s) => serviceInDomain(s, ipDomain._id));
    const ipCategories = (categories.data || []).filter((c) =>
      (c.domainIds as (string | Domain)[]).some((d) => (typeof d === "string" ? d : d._id) === ipDomain._id)
    );
    const grouped = ipCategories
      .map((c) => ({ category: c, items: ipServices.filter((s) => serviceInCategory(s, c._id)) }))
      .filter((g) => g.items.length > 0);
    const ungrouped = ipServices.filter((s) => !grouped.some((g) => g.items.includes(s)));
    return ungrouped.length ? [...grouped, { category: { _id: "other", name: "Other IP services" } as any, items: ungrouped }] : grouped;
  }, [ipDomain, services.data, categories.data]);

  const loading = domains.isLoading || services.isLoading || categories.isLoading;
  const failed = domains.isError || services.isError;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 80% 20%, rgba(209,168,69,0.35), transparent 45%)",
          }}
          aria-hidden="true"
        />
        <div className="container-page relative grid gap-10 pb-14 pt-10 sm:pb-16 sm:pt-12 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-12 lg:pb-20 lg:pt-14">
          <div>
            <p className="eyebrow text-accent-300">
              <span className="h-px w-6 bg-accent-400" /> Patents & intellectual property
            </p>
            <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
              Protect the ideas behind your research.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-200">
              Patentability searches, specification drafting, filing support in India and under the PCT, examination
              responses, design registration, trademarks and copyright — delivered by technical specialists who
              understand research.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <AppLink to="wizard" navigate={navigate} className="btn-on-dark btn-lg">
                Discuss your invention <ArrowRight className="h-4 w-4" />
              </AppLink>
              <a href="#ip-services" className="btn-outline-on-dark btn-lg">
                View IP services
              </a>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-accent-300">Typical patent journey</p>
            <ol className="mt-5 space-y-5">
              {TIMELINE.map((step, i) => (
                <li key={step.t} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-400/60 text-xs font-semibold text-accent-200">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{step.t}</p>
                    <p className="text-sm text-navy-200">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="section">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Capabilities</p>
            <h2 className="h-section mt-3">End-to-end support for your intellectual property</h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-50 text-navy-700">{c.icon}</span>
                <h3 className="mt-4 font-semibold text-navy-900">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services from the catalogue */}
      <section id="ip-services" className="section scroll-mt-20 border-y border-slate-200 bg-slate-50">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Services</p>
            <h2 className="h-section mt-3">Patent & IP services</h2>
            <p className="lead mt-4 text-base">Choose a service to see what's included, or send us a brief and we'll recommend the right route.</p>
          </div>

          {failed ? (
            <div className="mt-10">
              <ErrorState onRetry={() => { domains.refetch(); services.refetch(); categories.refetch(); }} />
            </div>
          ) : loading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="card card-pad mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-slate-600">
                Our IP service catalogue is being updated. Send us a brief and a specialist will contact you.
              </p>
              <AppLink to="wizard" navigate={navigate} className="btn-primary">
                Send a brief
              </AppLink>
            </div>
          ) : (
            <div className="mt-12 space-y-14">
              {groups.map((g) => (
                <div key={g.category._id}>
                  <h3 className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.05em] text-slate-500">
                    {g.category.name}
                    <span className="h-px flex-1 bg-slate-200" />
                  </h3>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((s) => (
                      <ServiceCard key={s._id} service={s} navigate={navigate} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQs */}
      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow">Patent FAQs</p>
            <h2 className="h-section mt-3">Questions inventors often ask</h2>
            <p className="mt-4 text-sm text-slate-500">
              This information is general guidance, not legal advice. We will advise on your specific situation once we
              review your disclosure.
            </p>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {IP_FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={faq.q}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left font-medium text-navy-900"
                    >
                      {faq.q}
                      <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                  </h3>
                  {open && <p className="pb-5 pr-10 text-sm leading-relaxed text-slate-600 animate-fade-in">{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CtaBand
        navigate={navigate}
        title="Have an invention to protect?"
        text="Share a confidential brief. We'll recommend the right route and send a written quotation."
      />
    </>
  );
};
