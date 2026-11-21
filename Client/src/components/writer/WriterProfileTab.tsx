import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  FileText,
  Globe2,
  GraduationCap,
  Link2,
  Plus,
  Trash2,
  Upload,
  UserRound,
  Wand2,
  X,
} from "lucide-react";
import { getErrorMessage, uploadFile } from "../../api";
import { safeHref } from "../../api/types";
import { CvSuggestions, WriterAccount, WriterPublication, extractMyCv, updateMyWriterProfile } from "../../api/writers";
import { useAuth } from "../../context/AuthContext";
import { ACADEMIC_DESIGNATIONS, ComboInput } from "../ComboInput";
import { Field, Spinner } from "../ui";
import { APPLICATION_BADGE, formatDate, initialsOf } from "./writerHelpers";

const TITLES = ["Dr.", "Prof.", "Mr.", "Ms.", "Mrs."];
const QUALIFICATIONS = ["Ph.D.", "Post-doctoral", "M.Phil.", "M.Tech / M.E.", "M.Sc / MS", "M.A.", "M.Com", "MBA", "M.Pharm", "MBBS / MD", "B.Tech / B.E.", "Other"];
const INDEXING = ["Scopus", "Web of Science", "SCI/SCIE", "UGC-CARE", "PubMed", "IEEE", "Springer", "Elsevier", "Other"];
const MAX_EXPERTISE = 20;
const MAX_PUBLICATIONS = 50;
const ORCID_RE = /^(https?:\/\/orcid\.org\/)?\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i;
const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());

type PubRow = { key: string; title: string; journal: string; year: string; indexing: string; url: string };

interface Form {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  institution: string;
  department: string;
  title: string;
  designation: string;
  city: string;
  country: string;
  highestQualification: string;
  yearsOfExperience: string;
  bio: string;
  googleScholarUrl: string;
  orcidId: string;
  linkedinUrl: string;
  cvUrl: string;
  photoUrl: string;
  expertise: string[];
  publications: PubRow[];
  showOnWebsite: boolean;
}

let rowSeq = 0;
const newRow = (p?: WriterPublication): PubRow => ({
  key: `pub-${++rowSeq}`,
  title: p?.title || "",
  journal: p?.journal || "",
  year: p?.year ? String(p.year) : "",
  indexing: p?.indexing || "",
  url: p?.url || "",
});

const fromAccount = (a: WriterAccount): Form => {
  const p = a.writerProfile || ({} as WriterAccount["writerProfile"]);
  return {
    firstName: a.firstName || "",
    lastName: a.lastName || "",
    phone: a.phone || "",
    whatsapp: a.whatsapp || "",
    institution: a.institution || "",
    department: a.department || "",
    title: p.title || "",
    designation: p.designation || "",
    city: p.city || "",
    country: p.country || "",
    highestQualification: p.highestQualification || "",
    yearsOfExperience: p.yearsOfExperience != null ? String(p.yearsOfExperience) : "",
    bio: p.bio || "",
    googleScholarUrl: p.googleScholarUrl || "",
    orcidId: p.orcidId || "",
    linkedinUrl: p.linkedinUrl || "",
    cvUrl: p.cvUrl || "",
    photoUrl: p.photoUrl || "",
    expertise: [...(p.expertise || [])],
    publications: (p.publications || []).map((x) => newRow(x)),
    showOnWebsite: Boolean(p.showOnWebsite),
  };
};

/** Comparable snapshot (ignores row keys and surrounding whitespace). */
const snapshot = (f: Form) =>
  JSON.stringify({
    ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])),
    publications: f.publications.map(({ key: _k, ...rest }) => Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v.trim()]))),
  });

const pubHasContent = (r: PubRow) => [r.title, r.journal, r.year, r.indexing, r.url].some((v) => v.trim());

const CV_FIELD_LABELS: Partial<Record<keyof Form, string>> = {
  title: "Title",
  designation: "Designation",
  institution: "Institution",
  department: "Department",
  city: "City",
  country: "Country",
  highestQualification: "Highest qualification",
  yearsOfExperience: "Years of experience",
  bio: "Bio",
  googleScholarUrl: "Google Scholar",
  orcidId: "ORCID iD",
  linkedinUrl: "LinkedIn",
};

