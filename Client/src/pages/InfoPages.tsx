import React, { useState } from "react";
import { ArrowRight, Clock, Compass, Mail, MessageCircle, Phone, Scale, ShieldCheck, Target, Users } from "lucide-react";
import { AppLink, Field, PageHeader, useDocumentTitle } from "../components/ui";
import { CtaBand } from "./HomePage";
import { useSettings, whatsappLink } from "../hooks/usePublicData";
import { Navigate } from "../router";

/* --------------------------------- About --------------------------------- */

export const AboutPage: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  useDocumentTitle("About us");
  const { data: settings } = useSettings();

  const values = [
    { icon: <ShieldCheck className="h-5 w-5" />, t: "Confidentiality", d: "Manuscripts, data and inventions are shared only with the specialists working on them." },
    { icon: <Scale className="h-5 w-5" />, t: "Integrity", d: "We support your work; we do not compromise academic or legal standards to deliver it." },
    { icon: <Target className="h-5 w-5" />, t: "Clarity", d: "Written scope, price and timeline before work begins, and visible progress after." },
    { icon: <Users className="h-5 w-5" />, t: "Accountability", d: "One client manager coordinates your engagement from brief to delivery." },
  ];

  return (
    <>
      <PageHeader
        eyebrow="About us"
        title={`About ${settings?.platformName || "Research Hub"}`}
        description={
          settings?.tagline ||
          "A research and intellectual property services firm supporting scholars, universities and innovators."
        }
      />

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5 text-lg leading-relaxed text-slate-700">
            <p>
              {settings?.description ||
                "Research Hub brings together subject-matter specialists, editors and patent professionals to help researchers plan, write, publish and protect their work."}
            </p>
            <p>
              Our clients include doctoral scholars, faculty members, research groups, start-ups and institutional IPR
              cells. Many come to us for a research paper or thesis and return when their work produces something worth
              protecting — so we built both practices under one roof.
            </p>
            <p>
              Every engagement follows the same disciplined process: a clear brief, a written quotation, a dedicated
              team, transparent progress in your dashboard, and delivery you can stand behind.
            </p>
          </div>
          <div className="panel-muted p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.05em] text-slate-500">
              <Compass className="h-4 w-4" /> What we do
            </h2>
            <ul className="mt-5 space-y-4">
              <li>
                <AppLink to="services" navigate={navigate} className="link inline-flex items-center gap-1">
                  Research & publication <ArrowRight className="h-4 w-4" />
                </AppLink>
                <p className="mt-1 text-sm text-slate-600">Papers, reviews, theses, editing and submission support.</p>
              </li>
              <li>
                <AppLink to="patents" navigate={navigate} className="link inline-flex items-center gap-1">
                  Patents & intellectual property <ArrowRight className="h-4 w-4" />
                </AppLink>
                <p className="mt-1 text-sm text-slate-600">Searches, drafting, filing support, designs, trademarks and copyright.</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section border-t border-slate-200 bg-slate-50">
        <div className="container-page">
          <p className="eyebrow">Our principles</p>
          <h2 className="h-section mt-3">How we work</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.t} className="card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-900 text-white">{v.icon}</span>
                <h3 className="mt-4 font-semibold text-navy-900">{v.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.d}</p>
              </div>
            ))}
          </div>
          {settings?.academicIntegrityPolicy && (
            <div className="card card-pad mt-10">
              <h3 className="h-card">Academic integrity policy</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{settings.academicIntegrityPolicy}</p>
            </div>
          )}
        </div>
      </section>

      <CtaBand navigate={navigate} />
    </>
  );
};

/* -------------------------------- Contact -------------------------------- */

