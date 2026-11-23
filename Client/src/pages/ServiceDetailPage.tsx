import React from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Clock, FileCheck2, Lock, ReceiptText, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicServiceBySlugOrId } from "../api";
import { Category, Domain, Service, formatServicePrice } from "../api/types";
import { WhatsAppButton } from "../components/common/WhatsAppButton";
import { AppLink, EmptyState, ErrorState, PageLoader, useDocumentTitle } from "../components/ui";
import { CtaBand } from "./HomePage";
import { IP_DOMAIN_SLUG } from "../hooks/usePublicData";
import { Navigate } from "../router";

export const ServiceDetailPage: React.FC<{ slug: string; navigate: Navigate }> = ({ slug, navigate }) => {
  const queryClient = useQueryClient();
  const { data: service, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["service-detail", slug],
    queryFn: () => getPublicServiceBySlugOrId(slug),
    retry: (count, err: any) => err?.response?.status !== 404 && count < 1,
    // Show the service straight away from the already-loaded catalogue while the full details arrive
    placeholderData: () => {
      for (const key of ["public-services-all", "public-services-featured"]) {
        const match = queryClient
          .getQueryData<Service[]>([key])
          ?.find((s) => s.slug === slug || s._id === slug);
        if (match) return match;
      }
      return undefined;
    },
  });

  useDocumentTitle(service?.name || "Service");

  if (isLoading) return <PageLoader label="Loading service…" />;

  if (isError || !service) {
    const notFound = (error as any)?.response?.status === 404 || !service;
    return (
      <div className="container-page section max-w-2xl">
        {notFound ? (
          <EmptyState
            title="Service not found"
            message="This service may have been renamed or is no longer offered."
            action={
              <button type="button" onClick={() => navigate("services")} className="btn-primary btn-sm">
                Browse all services
              </button>
            }
          />
        ) : (
          <ErrorState onRetry={() => refetch()} />
        )}
      </div>
    );
  }

  const domains = (service.domainIds || []).filter((d): d is Domain => typeof d === "object");
  const categories = (service.categoryIds || []).filter((c): c is Category => typeof c === "object");
  const isIp = domains.some((d) => d.slug === IP_DOMAIN_SLUG);

  return (
    <>
      <section className="border-b border-slate-200 bg-navy-50/60">
        <div className="container-page py-10 sm:py-14">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
            <AppLink to="home" navigate={navigate} className="hover:text-navy-900">
              Home
            </AppLink>
            <ChevronRight className="h-3.5 w-3.5" />
            <AppLink to={isIp ? "patents" : "services"} navigate={navigate} className="hover:text-navy-900">
              {isIp ? "Patents & IP" : "Services"}
            </AppLink>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-navy-900">{service.name}</span>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span key={c._id} className="badge-navy">
                    {c.name}
                  </span>
                ))}
              </div>
              <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">{service.name}</h1>
              {service.shortDescription && <p className="lead mt-4">{service.shortDescription}</p>}
            </div>

            <aside className="card p-6 lg:sticky lg:top-24">
              <dl className="space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Pricing</dt>
                  <dd className="font-semibold text-navy-900">{formatServicePrice(service)}</dd>
                </div>
                {service.turnaroundTime && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Typical turnaround</dt>
                    <dd className="text-right font-medium text-navy-900">{service.turnaroundTime}</dd>
                  </div>
                )}
              </dl>
              <AppLink to="wizard" params={{ service: service._id }} navigate={navigate} className="btn-primary btn-lg mt-6 w-full">
                Request this service <ArrowRight className="h-4 w-4" />
              </AppLink>
              <WhatsAppButton serviceName={service.name} className="mt-3 w-full" label="Ask a question" />
              <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Everything you share is kept confidential. You only pay after accepting a written quotation.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="container-page section-tight">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-12">
            {service.description && (
              <div>
                <h2 className="h-card text-xl">Overview</h2>
                <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-700">{service.description}</p>
              </div>
            )}

            {service.deliverables && service.deliverables.length > 0 && (
              <div>
                <h2 className="h-card flex items-center gap-2 text-xl">
                  <FileCheck2 className="h-5 w-5 text-navy-500" /> What you receive
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {service.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h2 className="h-card flex items-center gap-2 text-xl">
                <ReceiptText className="h-5 w-5 text-navy-500" /> How the engagement works
              </h2>
              <ol className="mt-5 space-y-4">
                {[
                  ["Submit a short brief", "Two quick steps: what you need, and your contact details."],
                  ["Receive a written quotation", "A specialist reviews your brief and confirms scope, price and timeline."],
                  ["Work begins after payment", "Track progress and message the team from your dashboard."],
                  ["Delivery and revisions", "Download your deliverables; revisions are handled in the same thread."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-navy-900">{t}</p>
                      <p className="text-sm text-slate-600">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="space-y-6">
            {service.idealFor && service.idealFor.length > 0 && (
              <div className="panel-muted p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.05em] text-slate-500">
                  <Users className="h-4 w-4" /> Suited to
                </h2>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {service.idealFor.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
            {!isIp && service.supportedIndexing && service.supportedIndexing.length > 0 && (
              <div className="panel-muted p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-slate-500">Indexing targets</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {service.supportedIndexing.map((i) => (
                    <span key={i} className="badge-neutral">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {isIp && (
              <div className="panel-muted p-6 text-sm text-slate-600">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.05em] text-slate-500">
                  <Clock className="h-4 w-4" /> Statutory deadlines
                </h2>
                <p className="mt-3">
                  Patent and trademark matters have strict official deadlines. Tell us about any date you are working
                  towards when you submit your brief, and we will plan the work around it.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <CtaBand navigate={navigate} />
    </>
  );
};
