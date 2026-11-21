import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Link2,
  Lock,
  Paperclip,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { getErrorMessage, getPublicServiceTemplate, submitServiceRequest, uploadFile } from "../api";
import { RequirementField, Service, ServiceRequest } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { AppLink, ErrorState, Field, PageLoader, Spinner, useDocumentTitle } from "../components/ui";
import { ServicePicker } from "../components/ServicePicker";
import { ACADEMIC_DESIGNATIONS, APPLICANT_TYPES, ComboInput, INVENTOR_DESIGNATIONS } from "../components/ComboInput";
import { isIpService, useAllServices, useDomains, useReferenceData } from "../hooks/usePublicData";
import { Navigate } from "../router";

/* -------------------------------------------------------------------------- */
/* Draft state (persisted so nothing is lost when the visitor has to sign in)  */
/* -------------------------------------------------------------------------- */

type Person = { name: string; designation: string; email: string };
type FileRef = { name: string; url: string; size?: number };

interface Draft {
  serviceId: string;
  requirements: Record<string, unknown>;
  topic: string;
  brief: string;
  deadline: string;
  publicationType: string;
  targetJournal: string;
  indexingRequirement: string;
  citationStyle: string;
  files: FileRef[];
  notes: string;
  name: string;
  email: string;
  whatsapp: string;
  contactMethod: "WHATSAPP" | "EMAIL" | "PHONE";
  institution: string;
  department: string;
  academicLevel: string;
  lead: Person;
  supervisor: Person;
  others: Person[];
  consent: boolean;
}

const emptyPerson = (): Person => ({ name: "", designation: "", email: "" });

const EMPTY_DRAFT: Draft = {
  serviceId: "",
  requirements: {},
  topic: "",
  brief: "",
  deadline: "",
  publicationType: "",
  targetJournal: "",
  indexingRequirement: "",
  citationStyle: "",
  files: [],
  notes: "",
  name: "",
  email: "",
  whatsapp: "",
  contactMethod: "WHATSAPP",
  institution: "",
  department: "",
  academicLevel: "",
  lead: emptyPerson(),
  supervisor: emptyPerson(),
  others: [],
  consent: false,
};

const DRAFT_KEY = "rh_request_draft";

const loadDraft = (): Draft => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return EMPTY_DRAFT;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/* -------------------------------------------------------------------------- */

