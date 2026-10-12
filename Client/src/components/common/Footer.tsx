import React from "react";
import { GraduationCap, ShieldCheck, Mail, Phone, Clock, FileCheck2, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../../api";
import { WhatsAppButton } from "./WhatsAppButton";

interface FooterProps {
  navigate: (route: string, params?: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: getPublicSettings,
  });

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 text-sm">
      {/* Top Banner / Trust Bar */}
      <div className="border-b border-slate-800/60 bg-slate-900/40 py-8">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">COPE Compliance & Ethics</p>
                <p className="text-xs text-slate-400">Strict anti-plagiarism & original research standards</p>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Target Journal Formatting</p>
                <p className="text-xs text-slate-400">IEEE, Elsevier, Springer, Nature & UGC formats</p>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Milestone-Based Delivery</p>
                <p className="text-xs text-slate-400">Prompt turnaround with direct WhatsApp collaboration</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Col 1: Platform & Branding */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Research<span className="text-indigo-400">Hub</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {settings?.description ||
                "A premier academic research consultation and publication platform supporting undergraduate, doctoral scholars, and faculty worldwide."}
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <WhatsAppButton size="sm" />
            </div>
          </div>

          {/* Col 2: Services */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 tracking-wider uppercase mb-4">
              Core Services
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button onClick={() => navigate("services")} className="hover:text-white transition-colors">
                  Research Paper Writing
                </button>
              </li>
              <li>
                <button onClick={() => navigate("services")} className="hover:text-white transition-colors">
                  Ph.D. Thesis Consulting
                </button>
              </li>
              <li>
                <button onClick={() => navigate("services")} className="hover:text-white transition-colors">
                  PRISMA Systematic Reviews
                </button>
              </li>
              <li>
                <button onClick={() => navigate("services")} className="hover:text-white transition-colors">
                  Algorithm Implementation
                </button>
              </li>
              <li>
                <button onClick={() => navigate("services")} className="hover:text-white transition-colors">
                  Turnitin & Proofreading
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Disciplines */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 tracking-wider uppercase mb-4">
              Disciplines
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button onClick={() => navigate("services")} className="hover:text-white transition-colors">
                  Computer Science & AI
                </button>
              </li>
              <li>
                <button onClick={() => navigate("services")} className="hover:text-white transition-colors">
                  Medical & Clinical Sciences
                </button>
              </li>
              <li>
                <button onClick={() => navigate("services")} className="hover:text-white transition-colors">
                  Engineering & Robotics
                </button>
              </li>
              <li>
                <button onClick={() => navigate("services")} className="hover:text-white transition-colors">
                  Management & Business
                </button>
              </li>
              <li>
                <button onClick={() => navigate("services")} className="hover:text-white transition-colors">
                  Law & Comparative Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Support */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 tracking-wider uppercase mb-4">
              Direct Inquiries
            </h4>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <span className="text-slate-300 select-all">
                  {settings?.supportEmail || "support@researchhub.com"}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                {(() => {
                  const phoneText =
                    settings?.supportPhone && !settings.supportPhone.includes("7905632280")
                      ? settings.supportPhone
                      : settings?.whatsappNumber
                      ? settings.whatsappNumber.startsWith("91") && settings.whatsappNumber.length === 12
                        ? `+91 ${settings.whatsappNumber.slice(2)}`
                        : `+${settings.whatsappNumber}`
                      : "+91 8004153053";

                  return (
                    <a
                      href={`tel:${phoneText.replace(/[^0-9+]/g, "")}`}
                      className="text-slate-300 hover:text-emerald-400 transition-colors select-all"
                    >
                      {phoneText}
                    </a>
                  );
                })()}
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-slate-400 text-xs">
                  {settings?.businessHours || "Mon - Sat: 9:00 AM - 8:30 PM IST"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ethical Disclaimer */}
        <div className="mt-12 pt-8 border-t border-slate-900 text-xs text-slate-500 space-y-3">
          <p className="leading-relaxed">
            <strong className="text-slate-400">Academic Integrity Notice:</strong>{" "}
            {settings?.disclaimer ||
              "Research Hub provides ethical research consultation, technical writing guidance, proofreading, and journal formatting services. We strictly adhere to academic integrity standards and do not guarantee publication acceptance without editorial review."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-900/60 text-slate-500 text-[11px]">
            <p>© {new Date().getFullYear()} Research Hub Academic Network. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="text-slate-600">•</span>
              <span>Committee on Publication Ethics (COPE) Compliant</span>
              <span className="text-slate-600">•</span>
              <span>Zero-Plagiarism Guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
