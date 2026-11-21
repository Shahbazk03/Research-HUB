import React, { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  ChevronDown,
  ClipboardList,
  FileSearch,
  FileSignature,
  GraduationCap,
  Lightbulb,
  Lock,
  MessagesSquare,
  PackageCheck,
  ReceiptText,
  Scale,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { AppLink, ErrorState, useDocumentTitle } from "../components/ui";
import { ServiceCard, ServiceCardSkeleton } from "../components/ServiceCard";
import { HomeHero } from "../components/HomeHero";
import { ExpertsShowcase } from "./ExpertsPages";
import { useDomains, useFaqs, useFeaturedServices } from "../hooks/usePublicData";
import { Navigate } from "../router";

const PRACTICES = [
  {
    icon: <BookOpenText className="h-6 w-6" />,
    title: "Research & Publication",
    text: "Research papers, systematic reviews, theses and dissertations, editing and journal submission support across disciplines.",
    points: ["Manuscript development", "Thesis & dissertation", "Editing & formatting", "Journal selection & submission"],
    to: "services" as const,
    cta: "Explore research services",
  },
  {
    icon: <Lightbulb className="h-6 w-6" />,
    title: "Patents & Intellectual Property",
    text: "From prior-art search and specification drafting to filing support, examination responses, designs, trademarks and copyright.",
    points: ["Patentability search", "Provisional & complete specifications", "Filing support (India & PCT)", "Design, trademark & copyright"],
    to: "patents" as const,
    cta: "Explore patent & IP services",
  },
];

const STEPS = [
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: "Share your brief",
    text: "Tell us what you need in a short two-step form. It takes about three minutes.",
  },
  {
    icon: <ReceiptText className="h-5 w-5" />,
    title: "Receive a quotation",
    text: "A specialist reviews your brief and sends a clear, fixed quotation with timelines.",
  },
  {
    icon: <MessagesSquare className="h-5 w-5" />,
    title: "Track progress",
    text: "Follow every stage and message your team from your secure client dashboard.",
  },
  {
    icon: <PackageCheck className="h-5 w-5" />,
    title: "Receive deliverables",
    text: "Download final files and supporting documents, with revisions handled in the same thread.",
  },
];

const COMMITMENTS = [
  {
    icon: <Lock className="h-5 w-5" />,
    title: "Confidential by default",
    text: "Your manuscripts, inventions and data are handled on a need-to-know basis and never shared or reused.",
  },
  {
    icon: <UserRoundCheck className="h-5 w-5" />,
    title: "Subject-matter specialists",
    text: "Work is matched to specialists with experience in your discipline or technical field.",
  },
  {
    icon: <Scale className="h-5 w-5" />,
    title: "Integrity and compliance",
    text: "We follow academic integrity guidelines and coordinate statutory filings through registered professionals.",
  },
  {
    icon: <BadgeCheck className="h-5 w-5" />,
    title: "Transparent pricing",
    text: "Every engagement starts with a written quotation. No hidden charges, ever.",
  },
];

