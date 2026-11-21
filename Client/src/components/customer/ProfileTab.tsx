import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, CheckCircle2, KeyRound, Mail, Phone, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useReferenceData } from "../../hooks/usePublicData";
import { Field, Spinner } from "../ui";

type Navigate = (route: string, params?: Record<string, string | undefined>) => void;

const formatMemberSince = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : undefined;

/** Customer account page: summary card on the left, sectioned form on the right. */
export const ProfileTab: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  const { user, updateProfile } = useAuth();
  const refData = useReferenceData();

  const fromUser = useCallback(
    () => ({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      whatsapp: user?.whatsapp || "",
      academicLevel: user?.academicLevel || "",
      institution: user?.institution || "",
      department: user?.department || "",
    }),
    [user]
  );
  type Form = ReturnType<typeof fromUser>;

  const [form, setForm] = useState<Form>(fromUser);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [nameError, setNameError] = useState("");

  // Sync when the signed-in user record arrives or changes
  useEffect(() => {
    setForm(fromUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?._id]);

  const original = fromUser();
  const dirty = (Object.keys(form) as (keyof Form)[]).some((k) => form[k].trim() !== original[k].trim());

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFeedback(null);
  };

  // Simple completeness indicator encourages customers to fill what our team needs
  const completeness = useMemo(() => {
    const keys: (keyof Form)[] = ["firstName", "lastName", "phone", "whatsapp", "academicLevel", "institution", "department"];
    return Math.round((keys.filter((k) => form[k].trim()).length / keys.length) * 100);
  }, [form]);

  const academicLevels = (refData.data?.academic_levels || []).filter((i) => i.isActive !== false);
  const levelInList = !form.academicLevel || academicLevels.some((l) => l.label === form.academicLevel);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      setNameError("First name is required.");
      return;
    }
    setNameError("");
    setSaving(true);
    setFeedback(null);
    try {
      const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as Form;
      const ok = await updateProfile(trimmed);
      setFeedback(
        ok
          ? { type: "success", text: "Your profile has been saved." }
          : { type: "error", text: "We couldn't save your profile. Please try again." }
      );
    } catch {
      setFeedback({ type: "error", text: "We couldn't save your profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "U";
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const memberSince = formatMemberSince(user?.createdAt);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,52rem)]">
      {/* Summary */}
      <aside className="space-y-4 lg:sticky lg:top-24">
        <div className="card overflow-hidden">
          <div className="h-16 bg-navy-900" aria-hidden="true" />
          <div className="-mt-8 px-5 pb-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-navy-700 text-xl font-semibold text-white">
              {initials}
            </span>
            <p className="mt-3 text-lg font-semibold text-navy-900">{fullName || "Your account"}</p>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {user?.institution && (
                <li className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{user.institution}</span>
                </li>
              )}
              {(user?.whatsapp || user?.phone) && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  {user?.whatsapp || user?.phone}
                </li>
              )}
              {memberSince && (
                <li className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                  Client since {memberSince}
                </li>
              )}
            </ul>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Profile completeness</span>
                <span className="font-semibold text-navy-900">{completeness}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
                <div className="h-full rounded-full bg-navy-700 transition-all" style={{ width: `${completeness}%` }} />
              </div>
              {completeness < 100 && <p className="mt-2 text-xs text-slate-500">A complete profile helps us prepare your documents faster.</p>}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <KeyRound className="h-4 w-4 text-slate-400" /> Sign-in & security
          </p>
          <p className="mt-2 text-sm text-slate-600">To change your email address or password, contact our support team.</p>
          <button type="button" className="link mt-3 text-sm" onClick={() => navigate("contact")}>
            Contact support
          </button>
        </div>
      </aside>

      {/* Form */}
      <form onSubmit={onSubmit} className="card" noValidate>
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-navy-900">Account details</h2>
          <p className="mt-0.5 text-sm text-slate-500">Used to contact you and to prepare documents correctly.</p>
        </div>

        <div className="divide-y divide-slate-100">
          <Section icon={<UserRound className="h-4 w-4" />} title="Personal details">
            <Field label="First name" required error={nameError}>
              {(id, d) => (
                <input
                  id={id}
                  aria-describedby={d}
                  aria-invalid={Boolean(nameError)}
                  className={`input ${nameError ? "input-error" : ""}`}
                  value={form.firstName}
                  onChange={set("firstName")}
                  autoComplete="given-name"
                />
              )}
            </Field>
            <Field label="Last name">
              {(id) => <input id={id} className="input" value={form.lastName} onChange={set("lastName")} autoComplete="family-name" />}
            </Field>
          </Section>

          <Section icon={<Mail className="h-4 w-4" />} title="Contact">
            <Field label="Email" className="sm:col-span-2">
              {(id) => (
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                  <span id={id} className="min-w-0 flex-1 truncate">
                    {user?.email}
                  </span>
                  <span className="badge-success shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> Sign-in email
                  </span>
                </div>
              )}
            </Field>
            <Field label="Phone">
              {(id) => <input id={id} type="tel" className="input" placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} autoComplete="tel" />}
            </Field>
            <Field label="WhatsApp" help={!form.whatsapp && form.phone ? undefined : "Include the country code."}>
              {(id, d) => (
                <>
                  <input id={id} aria-describedby={d} type="tel" className="input" placeholder="+91 98765 43210" value={form.whatsapp} onChange={set("whatsapp")} />
                  {!form.whatsapp && form.phone && (
                    <button type="button" className="link mt-1.5 text-xs" onClick={() => setForm((f) => ({ ...f, whatsapp: f.phone }))}>
                      Same as phone
                    </button>
                  )}
                </>
              )}
            </Field>
          </Section>

          <Section icon={<Building2 className="h-4 w-4" />} title="Academic & institution">
            <Field label="Academic level">
              {(id) => (
                <select id={id} className="input" value={form.academicLevel} onChange={set("academicLevel")}>
                  <option value="">Select…</option>
                  {!levelInList && <option value={form.academicLevel}>{form.academicLevel}</option>}
                  {academicLevels.map((l) => (
                    <option key={l.id} value={l.label}>
                      {l.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Institution / organisation">
              {(id) => <input id={id} className="input" value={form.institution} onChange={set("institution")} autoComplete="organization" />}
            </Field>
            <Field label="Department" className="sm:col-span-2">
              {(id) => <input id={id} className="input" value={form.department} onChange={set("department")} />}
            </Field>
          </Section>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div aria-live="polite" className="text-sm">
            {feedback ? (
              <span className={feedback.type === "success" ? "flex items-center gap-1.5 text-emerald-700" : "text-red-700"}>
                {feedback.type === "success" && <CheckCircle2 className="h-4 w-4" />}
                {feedback.text}
              </span>
            ) : dirty ? (
              <span className="text-slate-500">You have unsaved changes.</span>
            ) : null}
          </div>
          <div className="flex gap-2">
            {dirty && (
              <button type="button" className="btn-secondary" onClick={() => { setForm(fromUser()); setNameError(""); setFeedback(null); }} disabled={saving}>
                Discard
              </button>
            )}
            <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={saving || !dirty}>
              {saving && <Spinner className="h-4 w-4" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <fieldset className="px-5 py-5 sm:px-6">
    <legend className="sr-only">{title}</legend>
    <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-slate-500" aria-hidden="true">
      <span className="text-slate-400">{icon}</span>
      {title}
    </p>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </fieldset>
);
