import React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ShieldCheck,
  Award,
  Users,
  FileCheck2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublicServiceBySlugOrId } from "../api";
import { formatServicePrice } from "../api/types";
import { WhatsAppButton } from "../components/common/WhatsAppButton";

interface ServiceDetailPageProps {
  slug: string;
  navigate: (route: string, params?: any) => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  slug,
  navigate,
}) => {
  const { data: service, isLoading, isError } = useQuery({
    queryKey: ["service-detail", slug],
    queryFn: () => getPublicServiceBySlugOrId(slug),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading research service details...</p>
      </div>
    );
  }

  if (isError || !service) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Service Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested service could not be located or has been deactivated.
        </p>
        <button
          onClick={() => navigate("services")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Service Directory
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 space-y-6">
      {/* Back Link */}
      <button
        onClick={() => navigate("services")}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Services Catalog</span>
      </button>

      {/* Hero Header */}
      <div className="glass-panel p-6 sm:p-10 rounded-3xl border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
            <Clock className="w-3.5 h-3.5" />
            <span>Turnaround: {service.turnaroundTime || "7–14 Business Days"}</span>
          </div>

          <div className="text-sm font-semibold text-slate-200">
            Pricing Model:{" "}
            <span className="text-indigo-400 font-bold">
              {formatServicePrice(service)}
            </span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
          {service.name}
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
          {service.description || service.shortDescription}
        </p>

        {/* Action CTAs */}
        <div className="pt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("wizard", { serviceId: service._id })}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Dynamic Request Wizard</span>
          </button>

          <WhatsAppButton
            serviceName={service.name}
            size="md"
            label="Inquire Scope on WhatsApp"
          />
        </div>
      </div>

      {/* Deliverables & Scope Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deliverables */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span>Guaranteed Deliverables</span>
          </div>

          <div className="space-y-2.5">
            {service.deliverables && service.deliverables.length > 0 ? (
              service.deliverables.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">Standard manuscript deliverables included.</p>
            )}
          </div>
        </div>

        {/* Suitable Academic Levels & Indexing */}
        <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-5">
          {/* Ideal for */}
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-3">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Recommended For</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {service.idealFor && service.idealFor.length > 0 ? (
                service.idealFor.map((level, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium"
                  >
                    {level}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Doctoral Scholars & Postgraduates</span>
              )}
            </div>
          </div>

          {/* Indexing Targets */}
          {service.supportedIndexing && service.supportedIndexing.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-3">
                <Award className="w-4 h-4 text-purple-400" />
                <span>Target Journal Formats</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {service.supportedIndexing.map((target, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium"
                  >
                    {target}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COPE Ethics Assurance Box */}
      <div className="glass-panel p-6 rounded-2xl border-slate-800 bg-slate-950/60 flex items-start gap-4">
        <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed space-y-1">
          <p className="font-semibold text-slate-200">Ethical Consultation Standards</p>
          <p>
            All advisory drafts adhere to Committee on Publication Ethics (COPE) guidelines. We do not provide forged data or unverified publication guarantees. Research Hub provides original synthesis, developmental editing, and rigorous technical modeling.
          </p>
        </div>
      </div>
    </div>
  );
};
