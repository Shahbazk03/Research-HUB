import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { getErrorMessage } from "../../api";
import { Engagement, formatMoney, getMyEngagements, getWriterEarnings } from "../../api/writers";
import { EmptyState, ErrorState } from "../ui";
import { formatDate, isNotApprovedError, serviceName, writerRetry } from "./writerHelpers";

const Tile: React.FC<{ label: string; value: string; loading: boolean; hint?: string; emphasis?: boolean }> = ({ label, value, loading, hint, emphasis }) => (
  <div className={`card px-4 py-4 sm:px-5 ${emphasis ? "border-l-4 border-l-accent-500" : ""}`}>
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    {loading ? (
      <div className="skeleton mt-2 h-7 w-20" aria-hidden="true" />
    ) : (
      <p className="mt-1 break-words font-serif text-xl font-semibold text-navy-900 sm:text-2xl">{value}</p>
    )}
    {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
  </div>
);

const rowFigures = (e: Engagement) => {
  const fee = e.offer?.fee ?? 0;
  const penalty = e.payout?.penaltyAmount ?? e.penalty?.penaltyAmount ?? 0;
  const payable = e.payout?.payableAmount ?? e.penalty?.payableAmount ?? fee;
  const paid = e.payout?.status === "PAID";
  return { fee, penalty, payable, paid, currency: e.offer?.currency };
};

const PaidBadge: React.FC<{ e: Engagement }> = ({ e }) =>
  e.payout?.status === "PAID" ? (
    <span className="badge-success">Paid{e.payout.paidAt ? ` ${formatDate(e.payout.paidAt)}` : ""}</span>
  ) : (
    <span className="badge-warning">Pending</span>
  );

export const EarningsTab: React.FC<{ onOpenEngagement: (id: string) => void; notApproved: (message?: string) => React.ReactNode }> = ({
  onOpenEngagement,
  notApproved,
}) => {
  const earnings = useQuery({ queryKey: ["writer-earnings"], queryFn: getWriterEarnings, retry: writerRetry });
  const engagements = useQuery({ queryKey: ["writer-engagements"], queryFn: getMyEngagements, retry: writerRetry });

  const blocked = [earnings.error, engagements.error].find(isNotApprovedError);
  if (blocked) return <>{notApproved(getErrorMessage(blocked))}</>;

  const data = earnings.data;
  const approved = (engagements.data || [])
    .filter((e) => e.stage === "APPROVED")
    .sort((a, b) => new Date(b.approvedAt || b.updatedAt).getTime() - new Date(a.approvedAt || a.updatedAt).getTime());
  const loading = earnings.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy-900">Earnings</h2>
        <p className="muted mt-0.5">Fees for approved work, after any late-delivery penalty.</p>
      </div>

      {earnings.isError ? (
        <ErrorState title="We couldn't load your earnings" message={getErrorMessage(earnings.error)} onRetry={() => earnings.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <Tile label="In progress" value={formatMoney(data?.inProgressValue ?? 0)} loading={loading} hint="Accepted, not yet approved" />
          <Tile label="Approved" value={formatMoney(data?.approvedValue ?? 0)} loading={loading} hint="Payable for approved work" emphasis />
          <Tile label="Paid" value={formatMoney(data?.paid ?? 0)} loading={loading} />
          <Tile label="Penalties" value={formatMoney(data?.penalties ?? 0)} loading={loading} hint="Deducted for late delivery" />
          <Tile label="Completed" value={String(data?.completedCount ?? 0)} loading={loading} hint="Approved projects" />
        </div>
      )}

      <div className="alert-info">
        <Wallet className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Payouts are handled by the Research Hub team after your work is approved. Penalties apply only when work is delivered after the agreed
          deadline, as set out in each offer.
        </p>
      </div>

      <section aria-labelledby="earnings-approved">
        <h3 id="earnings-approved" className="mb-3 text-sm font-semibold uppercase tracking-[0.05em] text-slate-600">
          Approved work
        </h3>
        {engagements.isLoading ? (
          <div className="space-y-2" role="status" aria-label="Loading approved work">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full" />
            ))}
          </div>
        ) : engagements.isError ? (
          <ErrorState title="We couldn't load your projects" message={getErrorMessage(engagements.error)} onRetry={() => engagements.refetch()} />
        ) : approved.length === 0 ? (
          <EmptyState icon={<Wallet className="h-5 w-5" />} title="No approved work yet" message="Projects appear here once our team approves your submission." />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Project</th>
                    <th scope="col">Approved</th>
                    <th scope="col" className="text-right">Fee</th>
                    <th scope="col" className="text-right">Penalty</th>
                    <th scope="col" className="text-right">Payable</th>
                    <th scope="col">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {approved.map((e) => {
                    const f = rowFigures(e);
                    return (
                      <tr key={e._id} className="cursor-pointer" onClick={() => onOpenEngagement(e._id)}>
                        <td className="max-w-[280px]">
                          <button type="button" className="block max-w-full truncate text-left font-medium text-navy-900 hover:underline" onClick={(ev) => { ev.stopPropagation(); onOpenEngagement(e._id); }}>
                            {serviceName(e)}
                          </button>
                          <p className="font-mono text-xs text-slate-500">{e.brief?.requestNumber}</p>
                        </td>
                        <td className="whitespace-nowrap">{formatDate(e.approvedAt || e.updatedAt)}</td>
                        <td className="whitespace-nowrap text-right">{formatMoney(f.fee, f.currency)}</td>
                        <td className={`whitespace-nowrap text-right ${f.penalty ? "text-red-700" : ""}`}>{f.penalty ? `− ${formatMoney(f.penalty, f.currency)}` : "—"}</td>
                        <td className="whitespace-nowrap text-right font-semibold text-navy-900">{formatMoney(f.payable, f.currency)}</td>
                        <td>
                          <PaidBadge e={e} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {approved.map((e) => {
                const f = rowFigures(e);
                return (
                  <li key={e._id}>
                    <button type="button" className="card block w-full p-4 text-left" onClick={() => onOpenEngagement(e._id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-navy-900">{serviceName(e)}</p>
                          <p className="font-mono text-xs text-slate-500">{e.brief?.requestNumber}</p>
                        </div>
                        <PaidBadge e={e} />
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <dt className="text-xs text-slate-500">Fee</dt>
                          <dd>{formatMoney(f.fee, f.currency)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Penalty</dt>
                          <dd className={f.penalty ? "text-red-700" : ""}>{f.penalty ? formatMoney(f.penalty, f.currency) : "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Payable</dt>
                          <dd className="font-semibold text-navy-900">{formatMoney(f.payable, f.currency)}</dd>
                        </div>
                      </dl>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
};
