import React from "react";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import { AppLink } from "../ui";
import { Logo } from "./Navbar";
import { Navigate, RouteParams, RouteType } from "../../router";
import { useSettings, whatsappLink } from "../../hooks/usePublicData";

const formatPhone = (raw?: string) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return raw?.startsWith("+") ? raw : `+${digits}`;
};

type LinkItem = { label: string; to: RouteType; params?: RouteParams };

const COLUMNS: { title: string; links: LinkItem[] }[] = [
  {
    title: "Research & Publication",
    links: [
      { label: "All services", to: "services" },
      { label: "Research papers", to: "services", params: { search: "paper" } },
      { label: "Thesis & dissertation", to: "services", params: { search: "thesis" } },
      { label: "Editing & proofreading", to: "services", params: { search: "editing" } },
    ],
  },
  {
    title: "Patents & IP",
    links: [
      { label: "Patent search & drafting", to: "patents" },
      { label: "Patent filing support", to: "service-detail", params: { slug: "patent-filing-support" } },
      { label: "Design registration", to: "service-detail", params: { slug: "design-registration" } },
      { label: "Trademark & copyright", to: "service-detail", params: { slug: "trademark-registration" } },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", to: "about" },
      { label: "Contact", to: "contact" },
      { label: "Start a request", to: "wizard" },
      { label: "Our experts", to: "experts" },
      { label: "Join as an expert", to: "join-experts" },
      { label: "Client sign in", to: "login" },
    ],
  },
];

export const Footer: React.FC<{ navigate: Navigate }> = ({ navigate }) => {
  const { data: settings } = useSettings();
  const phone = formatPhone(settings?.supportPhone || settings?.whatsappNumber);
  const wa = whatsappLink(settings?.whatsappNumber);
  const year = new Date().getFullYear();

  return (
    <footer className="bg-navy-950 text-navy-100">
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.3fr_2fr] lg:py-16">
        <div>
          <Logo navigate={navigate} inverted />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-navy-200">
            {settings?.description ||
              "Research publication, thesis and patent & intellectual property services for researchers, universities and innovators."}
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {settings?.supportEmail && (
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-accent-300" />
                <a href={`mailto:${settings.supportEmail}`} className="hover:text-white">
                  {settings.supportEmail}
                </a>
              </li>
            )}
            {phone && (
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-accent-300" />
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="hover:text-white">
                  {phone}
                </a>
              </li>
            )}
            {wa && (
              <li className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 text-accent-300" />
                <a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  WhatsApp
                </a>
              </li>
            )}
            {settings?.businessHours && (
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-accent-300" />
                <span>{settings.businessHours}</span>
              </li>
            )}
          </ul>
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.05em] text-white">{col.title}</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <AppLink to={link.to} params={link.params} navigate={navigate} className="text-navy-200 hover:text-white">
                      {link.label}
                    </AppLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-navy-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {settings?.platformName || "Research Hub"}. All rights reserved.</p>
          <div className="flex gap-6">
            <AppLink to="privacy" navigate={navigate} className="hover:text-white">
              Privacy policy
            </AppLink>
            <AppLink to="terms" navigate={navigate} className="hover:text-white">
              Terms of service
            </AppLink>
          </div>
        </div>
      </div>
    </footer>
  );
};
