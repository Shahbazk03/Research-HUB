import React, { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MessageSquare, Search, X } from "lucide-react";
import { getAdminRequests } from "../../api";
import { hasSubmittedPayment, ServiceRequest, ServiceRequestStatus } from "../../api/types";
import { StatusBadge } from "../common/StatusBadge";
import {
  ALL_STATUSES,
  DataState,
  formatDate,
  getRequestTopic,
  getServiceName,
  Pager,
  SectionHeader,
  staffStatusLabel,
  useDebouncedValue,
} from "./shared";

const PAGE_SIZE = 20;

/** Primary statuses get chips; the rest sit under "Other". */
const PRIMARY_STATUSES: ServiceRequestStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "QUOTATION_SENT",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "COMPLETED",
  "CANCELLED",
];
const OTHER_STATUSES = ALL_STATUSES.filter((s) => !PRIMARY_STATUSES.includes(s));

const whatsappLink = (req: ServiceRequest): string | undefined => {
  const digits = (req.customer?.whatsapp || req.customer?.phone || "").replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  const text = `Hello ${req.customer?.name || ""}, this is Research Hub regarding your request ${req.requestNumber} (${getServiceName(req)}).`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};

export const RequestsTab: React.FC<{ onManage: (req: ServiceRequest) => void }> = ({ onManage }) => {
  const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [statusFilter, search]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-requests", statusFilter, search, page],
    queryFn: () =>
      getAdminRequests({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const requests = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const chip = (value: ServiceRequestStatus | "all", label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setStatusFilter(value)}
      aria-pressed={statusFilter === value}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        statusFilter === value
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-navy-300 hover:text-navy-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Service requests"
        description="Review submissions, update status, send quotations and deliver completed work."
      />

      <div className="card space-y-3 p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search requests"
            placeholder="Search by reference, customer name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input pl-9 pr-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-navy-900"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
          {chip("all", "All")}
          {PRIMARY_STATUSES.map((s) => chip(s, staffStatusLabel(s)))}
          {OTHER_STATUSES.length > 0 && (
            <select
              aria-label="Other statuses"
              value={OTHER_STATUSES.includes(statusFilter as ServiceRequestStatus) ? statusFilter : ""}
              onChange={(e) => e.target.value && setStatusFilter(e.target.value as ServiceRequestStatus)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                OTHER_STATUSES.includes(statusFilter as ServiceRequestStatus)
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-slate-300 bg-white text-slate-600"
              }`}
            >
              <option value="">Other…</option>
              {OTHER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {staffStatusLabel(s)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        isEmpty={requests.length === 0}
        emptyTitle="No requests found"
        emptyMessage={search || statusFilter !== "all" ? "Try a different search term or status filter." : "New customer submissions will appear here."}
      >
        <div className={`table-wrap ${isFetching ? "opacity-70" : ""}`} aria-busy={isFetching}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Customer</th>
                <th scope="col">Service &amp; topic</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const topic = getRequestTopic(req);
                const wa = whatsappLink(req);
                const paymentPending =
                  hasSubmittedPayment(req) && req.paymentSubmission?.status === "PENDING_VERIFICATION";
                return (
                  <tr key={req._id}>
                    <td className="whitespace-nowrap font-mono text-xs font-semibold text-navy-800">{req.requestNumber}</td>
                    <td className="max-w-[200px]">
                      <span className="block font-medium text-navy-900">{req.customer?.name}</span>
                      <span className="block break-all text-xs text-slate-500">{req.customer?.email}</span>
                    </td>
                    <td className="max-w-[280px]">
                      <span className="block break-words font-medium text-navy-900">{getServiceName(req)}</span>
                      {topic && (
                        <span className="mt-0.5 block truncate text-xs text-slate-500" title={topic}>
                          {topic}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={req.status} size="sm" audience="staff" />
                        {paymentPending && <span className="badge-warning text-[11px]">Payment to verify</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-slate-500">{formatDate(req.createdAt)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="icon-btn"
                            aria-label={`Message ${req.customer?.name || "customer"} on WhatsApp`}
                            title="WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </a>
                        )}
                        <button type="button" className="btn-secondary btn-sm" onClick={() => onManage(req)}>
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataState>

      <Pager page={page} totalPages={totalPages} total={total} noun="request" onPageChange={setPage} disabled={isFetching} />
    </div>
  );
};
