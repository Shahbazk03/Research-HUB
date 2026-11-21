import React, { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, Globe, KeyRound, RefreshCw, Search, UserPlus, X } from "lucide-react";
import { getAdminRequests, getErrorMessage } from "../../api";
import { safeHref, ServiceRequest } from "../../api/types";
import {
  adminCreateWriter,
  adminExtractWriterCv,
  adminGetWriter,
  adminListWriters,
  adminUpdateWriter,
  Engagement,
  formatMoney,
  WriterAccount,
  WriterApplicationStatus,
} from "../../api/writers";
import { pathFor } from "../../router";
import { ACADEMIC_DESIGNATIONS, ComboInput } from "../ComboInput";
import { Field, Spinner } from "../ui";
import { DataState, formatDate, Notify, ReadOnlyNotice, SafeLink, SectionHeader, useDebouncedValue } from "./shared";
import { EngagementModal } from "./EngagementModal";
import {
  APP_STATUS_LABELS,
  AppStatusBadge,
  copyToClipboard,
  Detail,
  ExpertiseChips,
  generatePassword,
  invalidateWriterData,
  isOnWebsite,
  onFormSubmit,
  orcidHref,
  Panel,
  StackedModal,
  StageBadge,
  TagInput,
  writerDisplayName,
  writersKey,
} from "./writerShared";

type StatusChip = WriterApplicationStatus | "";

const STATUS_CHIPS: { id: StatusChip; label: string }[] = [
  { id: "PENDING", label: "Pending applications" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "SUSPENDED", label: "Suspended" },
  { id: "", label: "All" },
];

const STATUS_ORDER: Record<WriterApplicationStatus, number> = { PENDING: 0, APPROVED: 1, SUSPENDED: 2, REJECTED: 3 };

const initials = (w: WriterAccount) => `${w.firstName?.[0] || ""}${w.lastName?.[0] || ""}`.toUpperCase() || "W";