/**
 * Merge CV suggestions into the form without overwriting anything the writer
 * already entered: empty fields are filled, new subjects and publications are added.
 */
const mergeCvSuggestions = (form: Form, cv: CvSuggestions) => {
  const next: Form = { ...form };
  const filled: string[] = [];

  (Object.keys(CV_FIELD_LABELS) as (keyof Form)[]).forEach((key) => {
    const suggestion = String((cv as unknown as Record<string, unknown>)[key] ?? "").trim();
    if (!suggestion || String(next[key] ?? "").trim()) return;
    if (key === "title" && !TITLES.includes(suggestion)) return;
    if (key === "yearsOfExperience" && !/^\d{1,2}$/.test(suggestion)) return;
    if ((key === "googleScholarUrl" || key === "linkedinUrl") && !isHttpUrl(suggestion)) return;
    if (key === "orcidId" && !ORCID_RE.test(suggestion)) return;
    (next as unknown as Record<string, unknown>)[key] = suggestion;
    filled.push(CV_FIELD_LABELS[key]!);
  });

  const known = new Set(next.expertise.map((e) => e.toLowerCase()));
  const newSubjects = (cv.expertise || []).map((e) => e.trim()).filter((e) => e && !known.has(e.toLowerCase()));
  const expertiseAdded = Math.max(0, Math.min(newSubjects.length, MAX_EXPERTISE - next.expertise.length));
  if (expertiseAdded) next.expertise = [...next.expertise, ...newSubjects.slice(0, expertiseAdded)];

  const titles = new Set(next.publications.map((p) => p.title.trim().toLowerCase()).filter(Boolean));
  const keptRows = next.publications.filter(pubHasContent);
  const newPubs = (cv.publications || [])
    .filter((p) => p.title?.trim() && !titles.has(p.title.trim().toLowerCase()))
    .slice(0, Math.max(0, MAX_PUBLICATIONS - keptRows.length))
    .map((p) => newRow({ title: p.title.trim(), journal: p.journal?.trim(), year: /^\d{4}$/.test(p.year) ? Number(p.year) : undefined, indexing: p.indexing?.trim(), url: isHttpUrl(p.url || "") ? p.url.trim() : undefined }));
  if (newPubs.length) next.publications = [...keptRows, ...newPubs];

  return { next, filled, expertiseAdded, publicationsAdded: newPubs.length };
};

/* -------------------------------------------------------------------------- */
/* Small pieces                                                               */
/* -------------------------------------------------------------------------- */

const Section: React.FC<{ icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }> = ({ icon, title, description, children }) => (
  <fieldset className="min-w-0 px-5 py-5 sm:px-6">
    <legend className="sr-only">{title}</legend>
    <div className="mb-4" aria-hidden="true">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {title}
      </p>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </fieldset>
);

