import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2 } from "lucide-react";
import {
  createAdminCategory,
  createAdminDomain,
  deleteAdminCategory,
  deleteAdminDomain,
  getAdminCategories,
  getAdminDomains,
  updateAdminCategory,
  updateAdminDomain,
} from "../../api";
import { Category, Domain } from "../../api/types";
import { Field, Modal, Spinner } from "../ui";
import {
  ActiveBadge,
  CheckboxField,
  DataState,
  invalidatePublic,
  MultiSelect,
  Notify,
  notifyError,
  ReadOnlyNotice,
  SectionHeader,
  slugify,
  toIdList,
} from "./shared";

type Kind = "domain" | "category";

interface TaxonomyItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  domainIds?: Category["domainIds"];
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
  domainIds: string[];
}

const CONFIG = {
  domain: {
    noun: "discipline",
    title: "Disciplines",
    description: "Top-level subject areas used to organise services, for example Engineering or Patents & Intellectual Property.",
    queryKey: "admin-domains",
    list: getAdminDomains as () => Promise<TaxonomyItem[]>,
    create: createAdminDomain,
    update: updateAdminDomain,
    remove: deleteAdminDomain,
  },
  category: {
    noun: "category",
    title: "Categories",
    description: "Service groupings within disciplines, for example Manuscript Writing or Patent Filing.",
    queryKey: "admin-categories",
    list: getAdminCategories as () => Promise<TaxonomyItem[]>,
    create: createAdminCategory,
    update: updateAdminCategory,
    remove: deleteAdminCategory,
  },
} as const;

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TaxonomyFormModal: React.FC<{
  kind: Kind;
  item: TaxonomyItem | null;
  notify: Notify;
  onClose: () => void;
}> = ({ kind, item, notify, onClose }) => {
  const cfg = CONFIG[kind];
  const queryClient = useQueryClient();
  const [slugTouched, setSlugTouched] = useState(Boolean(item));
  const [form, setForm] = useState<FormState>(() => ({
    name: item?.name || "",
    slug: item?.slug || "",
    description: item?.description || "",
    sortOrder: String(item?.sortOrder ?? 0),
    isActive: item ? item.isActive !== false : true,
    domainIds: toIdList(item?.domainIds as (string | { _id: string })[] | undefined),
  }));

  const domainsQuery = useQuery({
    queryKey: ["admin-domains"],
    queryFn: getAdminDomains,
    enabled: kind === "category",
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => (item ? cfg.update(item._id, payload) : cfg.create(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [cfg.queryKey] });
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      invalidatePublic(queryClient);
      notify("success", `${capitalise(cfg.noun)} ${item ? "updated" : "created"}.`);
      onClose();
    },
    onError: notifyError(notify, `The ${cfg.noun} could not be saved.`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    if (kind === "category") payload.domainIds = form.domainIds;
    mutation.mutate(payload);
  };

  return (
    <Modal
      open
      onClose={() => !mutation.isPending && onClose()}
      title={`${item ? "Edit" : "Add"} ${cfg.noun}`}
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button type="submit" form={`${kind}-form`} className="btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="h-3.5 w-3.5" />} Save
          </button>
        </>
      }
    >
      <form id={`${kind}-form`} onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" required>
          {(id) => (
            <input
              id={id}
              required
              className="input"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
              }}
            />
          )}
        </Field>
        <Field label="URL slug" required help="Lowercase letters, numbers and hyphens.">
          {(id, describedBy) => (
            <input
              id={id}
              required
              aria-describedby={describedBy}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              className="input font-mono"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }));
              }}
            />
          )}
        </Field>
        <Field label="Description">
          {(id) => (
            <textarea id={id} rows={3} className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          )}
        </Field>
        {kind === "category" && (
          <MultiSelect
            legend="Disciplines"
            help="The disciplines this category belongs to."
            options={(domainsQuery.data || []).map((d: Domain) => ({ value: d._id, label: d.name }))}
            value={form.domainIds}
            onChange={(domainIds) => setForm((f) => ({ ...f, domainIds }))}
            isLoading={domainsQuery.isLoading}
          />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Sort order" help="Lower numbers appear first.">
            {(id, describedBy) => (
              <input id={id} aria-describedby={describedBy} type="number" className="input" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            )}
          </Field>
          <div className="sm:pt-7">
            <CheckboxField label="Active" checked={form.isActive} onChange={(isActive) => setForm((f) => ({ ...f, isActive }))} />
          </div>
        </div>
      </form>
    </Modal>
  );
};

const TaxonomyTab: React.FC<{ kind: Kind; isAdmin: boolean; notify: Notify }> = ({ kind, isAdmin, notify }) => {
  const cfg = CONFIG[kind];
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TaxonomyItem | null | undefined>(undefined);

  const { data: items = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: [cfg.queryKey],
    queryFn: cfg.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cfg.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [cfg.queryKey] });
      invalidatePublic(queryClient);
      notify("success", `${capitalise(cfg.noun)} deleted.`);
    },
    onError: notifyError(notify, `The ${cfg.noun} could not be deleted.`),
  });

  const domainNames = (item: TaxonomyItem) =>
    (item.domainIds || [])
      .map((d) => (typeof d === "string" ? null : (d as Domain).name))
      .filter(Boolean)
      .join(", ");

  return (
    <div className="space-y-5">
      <SectionHeader
        title={cfg.title}
        description={cfg.description}
        actions={
          isAdmin && (
            <button type="button" className="btn-primary btn-sm" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add {cfg.noun}
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
        isEmpty={items.length === 0}
        emptyTitle={`No ${cfg.noun === "category" ? "categories" : "disciplines"} yet`}
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                {kind === "category" && <th scope="col">Disciplines</th>}
                <th scope="col">Description</th>
                <th scope="col">Status</th>
                {isAdmin && (
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td className="max-w-[240px]">
                    <span className="block break-words font-medium text-navy-900">{item.name}</span>
                    <span className="block break-all font-mono text-xs text-slate-500">{item.slug}</span>
                  </td>
                  {kind === "category" && <td className="max-w-[220px] break-words text-slate-600">{domainNames(item) || "—"}</td>}
                  <td className="max-w-[320px]">
                    <span className="line-clamp-2 text-slate-600">{item.description || "—"}</span>
                  </td>
                  <td>
                    <ActiveBadge active={item.isActive !== false} />
                  </td>
                  {isAdmin && (
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="icon-btn" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)}>
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${item.name}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete the ${cfg.noun} "${item.name}"? This cannot be undone.`)) deleteMutation.mutate(item._id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      {isAdmin && editing !== undefined && (
        <TaxonomyFormModal kind={kind} item={editing} notify={notify} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
};

export const DomainsTab: React.FC<{ isAdmin: boolean; notify: Notify }> = (props) => <TaxonomyTab kind="domain" {...props} />;
export const CategoriesTab: React.FC<{ isAdmin: boolean; notify: Notify }> = (props) => <TaxonomyTab kind="category" {...props} />;
