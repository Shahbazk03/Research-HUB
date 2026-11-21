import React, { useCallback, useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, Plus, Search } from "lucide-react";
import { getCustomerRequests } from "../api";
import { ServiceRequest, ServiceRequestStatus, STATUS_LABELS } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState, ErrorState, Field, PageHeader, Spinner, useDocumentTitle } from "../components/ui";
import { RequestDetailModal } from "../components/customer/RequestDetailModal";
import { ProfileTab } from "../components/customer/ProfileTab";
import { TONE_BADGE, formatDate, getNextStep, getServiceName, isClosed } from "../components/customer/requestHelpers";
import { pathFor } from "../router";

interface CustomerDashboardPageProps {
  navigate: (route: string, params?: Record<string, string | undefined>) => void;
  initialTab?: string;
}

type Tab = "requests" | "profile";
const PAGE_SIZE = 10;

const STATUS_GROUPS: { label: string; statuses: ServiceRequestStatus[] }[] = [
  { label: "Open", statuses: ["NEW", "UNDER_REVIEW", "QUOTATION_SENT", "IN_PROGRESS"] },
  { label: "Needs your attention", statuses: ["WAITING_FOR_CUSTOMER", "NEEDS_INFORMATION"] },
  { label: "Closed", statuses: ["COMPLETED", "CANCELLED"] },
];

const useDebounced = <T,>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

/* -------------------------------------------------------------------------- */
/* Summary tiles                                                              */
/* -------------------------------------------------------------------------- */

