import React, { useState } from "react";
import { flushSync } from "react-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAdminRequests, getErrorMessage } from "../../api";
import { ServiceRequest } from "../../api/types";
import { adminListEngagements, Engagement, formatMoney } from "../../api/writers";
import { DataState, Notify, SectionHeader } from "./shared";
import { EngagementModal } from "./EngagementModal";
import { DeadlineCountdown, EngagementFilter, engagementsKey, StageBadge, useNow, WORKING_STAGES } from "./writerShared";

type ChipId = "SUBMITTED" | "OVERDUE" | "OFFERED" | "IN_PROGRESS" | "INTERESTED" | "APPROVED" | "ALL";

const CHIPS: { id: ChipId; label: string; stage: EngagementFilter; count: (c: Record<string, number>) => number }[] = [
  { id: "SUBMITTED", label: "Needs review", stage: "SUBMITTED", count: (c) => c.SUBMITTED || 0 },
  { id: "OVERDUE", label: "Overdue", stage: "OVERDUE", count: (c) => c.OVERDUE || 0 },
  { id: "OFFERED", label: "Offers pending", stage: "OFFERED", count: (c) => c.OFFERED || 0 },
  { id: "IN_PROGRESS", label: "In progress", stage: "ACTIVE", count: (c) => (c.ACCEPTED || 0) + (c.CHANGES_REQUESTED || 0) },
  { id: "INTERESTED", label: "Interest received", stage: "INTERESTED", count: (c) => c.INTERESTED || 0 },
  { id: "APPROVED", label: "Approved", stage: "APPROVED", count: (c) => c.APPROVED || 0 },
  {
    id: "ALL",
    label: "All",
    stage: "",
    count: (c) => Object.entries(c).reduce((sum, [k, v]) => (k === "OVERDUE" ? sum : sum + (v || 0)), 0),
  },
];

const EMPTY_TEXT: Record<ChipId, string> = {
  SUBMITTED: "No submissions are waiting for review.",
  OVERDUE: "No work is past its deadline.",
  OFFERED: "No offers are waiting for a writer's response.",
  IN_PROGRESS: "No writers are currently working on a request.",
  INTERESTED: "No writers have expressed interest in open requests.",
  APPROVED: "No work has been approved yet.",
  ALL: "Writer interest, offers and submissions will appear here.",
};

