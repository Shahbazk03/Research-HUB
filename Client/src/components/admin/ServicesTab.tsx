import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import {
  createAdminService,
  deleteAdminService,
  getAdminCategories,
  getAdminDomains,
  getAdminServices,
  updateAdminService,
} from "../../api";
import { formatServicePrice, PricingModel, Service } from "../../api/types";
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
  useDebouncedValue,
} from "./shared";

const PRICING_LABELS: Record<PricingModel, string> = {
  CUSTOM_QUOTE: "Custom quotation",
  FIXED: "Fixed price",
  RANGE: "Price range",
  CONTACT_FOR_PRICE: "Contact for price",
};

interface ServiceFormState {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  pricingModel: PricingModel;
  currency: string;
  priceAmount: string;
  priceRangeMin: string;
  priceRangeMax: string;
  turnaroundTime: string;
  deliverables: string;
  idealFor: string;
  sortOrder: string;
  isFeatured: boolean;
  isActive: boolean;
  domainIds: string[];
  categoryIds: string[];
}

const emptyForm = (): ServiceFormState => ({
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  pricingModel: "CUSTOM_QUOTE",
  currency: "INR",
  priceAmount: "",
  priceRangeMin: "",
  priceRangeMax: "",
  turnaroundTime: "",
  deliverables: "",
  idealFor: "",
  sortOrder: "0",
  isFeatured: false,
  isActive: true,
  domainIds: [],
  categoryIds: [],
});

const formFromService = (s: Service): ServiceFormState => ({
  name: s.name || "",
  slug: s.slug || "",
  shortDescription: s.shortDescription || "",
  description: s.description || "",
  pricingModel: s.pricingModel || "CUSTOM_QUOTE",
  currency: s.currency || s.priceRange?.currency || "INR",
  priceAmount: s.priceAmount != null ? String(s.priceAmount) : "",
  priceRangeMin: s.priceRange?.min != null ? String(s.priceRange.min) : "",
  priceRangeMax: s.priceRange?.max != null ? String(s.priceRange.max) : "",
  turnaroundTime: s.turnaroundTime || "",
  deliverables: (s.deliverables || []).join("\n"),
  idealFor: (s.idealFor || []).join("\n"),
  sortOrder: String(s.sortOrder ?? 0),
  isFeatured: Boolean(s.isFeatured),
  isActive: s.isActive !== false,
  domainIds: toIdList(s.domainIds as (string | { _id: string })[]),
  categoryIds: toIdList(s.categoryIds as (string | { _id: string })[]),
});

const lines = (value: string) =>
  value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);