const StatTile: React.FC<{ label: string; value?: number; loading: boolean; emphasis?: boolean }> = ({ label, value, loading, emphasis }) => (
  <div className={`card px-4 py-4 sm:px-5 ${emphasis ? "border-l-4 border-l-accent-500" : ""}`}>
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    {loading ? (
      <div className="skeleton mt-2 h-7 w-10" aria-hidden="true" />
    ) : (
      <p className="mt-1 font-serif text-2xl font-semibold text-navy-900 sm:text-3xl">{value ?? "—"}</p>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Request list                                                               */
/* -------------------------------------------------------------------------- */

const NextStepBadge: React.FC<{ req: ServiceRequest }> = ({ req }) => {
  const next = getNextStep(req);
  return <span className={TONE_BADGE[next.tone]}>{next.label}</span>;
};

const RequestTable: React.FC<{ requests: ServiceRequest[]; onOpen: (r: ServiceRequest) => void }> = ({ requests, onOpen }) => (
  <div className="table-wrap hidden md:block">
    <table className="table">
      <thead>
        <tr>
          <th scope="col">Reference</th>
          <th scope="col">Service</th>
          <th scope="col">Submitted</th>
          <th scope="col">Status</th>
          <th scope="col">Next step</th>
          <th scope="col">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => (
          <tr key={r._id} className="cursor-pointer" onClick={() => onOpen(r)}>
            <td className="whitespace-nowrap font-mono text-[13px] font-medium text-navy-900">{r.requestNumber}</td>
            <td className="max-w-[260px]">
              <p className="truncate font-medium text-navy-900">{getServiceName(r)}</p>
              {(r.academicProfile?.targetJournal || r.academicProfile?.publicationType) && (
                <p className="truncate text-xs text-slate-500">{r.academicProfile?.targetJournal || r.academicProfile?.publicationType}</p>
              )}
            </td>
            <td className="whitespace-nowrap">{formatDate(r.createdAt)}</td>
            <td>
              <StatusBadge status={r.status} size="sm" />
            </td>
            <td>
              <NextStepBadge req={r} />
            </td>
            <td className="text-right">
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(r);
                }}
                aria-label={`View details for ${r.requestNumber}`}
              >
                View
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RequestCards: React.FC<{ requests: ServiceRequest[]; onOpen: (r: ServiceRequest) => void }> = ({ requests, onOpen }) => (
  <ul className="space-y-3 md:hidden">
    {requests.map((r) => (
      <li key={r._id}>
        <button
          type="button"
          onClick={() => onOpen(r)}
          className="card block w-full p-4 text-left transition-colors hover:border-navy-200"
          aria-label={`View details for ${r.requestNumber}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs font-medium text-slate-500">{r.requestNumber}</p>
              <p className="mt-0.5 break-words font-semibold text-navy-900">{getServiceName(r)}</p>
              <p className="mt-0.5 text-xs text-slate-500">Submitted {formatDate(r.createdAt)}</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={r.status} size="sm" />
            <NextStepBadge req={r} />
          </div>
        </button>
      </li>
    ))}
  </ul>
);

const Pager: React.FC<{ page: number; totalPages: number; total: number; onChange: (p: number) => void; busy: boolean }> = ({
  page,
  totalPages,
  total,
  onChange,
  busy,
}) => {
  if (totalPages <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
      <p className="muted">
        Showing {from}–{to} of {total}
        {busy && <Spinner className="ml-2 inline h-3.5 w-3.5" />}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary btn-sm" onClick={() => onChange(page - 1)} disabled={page <= 1 || busy}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Previous
        </button>
        <span className="text-sm text-slate-600">
          Page {page} of {totalPages}
        </span>
        <button type="button" className="btn-secondary btn-sm" onClick={() => onChange(page + 1)} disabled={page >= totalPages || busy}>
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

// Profile UI lives in components/customer/ProfileTab.tsx

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const DashboardHeader: React.FC<{
  fullName: string;
  email?: string;
  institution?: string;
  actionCount: number;
  onNewRequest: () => void;
  onContact: () => void;
  onReviewActions: () => void;
}> = ({ fullName, email, institution, actionCount, onNewRequest, onContact, onReviewActions }) => {
  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="container-page flex flex-col gap-5 py-6 sm:py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-900 text-lg font-semibold text-white ring-4 ring-navy-50"
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-slate-500">{greeting()},</p>
            <h1 className="truncate font-serif text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
              {fullName || "Welcome"}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
              {email && <span className="truncate">{email}</span>}
              {email && institution && <span aria-hidden="true">·</span>}
              {institution && <span className="truncate">{institution}</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {actionCount > 0 && (
            <button type="button" onClick={onReviewActions} className="badge-warning justify-center px-3 py-1.5 text-sm hover:bg-amber-100">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              {actionCount} request{actionCount === 1 ? " needs" : "s need"} your attention
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={onContact}>
              Contact support
            </button>
            <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={onNewRequest}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New request
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export const CustomerDashboardPage: React.FC<CustomerDashboardPageProps> = ({ navigate, initialTab }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  useDocumentTitle("My requests");

  const [activeTab, setActiveTab] = useState<Tab>(initialTab === "profile" ? "profile" : "requests");
  useEffect(() => {
    if (initialTab === "requests" || initialTab === "profile") setActiveTab(initialTab);
  }, [initialTab]);

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    try {
      window.history.replaceState(null, "", pathFor("customer-dashboard", { tab }));
    } catch {
      /* ignore */
    }
  };

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput.trim(), 300);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ServiceRequest | null>(null);

  useEffect(() => setPage(1), [statusFilter, search]);

  // Unfiltered query for the summary tiles, so counts do not change while filtering.
  const summaryQuery = useQuery({
    queryKey: ["customer-requests", "summary"],
    queryFn: () => getCustomerRequests({ limit: 100 }),
    enabled: isAuthenticated,
  });

  const listQuery = useQuery({
    queryKey: ["customer-requests", "list", { status: statusFilter, search, page }],
    queryFn: () => getCustomerRequests({ status: statusFilter || undefined, search: search || undefined, page, limit: PAGE_SIZE }),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });

  const handleUpdated = useCallback(
    (updated: ServiceRequest) => {
      setSelected(updated);
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
    },
    [queryClient]
  );
  const closeDetail = useCallback(() => setSelected(null), []);

  if (!isAuthenticated) {
    return (
      <div className="container-page section-tight">
        <EmptyState
          title="Sign in to view your requests"
          message="Your requests, quotations and messages are available once you sign in."
          action={
            <button type="button" className="btn-primary" onClick={() => navigate("login", { redirect: "customer-dashboard" })}>
              Sign in
            </button>
          }
        />
      </div>
    );
  }

  const all = summaryQuery.data?.data || [];
  const stats = {
    total: summaryQuery.data?.total ?? all.length,
    active: all.filter((r) => !isClosed(r)).length,
    action: all.filter((r) => getNextStep(r).actionRequired).length,
    completed: all.filter((r) => r.status === "COMPLETED").length,
  };

  const requests = listQuery.data?.data || [];
  const filtersActive = Boolean(statusFilter || search);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  return (
    <div className="min-w-0 bg-slate-50/60 pb-16">
      <DashboardHeader
        fullName={fullName}
        email={user?.email}
        institution={user?.institution}
        actionCount={stats.action}
        onNewRequest={() => navigate("wizard")}
        onContact={() => navigate("contact")}
        onReviewActions={() => {
          changeTab("requests");
          setStatusFilter("");
          document.getElementById("panel-requests")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <div className="container-page pt-6">
        <div role="tablist" aria-label="Dashboard sections" className="flex gap-6 overflow-x-auto border-b border-slate-200">
          {(
            [
              ["requests", "Requests"],
              ["profile", "Profile"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-selected={activeTab === key}
              aria-controls={`panel-${key}`}
              className={`tab ${activeTab === key ? "tab-active" : ""}`}
              onClick={() => changeTab(key)}
            >
              {label}
              {key === "requests" && summaryQuery.data && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{stats.total}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "requests" && (
          <div role="tabpanel" id="panel-requests" aria-labelledby="tab-requests" className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatTile label="Total requests" value={stats.total} loading={summaryQuery.isLoading} />
              <StatTile label="Active" value={stats.active} loading={summaryQuery.isLoading} />
              <StatTile label="Awaiting your action" value={stats.action} loading={summaryQuery.isLoading} emphasis={stats.action > 0} />
              <StatTile label="Completed" value={stats.completed} loading={summaryQuery.isLoading} />
            </div>

            {/* Filters */}
            <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:p-4">
              <div className="min-w-0 flex-1">
                <label htmlFor="request-search" className="label">
                  Search
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="request-search"
                    type="search"
                    className="input pl-9"
                    placeholder="Reference no., discipline, journal or university"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:w-60">
                <label htmlFor="request-status" className="label">
                  Status
                </label>
                <select id="request-status" className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All statuses</option>
                  {STATUS_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.statuses.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {filtersActive && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setSearchInput("");
                    setStatusFilter("");
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* List */}
            {listQuery.isLoading ? (
              <div className="space-y-3" role="status" aria-label="Loading requests">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 w-full" />
                ))}
              </div>
            ) : listQuery.isError ? (
              <ErrorState
                title="We couldn't load your requests"
                message="Please check your connection and try again."
                onRetry={() => listQuery.refetch()}
              />
            ) : requests.length === 0 ? (
              filtersActive ? (
                <EmptyState
                  icon={<Search className="h-5 w-5" />}
                  title="No matching requests"
                  message="Try a different search term or status."
                  action={
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        setSearchInput("");
                        setStatusFilter("");
                      }}
                    >
                      Clear filters
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<FileText className="h-5 w-5" />}
                  title="No requests yet"
                  message="Submit your first request and our team will review your requirements and send a quotation."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <button type="button" className="btn-primary btn-sm" onClick={() => navigate("wizard")}>
                        New request
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => navigate("services")}>
                        Browse services
                      </button>
                    </div>
                  }
                />
              )
            ) : (
              <div className={`space-y-4 transition-opacity ${listQuery.isPlaceholderData ? "opacity-60" : ""}`}>
                <RequestTable requests={requests} onOpen={setSelected} />
                <RequestCards requests={requests} onOpen={setSelected} />
                <Pager
                  page={listQuery.data?.page || page}
                  totalPages={listQuery.data?.totalPages || 1}
                  total={listQuery.data?.total || requests.length}
                  onChange={setPage}
                  busy={listQuery.isFetching}
                />
              </div>
            )}

            <p className="muted">
              Need help with a request?{" "}
              <button type="button" className="link" onClick={() => navigate("contact")}>
                Contact our team
              </button>
              .
            </p>
          </div>
        )}

        {activeTab === "profile" && (
          <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile" className="pt-6">
            <ProfileTab navigate={navigate} />
          </div>
        )}
      </div>

      <RequestDetailModal
        request={selected}
        defaultPayerName={user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : undefined}
        onClose={closeDetail}
        onUpdated={handleUpdated}
      />
    </div>
  );
};