export const RequestWizardPage: React.FC<{ navigate: Navigate; initialService?: string }> = ({ navigate, initialService }) => {
  useDocumentTitle("Start a request");
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const services = useAllServices();
  const domains = useDomains();
  const refData = useReferenceData();

  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<ServiceRequest | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const formTop = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  // Persist the draft for this tab
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  // Preselect the service from the URL (?service=<id or slug>)
  useEffect(() => {
    if (!initialService || !services.data) return;
    const match = services.data.find((s) => s._id === initialService || s.slug === initialService);
    if (match && match._id !== draft.serviceId) update({ serviceId: match._id, requirements: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialService, services.data]);

  // Prefill contact details from the signed-in profile (never overwrite typed values)
  useEffect(() => {
    if (!user) return;
    setDraft((d) => ({
      ...d,
      name: d.name || [user.firstName, user.lastName].filter(Boolean).join(" "),
      email: d.email || user.email || "",
      whatsapp: d.whatsapp || user.whatsapp || user.phone || "",
      institution: d.institution || user.institution || "",
      department: d.department || user.department || "",
      academicLevel: d.academicLevel || user.academicLevel || "",
    }));
  }, [user]);

  const service: Service | undefined = services.data?.find((s) => s._id === draft.serviceId);
  const ip = isIpService(service, domains.data);

  const templateQuery = useQuery({
    queryKey: ["service-template", draft.serviceId],
    queryFn: () => getPublicServiceTemplate(draft.serviceId),
    enabled: Boolean(draft.serviceId),
    staleTime: 5 * 60 * 1000,
  });
  const template = templateQuery.data;
  const fields: RequirementField[] = useMemo(
    () => (template?.fields || []).filter((f) => f.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder),
    [template]
  );
  const usesTemplate = fields.length > 0;

  // Split services into the two practice areas for the guided picker
  const serviceGroups = useMemo(() => {
    const all = services.data || [];
    const ipList = all.filter((s) => isIpService(s, domains.data));
    return { research: all.filter((s) => !ipList.includes(s)), ip: ipList };
  }, [services.data, domains.data]);

  const people = ip
    ? {
        lead: { title: "Lead inventor", designationHint: "Select or type, e.g. Assistant Professor", options: INVENTOR_DESIGNATIONS },
        supervisor: { title: "Applicant / assignee", designationHint: "Select or type, e.g. University", nameLabel: "Applicant name", options: APPLICANT_TYPES },
        others: "Co-inventors",
        otherOptions: INVENTOR_DESIGNATIONS,
      }
    : {
        lead: { title: "Corresponding author", designationHint: "Select or type, e.g. Ph.D. Scholar", options: ACADEMIC_DESIGNATIONS },
        supervisor: { title: "Supervisor / guide", designationHint: "Select or type, e.g. Professor", nameLabel: "Full name", options: ACADEMIC_DESIGNATIONS },
        others: "Co-authors",
        otherOptions: ACADEMIC_DESIGNATIONS,
      };

  /* ------------------------------ validation ------------------------------ */

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!draft.serviceId) e.serviceId = "Please choose a service.";
    if (usesTemplate) {
      fields.forEach((f) => {
        if (f.isRequired && isEmpty(draft.requirements[f.key])) e[`req.${f.key}`] = "This field is required.";
        const v = draft.requirements[f.key];
        if (f.type === "EMAIL" && typeof v === "string" && v && !EMAIL_RE.test(v)) e[`req.${f.key}`] = "Enter a valid email address.";
      });
    } else if (draft.serviceId) {
      if (!draft.topic.trim()) e.topic = "Please give your project a title or topic.";
      if (draft.brief.trim().length < 20) e.brief = "Please describe what you need in a sentence or two (at least 20 characters).";
    }
    return e;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!draft.name.trim()) e.name = "Please enter your name.";
    if (!EMAIL_RE.test(draft.email.trim())) e.email = "Enter a valid email address.";
    if (draft.whatsapp.replace(/\D/g, "").length < 8) e.whatsapp = "Enter a valid WhatsApp / phone number with country code.";
    if (!draft.lead.name.trim()) e["lead.name"] = "Required.";
    if (!draft.lead.designation.trim()) e["lead.designation"] = "Required.";
    if (!draft.supervisor.name.trim()) e["supervisor.name"] = "Required.";
    if (!draft.supervisor.designation.trim()) e["supervisor.designation"] = "Required.";
    draft.others.forEach((p, i) => {
      if ((p.name.trim() || p.designation.trim()) && (!p.name.trim() || !p.designation.trim())) {
        e[`others.${i}`] = "Add both a name and a designation, or remove this row.";
      }
    });
    if (!draft.consent) e.consent = "Please accept the terms to continue.";
    return e;
  };

  const focusFirstError = (e: Record<string, string>) => {
    setErrors(e);
    const first = Object.keys(e)[0];
    if (!first) return;
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.querySelector<HTMLElement>("input,select,textarea,button")?.focus({ preventScroll: true });
    }, 50);
  };

  const goNext = () => {
    const e = validateStep1();
    if (Object.keys(e).length) return focusFirstError(e);
    setErrors({});
    setStep(2);
    formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goBack = () => {
    setStep(1);
    setErrors({});
    formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* -------------------------------- submit -------------------------------- */

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e1 = validateStep1();
    if (Object.keys(e1).length) {
      setStep(1);
      return focusFirstError(e1);
    }
    const e2 = validateStep2();
    if (Object.keys(e2).length) return focusFirstError(e2);
    if (!isAuthenticated) return;

    setSubmitting(true);
    setSubmitError(null);
    const person = (p: Person) => ({ name: p.name.trim(), designation: p.designation.trim(), email: p.email.trim() || undefined });

    const requirements: Record<string, unknown> = usesTemplate
      ? { ...draft.requirements }
      : { topic: draft.topic.trim(), project_brief: draft.brief.trim() };

    try {
      const result = await submitServiceRequest({
        serviceId: draft.serviceId,
        templateId: template?._id,
        name: draft.name.trim(),
        email: draft.email.trim(),
        whatsapp: draft.whatsapp.trim(),
        phone: draft.whatsapp.trim(),
        preferredContactMethod: draft.contactMethod,
        requirements,
        referenceFiles: draft.files,
        additionalMessage: draft.notes.trim() || undefined,
        academicProfile: {
          academicLevel: draft.academicLevel || undefined,
          university: draft.institution.trim() || undefined,
          department: draft.department.trim() || undefined,
          deadline: draft.deadline || undefined,
          publicationType: ip ? "Patent / IP" : draft.publicationType || undefined,
          targetJournal: ip ? undefined : draft.targetJournal.trim() || undefined,
          indexingRequirement: ip ? undefined : draft.indexingRequirement || undefined,
          citationStyle: ip ? undefined : draft.citationStyle || undefined,
          correspondingAuthor: person(draft.lead),
          supervisor: person(draft.supervisor),
          coAuthors: draft.others.filter((p) => p.name.trim()).map(person),
        },
      });
      setSubmitted(result);
      sessionStorage.removeItem(DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(getErrorMessage(err, "We couldn't submit your request. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------- rendering ------------------------------- */

  if (submitted) {
    return (
      <SubmittedView
        request={submitted}
        navigate={navigate}
        onAnother={() => {
          setDraft({ ...EMPTY_DRAFT, name: draft.name, email: draft.email, whatsapp: draft.whatsapp, institution: draft.institution, department: draft.department, academicLevel: draft.academicLevel });
          setSubmitted(null);
          setStep(1);
        }}
      />
    );
  }

  if (services.isLoading) return <PageLoader label="Preparing the form…" />;
  if (services.isError) {
    return (
      <div className="container-page section max-w-xl">
        <ErrorState onRetry={() => services.refetch()} />
      </div>
    );
  }

  const err = (k: string) => errors[k];
  const inputCls = (k: string) => `input ${err(k) ? "input-error" : ""}`;

  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="container-page py-8 sm:py-10" ref={formTop}>
          <p className="eyebrow">New request</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">Start a request</h1>
          <p className="mt-2 text-slate-600">Two short steps. You'll receive a written quotation before any work begins.</p>
          <Stepper step={step} />
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_20rem] lg:py-10">
        <div className="space-y-6">
          {step === 1 ? (
            <>
              <section className="card card-pad space-y-6" aria-labelledby="sec-service">
                <h2 id="sec-service" className="h-card">
                  What do you need?
                </h2>
                <div data-field="serviceId">
                  <ServicePicker
                    research={serviceGroups.research}
                    ip={serviceGroups.ip}
                    value={draft.serviceId}
                    error={err("serviceId")}
                    onChange={(serviceId) => update({ serviceId, requirements: {} })}
                  />
                </div>

                {draft.serviceId && (
                  <div className="divider pt-6">
                    <h3 className="text-base font-semibold text-navy-900">3. Tell us about your project</h3>
                    <p className="muted mt-1">A few quick questions so our specialists can prepare an accurate quotation.</p>
                  </div>
                )}

                {draft.serviceId && templateQuery.isLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Spinner /> Loading questions for this service…
                  </div>
                )}

                {draft.serviceId && !templateQuery.isLoading && (
                  <>
                    {usesTemplate ? (
                      <div className="grid gap-5 sm:grid-cols-2">
                        {fields.map((f) => (
                          <DynamicField
                            key={f._id || f.key}
                            field={f}
                            value={draft.requirements[f.key]}
                            error={err(`req.${f.key}`)}
                            canUpload={isAuthenticated}
                            onChange={(v) => setDraft((d) => ({ ...d, requirements: { ...d.requirements, [f.key]: v } }))}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-5">
                        <div data-field="topic">
                          <Field label={ip ? "Title of the invention / work" : "Project title or topic"} required error={err("topic")}>
                            {(id, d) => (
                              <input
                                id={id}
                                aria-describedby={d}
                                className={inputCls("topic")}
                                value={draft.topic}
                                onChange={(e) => update({ topic: e.target.value })}
                                placeholder={ip ? "e.g. Low-cost water purification cartridge" : "e.g. Deep learning for early crop disease detection"}
                              />
                            )}
                          </Field>
                        </div>
                        <div data-field="brief">
                          <Field
                            label="Describe what you need"
                            required
                            error={err("brief")}
                            help="Scope, current stage, and anything we should know. You can add detail later."
                          >
                            {(id, d) => (
                              <textarea
                                id={id}
                                aria-describedby={d}
                                rows={5}
                                className={inputCls("brief")}
                                value={draft.brief}
                                onChange={(e) => update({ brief: e.target.value })}
                              />
                            )}
                          </Field>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Target date" help="Optional. Tell us if you are working to a deadline.">
                        {(id, d) => (
                          <input
                            id={id}
                            aria-describedby={d}
                            type="date"
                            className="input"
                            min={new Date().toISOString().slice(0, 10)}
                            value={draft.deadline}
                            onChange={(e) => update({ deadline: e.target.value })}
                          />
                        )}
                      </Field>
                    </div>

                    {!ip && (
                      <div className="rounded-md border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowPrefs((s) => !s)}
                          aria-expanded={showPrefs}
                          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-navy-900"
                        >
                          Publication preferences <span className="font-normal text-slate-500">(optional)</span>
                          <ChevronDown className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${showPrefs ? "rotate-180" : ""}`} />
                        </button>
                        {showPrefs && (
                          <div className="grid gap-5 border-t border-slate-200 p-4 sm:grid-cols-2">
                            <RefSelect label="Publication type" items={refData.data?.publication_types} value={draft.publicationType} onChange={(v) => update({ publicationType: v })} />
                            <RefSelect label="Indexing target" items={refData.data?.indexing_targets} value={draft.indexingRequirement} onChange={(v) => update({ indexingRequirement: v })} />
                            <RefSelect label="Citation style" items={refData.data?.citation_styles} value={draft.citationStyle} onChange={(v) => update({ citationStyle: v })} />
                            <Field label="Target journal or conference">
                              {(id) => <input id={id} className="input" value={draft.targetJournal} onChange={(e) => update({ targetJournal: e.target.value })} />}
                            </Field>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="card card-pad space-y-5" aria-labelledby="sec-files">
                <div>
                  <h2 id="sec-files" className="h-card">
                    Supporting files <span className="text-sm font-normal text-slate-500">(optional)</span>
                  </h2>
                  <p className="muted mt-1">
                    {ip
                      ? "Sketches, draft specifications, examination reports or prior documents."
                      : "Drafts, data, guidelines from your institution or target journal."}
                  </p>
                </div>
                <Attachments files={draft.files} canUpload={isAuthenticated} onChange={(files) => update({ files })} navigate={navigate} />
                <Field label="Anything else we should know?">
                  {(id) => <textarea id={id} rows={3} className="input" value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />}
                </Field>
              </section>

              <div className="flex justify-end">
                <button type="button" onClick={goNext} className="btn-primary btn-lg w-full sm:w-auto">
                  Continue to your details <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <section className="card card-pad space-y-5" aria-labelledby="sec-contact">
                <h2 id="sec-contact" className="h-card">
                  Contact details
                </h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div data-field="name">
                    <Field label="Full name" required error={err("name")}>
                      {(id, d) => <input id={id} aria-describedby={d} autoComplete="name" className={inputCls("name")} value={draft.name} onChange={(e) => update({ name: e.target.value })} />}
                    </Field>
                  </div>
                  <div data-field="email">
                    <Field label="Email" required error={err("email")}>
                      {(id, d) => <input id={id} aria-describedby={d} type="email" autoComplete="email" className={inputCls("email")} value={draft.email} onChange={(e) => update({ email: e.target.value })} />}
                    </Field>
                  </div>
                  <div data-field="whatsapp">
                    <Field label="WhatsApp / phone" required error={err("whatsapp")} help="Include the country code, e.g. +91 98765 43210">
                      {(id, d) => <input id={id} aria-describedby={d} type="tel" autoComplete="tel" className={inputCls("whatsapp")} value={draft.whatsapp} onChange={(e) => update({ whatsapp: e.target.value })} />}
                    </Field>
                  </div>
                  <fieldset>
                    <legend className="label">Preferred contact</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {(["WHATSAPP", "EMAIL", "PHONE"] as const).map((m) => (
                        <label key={m} className={`choice justify-center py-2.5 ${draft.contactMethod === m ? "choice-active" : ""}`}>
                          <input type="radio" name="contactMethod" className="sr-only" checked={draft.contactMethod === m} onChange={() => update({ contactMethod: m })} />
                          {m === "WHATSAPP" ? "WhatsApp" : m === "EMAIL" ? "Email" : "Phone"}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label={ip ? "Organisation / institution" : "University / institution"}>
                    {(id) => <input id={id} autoComplete="organization" className="input" value={draft.institution} onChange={(e) => update({ institution: e.target.value })} />}
                  </Field>
                  {ip ? (
                    <Field label="Department / team">
                      {(id) => <input id={id} className="input" value={draft.department} onChange={(e) => update({ department: e.target.value })} />}
                    </Field>
                  ) : (
                    <RefSelect label="Academic level" items={refData.data?.academic_levels} value={draft.academicLevel} onChange={(v) => update({ academicLevel: v })} />
                  )}
                </div>
              </section>

              <section className="card card-pad space-y-6" aria-labelledby="sec-people">
                <div>
                  <h2 id="sec-people" className="h-card">
                    {ip ? "Inventor & applicant" : "Authors & supervisor"}
                  </h2>
                  <p className="muted mt-1">
                    {ip
                      ? "Needed to prepare the application documents correctly."
                      : "Needed for correct authorship and manuscript formatting."}
                  </p>
                </div>

                <PersonRow
                  title={people.lead.title}
                  person={draft.lead}
                  prefix="lead"
                  errors={errors}
                  designationHint={people.lead.designationHint}
                  designationOptions={people.lead.options}
                  required
                  onChange={(lead) => update({ lead })}
                />
                <PersonRow
                  title={people.supervisor.title}
                  person={draft.supervisor}
                  prefix="supervisor"
                  errors={errors}
                  nameLabel={people.supervisor.nameLabel}
                  designationLabel={ip ? "Applicant type" : undefined}
                  designationHint={people.supervisor.designationHint}
                  designationOptions={people.supervisor.options}
                  required
                  onChange={(supervisor) => update({ supervisor })}
                />

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-navy-900">
                      {people.others} <span className="font-normal text-slate-500">(optional)</span>
                    </h3>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => update({ others: [...draft.others, emptyPerson()] })}
                      disabled={draft.others.length >= 10}
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {draft.others.map((p, i) => (
                      <div key={i} data-field={`others.${i}`} className="rounded-md border border-slate-200 p-3">
                        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                          <Field label="Name">
                            {(id) => (
                              <input id={id} className="input" value={p.name} onChange={(e) => update({ others: draft.others.map((o, j) => (j === i ? { ...o, name: e.target.value } : o)) })} />
                            )}
                          </Field>
                          <Field label="Designation">
                            {(id) => (
                              <ComboInput
                                id={id}
                                options={people.otherOptions}
                                placeholder="Select or type"
                                value={p.designation}
                                onChange={(v) => update({ others: draft.others.map((o, j) => (j === i ? { ...o, designation: v } : o)) })}
                              />
                            )}
                          </Field>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`Remove ${people.others.toLowerCase().slice(0, -1)} ${i + 1}`}
                            onClick={() => update({ others: draft.others.filter((_, j) => j !== i) })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {err(`others.${i}`) && <p className="error-text">{err(`others.${i}`)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="card card-pad space-y-4">
                <label data-field="consent" className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-900 focus:ring-navy-500"
                    checked={draft.consent}
                    onChange={(e) => update({ consent: e.target.checked })}
                  />
                  <span>
                    I confirm the information is accurate and agree to the{" "}
                    <AppLink to="terms" navigate={navigate} className="link" target="_blank">
                      terms of service
                    </AppLink>{" "}
                    and{" "}
                    <AppLink to="privacy" navigate={navigate} className="link" target="_blank">
                      privacy policy
                    </AppLink>
                    .
                  </span>
                </label>
                {err("consent") && <p className="error-text">{err("consent")}</p>}

                {!isAuthenticated && (
                  <div className="alert-info">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Sign in to submit and track your request</p>
                      <p className="mt-0.5 text-navy-700">Your answers are saved — you'll come straight back here.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className="btn-primary btn-sm" onClick={() => navigate("login", { redirect: "wizard" })}>
                          Sign in
                        </button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => navigate("register", { redirect: "wizard" })}>
                          Create an account
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="alert-error" role="alert">
                    {submitError}
                  </div>
                )}
              </section>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button type="button" onClick={goBack} className="btn-secondary btn-lg">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button type="submit" className="btn-primary btn-lg" disabled={submitting || !isAuthenticated}>
                  {submitting ? (
                    <>
                      <Spinner /> Submitting…
                    </>
                  ) : (
                    <>
                      Submit request <Check className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Summary */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">Your request</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Service</dt>
                <dd className="font-medium text-navy-900">{service?.name || "Not selected yet"}</dd>
              </div>
              {Boolean(draft.topic || draft.requirements.invention_title || draft.requirements.research_topic) && (
                <div>
                  <dt className="text-slate-500">Title</dt>
                  <dd className="font-medium text-navy-900">
                    {String(draft.requirements.invention_title || draft.requirements.research_topic || draft.topic)}
                  </dd>
                </div>
              )}
              {draft.deadline && (
                <div>
                  <dt className="text-slate-500">Target date</dt>
                  <dd className="font-medium text-navy-900">{new Date(draft.deadline).toLocaleDateString()}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Files</dt>
                <dd className="font-medium text-navy-900">{draft.files.length || "None"}</dd>
              </div>
            </dl>
          </div>
          <div className="panel-muted p-5 text-sm text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-navy-900">
              <Lock className="h-4 w-4" /> Confidential
            </p>
            <p className="mt-2">Only the specialists assigned to your request can see what you share. There is no charge until you accept a quotation.</p>
          </div>
        </aside>
      </form>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Pieces                                                                      */
/* -------------------------------------------------------------------------- */

const Stepper: React.FC<{ step: 1 | 2 }> = ({ step }) => (
  <ol className="mt-6 flex items-center gap-3 text-sm" aria-label="Progress">
    {["Your project", "Your details"].map((label, i) => {
      const n = (i + 1) as 1 | 2;
      const done = step > n;
      const active = step === n;
      return (
        <li key={label} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              done ? "bg-emerald-600 text-white" : active ? "bg-navy-900 text-white" : "border border-slate-300 text-slate-500"
            }`}
          >
            {done ? <Check className="h-4 w-4" /> : n}
          </span>
          <span className={active ? "font-semibold text-navy-900" : "text-slate-500"}>{label}</span>
          {n === 1 && <span className="h-px w-8 bg-slate-300 sm:w-16" aria-hidden="true" />}
        </li>
      );
    })}
  </ol>
);

const RefSelect: React.FC<{
  label: string;
  items?: { id: string; label: string; isActive?: boolean }[];
  value: string;
  onChange: (value: string) => void;
}> = ({ label, items, value, onChange }) => (
  <Field label={label}>
    {(id) => (
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {(items || [])
          .filter((i) => i.isActive !== false)
          .map((i) => (
            <option key={i.id} value={i.label}>
              {i.label}
            </option>
          ))}
      </select>
    )}
  </Field>
);

const PersonRow: React.FC<{
  title: string;
  person: Person;
  prefix: string;
  errors: Record<string, string>;
  required?: boolean;
  nameLabel?: string;
  designationLabel?: string;
  designationHint?: string;
  designationOptions: string[];
  onChange: (p: Person) => void;
}> = ({ title, person, prefix, errors, required, nameLabel = "Full name", designationLabel = "Designation", designationHint, designationOptions, onChange }) => (
  <fieldset className="rounded-md border border-slate-200 p-4">
    <legend className="px-1 text-sm font-semibold text-navy-900">{title}</legend>
    <div className="grid gap-4 sm:grid-cols-3">
      <div data-field={`${prefix}.name`}>
        <Field label={nameLabel} required={required} error={errors[`${prefix}.name`]}>
          {(id, d) => (
            <input id={id} aria-describedby={d} className={`input ${errors[`${prefix}.name`] ? "input-error" : ""}`} value={person.name} onChange={(e) => onChange({ ...person, name: e.target.value })} />
          )}
        </Field>
      </div>
      <div data-field={`${prefix}.designation`}>
        <Field label={designationLabel} required={required} error={errors[`${prefix}.designation`]}>
          {(id, d) => (
            <ComboInput
              id={id}
              describedBy={d}
              options={designationOptions}
              placeholder={designationHint}
              invalid={Boolean(errors[`${prefix}.designation`])}
              value={person.designation}
              onChange={(designation) => onChange({ ...person, designation })}
            />
          )}
        </Field>
      </div>
      <Field label="Email">
        {(id) => <input id={id} type="email" className="input" value={person.email} onChange={(e) => onChange({ ...person, email: e.target.value })} />}
      </Field>
    </div>
  </fieldset>
);

/** Renders any requirement field type defined by admins in a service template. */
const DynamicField: React.FC<{
  field: RequirementField;
  value: unknown;
  error?: string;
  canUpload: boolean;
  onChange: (value: unknown) => void;
}> = ({ field, value, error, canUpload, onChange }) => {
  const wide = ["LONG_TEXT", "MULTI_SELECT", "CHECKBOX", "RADIO", "FILE", "MULTI_FILE"].includes(field.type);
  const cls = `input ${error ? "input-error" : ""}`;
  const str = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const list = Array.isArray(value) ? (value as string[]) : [];

  const control = (id: string, d?: string) => {
    switch (field.type) {
      case "LONG_TEXT":
        return <textarea id={id} aria-describedby={d} rows={4} className={cls} placeholder={field.placeholder} value={str} onChange={(e) => onChange(e.target.value)} />;
      case "NUMBER":
        return <input id={id} aria-describedby={d} type="number" inputMode="decimal" className={cls} placeholder={field.placeholder} value={str} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
      case "EMAIL":
        return <input id={id} aria-describedby={d} type="email" className={cls} placeholder={field.placeholder} value={str} onChange={(e) => onChange(e.target.value)} />;
      case "PHONE":
        return <input id={id} aria-describedby={d} type="tel" className={cls} placeholder={field.placeholder} value={str} onChange={(e) => onChange(e.target.value)} />;
      case "DATE":
        return <input id={id} aria-describedby={d} type="date" className={cls} value={str} onChange={(e) => onChange(e.target.value)} />;
      case "SELECT":
        return (
          <select id={id} aria-describedby={d} className={cls} value={str} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select…</option>
            {(field.options || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case "RADIO":
        return (
          <div id={id} role="radiogroup" aria-describedby={d} className="grid gap-2 sm:grid-cols-2">
            {(field.options || []).map((o) => (
              <label key={o.value} className={`choice ${value === o.value ? "choice-active" : ""}`}>
                <input type="radio" className="mt-0.5 accent-navy-900" name={field.key} checked={value === o.value} onChange={() => onChange(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        );
      case "MULTI_SELECT":
      case "CHECKBOX":
        if (field.type === "CHECKBOX" && !(field.options || []).length) {
          return (
            <label className="choice">
              <input id={id} type="checkbox" className="mt-0.5 accent-navy-900" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
              {field.placeholder || "Yes"}
            </label>
          );
        }
        return (
          <div id={id} aria-describedby={d} className="grid gap-2 sm:grid-cols-2">
            {(field.options || []).map((o) => {
              const on = list.includes(o.value);
              return (
                <label key={o.value} className={`choice ${on ? "choice-active" : ""}`}>
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-navy-900"
                    checked={on}
                    onChange={() => onChange(on ? list.filter((v) => v !== o.value) : [...list, o.value])}
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        );
      case "BOOLEAN":
        return (
          <div id={id} role="radiogroup" aria-describedby={d} className="grid grid-cols-2 gap-2">
            {[
              { v: true, l: "Yes" },
              { v: false, l: "No" },
            ].map((o) => (
              <label key={o.l} className={`choice justify-center ${value === o.v ? "choice-active" : ""}`}>
                <input type="radio" className="sr-only" name={field.key} checked={value === o.v} onChange={() => onChange(o.v)} />
                {o.l}
              </label>
            ))}
          </div>
        );
      case "FILE":
      case "MULTI_FILE":
        return (
          <Attachments
            files={Array.isArray(value) ? (value as FileRef[]) : []}
            canUpload={canUpload}
            max={field.type === "FILE" ? 1 : 5}
            onChange={(files) => onChange(files)}
          />
        );
      default:
        return <input id={id} aria-describedby={d} className={cls} placeholder={field.placeholder} value={str} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  return (
    <div data-field={`req.${field.key}`} className={wide ? "sm:col-span-2" : ""}>
      <Field label={field.label} required={field.isRequired} error={error} help={field.description}>
        {control}
      </Field>
    </div>
  );
};

/** Upload (when signed in) or link files. */
const Attachments: React.FC<{
  files: FileRef[];
  canUpload: boolean;
  max?: number;
  navigate?: Navigate;
  onChange: (files: FileRef[]) => void;
}> = ({ files, canUpload, max = 5, navigate, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const full = files.length >= max;

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).slice(0, max - files.length);
    e.target.value = "";
    if (!picked.length) return;
    setError(null);
    setUploading(true);
    const added: FileRef[] = [];
    for (const f of picked) {
      try {
        const res = await uploadFile(f, "references");
        added.push({ name: f.name, url: res.url, size: res.size });
      } catch (err) {
        setError(`${f.name}: ${getErrorMessage(err)}`);
      }
    }
    onChange([...files, ...added]);
    setUploading(false);
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      setError("Links must start with http:// or https://");
      return;
    }
    setError(null);
    onChange([...files, { name: linkName.trim() || url, url }]);
    setLinkName("");
    setLinkUrl("");
  };

  return (
    <div className="space-y-3">
      {files.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {files.map((f, i) => (
            <li key={`${f.url}-${i}`} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              {/^https?:\/\/[^/]+\/uploads\//.test(f.url) ? <FileText className="h-4 w-4 text-slate-400" /> : <Link2 className="h-4 w-4 text-slate-400" />}
              <span className="min-w-0 flex-1 truncate text-slate-700">{f.name}</span>
              <button type="button" className="icon-btn h-8 w-8" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {canUpload ? (
            <>
              <input
                ref={inputRef}
                type="file"
                multiple={max > 1}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp"
                className="sr-only"
                onChange={onPick}
                tabIndex={-1}
              />
              <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading ? <Spinner /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Upload files"}
              </button>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Paperclip className="h-4 w-4" />
              {navigate ? (
                <span>
                  <button type="button" className="link" onClick={() => navigate("login", { redirect: "wizard" })}>
                    Sign in
                  </button>{" "}
                  to upload files, or add a link below.
                </span>
              ) : (
                "Sign in to upload files, or add a link."
              )}
            </p>
          )}
        </div>
      )}

      {!full && (
        <div className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
          <label className="sr-only" htmlFor="link-name">
            Link name
          </label>
          <input id="link-name" className="input" placeholder="Link name (optional)" value={linkName} onChange={(e) => setLinkName(e.target.value)} />
          <label className="sr-only" htmlFor="link-url">
            Link URL
          </label>
          <input
            id="link-url"
            type="url"
            className="input"
            placeholder="https://drive.google.com/…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
          />
          <button type="button" className="btn-secondary" onClick={addLink} disabled={!linkUrl.trim()}>
            <Plus className="h-4 w-4" /> Add link
          </button>
        </div>
      )}
      <p className="help">PDF, Word, Excel, PowerPoint, ZIP or images, up to 10 MB each. Maximum {max} item{max === 1 ? "" : "s"}.</p>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
};

const SubmittedView: React.FC<{ request: ServiceRequest; navigate: Navigate; onAnother: () => void }> = ({ request, navigate, onAnother }) => (
  <div className="bg-slate-50">
    <div className="container-page section max-w-2xl">
      <div className="card overflow-hidden text-center">
        <div className="bg-navy-900 px-6 py-10 text-white">
          <CheckCircle2 className="mx-auto h-12 w-12 text-accent-300" />
          <h1 className="mt-4 font-serif text-3xl font-semibold text-white">Request received</h1>
          <p className="mt-2 text-navy-200">Thank you. A specialist will review your brief shortly.</p>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm text-slate-500">Your reference number</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-wide text-navy-900">{request.requestNumber}</p>
          <ol className="mt-8 space-y-4 text-left text-sm">
            {[
              "We review your brief and may message you if we need anything else.",
              "You receive a written quotation in your dashboard.",
              "After payment is confirmed, work begins and you can track every step.",
            ].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-semibold text-navy-700">{i + 1}</span>
                <span className="text-slate-700">{t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" className="btn-primary" onClick={() => navigate("customer-dashboard", { tab: "requests" })}>
              Track this request
            </button>
            <button type="button" className="btn-secondary" onClick={onAnother}>
              Submit another request
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