const ServiceFormModal: React.FC<{
  service: Service | null;
  notify: Notify;
  onClose: () => void;
}> = ({ service, notify, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ServiceFormState>(() => (service ? formFromService(service) : emptyForm()));
  const [slugTouched, setSlugTouched] = useState(Boolean(service));
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const domainsQuery = useQuery({ queryKey: ["admin-domains"], queryFn: getAdminDomains });
  const categoriesQuery = useQuery({ queryKey: ["admin-categories"], queryFn: getAdminCategories });

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      service ? updateAdminService(service._id, payload) : createAdminService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      invalidatePublic(queryClient);
      notify("success", service ? "Service updated." : "Service created.");
      onClose();
    },
    onError: notifyError(notify, "The service could not be saved."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      pricingModel: form.pricingModel,
      currency: form.currency,
      turnaroundTime: form.turnaroundTime.trim(),
      deliverables: lines(form.deliverables),
      idealFor: lines(form.idealFor),
      sortOrder: Number(form.sortOrder) || 0,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      domainIds: form.domainIds,
      categoryIds: form.categoryIds,
    };

    if (form.pricingModel === "FIXED") {
      const amount = Number(form.priceAmount);
      if (!form.priceAmount || !Number.isFinite(amount) || amount <= 0) {
        setError("Enter a fixed price greater than zero.");
        return;
      }
      payload.priceAmount = amount;
    } else if (form.pricingModel === "RANGE") {
      const min = Number(form.priceRangeMin);
      const max = Number(form.priceRangeMax);
      if (!form.priceRangeMin || !form.priceRangeMax || !(min >= 0) || !(max > 0) || min > max) {
        setError("Enter a valid price range where the minimum is not greater than the maximum.");
        return;
      }
      payload.priceRange = { min, max, currency: form.currency };
    }

    saveMutation.mutate(payload);
  };

  const domainOptions = (domainsQuery.data || []).map((d) => ({ value: d._id, label: d.name }));
  const categoryOptions = (categoriesQuery.data || []).map((c) => ({ value: c._id, label: c.name }));

  return (
    <Modal
      open
      onClose={() => !saveMutation.isPending && onClose()}
      size="lg"
      title={service ? "Edit service" : "Add service"}
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={saveMutation.isPending}>
            Cancel
          </button>
          <button type="submit" form="service-form" className="btn-primary btn-sm" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Spinner className="h-3.5 w-3.5" />} Save service
          </button>
        </>
      }
    >
      <form id="service-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Service name" required>
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
                  set("slug", e.target.value.toLowerCase());
                }}
              />
            )}
          </Field>
        </div>

        <Field label="Short description" help="One or two sentences shown on service cards.">
          {(id, describedBy) => (
            <textarea
              id={id}
              aria-describedby={describedBy}
              rows={2}
              maxLength={300}
              className="input"
              value={form.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
            />
          )}
        </Field>

        <Field label="Full description">
          {(id) => (
            <textarea id={id} rows={5} className="input" value={form.description} onChange={(e) => set("description", e.target.value)} />
          )}
        </Field>

        <fieldset className="panel-muted space-y-4 p-4">
          <legend className="px-1 text-sm font-semibold text-navy-900">Pricing</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pricing model" required>
              {(id) => (
                <select
                  id={id}
                  className="input"
                  value={form.pricingModel}
                  onChange={(e) => set("pricingModel", e.target.value as PricingModel)}
                >
                  {(Object.keys(PRICING_LABELS) as PricingModel[]).map((p) => (
                    <option key={p} value={p}>
                      {PRICING_LABELS[p]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Currency" required>
              {(id) => (
                <select id={id} className="input" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                  <option value="INR">INR — Indian rupee</option>
                  <option value="USD">USD — US dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British pound</option>
                </select>
              )}
            </Field>
          </div>
          {form.pricingModel === "FIXED" && (
            <Field label={`Price (${form.currency})`} required>
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min="1"
                  step="any"
                  required
                  className="input"
                  value={form.priceAmount}
                  onChange={(e) => set("priceAmount", e.target.value)}
                />
              )}
            </Field>
          )}
          {form.pricingModel === "RANGE" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label={`Minimum (${form.currency})`} required>
                {(id) => (
                  <input id={id} type="number" min="0" step="any" required className="input" value={form.priceRangeMin} onChange={(e) => set("priceRangeMin", e.target.value)} />
                )}
              </Field>
              <Field label={`Maximum (${form.currency})`} required>
                {(id) => (
                  <input id={id} type="number" min="0" step="any" required className="input" value={form.priceRangeMax} onChange={(e) => set("priceRangeMax", e.target.value)} />
                )}
              </Field>
            </div>
          )}
          {(form.pricingModel === "CUSTOM_QUOTE" || form.pricingModel === "CONTACT_FOR_PRICE") && (
            <p className="muted">
              {form.pricingModel === "CUSTOM_QUOTE"
                ? "Shown as “Custom quotation”. Customers describe their scope and receive a quotation from the team."
                : "Shown as “Contact for price”. Customers are directed to contact the team."}
            </p>
          )}
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Turnaround time" help="e.g. 7–14 business days">
            {(id, describedBy) => (
              <input id={id} aria-describedby={describedBy} className="input" value={form.turnaroundTime} onChange={(e) => set("turnaroundTime", e.target.value)} />
            )}
          </Field>
          <Field label="Sort order" help="Lower numbers appear first.">
            {(id, describedBy) => (
              <input id={id} aria-describedby={describedBy} type="number" className="input" value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
            )}
          </Field>
          <Field label="Deliverables" help="One per line.">
            {(id, describedBy) => (
              <textarea id={id} aria-describedby={describedBy} rows={4} className="input" value={form.deliverables} onChange={(e) => set("deliverables", e.target.value)} />
            )}
          </Field>
          <Field label="Ideal for" help="One audience per line, e.g. PhD scholars.">
            {(id, describedBy) => (
              <textarea id={id} aria-describedby={describedBy} rows={4} className="input" value={form.idealFor} onChange={(e) => set("idealFor", e.target.value)} />
            )}
          </Field>
        </div>

        <MultiSelect
          legend="Disciplines"
          options={domainOptions}
          value={form.domainIds}
          onChange={(v) => set("domainIds", v)}
          isLoading={domainsQuery.isLoading}
        />
        <MultiSelect
          legend="Categories"
          options={categoryOptions}
          value={form.categoryIds}
          onChange={(v) => set("categoryIds", v)}
          isLoading={categoriesQuery.isLoading}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckboxField label="Active" description="Visible to customers on the public site." checked={form.isActive} onChange={(v) => set("isActive", v)} />
          <CheckboxField label="Featured" description="Highlighted on the home page." checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} />
        </div>
      </form>
    </Modal>
  );
};

export const ServicesTab: React.FC<{ isAdmin: boolean; notify: Notify }> = ({ isAdmin, notify }) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Service | null | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 300);

  const { data: services = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-services"],
    queryFn: getAdminServices,
  });

  const filtered = useMemo(
    () =>
      search
        ? services.filter((s) => `${s.name} ${s.slug} ${s.shortDescription || ""}`.toLowerCase().includes(search))
        : services,
    [services, search]
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      invalidatePublic(queryClient);
      notify("success", "Service deleted.");
    },
    onError: notifyError(notify, "The service could not be deleted."),
  });

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Services"
        description="The service catalogue shown to customers."
        actions={
          isAdmin && (
            <button type="button" className="btn-primary btn-sm" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add service
            </button>
          )
        }
      />
      {!isAdmin && <ReadOnlyNotice />}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search services"
          placeholder="Search services"
          className="input pl-9"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        isEmpty={filtered.length === 0}
        emptyTitle={search ? "No matching services" : "No services yet"}
        emptyMessage={search ? "Try a different search term." : isAdmin ? "Add your first service to publish it on the site." : undefined}
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Pricing</th>
                <th scope="col">Turnaround</th>
                <th scope="col">Status</th>
                {isAdmin && (
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id}>
                  <td className="max-w-[320px]">
                    <span className="block break-words font-medium text-navy-900">{s.name}</span>
                    {s.shortDescription && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{s.shortDescription}</span>}
                  </td>
                  <td>
                    <span className="block whitespace-nowrap font-medium text-navy-900">{formatServicePrice(s)}</span>
                    <span className="block text-xs text-slate-500">{PRICING_LABELS[s.pricingModel] || s.pricingModel}</span>
                  </td>
                  <td className="text-slate-600">{s.turnaroundTime || "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <ActiveBadge active={s.isActive !== false} />
                      {s.isFeatured && <span className="badge-accent">Featured</span>}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="icon-btn" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}>
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${s.name}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete the service "${s.name}"? This cannot be undone.`)) deleteMutation.mutate(s._id);
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
        <ServiceFormModal service={editing} notify={notify} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
};
