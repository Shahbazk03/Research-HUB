import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeIndianRupee,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { applyAsWriter, getPublicExperts, PublicExpert, WriterPublication } from "../api/writers";
import { getErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext";
import { AppLink, EmptyState, ErrorState, Field, PageHeader, Spinner, useDocumentTitle } from "../components/ui";
import { ExpertCard } from "../components/ExpertCard";
import { ACADEMIC_DESIGNATIONS, ComboInput } from "../components/ComboInput";
import { Navigate } from "../router";
import { usePersistedPublicQuery } from "../hooks/usePublicData";

const useExperts = () => usePersistedPublicQuery("public-experts", getPublicExperts);

/* -------------------------------------------------------------------------- */
/* Home page section                                                           */
/* -------------------------------------------------------------------------- */

/** "Our experts" strip for the home page. Shows featured experts, or an invitation to join if none yet. */
export const ExpertsShowcase: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  const { data: experts } = useExperts();
  const list = experts || [];

  const totals = useMemo(
    () => ({
      experts: list.length,
      publications: list.reduce((s, e) => s + e.publicationCount, 0),
      institutions: new Set(list.map((e) => e.institution).filter(Boolean)).size,
    }),
    [list]
  );

  if (list.length === 0) {
    return (
      <section className="section-tight border-y border-slate-200 bg-white">
        <div className="container-page flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="eyebrow">For academics</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-navy-900 sm:text-3xl">Are you a professor or published researcher?</h2>
            <p className="mt-2 text-slate-600">Join our expert network, take on research projects in your field and get paid fairly for your expertise.</p>
          </div>
          <AppLink to="join-experts" navigate={navigate} className="btn-primary btn-lg shrink-0">
            Join as an expert <ArrowRight className="h-4 w-4" />
          </AppLink>
        </div>
      </section>
    );
  }

  return (
    <section className="section border-y border-slate-200 bg-slate-50">
      <div className="container-page">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Our experts</p>
            <h2 className="h-section mt-3">Work with published academics</h2>
            <p className="lead mt-4 text-base">
              Every project is handled by verified professors and researchers with a record of peer-reviewed publications.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-6 text-center lg:text-left">
            {[
              [totals.experts, "Verified experts"],
              [totals.publications, "Publications"],
              [totals.institutions, "Institutions"],
            ].map(([n, l]) => (
              <div key={String(l)}>
                <dd className="font-serif text-3xl font-semibold text-navy-900">{n}</dd>
                <dt className="text-xs text-slate-500">{l}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list.slice(0, 4).map((e) => (
            <ExpertCard key={e._id} expert={e} />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <AppLink to="experts" navigate={navigate} className="btn-secondary">
            Meet all experts <ArrowRight className="h-4 w-4" />
          </AppLink>
          <AppLink to="join-experts" navigate={navigate} className="btn-ghost">
            Join as an expert
          </AppLink>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Directory                                                                   */
/* -------------------------------------------------------------------------- */

export const ExpertsPage: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  useDocumentTitle("Our experts");
  const experts = useExperts();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return experts.data || [];
    return (experts.data || []).filter((e: PublicExpert) =>
      [e.name, e.designation, e.institution, e.department, ...e.expertise].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [experts.data, search]);

  return (
    <>
      <PageHeader
        eyebrow="Our experts"
        title="Verified professors and researchers"
        description={<span className="block max-w-2xl">Research Hub projects are written and reviewed by academics with real publication records. Every profile is verified by our team.</span>}
        actions={
          <AppLink to="join-experts" navigate={navigate} className="btn-primary">
            Join as an expert
          </AppLink>
        }
      />
      <section className="container-page py-8 lg:py-12">
        <div className="relative max-w-xl">
          <label htmlFor="expert-search" className="sr-only">
            Search experts
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="expert-search"
            type="search"
            className="input pl-10"
            placeholder="Search by name, subject or institution"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mt-8">
          {experts.isError ? (
            <ErrorState onRetry={() => experts.refetch()} />
          ) : experts.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card h-80 p-5">
                  <div className="skeleton h-14 w-14 rounded-full" />
                  <div className="skeleton mt-4 h-5 w-2/3" />
                  <div className="skeleton mt-2 h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={search ? "No experts match your search" : "Our expert directory is growing"}
              message={search ? "Try a different subject or name." : "Verified experts will appear here soon."}
              action={
                <AppLink to="join-experts" navigate={navigate} className="btn-primary btn-sm">
                  Join as an expert
                </AppLink>
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((e) => (
                <ExpertCard key={e._id} expert={e} detailed />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/* Application                                                                 */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDEXING = ["Scopus", "Web of Science", "SCI / SCIE", "UGC-CARE", "PubMed", "IEEE", "Springer", "Elsevier", "Other"];

const BENEFITS = [
  { icon: <Briefcase className="h-5 w-5" />, title: "Projects in your field", text: "See research briefs matched to your subject and choose what you want to work on." },
  { icon: <BadgeIndianRupee className="h-5 w-5" />, title: "Fee agreed upfront", text: "Propose your fee, agree final terms before you start, and track every payout." },
  { icon: <CalendarClock className="h-5 w-5" />, title: "Clear timelines", text: "Every assignment has a fixed deadline you accept in advance — no surprises." },
  { icon: <ShieldCheck className="h-5 w-5" />, title: "Recognition", text: "With your consent, your verified profile is featured on our website." },
];

export const JoinExpertsPage: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  useDocumentTitle("Join as an expert");
  const { setSession, isAuthenticated, isWriter } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    institution: "",
    department: "",
    title: "",
    designation: "",
    highestQualification: "",
    yearsOfExperience: "",
    city: "",
    country: "India",
    bio: "",
    googleScholarUrl: "",
    orcidId: "",
    linkedinUrl: "",
  });
  const [expertise, setExpertise] = useState<string[]>([]);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [publications, setPublications] = useState<WriterPublication[]>([]);
  const [showOnWebsite, setShowOnWebsite] = useState(true);
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const addExpertise = () => {
    const v = expertiseInput.trim().replace(/,$/, "");
    if (v && !expertise.includes(v) && expertise.length < 20) setExpertise([...expertise, v]);
    setExpertiseInput("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "Required.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (!form.institution.trim()) next.institution = "Required.";
    if (!form.designation.trim()) next.designation = "Required.";
    if (expertise.length === 0 && !expertiseInput.trim()) next.expertise = "Add at least one subject.";
    if (!agree) next.agree = "Please accept to continue.";
    setErrors(next);
    if (Object.keys(next).length) {
      document.querySelector(`[data-field="${Object.keys(next)[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const allExpertise = expertiseInput.trim() ? Array.from(new Set([...expertise, expertiseInput.trim()])) : expertise;
    setSubmitting(true);
    setError(null);
    try {
      const res = await applyAsWriter({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        whatsapp: form.phone.trim() || undefined,
        institution: form.institution.trim(),
        department: form.department.trim() || undefined,
        writerProfile: {
          title: form.title || undefined,
          designation: form.designation.trim(),
          highestQualification: form.highestQualification.trim() || undefined,
          yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
          bio: form.bio.trim() || undefined,
          googleScholarUrl: form.googleScholarUrl.trim() || undefined,
          orcidId: form.orcidId.trim() || undefined,
          linkedinUrl: form.linkedinUrl.trim() || undefined,
          expertise: allExpertise,
          publications: publications.filter((p) => p.title.trim()),
          showOnWebsite,
        },
      });
      setSession(res.data.token, res.data.user);
      navigate("writer", { tab: "profile", welcome: "1" });
    } catch (err) {
      setError(getErrorMessage(err, "We couldn't submit your application. Please try again."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated && isWriter) {
    return (
      <div className="container-page section max-w-xl">
        <EmptyState
          title="You're already part of our expert network"
          message="Manage your profile and projects from your writer portal."
          action={
            <button type="button" className="btn-primary btn-sm" onClick={() => navigate("writer")}>
              Open writer portal
            </button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <section className="border-b border-slate-200 bg-navy-950 text-white">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-16">
          <div>
            <p className="eyebrow text-accent-300">
              <span className="h-px w-6 bg-accent-400" /> Expert network
            </p>
            <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              Write for Research Hub
            </h1>
            <p className="mt-4 max-w-xl text-lg text-navy-200">
              We work with university professors, doctoral researchers and subject experts across disciplines. Apply in a
              few minutes — our team reviews every profile.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <li key={b.title} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-accent-300">{b.icon}</span>
                <p className="mt-2 font-semibold text-white">{b.title}</p>
                <p className="mt-1 text-sm text-navy-200">{b.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-slate-50">
        <form onSubmit={submit} noValidate className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_20rem] lg:py-12">
          <div className="space-y-6">
            {error && (
              <div className="alert-error" role="alert">
                {error}
              </div>
            )}

            <FormCard title="Your account" subtitle="You'll use these details to sign in to your writer portal.">
              <div className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
                <Field label="Title">
                  {(id) => (
                    <select id={id} className="input" value={form.title} onChange={set("title")}>
                      <option value="">—</option>
                      {["Dr.", "Prof.", "Mr.", "Ms.", "Mrs."].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  )}
                </Field>
                <div data-field="firstName">
                  <Field label="First name" required error={errors.firstName}>
                    {(id, d) => <input id={id} aria-describedby={d} className={`input ${errors.firstName ? "input-error" : ""}`} autoComplete="given-name" value={form.firstName} onChange={set("firstName")} />}
                  </Field>
                </div>
                <Field label="Last name">
                  {(id) => <input id={id} className="input" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} />}
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div data-field="email">
                  <Field label="Email" required error={errors.email} help="Preferably your institutional email.">
                    {(id, d) => <input id={id} aria-describedby={d} type="email" autoComplete="email" className={`input ${errors.email ? "input-error" : ""}`} value={form.email} onChange={set("email")} />}
                  </Field>
                </div>
                <Field label="WhatsApp / phone" help="Include the country code.">
                  {(id, d) => <input id={id} aria-describedby={d} type="tel" autoComplete="tel" className="input" value={form.phone} onChange={set("phone")} />}
                </Field>
              </div>
              <div data-field="password">
                <Field label="Create a password" required error={errors.password} help="At least 8 characters.">
                  {(id, d) => (
                    <div className="relative">
                      <input id={id} aria-describedby={d} type={showPassword ? "text" : "password"} autoComplete="new-password" className={`input pr-11 ${errors.password ? "input-error" : ""}`} value={form.password} onChange={set("password")} />
                      <button type="button" className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </Field>
              </div>
            </FormCard>

            <FormCard title="Academic profile" subtitle="Tell us where you work and what you specialise in.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div data-field="designation">
                  <Field label="Designation" required error={errors.designation}>
                    {(id, d) => (
                      <ComboInput id={id} describedBy={d} options={ACADEMIC_DESIGNATIONS} placeholder="Select or type" invalid={Boolean(errors.designation)} value={form.designation} onChange={(designation) => setForm((f) => ({ ...f, designation }))} />
                    )}
                  </Field>
                </div>
                <div data-field="institution">
                  <Field label="University / organisation" required error={errors.institution}>
                    {(id, d) => <input id={id} aria-describedby={d} autoComplete="organization" className={`input ${errors.institution ? "input-error" : ""}`} value={form.institution} onChange={set("institution")} />}
                  </Field>
                </div>
                <Field label="Department">
                  {(id) => <input id={id} className="input" value={form.department} onChange={set("department")} />}
                </Field>
                <Field label="Highest qualification">
                  {(id) => (
                    <ComboInput id={id} options={["Ph.D.", "Post-doctorate", "M.Phil.", "M.Tech / M.E.", "M.Sc / MS", "MBA", "LL.M.", "MD / MS (Medicine)"]} placeholder="Select or type" value={form.highestQualification} onChange={(highestQualification) => setForm((f) => ({ ...f, highestQualification }))} />
                  )}
                </Field>
                <Field label="Years of experience">
                  {(id) => <input id={id} type="number" min={0} max={70} inputMode="numeric" className="input" value={form.yearsOfExperience} onChange={set("yearsOfExperience")} />}
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="City">
                    {(id) => <input id={id} className="input" value={form.city} onChange={set("city")} />}
                  </Field>
                  <Field label="Country">
                    {(id) => <input id={id} className="input" value={form.country} onChange={set("country")} />}
                  </Field>
                </div>
              </div>

              <div data-field="expertise">
                <Field label="Subjects you can write in" required error={errors.expertise} help="Type a subject and press Enter, e.g. Machine Learning, Pharmacology, Patent Law.">
                  {(id, d) => (
                    <div className={`flex flex-wrap items-center gap-2 rounded-md border bg-white px-2.5 py-2 focus-within:border-navy-500 focus-within:ring-2 focus-within:ring-navy-500/20 ${errors.expertise ? "border-red-400" : "border-slate-300"}`}>
                      {expertise.map((x) => (
                        <span key={x} className="badge-navy gap-1.5">
                          {x}
                          <button type="button" aria-label={`Remove ${x}`} onClick={() => setExpertise(expertise.filter((y) => y !== x))}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        id={id}
                        aria-describedby={d}
                        className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-base focus:outline-none sm:text-sm"
                        value={expertiseInput}
                        onChange={(e) => setExpertiseInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            addExpertise();
                          }
                        }}
                        onBlur={addExpertise}
                        placeholder={expertise.length ? "Add another…" : "e.g. Machine Learning"}
                      />
                    </div>
                  )}
                </Field>
              </div>

              <Field label="Short bio" help="2–4 sentences about your research and teaching. Shown on your public profile if you opt in.">
                {(id, d) => <textarea id={id} aria-describedby={d} rows={4} className="input" value={form.bio} onChange={set("bio")} />}
              </Field>
            </FormCard>

            <FormCard title="Publications" subtitle="Add your key papers. You can add more and upload your CV after applying.">
              <div className="space-y-3">
                {publications.map((p, i) => (
                  <div key={i} className="rounded-md border border-slate-200 p-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <Field label="Paper title" required>
                        {(id) => <input id={id} className="input" value={p.title} onChange={(e) => setPublications(publications.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />}
                      </Field>
                      <button type="button" className="icon-btn self-end" aria-label={`Remove publication ${i + 1}`} onClick={() => setPublications(publications.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_6rem_1.4fr]">
                      <Field label="Journal / conference">
                        {(id) => <input id={id} className="input" value={p.journal || ""} onChange={(e) => setPublications(publications.map((x, j) => (j === i ? { ...x, journal: e.target.value } : x)))} />}
                      </Field>
                      <Field label="Year">
                        {(id) => <input id={id} type="number" min={1950} max={2100} inputMode="numeric" className="input" value={p.year ?? ""} onChange={(e) => setPublications(publications.map((x, j) => (j === i ? { ...x, year: e.target.value ? Number(e.target.value) : undefined } : x)))} />}
                      </Field>
                      <Field label="Indexed in">
                        {(id) => <ComboInput id={id} options={INDEXING} placeholder="Select or type" value={p.indexing || ""} onChange={(indexing) => setPublications(publications.map((x, j) => (j === i ? { ...x, indexing } : x)))} />}
                      </Field>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-secondary btn-sm" onClick={() => setPublications([...publications, { title: "" }])} disabled={publications.length >= 50}>
                  <Plus className="h-4 w-4" /> Add publication
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Google Scholar profile">
                  {(id) => <input id={id} type="url" className="input" placeholder="https://scholar.google.com/…" value={form.googleScholarUrl} onChange={set("googleScholarUrl")} />}
                </Field>
                <Field label="ORCID iD">
                  {(id) => <input id={id} className="input" placeholder="0000-0000-0000-0000" value={form.orcidId} onChange={set("orcidId")} />}
                </Field>
                <Field label="LinkedIn">
                  {(id) => <input id={id} type="url" className="input" placeholder="https://linkedin.com/in/…" value={form.linkedinUrl} onChange={set("linkedinUrl")} />}
                </Field>
              </div>
            </FormCard>

            <FormCard title="Consent">
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-navy-900" checked={showOnWebsite} onChange={(e) => setShowOnWebsite(e.target.checked)} />
                <span>
                  Show my profile on the Research Hub website (name, designation, institution, subjects and publication
                  highlights — never my contact details). <span className="text-slate-500">You can change this anytime.</span>
                </span>
              </label>
              <label data-field="agree" className="flex items-start gap-3 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-navy-900" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>
                  I confirm the information is accurate, I will keep all client material confidential, and I agree to the{" "}
                  <AppLink to="terms" navigate={navigate} className="link" target="_blank">
                    terms of service
                  </AppLink>
                  , including agreed deadlines and late-delivery deductions.
                </span>
              </label>
              {errors.agree && <p className="error-text">{errors.agree}</p>}
            </FormCard>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Already applied?{" "}
                <AppLink to="login" params={{ redirect: "writer" }} navigate={navigate} className="link">
                  Sign in
                </AppLink>
              </p>
              <button type="submit" className="btn-primary btn-lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner /> Submitting…
                  </>
                ) : (
                  <>
                    Submit application <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">How it works</h2>
              <ol className="mt-4 space-y-4 text-sm">
                {[
                  ["Apply", "Share your academic profile and publications."],
                  ["Get verified", "Our team reviews your profile and approves your account."],
                  ["Choose projects", "Browse anonymised briefs and send your fee and timeline."],
                  ["Deliver & get paid", "Submit your work for review; payouts follow approval."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">{i + 1}</span>
                    <span>
                      <span className="block font-medium text-navy-900">{t}</span>
                      <span className="text-slate-600">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="panel-muted p-5 text-sm text-slate-600">
              <p className="flex items-center gap-2 font-semibold text-navy-900">
                <GraduationCap className="h-4 w-4" /> Who we're looking for
              </p>
              <ul className="mt-3 space-y-2">
                {["University faculty and research scientists", "Ph.D. holders with peer-reviewed publications", "Patent attorneys and IP professionals"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </form>
      </section>
    </>
  );
};

const FormCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <section className="card">
    <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
      <h2 className="text-base font-semibold text-navy-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    <div className="space-y-5 px-5 py-5 sm:px-6">{children}</div>
  </section>
);
