import React from "react";
import { ArrowRight, Clock } from "lucide-react";
import { Service, formatServicePrice } from "../api/types";
import { AppLink } from "./ui";
import { Navigate } from "../router";

/** Responsive card grid: as many ~20rem columns as fit (1 on phones, 2 on tablets, 3–4 on desktops). */
export const SERVICE_GRID = "grid gap-5 sm:gap-6 grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))]";

export const ServiceCard: React.FC<{ service: Service; navigate: Navigate; tag?: string }> = ({ service, navigate, tag }) => (
  <article className="card card-hover group relative flex h-full min-w-0 flex-col p-6">
    {(tag || service.isFeatured) && (
      <div className="flex min-w-0 items-center gap-2">
        {tag && (
          <span className="badge-navy min-w-0 max-w-full" title={tag}>
            <span className="truncate">{tag}</span>
          </span>
        )}
        {service.isFeatured && <span className="badge-accent ml-auto shrink-0">Popular</span>}
      </div>
    )}
    <h3 className="mt-4 text-lg font-semibold leading-snug text-navy-900 first:mt-0">
      <AppLink
        to="service-detail"
        params={{ slug: service.slug }}
        navigate={navigate}
        className="after:absolute after:inset-0 focus:outline-none"
      >
        {service.name}
      </AppLink>
    </h3>
    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
      {service.shortDescription || service.description}
    </p>
    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
      <div className="space-y-0.5">
        <p className="font-semibold text-navy-900">{formatServicePrice(service)}</p>
        {service.turnaroundTime && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            {service.turnaroundTime}
          </p>
        )}
      </div>
      <span className="flex items-center gap-1 font-medium text-navy-700 transition-transform group-hover:translate-x-0.5">
        Details <ArrowRight className="h-4 w-4" />
      </span>
    </div>
  </article>
);

export const ServiceCardSkeleton: React.FC = () => (
  <div className="card p-6">
    <div className="skeleton h-5 w-24" />
    <div className="skeleton mt-4 h-6 w-3/4" />
    <div className="skeleton mt-3 h-4 w-full" />
    <div className="skeleton mt-2 h-4 w-5/6" />
    <div className="skeleton mt-8 h-4 w-1/3" />
  </div>
);