const Avatar: React.FC<{ writer: WriterAccount; size?: "sm" | "lg" }> = ({ writer, size = "sm" }) => {
  const src = safeHref(writer.writerProfile?.photoUrl);
  const dim = size === "lg" ? "h-20 w-20 text-xl" : "h-9 w-9 text-xs";
  return src ? (
    <img src={src} alt="" className={`${dim} shrink-0 rounded-full border border-slate-200 object-cover`} />
  ) : (
    <span className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-navy-100 font-semibold text-navy-700`} aria-hidden="true">
      {initials(writer)}
    </span>
  );
};

const WebsiteIndicator: React.FC<{ writer: WriterAccount }> = ({ writer }) =>
  isOnWebsite(writer) ? (
    <span className="badge-navy text-[11px]">
      <Globe className="h-3 w-3" aria-hidden="true" /> On website
    </span>
  ) : null;

/* -------------------------------------------------------------------------- */
/* Create writer login                                                        */
/* -------------------------------------------------------------------------- */

const CreateWriterModal: React.FC<{ notify: Notify; onClose: () => void }> = ({ notify, onClose }) => {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [showPassword, setShowPassword] = useState(true);
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string; name: string } | null>(null);

  const errors = {
    firstName: !firstName.trim() ? "First name is required." : undefined,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "Enter a valid email address." : undefined,
    password: password.length < 10 ? "Use at least 10 characters." : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const mutation = useMutation({
    mutationFn: () =>
      adminCreateWriter({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        institution: institution.trim() || undefined,
        department: department.trim() || undefined,
        writerProfile: { designation: designation.trim() || undefined, expertise },
      }),
    onSuccess: (res) => {
      invalidateWriterData(queryClient);
      setCreated({ email: res?.email || email.trim().toLowerCase(), password, name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") });
      notify("success", "Writer login created. The account is approved and can take on work.");
    },
    onError: (err) => notify("error", getErrorMessage(err, "The writer account could not be created.")),
  });

  const loginUrl = `${window.location.origin}${pathFor("login")}`;
  const credentialsText = created ? `Research Hub writer login\nSign in: ${loginUrl}\nEmail: ${created.email}\nPassword: ${created.password}` : "";

  const copy = async (text: string, what: string) => {
    const ok = await copyToClipboard(text);
    notify(ok ? "success" : "error", ok ? `${what} copied to the clipboard.` : "Copy failed. Select the text and copy it manually.");
  };

  const submit = () => {
    setSubmitted(true);
    if (!hasErrors) mutation.mutate();
  };

  if (created) {
    return (
      <StackedModal
        onClose={onClose}
        title="Writer login created"
        subtitle={created.name}
        footer={
          <button type="button" className="btn-primary btn-sm" onClick={onClose}>
            Done
          </button>
        }
      >
        <div className="space-y-4">
          <div className="alert-warning" role="note">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              This password is shown only once. Share it with the writer through a secure channel (not a public group) and ask them
              to change it after signing in.
            </p>
          </div>
          <dl className="panel-muted space-y-3 p-4">
            <Detail label="Sign-in page">
              <span className="break-all">{loginUrl}</span>
            </Detail>
            <Detail label="Email">
              <span className="break-all font-mono text-sm">{created.email}</span>
            </Detail>
            <Detail label="Password">
              <span className="flex flex-wrap items-center gap-2">
                <span className="break-all font-mono text-sm">{created.password}</span>
                <button type="button" className="icon-btn h-7 w-7" aria-label="Copy password" onClick={() => copy(created.password, "Password")}>
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </span>
            </Detail>
          </dl>
          <button type="button" className="btn-secondary btn-sm" onClick={() => copy(credentialsText, "Login details")}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy login details
          </button>
        </div>
      </StackedModal>
    );
  }

  return (
    <StackedModal
      onClose={() => !mutation.isPending && onClose()}
      size="lg"
      title="Create writer login"
      subtitle="The account is created as approved, so the writer can see open requests straight away."
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button type="submit" form="create-writer-form" className="btn-primary btn-sm" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />} Create login
          </button>
        </>
      }
    >
      <form id="create-writer-form" noValidate className="space-y-4" onSubmit={onFormSubmit(submit)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" required error={submitted ? errors.firstName : undefined}>
            {(id, d) => (
              <input id={id} aria-describedby={d} className={`input ${submitted && errors.firstName ? "input-error" : ""}`} autoComplete="off" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            )}
          </Field>
          <Field label="Last name">
            {(id) => <input id={id} className="input" autoComplete="off" value={lastName} onChange={(e) => setLastName(e.target.value)} />}
          </Field>
          <Field label="Email" required error={submitted ? errors.email : undefined} className="sm:col-span-2">
            {(id, d) => (
              <input
                id={id}
                aria-describedby={d}
                type="email"
                autoComplete="off"
                className={`input ${submitted && errors.email ? "input-error" : ""}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field
            label="Password"
            required
            help="At least 10 characters. A strong password has been generated for you."
            error={submitted ? errors.password : undefined}
            className="sm:col-span-2"
          >
            {(id, d) => (
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <div className="relative min-w-0 flex-1">
                  <input
                    id={id}
                    aria-describedby={d}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    spellCheck={false}
                    className={`input pr-10 font-mono ${submitted && errors.password ? "input-error" : ""}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-navy-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button type="button" className="btn-secondary shrink-0" onClick={() => setPassword(generatePassword())}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" /> Generate
                </button>
                <button
                  type="button"
                  className="btn-secondary shrink-0 px-3"
                  aria-label="Copy password"
                  onClick={() => copy(password, "Password")}
                  disabled={!password}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
          </Field>
          <Field label="Phone">
            {(id) => <input id={id} type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </Field>
          <Field label="Designation">
            {(id) => <ComboInput id={id} value={designation} onChange={setDesignation} options={ACADEMIC_DESIGNATIONS} placeholder="e.g. Associate Professor" />}
          </Field>
          <Field label="Institution">
            {(id) => <input id={id} className="input" value={institution} onChange={(e) => setInstitution(e.target.value)} />}
          </Field>
          <Field label="Department">
            {(id) => <input id={id} className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />}
          </Field>
          <Field label="Areas of expertise" help="Press Enter or comma after each area." className="sm:col-span-2">
            {(id, d) => <TagInput id={id} describedBy={d} value={expertise} onChange={setExpertise} placeholder="e.g. Machine learning" />}
          </Field>
        </div>
        <p className="muted">The writer can complete their profile (bio, publications, CV) after signing in.</p>
      </form>
    </StackedModal>
  );
};

/* -------------------------------------------------------------------------- */
/* Writer detail                                                              */
/* -------------------------------------------------------------------------- */

const STATUS_ACTIONS: Record<WriterApplicationStatus, { to: WriterApplicationStatus; label: string; tone: string; confirm: string }[]> = {
  PENDING: [
    { to: "APPROVED", label: "Approve", tone: "btn-primary", confirm: "Approve this application? The writer will be able to see open requests and send interest." },
    { to: "REJECTED", label: "Reject", tone: "btn-danger-outline", confirm: "Reject this application? The writer will not be able to take on work." },
  ],
  APPROVED: [
    { to: "SUSPENDED", label: "Suspend", tone: "btn-danger-outline", confirm: "Suspend this writer? They will stop seeing open requests and will be removed from the website. Current assignments are not cancelled automatically." },
  ],
  REJECTED: [{ to: "APPROVED", label: "Approve", tone: "btn-primary", confirm: "Approve this previously rejected application?" }],
  SUSPENDED: [{ to: "APPROVED", label: "Re-activate", tone: "btn-primary", confirm: "Re-activate this writer? They will be able to see open requests again." }],
};

const WriterDetailModal: React.FC<{
  writerId: string;
  initial?: WriterAccount;
  isAdmin: boolean;
  notify: Notify;
  onClose: () => void;
  onOpenRequest?: (requestId: string, requestNumber: string) => void | Promise<void>;
}> = ({ writerId, initial, isAdmin, notify, onClose, onOpenRequest }) => {
  const queryClient = useQueryClient();
  const [openEngagement, setOpenEngagement] = useState<Engagement | null>(null);
  const [notes, setNotes] = useState<string | null>(null);

  const { data: writer, isLoading, isError, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ["admin-writer", writerId],
    queryFn: () => adminGetWriter(writerId),
    placeholderData: initial,
  });

  useEffect(() => {
    if (writer && !isPlaceholderData && notes === null) setNotes(writer.writerProfile?.adminNotes || "");
  }, [writer, isPlaceholderData, notes]);

  const mutation = useMutation({
    mutationFn: (vars: { payload: Parameters<typeof adminUpdateWriter>[1]; success: string }) => adminUpdateWriter(writerId, vars.payload),
    onSuccess: (updated, vars) => {
      if (updated) queryClient.setQueryData(["admin-writer", writerId], updated);
      invalidateWriterData(queryClient, { writerId });
      if (vars.payload.writerProfile?.adminNotes !== undefined) setNotes(updated?.writerProfile?.adminNotes ?? vars.payload.writerProfile.adminNotes ?? "");
      notify("success", vars.success);
    },
    onError: (err) => notify("error", getErrorMessage(err, "The writer could not be updated.")),
  });

  if (!writer) {
    return (
      <StackedModal onClose={onClose} size="xl" title="Writer">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <p className="text-sm text-red-700">{isError ? getErrorMessage(error, "The writer could not be loaded.") : "Writer not found."}</p>
            <button type="button" className="btn-secondary btn-sm" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        )}
      </StackedModal>
    );
  }

  const p = writer.writerProfile || ({ applicationStatus: "PENDING", expertise: [], publications: [], showOnWebsite: false } as WriterAccount["writerProfile"]);
  const status = p.applicationStatus || "PENDING";
  const name = writerDisplayName(writer);
  const busy = mutation.isPending;
  const engagements = writer.engagements || [];
  const featureDisabledReason = !p.showOnWebsite
    ? "The writer has not consented to appear on the website. They can opt in from their profile."
    : status !== "APPROVED"
      ? "Only approved writers can be featured."
      : undefined;
  const location = [p.city, p.country].filter(Boolean).join(", ");
  const orcid = orcidHref(p.orcidId);
  const notesDirty = notes !== null && notes !== (p.adminNotes || "");

  const [cvBusy, setCvBusy] = useState(false);

  /** Read the writer's CV and save details that are currently missing (after confirmation). */
  const fillFromCv = async () => {
    setCvBusy(true);
    try {
      const { method, profile: cv } = await adminExtractWriterCv(writerId);
      const profilePatch: Record<string, unknown> = {};
      const filled: string[] = [];
      const take = (key: keyof typeof cv, label: string, current: unknown, valid: (v: string) => boolean = () => true) => {
        const v = String(cv[key] ?? "").trim();
        if (v && !String(current ?? "").trim() && valid(v)) {
          profilePatch[key] = key === "yearsOfExperience" ? Number(v) : v;
          filled.push(label);
        }
      };
      take("title", "title", p.title, (v) => ["Dr.", "Prof.", "Mr.", "Ms.", "Mrs."].includes(v));
      take("designation", "designation", p.designation);
      take("city", "city", p.city);
      take("country", "country", p.country);
      take("highestQualification", "qualification", p.highestQualification);
      take("yearsOfExperience", "experience", p.yearsOfExperience, (v) => /^\d{1,2}$/.test(v));
      take("bio", "bio", p.bio);
      take("googleScholarUrl", "Google Scholar", p.googleScholarUrl, (v) => /^https?:\/\//i.test(v));
      take("orcidId", "ORCID", p.orcidId, (v) => /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(v));
      take("linkedinUrl", "LinkedIn", p.linkedinUrl, (v) => /^https?:\/\//i.test(v));

      const known = new Set((p.expertise || []).map((e) => e.toLowerCase()));
      const newSubjects = (cv.expertise || []).filter((e) => e.trim() && !known.has(e.trim().toLowerCase()));
      if (newSubjects.length) {
        profilePatch.expertise = [...(p.expertise || []), ...newSubjects].slice(0, 20);
        filled.push(`${Math.min(newSubjects.length, 20 - (p.expertise || []).length)} subject(s)`);
      }
      const titles = new Set((p.publications || []).map((x) => x.title.trim().toLowerCase()));
      const newPubs = (cv.publications || [])
        .filter((x) => x.title?.trim() && !titles.has(x.title.trim().toLowerCase()))
        .map((x) => ({ title: x.title.trim(), journal: x.journal || undefined, year: /^\d{4}$/.test(x.year) ? Number(x.year) : undefined, indexing: x.indexing || undefined, url: /^https?:\/\//i.test(x.url) ? x.url : undefined }));
      if (newPubs.length) {
        profilePatch.publications = [...(p.publications || []), ...newPubs].slice(0, 50);
        filled.push(`${newPubs.length} publication(s)`);
      }
      const top: Record<string, string> = {};
      if (cv.institution?.trim() && !writer.institution?.trim()) {
        top.institution = cv.institution.trim();
        filled.push("institution");
      }
      if (cv.department?.trim() && !writer.department?.trim()) {
        top.department = cv.department.trim();
        filled.push("department");
      }

      if (!filled.length) {
        notify("success", "The profile already contains everything found in the CV.");
        return;
      }
      const how = method === "ai" ? "AI reading" : "basic reading (no AI key configured)";
      if (!window.confirm(`From the CV (${how}) we can add: ${filled.join(", ")}.\n\nExisting details will not be changed. Save these to ${name}'s profile?`)) return;
      mutation.mutate({ payload: { ...top, writerProfile: profilePatch as Partial<WriterAccount["writerProfile"]> }, success: "Profile filled from CV." });
    } catch (err) {
      notify("error", getErrorMessage(err, "The CV could not be read."));
    } finally {
      setCvBusy(false);
    }
  };

  const changeStatus = (to: WriterApplicationStatus, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    mutation.mutate({ payload: { applicationStatus: to }, success: `${name} is now ${APP_STATUS_LABELS[to].toLowerCase()}.` });
  };

  return (
    <StackedModal
      onClose={() => !busy && onClose()}
      size="xl"
      title={name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <AppStatusBadge status={status} />
          <WebsiteIndicator writer={writer} />
          <span>Joined {formatDate(writer.createdAt)}</span>
        </span>
      }
      footer={
        <>
          {isAdmin &&
            STATUS_ACTIONS[status].map((a) => (
              <button key={a.to} type="button" className={`${a.tone} btn-sm`} disabled={busy} onClick={() => changeStatus(a.to, a.confirm)}>
                {a.label}
              </button>
            ))}
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={busy}>
            Close
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="min-w-0 space-y-5 lg:col-span-3">
          <Panel title="Profile">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Avatar writer={writer} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-navy-900">{name}</p>
                <p className="text-sm text-slate-600">{[p.designation, writer.department, writer.institution].filter(Boolean).join(", ") || "No affiliation given"}</p>
                {location && <p className="text-xs text-slate-500">{location}</p>}
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="Email">
                <a className="link break-all" href={`mailto:${writer.email}`}>
                  {writer.email}
                </a>
              </Detail>
              <Detail label="Phone / WhatsApp">{[writer.phone, writer.whatsapp].filter(Boolean).join(" / ")}</Detail>
              <Detail label="Highest qualification">{p.highestQualification}</Detail>
              <Detail label="Experience">{p.yearsOfExperience != null ? `${p.yearsOfExperience} years` : undefined}</Detail>
              <Detail label="Expertise" className="sm:col-span-2">
                <ExpertiseChips items={p.expertise} />
              </Detail>
              {p.bio && (
                <Detail label="Bio" className="sm:col-span-2">
                  <span className="whitespace-pre-wrap">{p.bio}</span>
                </Detail>
              )}
            </dl>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {p.cvUrl ? <SafeLink url={p.cvUrl}>CV</SafeLink> : <span className="text-slate-400">No CV</span>}
              {isAdmin && p.cvUrl && /\.(pdf|docx)(\?|$)/i.test(p.cvUrl) && (
                <button type="button" className="link inline-flex items-center gap-1" onClick={fillFromCv} disabled={cvBusy || busy}>
                  {cvBusy ? <Spinner className="h-3.5 w-3.5" /> : null}
                  {cvBusy ? "Reading CV…" : "Fill missing details from CV"}
                </button>
              )}
              {p.googleScholarUrl && <SafeLink url={p.googleScholarUrl}>Google Scholar</SafeLink>}
              {p.orcidId && (orcid ? <SafeLink url={orcid}>ORCID {p.orcidId.replace(/^https?:\/\/orcid\.org\//i, "")}</SafeLink> : <span className="text-slate-600">ORCID {p.orcidId}</span>)}
              {p.linkedinUrl && <SafeLink url={p.linkedinUrl}>LinkedIn</SafeLink>}
            </div>
          </Panel>

          <Panel title={`Publications (${p.publications?.length || 0})`}>
            {p.publications && p.publications.length > 0 ? (
              <div className="table-wrap">
                <table className="table min-w-[520px]">
                  <thead>
                    <tr>
                      <th scope="col">Title</th>
                      <th scope="col">Journal</th>
                      <th scope="col">Year</th>
                      <th scope="col">Indexing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.publications.map((pub, i) => (
                      <tr key={`${pub.title}-${i}`}>
                        <td className="max-w-[260px] break-words">{pub.url ? <SafeLink url={pub.url}>{pub.title}</SafeLink> : pub.title}</td>
                        <td className="max-w-[180px] break-words text-slate-600">{pub.journal || "—"}</td>
                        <td className="whitespace-nowrap">{pub.year || "—"}</td>
                        <td className="text-slate-600">{pub.indexing || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No publications listed.</p>
            )}
          </Panel>

          <Panel title={`Engagement history (${engagements.length})`}>
            {engagements.length === 0 ? (
              <p className="muted">This writer has not engaged with any requests yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {engagements.map((e) => (
                  <li key={e._id}>
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
                      onClick={() => setOpenEngagement(e)}
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-semibold text-navy-800">{e.request?.requestNumber || "Request"}</span>
                        <span className="block truncate text-sm text-navy-900">{e.request?.serviceName}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-slate-700">
                          {e.offer ? formatMoney(e.offer.fee, e.offer.currency) : e.proposal?.fee ? `${formatMoney(e.proposal.fee, e.proposal.currency || "INR")} proposed` : ""}
                        </span>
                        <StageBadge stage={e.stage} className="text-[11px]" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Panel title="Application">
            <dl className="grid grid-cols-2 gap-3">
              <Detail label="Status">
                <AppStatusBadge status={status} />
              </Detail>
              <Detail label="Reviewed">{p.reviewedAt ? formatDate(p.reviewedAt) : "Not yet"}</Detail>
              <Detail label="Active work">{String(writer.stats?.active ?? engagements.filter((e) => ["OFFERED", "ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED"].includes(e.stage)).length)}</Detail>
              <Detail label="Completed">{String(writer.stats?.completed ?? engagements.filter((e) => e.stage === "APPROVED").length)}</Detail>
            </dl>
            {!isAdmin && <ReadOnlyNotice>Only administrators can approve, reject or suspend writers.</ReadOnlyNotice>}
          </Panel>

          <Panel title="Public website" aside={<WebsiteIndicator writer={writer} />}>
            <p className="text-sm text-slate-600">
              A writer appears on the public experts page only when <strong>both</strong> the writer has consented and an administrator
              features them.
            </p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center justify-between gap-2">
                <span>Writer's consent</span>
                {p.showOnWebsite ? <span className="badge-success">Given</span> : <span className="badge-neutral">Not given</span>}
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Featured by admin</span>
                {p.featuredOnWebsite ? <span className="badge-success">Yes</span> : <span className="badge-neutral">No</span>}
              </li>
            </ul>
            {isAdmin && (
              <div>
                <label className={`choice ${p.featuredOnWebsite ? "choice-active" : ""} ${featureDisabledReason ? "cursor-not-allowed opacity-60" : ""}`}>
                  <input
                    type="checkbox"
                    role="switch"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-navy-700 focus:ring-navy-500"
                    checked={Boolean(p.featuredOnWebsite)}
                    disabled={Boolean(featureDisabledReason) || busy}
                    aria-describedby="feature-reason"
                    onChange={(e) =>
                      mutation.mutate({
                        payload: { writerProfile: { featuredOnWebsite: e.target.checked } },
                        success: e.target.checked ? `${name} is now featured on the website.` : `${name} was removed from the website.`,
                      })
                    }
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">Feature on website</span>
                    <span id="feature-reason" className="mt-0.5 block text-xs text-slate-500">
                      {featureDisabledReason || "Shows name, designation, institution, expertise and publications. Contact details are never shown."}
                    </span>
                  </span>
                </label>
              </div>
            )}
          </Panel>

          <Panel title="Internal notes">
            {isAdmin ? (
              <form
                className="space-y-3"
                onSubmit={onFormSubmit(() =>
                  mutation.mutate({ payload: { writerProfile: { adminNotes: notes ?? "" } }, success: "Notes saved." })
                )}
              >
                <Field label="Notes (staff only)" help="Never shown to the writer or on the website.">
                  {(id, d) => (
                    <textarea
                      id={id}
                      aria-describedby={d}
                      rows={4}
                      maxLength={3000}
                      className="input"
                      value={notes ?? ""}
                      disabled={notes === null}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  )}
                </Field>
                <button type="submit" className="btn-secondary btn-sm" disabled={busy || !notesDirty}>
                  {busy && <Spinner className="h-3.5 w-3.5" />} Save notes
                </button>
              </form>
            ) : p.adminNotes ? (
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{p.adminNotes}</p>
            ) : (
              <p className="muted">No internal notes.</p>
            )}
          </Panel>
        </div>
      </div>

      {openEngagement && (
        <EngagementModal
          key={openEngagement._id}
          engagementId={openEngagement._id}
          isAdmin={isAdmin}
          notify={notify}
          onClose={() => setOpenEngagement(null)}
          onOpenRequest={onOpenRequest}
        />
      )}
    </StackedModal>
  );
};

/* -------------------------------------------------------------------------- */
/* Tab                                                                        */
/* -------------------------------------------------------------------------- */

export const WritersTab: React.FC<{
  isAdmin: boolean;
  notify: Notify;
  /** Opens the full request dialog (the dashboard's RequestManageModal). */
  onOpenRequest?: (req: ServiceRequest) => void;
}> = ({ isAdmin, notify, onOpenRequest }) => {
  const [status, setStatus] = useState<StatusChip>("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [selected, setSelected] = useState<WriterAccount | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: writersKey(status, search),
    queryFn: () => adminListWriters({ status: status || undefined, search: search || undefined }),
    placeholderData: keepPreviousData,
  });

  const counts = data?.counts || {};
  const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
  const writers = useMemo(
    () =>
      [...(data?.data || [])].sort(
        (a, b) => STATUS_ORDER[a.writerProfile?.applicationStatus || "PENDING"] - STATUS_ORDER[b.writerProfile?.applicationStatus || "PENDING"]
      ),
    [data?.data]
  );

  const openRequest = async (requestId: string, requestNumber: string) => {
    if (!onOpenRequest) return;
    try {
      const res = await getAdminRequests({ search: requestNumber, limit: 10 });
      const req = res.data.find((r) => r._id === requestId);
      if (!req) {
        notify("error", `Request ${requestNumber} could not be found.`);
        return;
      }
      // Close the writer + assignment dialogs before the request dialog mounts.
      flushSync(() => setSelected(null));
      onOpenRequest(req);
    } catch (err) {
      notify("error", getErrorMessage(err, "The request could not be opened."));
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Research writers"
        description="Review applications from writers and professors, manage their access and choose who is featured on the website."
        actions={
          isAdmin ? (
            <button type="button" className="btn-primary btn-sm" onClick={() => setCreating(true)}>
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Create writer login
            </button>
          ) : undefined
        }
      />

      {!isAdmin && <ReadOnlyNotice>You can view writers. Only administrators can approve applications or change access.</ReadOnlyNotice>}

      <div className="card space-y-3 p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search writers"
            placeholder="Search name, email, institution or expertise"
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
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by application status">
          {STATUS_CHIPS.map((c) => {
            const n = data ? (c.id ? counts[c.id] || 0 : total) : undefined;
            const active = status === c.id;
            return (
              <button
                key={c.id || "all"}
                type="button"
                onClick={() => setStatus(c.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active ? "border-navy-900 bg-navy-900 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-navy-300 hover:text-navy-900"
                }`}
              >
                {c.label}
                {n !== undefined && (
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-semibold ${
                      active ? "bg-white/20 text-white" : c.id === "PENDING" && n ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
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
        isEmpty={writers.length === 0}
        emptyTitle={status === "PENDING" && !search ? "No pending applications" : "No writers found"}
        emptyMessage={search || status ? "Try a different search term or status filter." : "Writer applications and logins you create will appear here."}
        emptyAction={
          isAdmin && !search && !status ? (
            <button type="button" className="btn-primary btn-sm" onClick={() => setCreating(true)}>
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Create writer login
            </button>
          ) : undefined
        }
      >
        {/* Cards (small screens) */}
        <ul className={`space-y-3 md:hidden ${isFetching ? "opacity-70" : ""}`} aria-busy={isFetching}>
          {writers.map((w) => (
            <li key={w.id}>
              <button type="button" onClick={() => setSelected(w)} className="card w-full p-4 text-left transition-colors hover:border-navy-300">
                <span className="flex items-start gap-3">
                  <Avatar writer={w} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="break-words font-semibold text-navy-900">{writerDisplayName(w)}</span>
                      <AppStatusBadge status={w.writerProfile?.applicationStatus} />
                    </span>
                    <span className="block text-xs text-slate-500">{[w.writerProfile?.designation, w.institution].filter(Boolean).join(", ") || w.email}</span>
                    <span className="mt-2 block">
                      <ExpertiseChips items={w.writerProfile?.expertise} max={4} />
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{w.writerProfile?.publications?.length || 0} publications</span>
                      <span>{w.stats?.active || 0} active</span>
                      <span>{w.stats?.completed || 0} completed</span>
                      <WebsiteIndicator writer={w} />
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Table (md and up) */}
        <div className={`table-wrap hidden md:block ${isFetching ? "opacity-70" : ""}`} aria-busy={isFetching}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Writer</th>
                <th scope="col">Expertise</th>
                <th scope="col" className="text-center">
                  Pubs
                </th>
                <th scope="col" className="text-center">
                  Active / done
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {writers.map((w) => (
                <tr key={w.id} className="cursor-pointer" onClick={() => setSelected(w)}>
                  <td className="max-w-[300px]">
                    <div className="flex items-center gap-3">
                      <Avatar writer={w} />
                      <div className="min-w-0">
                        <span className="block break-words font-medium text-navy-900">{writerDisplayName(w)}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {[w.writerProfile?.designation, w.institution].filter(Boolean).join(", ") || w.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[260px]">
                    <ExpertiseChips items={w.writerProfile?.expertise} max={3} />
                  </td>
                  <td className="text-center">{w.writerProfile?.publications?.length || 0}</td>
                  <td className="whitespace-nowrap text-center">
                    {w.stats?.active || 0} / {w.stats?.completed || 0}
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <AppStatusBadge status={w.writerProfile?.applicationStatus} />
                      <WebsiteIndicator writer={w} />
                    </div>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(w);
                      }}
                      aria-label={`View ${writerDisplayName(w)}`}
                    >
                      {isAdmin && w.writerProfile?.applicationStatus === "PENDING" ? "Review" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      {selected && (
        <WriterDetailModal
          key={selected.id}
          writerId={selected.id}
          initial={selected}
          isAdmin={isAdmin}
          notify={notify}
          onClose={() => setSelected(null)}
          onOpenRequest={onOpenRequest ? openRequest : undefined}
        />
      )}
      {creating && <CreateWriterModal notify={notify} onClose={() => setCreating(false)} />}
    </div>
  );
};
