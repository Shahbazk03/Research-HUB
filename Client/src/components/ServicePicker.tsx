import React, { useEffect, useState } from "react";
import { BookOpenText, Check, Clock, Lightbulb, MessageCircle } from "lucide-react";
import { Service } from "../api/types";
import { useSettings, whatsappLink } from "../hooks/usePublicData";

/**
 * Plain-language description of what each service is for, written from the
 * customer's point of view. Services added later in the admin panel fall back
 * to their own short description.
 */
const PLAIN_LANGUAGE: Record<string, string> = {
  // Research & publication
  "ai-deep-learning-paper": "I want to write and publish a research paper in AI or computer science",
  "management-business-study": "I want to write a research paper in management, economics or business",
  "phd-thesis-consulting": "I need help with my PhD or Master's thesis",
  "systematic-review-meta-analysis": "I need a review of existing studies on my topic",
  "algorithm-implementation-simulation": "I need code, a simulation or data analysis for my research",
  "manuscript-editing-turnitin": "I already have a draft and need editing or plagiarism reduction",
  // Patents & IP
  "patentability-search": "Check whether my idea is new and can be patented",
  "provisional-patent-drafting": "Protect my idea quickly while I keep developing it",
  "complete-patent-specification": "Write my full patent application",
  "patent-drawings": "I need drawings or diagrams for my patent",
  "patent-filing-support": "Help me file my patent in India or internationally",
  "patent-fer-response": "Reply to an objection I received from the patent office",
  "design-registration": "Protect the look or shape of my product",
  "trademark-registration": "Register my brand name or logo",
  "copyright-registration": "Register copyright for my software, book or creative work",
};

type Area = "research" | "ip";

export const ServicePicker: React.FC<{
  research: Service[];
  ip: Service[];
  value: string;
  error?: string;
  onChange: (serviceId: string) => void;
}> = ({ research, ip, value, error, onChange }) => {
  const { data: settings } = useSettings();
  const selectedArea: Area | null = ip.some((s) => s._id === value) ? "ip" : research.some((s) => s._id === value) ? "research" : null;
  const [area, setArea] = useState<Area | null>(selectedArea);

  // Follow a service preselected from the URL (e.g. "Request this service" on a service page)
  useEffect(() => {
    if (selectedArea) setArea(selectedArea);
  }, [selectedArea]);

  const list = area === "ip" ? ip : area === "research" ? research : [];
  const help = whatsappLink(settings?.whatsappNumber, "Hello Research Hub, I'm not sure which service I need. Can you help me choose?");

  const areas: { key: Area; title: string; text: string; icon: React.ReactNode; count: number }[] = [
    {
      key: "research",
      title: "Research & publication",
      text: "Papers, theses, literature reviews, editing, code and data analysis",
      icon: <BookOpenText className="h-5 w-5" />,
      count: research.length,
    },
    {
      key: "ip",
      title: "Patents & intellectual property",
      text: "Protect an invention, product design, brand name or creative work",
      icon: <Lightbulb className="h-5 w-5" />,
      count: ip.length,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Step A: area */}
      <fieldset>
        <legend className="label label-required">1. What is your work about?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {areas
            .filter((a) => a.count > 0)
            .map((a) => {
              const active = area === a.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setArea(a.key);
                    if (selectedArea && selectedArea !== a.key) onChange("");
                  }}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                    active ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700" : "border-slate-200 bg-white hover:border-navy-300"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded [&>svg]:h-4 [&>svg]:w-4 ${
                      active ? "bg-navy-900 text-white" : "bg-navy-50 text-navy-700"
                    }`}
                  >
                    {a.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-navy-900">{a.title}</span>
                    <span className="block text-xs leading-snug text-slate-500">{a.text}</span>
                  </span>
                </button>
              );
            })}
        </div>
      </fieldset>

      {/* Step B: plain-language service options */}
      {area && (
        <fieldset data-field="serviceId" className="animate-fade-in">
          <legend className="label label-required">2. Which of these best describes what you need?</legend>
          <div role="radiogroup" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((s) => {
              const active = value === s._id;
              const plain = PLAIN_LANGUAGE[s.slug] || s.shortDescription || s.name;
              return (
                <label
                  key={s._id}
                  title={s.name}
                  className={`relative flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors ${
                    active ? "border-navy-700 bg-navy-50 ring-1 ring-navy-700" : "border-slate-200 bg-white hover:border-navy-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="service"
                    className="sr-only"
                    checked={active}
                    onChange={() => onChange(s._id)}
                  />
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      active ? "border-navy-900 bg-navy-900 text-white" : "border-slate-300 bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {active && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-snug text-navy-900">{plain}</span>
                    {s.turnaroundTime && (
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3" /> {s.turnaroundTime}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          {error && <p className="error-text">{error}</p>}
        </fieldset>
      )}

      {!area && error && <p className="error-text">Please choose what your work is about.</p>}

      {/* Reassurance for people who aren't sure */}
      <div className="flex flex-col gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-navy-900">Not sure which one?</span> Pick the closest option — our team reads every
          brief and will suggest the right service. You only pay after you approve a quotation.
        </p>
        {help && (
          <a href={help} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm shrink-0">
            <MessageCircle className="h-4 w-4 text-[#1FAF5A]" /> Ask us on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
};