export const AssignmentsTab: React.FC<{
  isAdmin: boolean;
  notify: Notify;
  /** Opens the full request dialog (the dashboard's RequestManageModal). */
  onOpenRequest?: (req: ServiceRequest) => void;
}> = ({ isAdmin, notify, onOpenRequest }) => {
  const now = useNow();
  const [chip, setChip] = useState<ChipId>("ALL");
  const [selected, setSelected] = useState<Engagement | null>(null);
  const active = CHIPS.find((c) => c.id === chip)!;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: engagementsKey(active.stage),
    queryFn: () => adminListEngagements({ stage: active.stage }),
    placeholderData: keepPreviousData,
  });

  const counts = data?.counts || {};
  const rows = (data?.data || []).filter((e) => (chip === "IN_PROGRESS" ? e.stage === "ACCEPTED" || e.stage === "CHANGES_REQUESTED" : true));

  const openRequest = async (requestId: string, requestNumber: string) => {
    if (!onOpenRequest) return;
    try {
      const res = await getAdminRequests({ search: requestNumber, limit: 10 });
      const req = res.data.find((r) => r._id === requestId);
      if (!req) {
        notify("error", `Request ${requestNumber} could not be found.`);
        return;
      }
      flushSync(() => setSelected(null));
      onOpenRequest(req);
    } catch (err) {
      notify("error", getErrorMessage(err, "The request could not be opened."));
    }
  };

  const deadlineCell = (e: Engagement) =>
    e.offer && (WORKING_STAGES.includes(e.stage) || e.stage === "OFFERED") ? (
      <DeadlineCountdown deadline={e.offer.deadline} now={now} />
    ) : e.offer ? (
      <span className="text-xs text-slate-500">{new Date(e.offer.deadline).toLocaleDateString()}</span>
    ) : (
      <span className="text-slate-400">—</span>
    );

  const penaltyText = (e: Engagement) => {
    if (e.stage === "APPROVED" && e.payout) {
      return e.payout.penaltyAmount ? `−${formatMoney(e.payout.penaltyAmount, e.offer?.currency)}` : null;
    }
    return e.penalty?.isLate ? `−${formatMoney(e.penalty.penaltyAmount, e.offer?.currency)} (${e.penalty.penaltyPct}%)` : null;
  };

  const feeText = (e: Engagement) =>
    e.offer
      ? formatMoney(e.offer.fee, e.offer.currency)
      : e.proposal?.fee
        ? `${formatMoney(e.proposal.fee, e.proposal.currency || "INR")} proposed`
        : "—";

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Writer assignments"
        description="Review writer submissions, track deadlines and penalties, negotiate terms and settle payouts. Customers never see who wrote their paper."
      />

      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by stage">
          {CHIPS.map((c) => {
            const n = data ? c.count(counts) : undefined;
            const selectedChip = chip === c.id;
            const alert = (c.id === "SUBMITTED" || c.id === "OVERDUE") && n;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setChip(c.id)}
                aria-pressed={selectedChip}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedChip
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-navy-300 hover:text-navy-900"
                }`}
              >
                {c.label}
                {n !== undefined && (
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-semibold ${
                      selectedChip ? "bg-white/20 text-white" : alert ? (c.id === "OVERDUE" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800") : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        isEmpty={rows.length === 0}
        emptyTitle="Nothing here"
        emptyMessage={EMPTY_TEXT[chip]}
      >
        {/* Cards (small screens) */}
        <ul className={`space-y-3 md:hidden ${isFetching ? "opacity-70" : ""}`} aria-busy={isFetching}>
          {rows.map((e) => {
            const pen = penaltyText(e);
            return (
              <li key={e._id}>
                <button type="button" onClick={() => setSelected(e)} className="card w-full p-4 text-left transition-colors hover:border-navy-300">
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-semibold text-navy-800">{e.request?.requestNumber || "Request"}</span>
                      <span className="block break-words text-sm font-medium text-navy-900">{e.request?.serviceName || "Service"}</span>
                    </span>
                    <StageBadge stage={e.stage} className="text-[11px]" />
                  </span>
                  <span className="mt-2 block text-sm text-slate-700">{e.writer?.name || "Writer"}</span>
                  <span className="mt-2 flex flex-wrap items-end justify-between gap-2">
                    <span className="text-sm font-semibold text-navy-900">{feeText(e)}</span>
                    {deadlineCell(e)}
                  </span>
                  {pen && <span className="mt-1 block text-xs font-medium text-red-700">Penalty {pen}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Table (md and up) */}
        <div className={`table-wrap hidden md:block ${isFetching ? "opacity-70" : ""}`} aria-busy={isFetching}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Request</th>
                <th scope="col">Writer</th>
                <th scope="col">Stage</th>
                <th scope="col">Fee</th>
                <th scope="col">Deadline</th>
                <th scope="col">Penalty</th>
                <th scope="col" className="text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const pen = penaltyText(e);
                return (
                  <tr key={e._id} className="cursor-pointer" onClick={() => setSelected(e)}>
                    <td className="max-w-[240px]">
                      <span className="block font-mono text-xs font-semibold text-navy-800">{e.request?.requestNumber || "—"}</span>
                      <span className="block break-words text-sm text-navy-900">{e.request?.serviceName}</span>
                    </td>
                    <td className="max-w-[220px]">
                      <span className="block break-words font-medium text-navy-900">{e.writer?.name || "—"}</span>
                      {e.writer?.institution && <span className="block truncate text-xs text-slate-500">{e.writer.institution}</span>}
                    </td>
                    <td>
                      <StageBadge stage={e.stage} className="text-[11px]" />
                      {e.stage === "APPROVED" && e.payout && (
                        <span className={`ml-1 text-[11px] ${e.payout.status === "PAID" ? "badge-success" : "badge-neutral"}`}>
                          {e.payout.status === "PAID" ? "Paid" : "Unpaid"}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-sm">{feeText(e)}</td>
                    <td className="whitespace-nowrap">{deadlineCell(e)}</td>
                    <td className="whitespace-nowrap text-xs font-medium text-red-700">{pen || <span className="text-slate-400">—</span>}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelected(e);
                        }}
                        aria-label={`Open assignment for ${e.request?.requestNumber || "request"} with ${e.writer?.name || "writer"}`}
                      >
                        {e.stage === "SUBMITTED" && isAdmin ? "Review" : "Open"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataState>

      {selected && (
        <EngagementModal
          key={selected._id}
          engagementId={selected._id}
          initial={selected}
          isAdmin={isAdmin}
          notify={notify}
          onClose={() => setSelected(null)}
          onOpenRequest={onOpenRequest ? openRequest : undefined}
        />
      )}
    </div>
  );
};
