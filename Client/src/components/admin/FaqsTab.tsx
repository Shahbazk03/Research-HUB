import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2 } from "lucide-react";
import { createAdminFaq, deleteAdminFaq, getAdminFaqs, updateAdminFaq } from "../../api";
import { CmsFaq } from "../../api/types";
import { Field, Modal, Spinner } from "../ui";
import {
  ActiveBadge,
  CheckboxField,
  DataState,
  invalidatePublic,
  Notify,
  notifyError,
  ReadOnlyNotice,
  SectionHeader,
} from "./shared";

const FaqFormModal: React.FC<{ faq: CmsFaq | null; notify: Notify; onClose: () => void }> = ({ faq, notify, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    category: faq?.category || "General",
    question: faq?.question || "",
    answer: faq?.answer || "",
    sortOrder: String(faq?.sortOrder ?? 0),
    isActive: faq ? faq.isActive !== false : true,
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => (faq ? updateAdminFaq(faq._id, payload) : createAdminFaq(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      invalidatePublic(queryClient, ["public-faqs"]);
      notify("success", faq ? "FAQ updated." : "FAQ added.");
      onClose();
    },
    onError: notifyError(notify, "The FAQ could not be saved."),
  });

  return (
    <Modal
      open
      onClose={() => !mutation.isPending && onClose()}
      title={faq ? "Edit FAQ" : "Add FAQ"}
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button type="submit" form="faq-form" className="btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="h-3.5 w-3.5" />} Save FAQ
          </button>
        </>
      }
    >
      <form
        id="faq-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({
            category: form.category.trim() || "General",
            question: form.question.trim(),
            answer: form.answer.trim(),
            sortOrder: Number(form.sortOrder) || 0,
            isActive: form.isActive,
          });
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category">
            {(id) => <input id={id} className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />}
          </Field>
          <Field label="Sort order">
            {(id) => <input id={id} type="number" className="input" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />}
          </Field>
        </div>
        <Field label="Question" required>
          {(id) => <input id={id} required className="input" value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />}
        </Field>
        <Field label="Answer" required>
          {(id) => <textarea id={id} required rows={5} className="input" value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} />}
        </Field>
        <CheckboxField label="Published" description="Visible on the public FAQ page." checked={form.isActive} onChange={(isActive) => setForm((f) => ({ ...f, isActive }))} />
      </form>
    </Modal>
  );
};

export const FaqsTab: React.FC<{ isAdmin: boolean; notify: Notify }> = ({ isAdmin, notify }) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CmsFaq | null | undefined>(undefined);
  const { data: faqs = [], isLoading, isError, error, refetch } = useQuery({ queryKey: ["admin-faqs"], queryFn: getAdminFaqs });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      invalidatePublic(queryClient, ["public-faqs"]);
      notify("success", "FAQ deleted.");
    },
    onError: notifyError(notify, "The FAQ could not be deleted."),
  });

  return (
    <div className="space-y-5">
      <SectionHeader
        title="FAQs"
        description="Questions and answers shown on the public FAQ page."
        actions={
          isAdmin && (
            <button type="button" className="btn-primary btn-sm" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add FAQ
            </button>
          )
        }
      />
      {!isAdmin && <ReadOnlyNotice />}

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        isEmpty={faqs.length === 0}
        emptyTitle="No FAQs yet"
      >
        <ul className="space-y-3">
          {faqs.map((faq) => (
            <li key={faq._id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-navy">{faq.category}</span>
                  {faq.isActive === false && <ActiveBadge active={false} />}
                </div>
                <h3 className="break-words text-sm font-semibold text-navy-900">{faq.question}</h3>
                <p className="whitespace-pre-line break-words text-sm text-slate-600">{faq.answer}</p>
              </div>
              {isAdmin && (
                <div className="flex shrink-0 gap-1 self-end sm:self-start">
                  <button type="button" className="icon-btn" aria-label={`Edit FAQ: ${faq.question}`} onClick={() => setEditing(faq)}>
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn hover:bg-red-50 hover:text-red-700"
                    aria-label={`Delete FAQ: ${faq.question}`}
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this FAQ? This cannot be undone.")) deleteMutation.mutate(faq._id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </DataState>

      {isAdmin && editing !== undefined && <FaqFormModal faq={editing} notify={notify} onClose={() => setEditing(undefined)} />}
    </div>
  );
};
