import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Trash2 } from "lucide-react";
import {
  createAdminReferralCode,
  deleteAdminReferralCode,
  getAdminReferralCodes,
  updateAdminReferralCode,
} from "../../api";
import { formatCurrencyAmount, ReferralCode } from "../../api/types";
import { Field, Spinner } from "../ui";
import { ActiveBadge, CheckboxField, DataState, Notify, notifyError, SectionHeader } from "./shared";

const EMPTY = { referrerName: "", code: "", discountAmount: "", notes: "", isActive: true };

export const ReferralsTab: React.FC<{ notify: Notify }> = ({ notify }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: codes = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: getAdminReferralCodes,
  });

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: { referrerName: string; code: string; discountAmount: number; notes: string; isActive: boolean }) =>
      editingId ? updateAdminReferralCode(editingId, payload) : createAdminReferralCode(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      notify("success", editingId ? "Referral code updated." : "Referral code created.");
      reset();
    },
    onError: notifyError(notify, "The referral code could not be saved."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminReferralCode(id),
    onSuccess: (_d, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      if (id === editingId) reset();
      notify("success", "Referral code deleted.");
    },
    onError: notifyError(notify, "The referral code could not be deleted."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const discount = Number(form.discountAmount);
    if (!Number.isFinite(discount) || discount <= 0) {
      notify("error", "Discount amount must be greater than zero.");
      return;
    }
    saveMutation.mutate({
      referrerName: form.referrerName.trim(),
      code: form.code.trim().toUpperCase(),
      discountAmount: discount,
      notes: form.notes.trim(),
      isActive: form.isActive,
    });
  };

  const activeCount = codes.filter((c) => c.isActive).length;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Referral codes"
        description="Discount codes customers can apply when paying a quotation."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active codes</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-navy-900">{activeCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total codes</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-navy-900">{codes.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <form onSubmit={handleSubmit} className="card card-pad h-fit space-y-4" aria-labelledby="referral-form-title">
          <div className="flex items-center justify-between gap-2">
            <h3 id="referral-form-title" className="h-card text-base">
              {editingId ? "Edit referral code" : "New referral code"}
            </h3>
            {editingId && (
              <button type="button" className="btn-ghost btn-sm" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
          <Field label="Referrer name" required>
            {(id) => (
              <input id={id} required className="input" value={form.referrerName} onChange={(e) => setForm((f) => ({ ...f, referrerName: e.target.value }))} />
            )}
          </Field>
          <Field label="Code" required help="Letters and numbers, shown in upper case.">
            {(id, describedBy) => (
              <input
                id={id}
                required
                aria-describedby={describedBy}
                className="input font-mono uppercase"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, "") }))}
              />
            )}
          </Field>
          <Field label="Discount amount (INR)" required>
            {(id) => (
              <input
                id={id}
                required
                type="number"
                min="1"
                step="any"
                className="input"
                value={form.discountAmount}
                onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))}
              />
            )}
          </Field>
          <Field label="Internal notes">
            {(id) => <textarea id={id} rows={2} className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />}
          </Field>
          <CheckboxField label="Active" description="Customers can apply this code." checked={form.isActive} onChange={(isActive) => setForm((f) => ({ ...f, isActive }))} />
          <button type="submit" className="btn-primary w-full" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Spinner className="h-4 w-4" />}
            {editingId ? "Update code" : "Create code"}
          </button>
        </form>

        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={() => refetch()}
          isEmpty={codes.length === 0}
          emptyTitle="No referral codes yet"
          emptyMessage="Create a code using the form."
        >
          <div className="table-wrap h-fit">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Referrer</th>
                  <th scope="col">Discount</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {codes.map((item: ReferralCode) => (
                  <tr key={item._id} className={item._id === editingId ? "bg-navy-50/60" : undefined}>
                    <td className="font-mono text-xs font-semibold text-navy-800">{item.code}</td>
                    <td className="max-w-[220px]">
                      <span className="block break-words text-navy-900">{item.referrerName}</span>
                      {item.notes && <span className="block break-words text-xs text-slate-500">{item.notes}</span>}
                    </td>
                    <td className="whitespace-nowrap">{formatCurrencyAmount(item.discountAmount, "INR")}</td>
                    <td>
                      <ActiveBadge active={item.isActive} />
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Edit referral code ${item.code}`}
                          onClick={() => {
                            setEditingId(item._id);
                            setForm({
                              referrerName: item.referrerName,
                              code: item.code,
                              discountAmount: String(item.discountAmount ?? ""),
                              notes: item.notes || "",
                              isActive: Boolean(item.isActive),
                            });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete referral code ${item.code}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete referral code ${item.code}? Customers will no longer be able to use it.`)) {
                              deleteMutation.mutate(item._id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataState>
      </div>
    </div>
  );
};