export const HomePage: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  useDocumentTitle();
  const featured = useFeaturedServices();
  const domains = useDomains();
  const faqs = useFaqs();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <>
      <HomeHero navigate={navigate} />

      {/* Commitments strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {["Confidential handling of every file", "Written quotation before work begins", "Patent filing in India & under the PCT", "Track progress in your dashboard"].map((t) => (
            <p key={t} className="flex items-center gap-3 text-sm font-medium text-navy-900">
              <BadgeCheck className="h-5 w-5 shrink-0 text-accent-500" />
              {t}
            </p>
          ))}
        </div>
      </section>

      {/* Practice areas */}
      <section className="section">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Practice areas</p>
            <h2 className="h-section mt-3">Two practices, one accountable team</h2>
            <p className="lead mt-4">
              Whether you are preparing a manuscript or protecting an invention, a single client manager coordinates the
              specialists you need.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {PRACTICES.map((p) => (
              <article key={p.title} className="card flex flex-col p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-navy-900 text-white">{p.icon}</span>
                <h3 className="mt-6 font-serif text-2xl font-semibold text-navy-900">{p.title}</h3>
                <p className="mt-3 text-slate-600">{p.text}</p>
                <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                      {pt}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <AppLink to={p.to} navigate={navigate} className="link inline-flex items-center gap-1.5">
                    {p.cta} <ArrowRight className="h-4 w-4" />
                  </AppLink>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Featured services */}
      <section className="section border-y border-slate-200 bg-slate-50">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">Most requested</p>
              <h2 className="h-section mt-3">Featured services</h2>
            </div>
            <AppLink to="services" navigate={navigate} className="btn-secondary">
              View all services <ArrowRight className="h-4 w-4" />
            </AppLink>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.isLoading &&
              Array.from({ length: 3 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
            {featured.isError && (
              <div className="sm:col-span-2 lg:col-span-3">
                <ErrorState onRetry={() => featured.refetch()} />
              </div>
            )}
            {featured.data?.slice(0, 6).map((s) => (
              <ServiceCard key={s._id} service={s} navigate={navigate} />
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="h-section mt-3">A clear, four-step engagement</h2>
          </div>
          <ol className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-navy-900 text-sm font-bold text-navy-900">
                    {i + 1}
                  </span>
                  <span className="hidden h-px flex-1 bg-slate-200 lg:block" aria-hidden="true" />
                </div>
                <h3 className="mt-5 flex items-center gap-2 font-semibold text-navy-900">
                  <span className="text-navy-500">{step.icon}</span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Commitments */}
      <section className="section bg-navy-950 text-white">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow text-accent-300">Our commitments</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Work you can put your name to
            </h2>
            <p className="mt-4 text-navy-200">
              Research and inventions are personal and often confidential. Our processes are designed around protecting
              both your work and your reputation.
            </p>
            <AppLink to="about" navigate={navigate} className="btn-outline-on-dark mt-8">
              About Research Hub
            </AppLink>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg bg-white/10 sm:grid-cols-2">
            {COMMITMENTS.map((c) => (
              <div key={c.title} className="bg-navy-950 p-6">
                <span className="text-accent-300">{c.icon}</span>
                <h3 className="mt-4 font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-200">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ExpertsShowcase navigate={navigate} />

      {/* Disciplines */}
      {domains.data && domains.data.length > 0 && (
        <section className="section-tight border-b border-slate-200">
          <div className="container-page">
            <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-slate-500">Disciplines we support</h2>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {domains.data.map((d) => (
                <AppLink
                  key={d._id}
                  to={d.slug === "patents-ip" ? "patents" : "services"}
                  params={d.slug === "patents-ip" ? undefined : { domain: d.slug }}
                  navigate={navigate}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:border-navy-300 hover:text-navy-900"
                >
                  {d.name}
                </AppLink>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {faqs.data && faqs.data.length > 0 && (
        <section className="section">
          <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <p className="eyebrow">FAQs</p>
              <h2 className="h-section mt-3">Common questions</h2>
              <p className="lead mt-4 text-base">
                Can't find what you need?{" "}
                <AppLink to="contact" navigate={navigate} className="link">
                  Contact our team
                </AppLink>
                .
              </p>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {faqs.data.slice(0, 8).map((faq) => {
                const open = openFaq === faq._id;
                return (
                  <div key={faq._id}>
                    <h3>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(open ? null : faq._id)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between gap-6 py-5 text-left font-medium text-navy-900"
                      >
                        {faq.question}
                        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                    </h3>
                    {open && <p className="pb-5 pr-10 text-sm leading-relaxed text-slate-600 animate-fade-in">{faq.answer}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <CtaBand navigate={navigate} />
    </>
  );
};

export const CtaBand: React.FC<{ navigate: Navigate; title?: string; text?: string }> = ({
  navigate,
  title = "Ready to discuss your project?",
  text = "Share a short brief and receive a written quotation from our specialists.",
}) => (
  <section className="border-t border-slate-200 bg-navy-50/70">
    <div className="container-page flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-navy-900 sm:text-3xl">{title}</h2>
        <p className="mt-2 text-slate-600">{text}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <AppLink to="wizard" navigate={navigate} className="btn-primary btn-lg">
          Start a request <ArrowRight className="h-4 w-4" />
        </AppLink>
        <AppLink to="contact" navigate={navigate} className="btn-secondary btn-lg">
          Talk to us
        </AppLink>
      </div>
    </div>
  </section>
);
