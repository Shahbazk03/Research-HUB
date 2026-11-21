import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, RefreshCw } from "lucide-react";
import { getAdminOverview, getErrorMessage } from "../../api";
import { ServiceRequest } from "../../api/types";
import { StatusBadge } from "../common/StatusBadge";
import { EmptyState, ErrorState } from "../ui";
import { formatDate, getServiceName, SectionHeader } from "./shared";

interface TrendPoint {
  label: string;
  value: number;
}

const StatCard: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({
  label,
  value,
  hint,
  tone = "bg-navy-600",
}) => (
  <div className="card p-4 sm:p-5">
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden="true" />
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    </div>
    <p className="mt-2 text-2xl font-semibold tabular-nums text-navy-900 sm:text-3xl">{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

/** Simple 7-day column chart with value labels; one series, one colour. */
const TrendChart: React.FC<{ title: string; total: number; points: TrendPoint[]; unit: string }> = ({
  title,
  total,
  points,
  unit,
}) => {
  const peak = Math.max(1, ...points.map((p) => Number(p.value || 0)));
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="h-card text-base">{title}</p>
          <p className="muted">Last 7 days</p>
        </div>
        <span className="badge-navy tabular-nums">
          {total} {unit}
        </span>
      </div>
      {points.length === 0 ? (
        <p className="muted mt-6">No activity recorded.</p>
      ) : (
        <div className="mt-5 grid h-36 grid-cols-7 items-end gap-2" role="list" aria-label={`${title}, last 7 days`}>
          {points.map((p) => {
            const v = Number(p.value || 0);
            return (
              <div key={p.label} role="listitem" className="flex h-full flex-col items-center justify-end gap-1">
                <span className="text-xs font-medium tabular-nums text-slate-700">{v}</span>
                <div
                  className="w-full max-w-[28px] rounded-t bg-navy-700"
                  style={{ height: `${Math.max(v > 0 ? 6 : 2, (v / peak) * 100)}%`, opacity: v > 0 ? 1 : 0.25 }}
                  aria-hidden="true"
                />
                <span className="truncate text-[11px] text-slate-500">{p.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const OverviewTab: React.FC<{
  onOpenRequests: () => void;
  onManageRequest: (req: ServiceRequest) => void;
}> = ({ onOpenRequests, onManageRequest }) => {
  const { data: overview, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
  });

  const header = (
    <SectionHeader
      title="Overview"
      description="A summary of request volume, customer sign-ups and recent submissions."
      actions={
        <button type="button" className="btn-secondary btn-sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
        </button>
      }
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      </div>
    );
  }

  const m = overview?.metrics || {};
  const a = overview?.activity || {};
  const recent: ServiceRequest[] = overview?.recentRequests || [];

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total requests" value={m.totalRequests ?? 0} tone="bg-navy-700" />
        <StatCard label="New" value={m.newRequests ?? 0} tone="bg-sky-500" hint="Awaiting first review" />
        <StatCard label="In progress" value={m.inProgressRequests ?? 0} tone="bg-navy-500" />
        <StatCard label="Completed" value={m.completedRequests ?? 0} tone="bg-emerald-500" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Awaiting customer" value={m.waitingRequests ?? 0} tone="bg-amber-500" />
        <StatCard label="Registered users" value={m.totalUsers ?? 0} tone="bg-slate-400" hint={`${a.todayUsers ?? 0} today`} />
        <StatCard label="Active services" value={m.totalServices ?? 0} tone="bg-slate-400" />
        <StatCard label="Active disciplines" value={m.totalDomains ?? 0} tone="bg-slate-400" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TrendChart title="New requests" total={a.requestsLast7Days ?? 0} points={a.requestTrend || []} unit="total" />
        <TrendChart title="Customer sign-ups" total={a.signupsLast7Days ?? 0} points={a.signupTrend || []} unit="total" />
      </div>

      <section className="space-y-3" aria-labelledby="recent-requests-heading">
        <div className="flex items-center justify-between gap-3">
          <h3 id="recent-requests-heading" className="h-card">
            Recent requests
          </h3>
          <button type="button" className="btn-ghost btn-sm" onClick={onOpenRequests}>
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No requests yet" message="New customer submissions will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Service</th>
                  <th scope="col">Status</th>
                  <th scope="col">Submitted</th>
                  <th scope="col" className="text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((req) => (
                  <tr key={req._id}>
                    <td className="whitespace-nowrap font-mono text-xs font-semibold text-navy-800">{req.requestNumber}</td>
                    <td>
                      <span className="block font-medium text-navy-900">{req.customer?.name}</span>
                      <span className="block break-all text-xs text-slate-500">{req.customer?.email}</span>
                    </td>
                    <td className="max-w-[220px] break-words">{getServiceName(req)}</td>
                    <td>
                      <StatusBadge status={req.status} size="sm" audience="staff" />
                    </td>
                    <td className="whitespace-nowrap text-slate-500">{formatDate(req.createdAt)}</td>
                    <td className="text-right">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => onManageRequest(req)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