export const ContactPage: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  useDocumentTitle("Contact");
  const { data: settings } = useSettings();
  const [form, setForm] = useState({ name: "", topic: "General enquiry", message: "" });

  const phone = settings?.supportPhone || (settings?.whatsappNumber ? `+${settings.whatsappNumber.replace(/\D/g, "")}` : "");
  const body = `Name: ${form.name}\nTopic: ${form.topic}\n\n${form.message}`;
  const wa = whatsappLink(settings?.whatsappNumber, `Hello Research Hub,\n\n${body}`);
  const mail = settings?.supportEmail
    ? `mailto:${settings.supportEmail}?subject=${encodeURIComponent(`${form.topic} — ${form.name || "Website enquiry"}`)}&body=${encodeURIComponent(body)}`
    : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to our team"
        description="Questions about a service, a quotation or an existing request? We usually reply within one business day."
      />
      <section className="section">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            {settings?.supportEmail && (
              <ContactCard icon={<Mail className="h-5 w-5" />} title="Email" value={settings.supportEmail} href={`mailto:${settings.supportEmail}`} />
            )}
            {phone && <ContactCard icon={<Phone className="h-5 w-5" />} title="Phone" value={phone} href={`tel:${phone.replace(/[^\d+]/g, "")}`} />}
            {whatsappLink(settings?.whatsappNumber) && (
              <ContactCard icon={<MessageCircle className="h-5 w-5" />} title="WhatsApp" value="Chat with us" href={whatsappLink(settings?.whatsappNumber)!} external />
            )}
            {settings?.businessHours && <ContactCard icon={<Clock className="h-5 w-5" />} title="Business hours" value={settings.businessHours} />}
            <div className="panel-muted p-5 text-sm text-slate-600">
              Already have a request?{" "}
              <AppLink to="customer-dashboard" navigate={navigate} className="link">
                Message the team from your dashboard
              </AppLink>{" "}
              so everything stays in one place.
            </div>
          </div>

          <div className="card card-pad">
            <h2 className="h-card">Send us a message</h2>
            <p className="muted mt-1">Choose how you'd like to send it — your message opens in WhatsApp or your email app.</p>
            <div className="mt-6 space-y-5">
              <Field label="Your name">
                {(id) => <input id={id} className="input" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
              </Field>
              <Field label="Topic">
                {(id) => (
                  <select id={id} className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                    {["General enquiry", "Research & publication", "Patents & IP", "Existing request", "Billing"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Message">
                {(id) => <textarea id={id} rows={5} className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />}
              </Field>
              <div className="flex flex-col gap-3 sm:flex-row">
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`btn-primary ${!form.message.trim() ? "pointer-events-none opacity-60" : ""}`}
                    aria-disabled={!form.message.trim()}
                  >
                    <MessageCircle className="h-4 w-4" /> Send via WhatsApp
                  </a>
                )}
                {mail && (
                  <a href={mail} className={`btn-secondary ${!form.message.trim() ? "pointer-events-none opacity-60" : ""}`} aria-disabled={!form.message.trim()}>
                    <Mail className="h-4 w-4" /> Send via email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

const ContactCard: React.FC<{ icon: React.ReactNode; title: string; value: string; href?: string; external?: boolean }> = ({
  icon,
  title,
  value,
  href,
  external,
}) => (
  <div className="card flex items-center gap-4 p-5">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-700">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">{title}</p>
      {href ? (
        <a href={href} className="link block truncate" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {value}
        </a>
      ) : (
        <p className="font-medium text-navy-900">{value}</p>
      )}
    </div>
  </div>
);

/* --------------------------------- Legal --------------------------------- */

const PRIVACY: { h: string; p: string }[] = [
  { h: "Information we collect", p: "We collect the details you provide when you create an account or submit a request — such as your name, email, phone or WhatsApp number, institution, and the project information and files you share — together with basic technical data needed to operate the website securely." },
  { h: "How we use it", p: "Your information is used to prepare quotations, deliver the services you request, communicate with you about your requests, process payments and meet legal obligations. We do not sell your personal information." },
  { h: "Confidentiality of your work", p: "Manuscripts, data, invention disclosures and other files you share are accessible only to the staff and specialists assigned to your request, and are used solely to deliver that request." },
  { h: "Sharing", p: "We share information only with professionals engaged on your matter (for example, a registered patent agent for a filing), service providers who help us operate the platform, or where required by law." },
  { h: "Retention and security", p: "We keep information for as long as needed to provide the services and meet legal requirements, and protect it with appropriate technical and organisational measures." },
  { h: "Your choices", p: "You can update your profile at any time from your dashboard and may ask us to access, correct or delete your personal information by contacting support." },
];

const TERMS: { h: string; p: string }[] = [
  { h: "Services", p: "Research Hub provides research support, editing, publication assistance and intellectual property services as described on each service page and in your written quotation." },
  { h: "Quotations and payment", p: "Work begins after you accept a quotation and your payment is confirmed. The scope, price and timeline in the quotation form the basis of the engagement." },
  { h: "Your responsibilities", p: "You confirm that the information and materials you provide are accurate and that you have the right to share them. You remain responsible for how you use the deliverables, including compliance with your institution's policies." },
  { h: "Academic integrity", p: "Our services are intended to support your own research. We do not guarantee acceptance by any journal, institution or patent office, as those decisions rest with third parties." },
  { h: "Statutory filings", p: "Patent, design and trademark filings are made by the applicant or through registered professionals. Official fees and deadlines are the applicant's responsibility unless agreed otherwise in writing." },
  { h: "Confidentiality", p: "We treat your materials as confidential and will sign a non-disclosure agreement on request." },
  { h: "Liability", p: "To the extent permitted by law, our liability for any engagement is limited to the fees paid for that engagement." },
];

export const LegalPage: React.FC<{ kind: "privacy" | "terms"; navigate: Navigate }> = ({ kind, navigate }) => {
  const isPrivacy = kind === "privacy";
  useDocumentTitle(isPrivacy ? "Privacy policy" : "Terms of service");
  const { data: settings } = useSettings();
  const sections = isPrivacy ? PRIVACY : TERMS;

  return (
    <>
      <PageHeader eyebrow="Legal" title={isPrivacy ? "Privacy policy" : "Terms of service"} />
      <section className="section-tight">
        <div className="container-page max-w-3xl space-y-8">
          {sections.map((s, i) => (
            <div key={s.h}>
              <h2 className="text-lg font-semibold text-navy-900">
                {i + 1}. {s.h}
              </h2>
              <p className="mt-2 leading-relaxed text-slate-700">{s.p}</p>
            </div>
          ))}
          {!isPrivacy && settings?.disclaimer && (
            <div className="panel-muted p-5 text-sm text-slate-600">
              <p className="font-semibold text-navy-900">Disclaimer</p>
              <p className="mt-2 whitespace-pre-line">{settings.disclaimer}</p>
            </div>
          )}
          <p className="border-t border-slate-200 pt-6 text-sm text-slate-500">
            Questions about this policy?{" "}
            <AppLink to="contact" navigate={navigate} className="link">
              Contact us
            </AppLink>
            .
          </p>
        </div>
      </section>
    </>
  );
};

/* ------------------------------- Not found ------------------------------- */

export const NotFoundPage: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  useDocumentTitle("Page not found");
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-mono text-sm font-semibold text-accent-600">404</p>
      <h1 className="mt-3 font-serif text-4xl font-semibold text-navy-900">Page not found</h1>
      <p className="mt-3 max-w-md text-slate-600">The page you're looking for doesn't exist or has moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <AppLink to="home" navigate={navigate} className="btn-primary">
          Go to home page
        </AppLink>
        <AppLink to="services" navigate={navigate} className="btn-secondary">
          Browse services
        </AppLink>
      </div>
    </section>
  );
};