const TagInput: React.FC<{ id: string; describedBy?: string; value: string[]; onChange: (v: string[]) => void }> = ({ id, describedBy, value, onChange }) => {
  const [draft, setDraft] = useState("");
  const full = value.length >= MAX_EXPERTISE;

  const add = (raw: string) => {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!tag || full) return;
    if (!value.some((v) => v.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setDraft("");
  };

  return (
    <div className="rounded-md border border-slate-300 bg-white px-2 py-2 focus-within:border-navy-500 focus-within:ring-2 focus-within:ring-navy-500/20">
      {value.length > 0 && (
        <ul className="mb-1.5 flex flex-wrap gap-1.5" aria-label="Your areas of expertise">
          {value.map((tag) => (
            <li key={tag} className="inline-flex max-w-full items-center gap-1 rounded-full bg-navy-50 py-0.5 pl-2.5 pr-1 text-sm text-navy-800 ring-1 ring-inset ring-navy-200">
              <span className="truncate">{tag}</span>
              <button
                type="button"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-navy-600 hover:bg-navy-100"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(value.filter((v) => v !== tag))}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        aria-describedby={describedBy}
        className="w-full border-0 bg-transparent px-1.5 py-1 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm"
        placeholder={full ? "Maximum of 20 reached" : "Type an area and press Enter, e.g. Machine learning"}
        value={draft}
        disabled={full}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) add(v.slice(0, -1));
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
      />
    </div>
  );
};

const UploadButton: React.FC<{
  label: string;
  accept: string;
  busy: boolean;
  onFile: (f: File) => void;
}> = ({ label, accept, busy, onFile }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <button type="button" className="btn-secondary btn-sm" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Spinner className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
        {busy ? "Uploading…" : label}
      </button>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Tab                                                                        */
/* -------------------------------------------------------------------------- */

export const WriterProfileTab: React.FC<{ account: WriterAccount; onContact: () => void }> = ({ account, onContact }) => {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState<Form>(() => fromAccount(account));
  // Latest form values for async work (CV reading finishes after other edits)
  const formRef = useRef(form);
  formRef.current = form;
  const [baseline, setBaseline] = useState(() => snapshot(fromAccount(account)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState<"cv" | "photo" | null>(null);
  const [uploadMsg, setUploadMsg] = useState<{ field: "cv" | "photo"; type: "success" | "error"; text: string } | null>(null);

  // Re-sync when a different account loads
  useEffect(() => {
    const f = fromAccount(account);
    setForm(f);
    setBaseline(snapshot(f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.id]);

  const dirty = snapshot(form) !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFeedback(null);
    if (errors[key as string]) setErrors(({ [key as string]: _drop, ...rest }) => rest);
  };
  const text = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    update(key, e.target.value as never);

  const updatePub = (i: number, patch: Partial<PubRow>) => {
    setForm((f) => ({ ...f, publications: f.publications.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
    setFeedback(null);
  };

  const completeness = useMemo(() => {
    const checks = [
      Boolean(form.firstName.trim() && form.lastName.trim()),
      Boolean(form.phone.trim() || form.whatsapp.trim()),
      Boolean(form.institution.trim()),
      Boolean(form.designation.trim()),
      Boolean(form.highestQualification.trim()),
      Boolean(form.yearsOfExperience.trim()),
      Boolean(form.city.trim() || form.country.trim()),
      form.expertise.length > 0,
      form.bio.trim().length >= 80,
      form.publications.some((p) => p.title.trim()),
      Boolean(form.googleScholarUrl.trim() || form.orcidId.trim()),
      Boolean(form.cvUrl),
      Boolean(form.photoUrl),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (form.yearsOfExperience.trim()) {
      const n = Number(form.yearsOfExperience);
      if (!Number.isInteger(n) || n < 0 || n > 70) e.yearsOfExperience = "Enter a whole number between 0 and 70.";
    }
    if (form.googleScholarUrl.trim() && !isHttpUrl(form.googleScholarUrl)) e.googleScholarUrl = "Enter a full link starting with https://";
    if (form.linkedinUrl.trim() && !isHttpUrl(form.linkedinUrl)) e.linkedinUrl = "Enter a full link starting with https://";
    if (form.orcidId.trim() && !ORCID_RE.test(form.orcidId.trim())) e.orcidId = "Use the format 0000-0000-0000-0000.";
    const maxYear = new Date().getFullYear() + 1;
    form.publications.forEach((p, i) => {
      if (!pubHasContent(p)) return;
      if (!p.title.trim()) e[`pub-${i}-title`] = "Title is required.";
      if (p.year.trim()) {
        const y = Number(p.year);
        if (!Number.isInteger(y) || y < 1950 || y > maxYear) e[`pub-${i}-year`] = `Year between 1950 and ${maxYear}.`;
      }
      if (p.url.trim() && !isHttpUrl(p.url)) e[`pub-${i}-url`] = "Link must start with https://";
    });
    return e;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setFeedback({ type: "error", text: "Please correct the highlighted fields." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const t = (v: string) => v.trim();
      const updated = await updateMyWriterProfile({
        firstName: t(form.firstName),
        lastName: t(form.lastName),
        phone: t(form.phone),
        whatsapp: t(form.whatsapp),
        institution: t(form.institution),
        department: t(form.department),
        writerProfile: {
          title: form.title,
          designation: t(form.designation),
          city: t(form.city),
          country: t(form.country),
          highestQualification: t(form.highestQualification),
          yearsOfExperience: form.yearsOfExperience.trim() ? Number(form.yearsOfExperience) : undefined,
          bio: t(form.bio),
          googleScholarUrl: t(form.googleScholarUrl),
          orcidId: t(form.orcidId),
          linkedinUrl: t(form.linkedinUrl),
          cvUrl: form.cvUrl,
          photoUrl: form.photoUrl,
          expertise: form.expertise,
          publications: form.publications.filter(pubHasContent).map((p) => ({
            title: t(p.title),
            journal: t(p.journal) || undefined,
            year: p.year.trim() ? Number(p.year) : undefined,
            indexing: t(p.indexing) || undefined,
            url: t(p.url) || undefined,
          })),
          showOnWebsite: form.showOnWebsite,
        },
      });
      queryClient.setQueryData(["writer-profile"], updated);
      const f = fromAccount(updated);
      setForm(f);
      setBaseline(snapshot(f));
      setFeedback({ type: "success", text: "Your profile has been saved." });
      refreshUser().catch(() => undefined);
    } catch (err) {
      setFeedback({ type: "error", text: getErrorMessage(err, "We couldn't save your profile. Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  const doUpload = async (kind: "cv" | "photo", file: File) => {
    const ok = kind === "cv" ? /\.(pdf|docx?)$/i.test(file.name) : /\.(png|jpe?g|webp)$/i.test(file.name);
    if (!ok) {
      setUploadMsg({ field: kind, type: "error", text: kind === "cv" ? "Upload a PDF or Word document." : "Upload a PNG, JPG or WebP image." });
      return;
    }
    setUploading(kind);
    setUploadMsg(null);
    let uploadedUrl = "";
    try {
      const res = await uploadFile(file, kind === "cv" ? "writer-cv" : "writer-photos");
      uploadedUrl = res.url;
      update(kind === "cv" ? "cvUrl" : "photoUrl", res.url);
      setUploadMsg({ field: kind, type: "success", text: "Uploaded. Save changes to update your profile." });
    } catch (err) {
      setUploadMsg({ field: kind, type: "error", text: getErrorMessage(err, "Upload failed.") });
    } finally {
      setUploading(null);
    }
    // Read the new CV straight away and fill in the profile
    if (kind === "cv" && uploadedUrl && /\.(pdf|docx)$/i.test(file.name)) void fillFromCv(uploadedUrl);
  };

  /* ---------------------------- CV auto-fill ---------------------------- */

  const [cvFill, setCvFill] = useState<{
    busy: boolean;
    error?: string;
    summary?: { method: "ai" | "basic"; filled: string[]; expertiseAdded: number; publicationsAdded: number; note?: string };
    undo?: Form;
  }>({ busy: false });

  const fillFromCv = async (cvUrl?: string) => {
    setCvFill({ busy: true });
    try {
      const result = await extractMyCv(cvUrl || formRef.current.cvUrl || undefined);
      // Merge into the latest form (the CV link may have been set while we were waiting)
      const before = formRef.current;
      const merged = mergeCvSuggestions(before, result.profile);
      setForm(merged.next);
      setFeedback(null);
      setCvFill({
        busy: false,
        undo: before,
        summary: { method: result.method, filled: merged.filled, expertiseAdded: merged.expertiseAdded, publicationsAdded: merged.publicationsAdded, note: result.note },
      });
    } catch (err) {
      setCvFill({ busy: false, error: getErrorMessage(err, "We couldn't read your CV. Please fill the details manually.") });
    }
  };

  const undoCvFill = () => {
    if (cvFill.undo) setForm(cvFill.undo);
    setCvFill({ busy: false });
  };

  const status = account.writerProfile?.applicationStatus || "PENDING";
  const badge = APPLICATION_BADGE[status];
  const displayName = [form.title, form.firstName, form.lastName].map((s) => s.trim()).filter(Boolean).join(" ");
  const photoHref = safeHref(form.photoUrl);
  const cvHref = safeHref(form.cvUrl);
  const titleInList = !form.title || TITLES.includes(form.title);

  const uploadNote = (field: "cv" | "photo") =>
    uploadMsg?.field === field ? (
      <p className={uploadMsg.type === "success" ? "help text-emerald-700" : "error-text"} role={uploadMsg.type === "error" ? "alert" : "status"}>
        {uploadMsg.text}
      </p>
    ) : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,56rem)]">
      {/* Summary */}
      <aside className="space-y-4 lg:sticky lg:top-24">
        <div className="card overflow-hidden">
          <div className="h-16 bg-navy-900" aria-hidden="true" />
          <div className="-mt-8 px-5 pb-5">
            {photoHref ? (
              <img src={photoHref} alt="" className="h-16 w-16 rounded-full border-4 border-white bg-white object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-navy-700 text-xl font-semibold text-white" aria-hidden="true">
                {initialsOf(displayName)}
              </span>
            )}
            <p className="mt-3 break-words text-lg font-semibold text-navy-900">{displayName || "Your profile"}</p>
            {(form.designation || form.institution) && (
              <p className="text-sm text-slate-500">{[form.designation, form.institution].filter(Boolean).join(" · ")}</p>
            )}
            <p className="mt-3">
              <span className={badge.cls}>{badge.label}</span>
            </p>
            {account.writerProfile?.reviewedAt && <p className="mt-1 text-xs text-slate-500">Reviewed {formatDate(account.writerProfile.reviewedAt)}</p>}

            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Profile completeness</span>
                <span className="font-semibold text-navy-900">{completeness}%</span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={completeness}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completeness"
              >
                <div className="h-full rounded-full bg-navy-700 transition-all" style={{ width: `${completeness}%` }} />
              </div>
              {completeness < 100 && (
                <p className="mt-2 text-xs text-slate-500">
                  {status === "PENDING"
                    ? "A complete profile with publications and a CV helps our team approve you faster."
                    : "Complete profiles are matched with more projects."}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card p-5 text-sm text-slate-600">
          <p className="font-semibold text-navy-900">Sign-in & privacy</p>
          <p className="mt-2">Signed in as <span className="break-all font-medium text-slate-800">{account.email}</span>.</p>
          <p className="mt-2">Clients never see your contact details, and you never see theirs.</p>
          <button type="button" className="link mt-3 text-sm" onClick={onContact}>
            Contact support
          </button>
        </div>
      </aside>

      {/* Form */}
      <form onSubmit={onSubmit} className="card min-w-0" noValidate>
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-navy-900">Writer profile</h2>
          <p className="mt-0.5 text-sm text-slate-500">Our team uses this to match you with projects and to review your application.</p>
        </div>

        <div className="divide-y divide-slate-100">
          <Section icon={<UserRound className="h-4 w-4" />} title="Personal details">
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:col-span-2 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)]">
              <Field label="Title">
                {(id) => (
                  <select id={id} className="input" value={form.title} onChange={text("title")}>
                    <option value="">None</option>
                    {!titleInList && <option value={form.title}>{form.title}</option>}
                    {TITLES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="First name" required error={errors.firstName}>
                {(id, d) => (
                  <input
                    id={id}
                    aria-describedby={d}
                    aria-invalid={Boolean(errors.firstName)}
                    className={`input ${errors.firstName ? "input-error" : ""}`}
                    value={form.firstName}
                    onChange={text("firstName")}
                    autoComplete="given-name"
                  />
                )}
              </Field>
              <Field label="Last name" className="col-span-2 sm:col-span-1">
                {(id) => <input id={id} className="input" value={form.lastName} onChange={text("lastName")} autoComplete="family-name" />}
              </Field>
            </div>
            <Field label="Phone">
              {(id) => <input id={id} type="tel" className="input" placeholder="+91 98765 43210" value={form.phone} onChange={text("phone")} autoComplete="tel" />}
            </Field>
            <Field label="WhatsApp" help="Include the country code.">
              {(id, d) => (
                <>
                  <input id={id} aria-describedby={d} type="tel" className="input" placeholder="+91 98765 43210" value={form.whatsapp} onChange={text("whatsapp")} />
                  {!form.whatsapp && form.phone && (
                    <button type="button" className="link mt-1.5 text-xs" onClick={() => update("whatsapp", form.phone)}>
                      Same as phone
                    </button>
                  )}
                </>
              )}
            </Field>
          </Section>

          <Section icon={<Building2 className="h-4 w-4" />} title="Academic position">
            <Field label="Designation">
              {(id, d) => (
                <ComboInput id={id} describedBy={d} value={form.designation} onChange={(v) => update("designation", v)} options={ACADEMIC_DESIGNATIONS} placeholder="e.g. Associate Professor" />
              )}
            </Field>
            <Field label="Institution / organisation">
              {(id) => <input id={id} className="input" value={form.institution} onChange={text("institution")} autoComplete="organization" />}
            </Field>
            <Field label="Department">
              {(id) => <input id={id} className="input" value={form.department} onChange={text("department")} />}
            </Field>
            <Field label="Highest qualification">
              {(id, d) => (
                <ComboInput id={id} describedBy={d} value={form.highestQualification} onChange={(v) => update("highestQualification", v)} options={QUALIFICATIONS} placeholder="e.g. Ph.D." />
              )}
            </Field>
            <Field label="Years of experience" error={errors.yearsOfExperience}>
              {(id, d) => (
                <input
                  id={id}
                  aria-describedby={d}
                  aria-invalid={Boolean(errors.yearsOfExperience)}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={70}
                  className={`input ${errors.yearsOfExperience ? "input-error" : ""}`}
                  value={form.yearsOfExperience}
                  onChange={text("yearsOfExperience")}
                />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">{(id) => <input id={id} className="input" value={form.city} onChange={text("city")} autoComplete="address-level2" />}</Field>
              <Field label="Country">{(id) => <input id={id} className="input" value={form.country} onChange={text("country")} autoComplete="country-name" />}</Field>
            </div>
          </Section>

          <Section icon={<GraduationCap className="h-4 w-4" />} title="Expertise & bio">
            <Field label="Areas of expertise" className="sm:col-span-2" help={`Press Enter after each area. ${form.expertise.length}/${MAX_EXPERTISE} added.`}>
              {(id, d) => <TagInput id={id} describedBy={d} value={form.expertise} onChange={(v) => update("expertise", v)} />}
            </Field>
            <Field label="Short bio" className="sm:col-span-2" help={`Your research background and the kind of work you do best. ${form.bio.length}/3000`}>
              {(id, d) => <textarea id={id} aria-describedby={d} rows={5} maxLength={3000} className="input" value={form.bio} onChange={text("bio")} />}
            </Field>
          </Section>

          <Section icon={<Link2 className="h-4 w-4" />} title="Research identity">
            <Field label="Google Scholar profile" error={errors.googleScholarUrl}>
              {(id, d) => (
                <input
                  id={id}
                  aria-describedby={d}
                  aria-invalid={Boolean(errors.googleScholarUrl)}
                  type="url"
                  className={`input ${errors.googleScholarUrl ? "input-error" : ""}`}
                  placeholder="https://scholar.google.com/citations?user=…"
                  value={form.googleScholarUrl}
                  onChange={text("googleScholarUrl")}
                />
              )}
            </Field>
            <Field label="ORCID iD" error={errors.orcidId}>
              {(id, d) => (
                <input
                  id={id}
                  aria-describedby={d}
                  aria-invalid={Boolean(errors.orcidId)}
                  className={`input ${errors.orcidId ? "input-error" : ""}`}
                  placeholder="0000-0002-1825-0097"
                  value={form.orcidId}
                  onChange={text("orcidId")}
                />
              )}
            </Field>
            <Field label="LinkedIn profile" className="sm:col-span-2" error={errors.linkedinUrl}>
              {(id, d) => (
                <input
                  id={id}
                  aria-describedby={d}
                  aria-invalid={Boolean(errors.linkedinUrl)}
                  type="url"
                  className={`input ${errors.linkedinUrl ? "input-error" : ""}`}
                  placeholder="https://www.linkedin.com/in/…"
                  value={form.linkedinUrl}
                  onChange={text("linkedinUrl")}
                />
              )}
            </Field>
          </Section>

          <fieldset className="min-w-0 px-5 py-5 sm:px-6">
            <legend className="sr-only">Publications</legend>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div aria-hidden="true">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">
                  <BookOpen className="h-4 w-4 text-slate-400" /> Publications
                </p>
                <p className="mt-1 text-xs text-slate-500">Your most relevant papers. Indexed publications strengthen your application.</p>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={form.publications.length >= MAX_PUBLICATIONS}
                onClick={() => update("publications", [...form.publications, newRow()])}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add publication
              </button>
            </div>
            {form.publications.length === 0 ? (
              <p className="panel-muted px-4 py-5 text-center text-sm text-slate-500">No publications added yet.</p>
            ) : (
              <ol className="space-y-3">
                {form.publications.map((p, i) => (
                  <li key={p.key} className="panel-muted p-3 sm:p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Publication {i + 1}</span>
                      <button
                        type="button"
                        className="icon-btn h-8 w-8 text-slate-500 hover:text-red-700"
                        aria-label={`Remove publication ${i + 1}${p.title ? `: ${p.title}` : ""}`}
                        onClick={() => update("publications", form.publications.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-6">
                      <Field label="Title" required className="sm:col-span-6" error={errors[`pub-${i}-title`]}>
                        {(id, d) => (
                          <input
                            id={id}
                            aria-describedby={d}
                            aria-invalid={Boolean(errors[`pub-${i}-title`])}
                            className={`input ${errors[`pub-${i}-title`] ? "input-error" : ""}`}
                            value={p.title}
                            onChange={(e) => updatePub(i, { title: e.target.value })}
                          />
                        )}
                      </Field>
                      <Field label="Journal / conference" className="sm:col-span-4">
                        {(id) => <input id={id} className="input" value={p.journal} onChange={(e) => updatePub(i, { journal: e.target.value })} />}
                      </Field>
                      <Field label="Year" className="sm:col-span-2" error={errors[`pub-${i}-year`]}>
                        {(id, d) => (
                          <input
                            id={id}
                            aria-describedby={d}
                            aria-invalid={Boolean(errors[`pub-${i}-year`])}
                            type="number"
                            inputMode="numeric"
                            min={1950}
                            className={`input ${errors[`pub-${i}-year`] ? "input-error" : ""}`}
                            value={p.year}
                            onChange={(e) => updatePub(i, { year: e.target.value })}
                          />
                        )}
                      </Field>
                      <Field label="Indexing" className="sm:col-span-2">
                        {(id) => <ComboInput id={id} value={p.indexing} onChange={(v) => updatePub(i, { indexing: v })} options={INDEXING} placeholder="Scopus" />}
                      </Field>
                      <Field label="Link (DOI or URL)" className="sm:col-span-4" error={errors[`pub-${i}-url`]}>
                        {(id, d) => (
                          <input
                            id={id}
                            aria-describedby={d}
                            aria-invalid={Boolean(errors[`pub-${i}-url`])}
                            type="url"
                            className={`input ${errors[`pub-${i}-url`] ? "input-error" : ""}`}
                            placeholder="https://doi.org/…"
                            value={p.url}
                            onChange={(e) => updatePub(i, { url: e.target.value })}
                          />
                        )}
                      </Field>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </fieldset>

          <Section icon={<FileText className="h-4 w-4" />} title="CV & photo">
            <div>
              <p className="label">Curriculum vitae</p>
              <div className="flex flex-wrap items-center gap-3">
                <UploadButton label={form.cvUrl ? "Replace CV" : "Upload CV"} accept=".pdf,.doc,.docx" busy={uploading === "cv"} onFile={(f) => doUpload("cv", f)} />
                {cvHref ? (
                  <a href={cvHref} target="_blank" rel="noopener noreferrer" className="link text-sm">
                    View current CV
                  </a>
                ) : (
                  <span className="text-sm text-slate-500">No CV uploaded</span>
                )}
              </div>
              <p className="help">PDF or Word, up to 10 MB. We'll read it and fill in your details automatically.</p>
              {uploadNote("cv")}

              {form.cvUrl && !cvFill.busy && !cvFill.summary && (
                <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => fillFromCv()}>
                  <Wand2 className="h-4 w-4" /> Fill details from my CV
                </button>
              )}

              {cvFill.busy && (
                <p className="alert-info mt-3" role="status">
                  <Spinner className="h-4 w-4 shrink-0" /> Reading your CV and filling in your profile… this can take up to a minute.
                </p>
              )}

              {cvFill.error && (
                <p className="alert-error mt-3" role="alert">
                  {cvFill.error}
                </p>
              )}

              {cvFill.summary && (
                <div className="alert-success mt-3 flex-col items-stretch" role="status">
                  <p className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {cvFill.summary.filled.length + cvFill.summary.expertiseAdded + cvFill.summary.publicationsAdded > 0
                      ? "We filled in your profile from your CV"
                      : "Your profile already has everything we found in your CV"}
                  </p>
                  <ul className="ml-6 list-disc space-y-0.5 text-sm">
                    {cvFill.summary.filled.length > 0 && <li>{cvFill.summary.filled.join(", ")}</li>}
                    {cvFill.summary.expertiseAdded > 0 && <li>{cvFill.summary.expertiseAdded} area(s) of expertise</li>}
                    {cvFill.summary.publicationsAdded > 0 && <li>{cvFill.summary.publicationsAdded} publication(s)</li>}
                  </ul>
                  <p className="text-sm">
                    {cvFill.summary.note || "Fields you had already filled were not changed."} Please review everything below, then press <strong>Save changes</strong>.
                  </p>
                  <div className="flex gap-2">
                    {cvFill.undo && (
                      <button type="button" className="btn-secondary btn-sm" onClick={undoCvFill}>
                        Undo
                      </button>
                    )}
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setCvFill({ busy: false })}>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className="label">Profile photo</p>
              <div className="flex flex-wrap items-center gap-3">
                {photoHref ? (
                  <img src={photoHref} alt="Profile photo preview" className="h-14 w-14 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500" aria-hidden="true">
                    {initialsOf(displayName)}
                  </span>
                )}
                <UploadButton label={form.photoUrl ? "Replace photo" : "Upload photo"} accept=".png,.jpg,.jpeg,.webp" busy={uploading === "photo"} onFile={(f) => doUpload("photo", f)} />
                {form.photoUrl && (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => update("photoUrl", "")}>
                    Remove
                  </button>
                )}
              </div>
              <p className="help">A professional head-and-shoulders photo. PNG, JPG or WebP.</p>
              {uploadNote("photo")}
            </div>
          </Section>

          <fieldset className="min-w-0 px-5 py-5 sm:px-6">
            <legend className="sr-only">Website listing</legend>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-slate-500" aria-hidden="true">
              <Globe2 className="h-4 w-4 text-slate-400" /> Website listing
            </p>
            <label className={`choice ${form.showOnWebsite ? "choice-active" : ""}`}>
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-navy-900"
                checked={form.showOnWebsite}
                onChange={(e) => update("showOnWebsite", e.target.checked)}
              />
              <span>
                Show my profile on the Research Hub website (name, designation, institution, expertise and publication highlights — never my contact
                details)
              </span>
            </label>
            <p className="help">Giving consent does not publish your profile automatically — our team decides which experts are featured.</p>
          </fieldset>
        </div>

        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 rounded-b-lg border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div aria-live="polite" className="text-sm">
            {feedback ? (
              <span className={feedback.type === "success" ? "flex items-center gap-1.5 text-emerald-700" : "text-red-700"}>
                {feedback.type === "success" && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                {feedback.text}
              </span>
            ) : dirty ? (
              <span className="flex items-center gap-1.5 text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                You have unsaved changes.
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            {dirty && (
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => {
                  setForm(fromAccount(account));
                  setErrors({});
                  setFeedback(null);
                  setUploadMsg(null);
                }}
              >
                Discard
              </button>
            )}
            <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={saving || !dirty || uploading !== null}>
              {saving && <Spinner />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
