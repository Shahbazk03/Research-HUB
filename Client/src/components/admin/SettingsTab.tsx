import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminSettings, getErrorMessage, updateAdminSettings } from "../../api";
import { SiteSetting } from "../../api/types";
import { ErrorState, Field, Spinner } from "../ui";
import { CheckboxField, invalidatePublic, Notify, notifyError, SectionHeader } from "./shared";

type SettingsForm = Omit<SiteSetting, "enableQuotations"> & { enableQuotations: boolean };

const toForm = (s?: Partial<SiteSetting>): SettingsForm => ({
  platformName: s?.platformName || "",
  tagline: s?.tagline || "",
  description: s?.description || "",
  whatsappNumber: s?.whatsappNumber || "",
  whatsappDefaultMessageTemplate: s?.whatsappDefaultMessageTemplate || "",
  supportEmail: s?.supportEmail || "",
  supportPhone: s?.supportPhone || "",
  businessHours: s?.businessHours || "",
  disclaimer: s?.disclaimer || "",
  academicIntegrityPolicy: s?.academicIntegrityPolicy || "",
  enableQuotations: s?.enableQuotations !== false,
});

const phoneFromWhatsapp = (digits: string) =>
  digits.startsWith("91") && digits.length === 12 ? `+91 ${digits.slice(2)}` : `+${digits}`;

export const SettingsTab: React.FC<{ notify: Notify }> = ({ notify }) => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getAdminSettings,
  });
  const [form, setForm] = useState<SettingsForm>(toForm());
  const loaded = useRef(false);

  // Populate once when settings first arrive; background refetches must not wipe edits.
  useEffect(() => {
    if (data && !loaded.current) {
      loaded.current = true;
      setForm(toForm(data));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: SettingsForm) => updateAdminSettings(payload),
    onSuccess: (saved) => {
      setForm(toForm(saved));
      queryClient.setQueryData(["admin-settings"], saved);
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      invalidatePublic(queryClient, ["public-settings"]);
      notify("success", "Settings saved.");
    },
    onError: notifyError(notify, "Settings could not be saved."),
  });

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  if (isLoading) {
    return (
      <div className="space-y-5">
        <SectionHeader title="Settings" />
        <div className="skeleton h-96" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="space-y-5">
        <SectionHeader title="Settings" />
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      </div>
    );
  }

  const waDigits = form.whatsappNumber.replace(/[^0-9]/g, "");

  return (
    <div className="space-y-5">
      <SectionHeader title="Settings" description="Company details and contact information shown across the public website." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ ...form, whatsappNumber: waDigits });
        }}
        className="space-y-5"
      >
        <section className="card card-pad space-y-4" aria-labelledby="settings-brand">
          <h3 id="settings-brand" className="h-card text-base">
            Organisation
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Platform name" required>
              {(id) => <input id={id} required className="input" value={form.platformName} onChange={(e) => set("platformName", e.target.value)} />}
            </Field>
            <Field label="Tagline">
              {(id) => <input id={id} className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />}
            </Field>
          </div>
          <Field label="Description">
            {(id) => <textarea id={id} rows={3} className="input" value={form.description || ""} onChange={(e) => set("description", e.target.value)} />}
          </Field>
        </section>

        <section className="card card-pad space-y-4" aria-labelledby="settings-contact">
          <h3 id="settings-contact" className="h-card text-base">
            Contact details
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="WhatsApp business number" required help="Digits only including country code, e.g. 919876543210.">
              {(id, describedBy) => (
                <input
                  id={id}
                  required
                  inputMode="numeric"
                  aria-describedby={describedBy}
                  className="input"
                  value={form.whatsappNumber}
                  onChange={(e) => set("whatsappNumber", e.target.value)}
                />
              )}
            </Field>
            <Field label="Support phone" help="Shown in the website footer and contact page.">
              {(id, describedBy) => (
                <div>
                  <input
                    id={id}
                    aria-describedby={describedBy}
                    type="tel"
                    className="input"
                    value={form.supportPhone}
                    onChange={(e) => set("supportPhone", e.target.value)}
                  />
                  {waDigits && form.supportPhone !== phoneFromWhatsapp(waDigits) && (
                    <button type="button" className="link mt-1.5 text-xs" onClick={() => set("supportPhone", phoneFromWhatsapp(waDigits))}>
                      Use WhatsApp number ({phoneFromWhatsapp(waDigits)})
                    </button>
                  )}
                </div>
              )}
            </Field>
            <Field label="Support email" required>
              {(id) => <input id={id} type="email" required className="input" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />}
            </Field>
            <Field label="Business hours">
              {(id) => <input id={id} className="input" value={form.businessHours} onChange={(e) => set("businessHours", e.target.value)} />}
            </Field>
          </div>
          <Field label="WhatsApp message template" help="Placeholders: {requestNumber}, {serviceName}.">
            {(id, describedBy) => (
              <textarea
                id={id}
                aria-describedby={describedBy}
                rows={2}
                className="input font-mono"
                value={form.whatsappDefaultMessageTemplate}
                onChange={(e) => set("whatsappDefaultMessageTemplate", e.target.value)}
              />
            )}
          </Field>
        </section>

        <section className="card card-pad space-y-4" aria-labelledby="settings-policy">
          <h3 id="settings-policy" className="h-card text-base">
            Policies
          </h3>
          <Field label="Disclaimer">
            {(id) => <textarea id={id} rows={3} className="input" value={form.disclaimer} onChange={(e) => set("disclaimer", e.target.value)} />}
          </Field>
          <Field label="Academic integrity policy">
            {(id) => (
              <textarea id={id} rows={4} className="input" value={form.academicIntegrityPolicy} onChange={(e) => set("academicIntegrityPolicy", e.target.value)} />
            )}
          </Field>
          <CheckboxField
            label="Enable quotations"
            description="Allow the team to issue quotations to customers."
            checked={form.enableQuotations}
            onChange={(v) => set("enableQuotations", v)}
          />
        </section>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="h-4 w-4" />} Save settings
          </button>
        </div>
      </form>
    </div>
  );
};
